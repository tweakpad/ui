import { DEFAULT_ROUTER_OPTIONS } from '../defaults.js';
import { expandRect, rectsEqual, rectsIntersect } from '../geometry.js';
import { SpatialIndex, type SpatialIndexOptions } from '../spatial-index.js';
import type { FlowPoint, FlowRect } from '../types.js';

/**
 * Rounds a padded rect outward to whole pixels. Nodes at fractional positions would otherwise put
 * routing lines a fraction of a pixel from the corridor lanes other edges use: visually the same
 * line, but not the same coordinate, so the nudging could not separate them. Rounding outward
 * keeps at least the full padding.
 */
function outwardToPixels(rect: FlowRect): FlowRect {
  const x = Math.floor(rect.x);
  const y = Math.floor(rect.y);
  return {
    x,
    y,
    width: Math.ceil(rect.x + rect.width) - x,
    height: Math.ceil(rect.y + rect.height) - y,
  };
}

/**
 * Padded node rects for the router. Every rect is stored expanded by the clearance, so queries
 * and grid construction read the padded boundary directly. Groups are never inserted.
 */
export class ObstacleIndex {
  readonly #index: SpatialIndex;
  readonly #rects = new Map<string, FlowRect>();
  readonly #padding: number;

  constructor(padding = DEFAULT_ROUTER_OPTIONS.nodePadding, options?: SpatialIndexOptions) {
    this.#padding = padding;
    this.#index = new SpatialIndex(options);
  }

  get padding(): number {
    return this.#padding;
  }

  get size(): number {
    return this.#rects.size;
  }

  has(id: string): boolean {
    return this.#rects.has(id);
  }

  /** The padded rect. */
  rectOf(id: string): FlowRect | undefined {
    return this.#rects.get(id);
  }

  ids(): IterableIterator<string> {
    return this.#rects.keys();
  }

