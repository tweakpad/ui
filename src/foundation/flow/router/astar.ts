import type { FlowPoint, FlowSide } from '../types.js';
import type { GridPool, RoutingGrid } from './grid.js';

/** Travel directions; a state is `vertex * 4 + direction`. */
export const RIGHT = 0;
export const DOWN = 1;
export const LEFT = 2;
export const UP = 3;

/** The outward travel direction from a port on `side`. */
export function directionOfSide(side: FlowSide): number {
  switch (side) {
    case 'right':
      return RIGHT;
    case 'bottom':
      return DOWN;
    case 'left':
      return LEFT;
    default:
      return UP;
  }
}

export function oppositeDirection(direction: number): number {
  return direction < 0 ? -1 : (direction + 2) % 4;
}

/** Direction of the axis-aligned move `a → b`; `-1` when the points coincide or are diagonal. */
export function directionBetween(a: FlowPoint, b: FlowPoint): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dx === 0 && dy === 0) return -1;
  if (dy === 0) return dx > 0 ? RIGHT : LEFT;
  if (dx === 0) return dy > 0 ? DOWN : UP;
  return -1;
}

export interface AstarCosts {
  bend: number;
  hug: number;
  crossing: number;
  overlap: number;
  /**
   * Heuristic weight (default 1, exact). Values above 1 focus the search (weighted A*): the
   * result is at most `weight` times the optimal cost, found with far fewer expansions.
   */
  weight?: number;
  /** Expansion cap; the search gives up (returns `undefined`) when exceeded. */
  maxExpansions?: number;
}

export interface AstarQuery {
  start: number;
  /** Direction of travel on arrival at `start` (the port stub); `-1` for any. */
  startDirection: number;
  goal: number;
  /** Required direction of travel into `goal` (toward the port); `-1` for any. */
  goalDirection: number;
}

/**
 * A* over `(vertex, direction)` states. Cost = length + bend + hug + crossing × count +
 * overlap × count; the heuristic is the Manhattan distance plus a lower bound on bends, so it
 * is admissible; states improved after expansion are re-opened. Ties break on (f, h, state),
 * which makes the result deterministic. Returns the vertex sequence or `undefined`.
 */