  /** Inserts or updates the unpadded `rect`; returns whether anything changed. */
  set(id: string, rect: FlowRect): boolean {
    const padded = outwardToPixels(expandRect(rect, this.#padding));
    const previous = this.#rects.get(id);
    if (previous && rectsEqual(previous, padded)) return false;
    this.#rects.set(id, padded);
    this.#index.insert(id, padded);
    return true;
  }

  remove(id: string): boolean {
    if (!this.#rects.delete(id)) return false;
    this.#index.remove(id);
    return true;
  }

  clear(): void {
    this.#rects.clear();
    this.#index.clear();
  }

  /** Ids whose padded rect overlaps `rect` (boundary contact does not count). */
  query(rect: FlowRect, out: string[] = []): string[] {
    const start = out.length;
    this.#index.queryRect(rect, true, out);
    // The spatial index tests open intervals already; keep the result deterministic.
    if (out.length - start > 1) sortRange(out, start);
    return out;
  }

  /** Ids whose padded rect contains `point` (boundary included). */
  containing(point: FlowPoint, out: string[] = []): string[] {
    const start = out.length;
    this.#index.queryPoint(point, out);
    if (out.length - start > 1) sortRange(out, start);
    return out;
  }

  /** Padded rects overlapping `rect`, as `[id, rect]` pairs in id order. */
  rectsIn(rect: FlowRect): Array<[string, FlowRect]> {
    const result: Array<[string, FlowRect]> = [];
    for (const id of this.query(rect)) {
      const padded = this.#rects.get(id)!;
      if (rectsIntersect(rect, padded)) result.push([id, padded]);
    }
    return result;
  }

  /** Projects a point that lies inside an obstacle onto that obstacle's nearest boundary. */
  projectOut(point: FlowPoint): FlowPoint {
    let current = point;
    for (let guard = 0; guard < 4; guard += 1) {
      const inside = this.containing(current).filter((id) => {
        const rect = this.#rects.get(id)!;
        return strictlyInside(rect, current);
      });
      if (inside.length === 0) return current;
      const rect = this.#rects.get(inside[0]!)!;
      current = nearestBoundaryPoint(rect, current);
    }
    return current;
  }
}

function strictlyInside(rect: FlowRect, point: FlowPoint): boolean {
  return (
    point.x > rect.x &&
    point.x < rect.x + rect.width &&
    point.y > rect.y &&
    point.y < rect.y + rect.height
  );
}

function nearestBoundaryPoint(rect: FlowRect, point: FlowPoint): FlowPoint {
  const left = point.x - rect.x;
  const right = rect.x + rect.width - point.x;
  const top = point.y - rect.y;
  const bottom = rect.y + rect.height - point.y;
  const min = Math.min(left, right, top, bottom);
  if (min === left) return { x: rect.x, y: point.y };
  if (min === right) return { x: rect.x + rect.width, y: point.y };
  if (min === top) return { x: point.x, y: rect.y };
  return { x: point.x, y: rect.y + rect.height };
}

function sortRange(list: string[], start: number): void {
  const tail = list.splice(start).sort();
  for (const id of tail) list.push(id);
}

export interface CollectedCoordinates {
  xs: number[];
  ys: number[];
  /** Obstacles touching the region, in id order. */
  obstacleIds: string[];
}

export interface CollectCoordinatesOptions {
  /** Add the midline between neighbouring coordinates (channel centres). */
  midlines?: boolean;
  /** Minimum gap that receives a midline (default 2). */
  minGap?: number;
  /**
   * Cluster obstacle coordinates closer than this (thinning for huge regions); the given
   * points stay exact and the grid blocks obstacles conservatively on the coarser lines.
   */
  quantum?: number;
}

/**
 * The interesting coordinates of a routing region: the region bounds, obstacle boundaries that
 * fall inside the region, the given points (port exits and waypoints) and, optionally, the
 * midlines between neighbouring coordinates. Sorted, unique, clipped to the region.
 */
export function collectCoordinates(
  obstacles: ObstacleIndex,
  region: FlowRect,
  points: readonly FlowPoint[],
  options: CollectCoordinatesOptions = {},
): CollectedCoordinates {
  const x1 = region.x;
  const y1 = region.y;
  const x2 = region.x + region.width;
  const y2 = region.y + region.height;
  const obstacleIds = obstacles.query(region);
  let obstacleX: number[] = [];
  let obstacleY: number[] = [];
  for (const id of obstacleIds) {
    const rect = obstacles.rectOf(id)!;
    obstacleX.push(rect.x, rect.x + rect.width);
    obstacleY.push(rect.y, rect.y + rect.height);
  }
  if (options.quantum !== undefined && options.quantum > 0) {
    obstacleX = cluster(obstacleX, options.quantum);
    obstacleY = cluster(obstacleY, options.quantum);
  }
  const xs: number[] = [x1, x2, ...obstacleX];
  const ys: number[] = [y1, y2, ...obstacleY];
  for (const point of points) {
    xs.push(point.x);
    ys.push(point.y);
  }
  const uniqueX = uniqueSorted(xs, x1, x2);
  const uniqueY = uniqueSorted(ys, y1, y2);
  if (options.midlines) {
    const minGap = options.minGap ?? 2;
    return {
      xs: uniqueSorted(withMidlines(uniqueX, minGap), x1, x2),
      ys: uniqueSorted(withMidlines(uniqueY, minGap), y1, y2),
      obstacleIds,
    };
  }
  return { xs: uniqueX, ys: uniqueY, obstacleIds };
}

const COORD_EPSILON = 1e-6;

function uniqueSorted(values: number[], min: number, max: number): number[] {
  const sorted = values.filter((value) => value >= min && value <= max).sort((a, b) => a - b);
  const result: number[] = [];
  for (const value of sorted) {
    const last = result[result.length - 1];
    if (last === undefined || value - last > COORD_EPSILON) result.push(value);
  }
  return result;
}

/** Replaces runs of values within `quantum` of the run's first value by that value. */
function cluster(values: number[], quantum: number): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const result: number[] = [];
  let start = Number.NaN;
  for (const value of sorted) {
    if (Number.isNaN(start) || value - start > quantum) {
      start = value;
      result.push(value);
    }
  }
  return result;
}

function withMidlines(values: number[], minGap: number): number[] {
  const result: number[] = [];
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]!;
    result.push(value);
    const next = values[index + 1];
    // Whole-pixel midlines: routes in a corridor then share exact lanes (which the nudging
    // separates) instead of sitting half a pixel apart (which it would not see).
    if (next !== undefined && next - value > minGap) {
      const middle = Math.round((value + next) / 2);
      if (middle > value && middle < next) result.push(middle);
    }
  }
  return result;
}