export function astarRoute(
  grid: RoutingGrid,
  query: AstarQuery,
  costs: AstarCosts,
  pool: GridPool,
): number[] | undefined {
  const { cols, rows, xs, ys, blockedH, blockedV, hugH, hugV } = grid;
  const { crossH, crossV, overlapH, overlapV } = grid;
  const states = grid.vertices * 4;
  pool.ensureStates(states);
  const generation = pool.nextGeneration();
  const g = pool.g;
  const parent = pool.parent;
  const stamp = pool.stamp;
  const heap = pool.heap;
  heap.clear();
  const { start, goal, goalDirection } = query;
  if (start < 0 || goal < 0 || start >= grid.vertices || goal >= grid.vertices) return undefined;
  const goalX = xs[goal % cols]!;
  const goalY = ys[Math.floor(goal / cols)]!;
  const bend = costs.bend;
  const weight = costs.weight ?? 1;

  const heuristic = (vertex: number, direction: number): number => {
    const dx = goalX - xs[vertex % cols]!;
    const dy = goalY - ys[Math.floor(vertex / cols)]!;
    const manhattan = Math.abs(dx) + Math.abs(dy);
    if (dx === 0 && dy === 0) return 0;
    let bends = 0;
    const reversed =
      (direction === RIGHT && dx < 0) ||
      (direction === LEFT && dx > 0) ||
      (direction === DOWN && dy < 0) ||
      (direction === UP && dy > 0);
    if (reversed) bends = 2;
    else if ((direction === RIGHT || direction === LEFT) && dy !== 0) bends = 1;
    else if ((direction === DOWN || direction === UP) && dx !== 0) bends = 1;
    return manhattan + bends * bend;
  };

  // Stamps: `generation` = open with a tentative cost, `-generation` = closed (never re-opened,
  // which bounds the expansions by the state count under the weighted heuristic).
  const open = (state: number, cost: number, from: number): void => {
    if (stamp[state] === -generation) return;
    if (stamp[state] === generation && g[state]! <= cost) return;
    stamp[state] = generation;
    g[state] = cost;
    parent[state] = from;
    const h = heuristic(state >> 2, state & 3) * weight;
    heap.push(state, cost + h, h);
  };

  if (query.startDirection < 0) for (let d = 0; d < 4; d += 1) open(start * 4 + d, 0, -1);
  else open(start * 4 + query.startDirection, 0, -1);

  let goalState = -1;
  let budget = Math.min(states, costs.maxExpansions ?? Infinity);
  while (heap.size > 0 && budget > 0) {
    budget -= 1;
    const state = heap.pop();
    stamp[state] = -generation;
    const vertex = state >> 2;
    const direction = state & 3;
    const cost = g[state]!;
    if (vertex === goal) {
      goalState = state;
      break;
    }
    const ix = vertex % cols;
    const iy = (vertex - ix) / cols;
    for (let next = 0; next < 4; next += 1) {
      let neighbour: number;
      let length: number;
      let edge: number;
      let horizontal: boolean;
      if (next === RIGHT) {
        if (ix >= cols - 1 || blockedH[vertex]) continue;
        neighbour = vertex + 1;
        length = xs[ix + 1]! - xs[ix]!;
        edge = vertex;
        horizontal = true;
      } else if (next === LEFT) {
        if (ix <= 0 || blockedH[vertex - 1]) continue;
        neighbour = vertex - 1;
        length = xs[ix]! - xs[ix - 1]!;
        edge = vertex - 1;
        horizontal = true;
      } else if (next === DOWN) {
        if (iy >= rows - 1 || blockedV[vertex]) continue;
        neighbour = vertex + cols;
        length = ys[iy + 1]! - ys[iy]!;
        edge = vertex;
        horizontal = false;
      } else {
        if (iy <= 0 || blockedV[vertex - cols]) continue;
        neighbour = vertex - cols;
        length = ys[iy]! - ys[iy - 1]!;
        edge = vertex - cols;
        horizontal = false;
      }
      // Never reverse in place: a U-turn is two bends through another vertex.
      if (next === oppositeDirection(direction)) continue;
      let step = length;
      if (next !== direction) step += bend;
      if (horizontal) {
        if (hugH[edge]) step += costs.hug;
        if (crossH) step += costs.crossing * crossH[edge]!;
        if (overlapH) step += overlapCost(costs.overlap, overlapH[edge]!, length);
      } else {
        if (hugV[edge]) step += costs.hug;
        if (crossV) step += costs.crossing * crossV[edge]!;
        if (overlapV) step += overlapCost(costs.overlap, overlapV[edge]!, length);
      }
      if (neighbour === goal && goalDirection >= 0 && next !== goalDirection) {
        // The final stub leaves the goal toward the port; arriving against it would reverse.
        if (next === oppositeDirection(goalDirection)) continue;
        step += bend;
      }
      open(neighbour * 4 + next, cost + step, state);
    }
  }
  if (goalState < 0) return undefined;
  const path: number[] = [];
  for (let state = goalState; state >= 0; state = parent[state]!) path.push(state >> 2);
  path.reverse();
  return path;
}

/** Drops repeated points and the middle point of every same-direction colinear triple. */
export function simplifyOrthogonal(points: readonly FlowPoint[]): FlowPoint[] {
  const result: FlowPoint[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    const before = result[result.length - 2];
    if (last && before) {
      const previous = directionBetween(before, last);
      const next = directionBetween(last, point);
      if (previous >= 0 && previous === next) {
        result[result.length - 1] = point;
        continue;
      }
    }
    result.push(point);
  }
  return result;
}

/**
 * A colinear overlap is priced by its length, not per grid edge: a run laid over another edge
 * for 300 px through a pinch the nudging cannot widen must cost more than a short detour,
 * while a few pixels of shared approach stay cheap.
 */
function overlapCost(penalty: number, count: number, length: number): number {
  return count === 0 ? 0 : penalty * count * (1 + length / OVERLAP_UNIT);
}

/** Length (px) over which one overlap penalty accrues again. */
const OVERLAP_UNIT = 16;
