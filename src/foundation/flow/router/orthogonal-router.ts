import { DEFAULT_ROUTER_OPTIONS, type FlowRouterOptions } from '../defaults.js';
import {
  expandRect,
  hashNumber,
  hashString,
  isHorizontalSide,
  roundCoord,
  sideNormal,
  unionRects,
} from '../geometry.js';
import type { FlowEdgeKind, FlowEndpoint, FlowPoint, FlowRect, FlowSide } from '../types.js';
import {
  astarRoute,
  directionBetween,
  directionOfSide,
  oppositeDirection,
  simplifyOrthogonal,
} from './astar.js';
import { GridPool, buildRoutingGrid, gridPoint, gridVertex, type RoutingGrid } from './grid.js';
import { nudgeRoutes } from './nudging.js';
import type { ObstacleIndex } from './obstacles.js';
import type { FlowRoute, FlowRouteContext, FlowRouteRequest, FlowRouter } from './types.js';

/**
 * Weighted A* focus. Crossing and overlap penalties are invisible to the heuristic, so an
 * exact search explores most of the grid on busy canvases; 1.5 bounds the extra cost to 50 %
 * and keeps long routes in the millisecond range.
 */
export const HEURISTIC_WEIGHT = 1.5;

/** FNV-1a over the kind, the flags and the rounded points; equal routes hash equally. */
export function routeHash(
  kind: FlowEdgeKind,
  points: readonly FlowPoint[],
  fallback: boolean,
  selfLoop: boolean,
): number {
  let hash = hashString(0x811c9dc5, kind);
  hash = hashNumber(hash, (fallback ? 1 : 0) + (selfLoop ? 2 : 0));
  for (const point of points) {
    hash = hashNumber(hash, roundCoord(point.x));
    hash = hashNumber(hash, roundCoord(point.y));
  }
  return hash >>> 0;
}

/** Resolves the router options over the defaults, ignoring `undefined` entries. */
export function resolveRouterOptions(options: FlowRouterOptions = {}): Required<FlowRouterOptions> {
  const result = { ...DEFAULT_ROUTER_OPTIONS };
  for (const key of Object.keys(options) as Array<keyof FlowRouterOptions>) {
    const value = options[key];
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/** The port exit: `point + normal × stub`; a free endpoint (zero rect) has no stub. */
export function exitPoint(endpoint: FlowEndpoint, stub: number): FlowPoint {
  if (stub <= 0 || (endpoint.rect.width === 0 && endpoint.rect.height === 0)) return endpoint.point;
  const normal = sideNormal(endpoint.side);
  return { x: endpoint.point.x + normal.x * stub, y: endpoint.point.y + normal.y * stub };
}

/**
 * Pulls a stub exit that landed inside a neighbouring node's padded rect back onto that rect's
 * boundary along the port normal. Two nodes closer than two stubs would otherwise leave the
 * exit in blocked space, the search would fail and the edge would fall back to a smoothstep
 * path the nudging cannot separate. Exits in other obstacles' padding behind the port stay.
 */
export function clearExit(
  endpoint: FlowEndpoint,
  exit: FlowPoint,
  obstacles: Pick<ObstacleIndex, 'rectsIn'>,
  padding = 0,
): FlowPoint {
  if (exit === endpoint.point) return exit;
  const normal = sideNormal(endpoint.side);
  const port = endpoint.point;
  const stub = Math.abs(exit.x - port.x) + Math.abs(exit.y - port.y);
  // The free run in front of the port: up to the nearest other padded rect across the port's
  // line, looked up as far as two stubs (a facing port's stub comes from that side).
  const ahead = 2 * stub;
  const probe =
    normal.x !== 0
      ? {
          x: normal.x > 0 ? port.x : port.x - ahead,
          y: port.y - 0.5,
          width: ahead,
          height: 1,
        }
      : {
          x: port.x - 0.5,
          y: normal.y > 0 ? port.y : port.y - ahead,
          width: 1,
          height: ahead,
        };
  let free = Infinity;
  for (const [id, rect] of obstacles.rectsIn(probe)) {
    if (id === endpoint.nodeId) continue;
    const across =
      normal.x !== 0
        ? port.y > rect.y + EXIT_EPSILON && port.y < rect.y + rect.height - EXIT_EPSILON
        : port.x > rect.x + EXIT_EPSILON && port.x < rect.x + rect.width - EXIT_EPSILON;
    if (!across) continue;
    const distance =
      normal.x > 0
        ? rect.x - port.x
        : normal.x < 0
          ? port.x - (rect.x + rect.width)
          : normal.y > 0
            ? rect.y - port.y
            : port.y - (rect.y + rect.height);
    if (distance > EXIT_EPSILON) free = Math.min(free, distance);
  }
  if (free >= ahead) return onPixel(port, normal, stub);
  // Clear of the own node's padding: the port may sit on or just outside the node edge.
  const rect = endpoint.rect;
  const own =
    normal.x > 0
      ? rect.x + rect.width + padding - port.x
      : normal.x < 0
        ? port.x - (rect.x - padding)
        : normal.y > 0
          ? rect.y + rect.height + padding - port.y
          : port.y - (rect.y - padding);
  // In a gap narrower than two stubs, a stub from the facing node would share the line: each
  // side takes at most half of the gap, never less than clearing its own padding.
  const reach = Math.min(stub, Math.max(free / 2, Math.min(own + 1, free)));
  return onPixel(port, normal, reach);
}

/**
 * The exit `reach` along the port normal, its normal coordinate rounded to a whole pixel: a
 * fractional port position would otherwise put the leg after the stub a fraction of a pixel
 * off the lanes of neighbouring routes, too close to see apart and not equal to be nudged.
 */
function onPixel(port: FlowPoint, normal: FlowPoint, reach: number): FlowPoint {
  return normal.x !== 0
    ? { x: Math.round(port.x + normal.x * reach), y: port.y }
    : { x: port.x, y: Math.round(port.y + normal.y * reach) };
}

const EXIT_EPSILON = 1e-6;

/**
 * Obstacle-aware orthogonal router (Widgets §6.3 Routing). Port stubs are fixed outside the
 * search; waypoints split the route into legs; the search region doubles its margin until a
 * route exists or the growth limit is hit, after which the smoothstep fallback is used.
 */
export class OrthogonalRouter implements FlowRouter {
  readonly options: Required<FlowRouterOptions>;
  readonly #pool = new GridPool();

  constructor(options: FlowRouterOptions = {}) {
    this.options = resolveRouterOptions(options);
  }

  route(request: FlowRouteRequest): FlowRoute {
    const { source, target, context } = request;
    const borderRadius = request.options.borderRadius;
    if (source.nodeId !== '' && source.nodeId === target.nodeId) return this.#selfLoop(request);
    const stub = this.stubLength(request);
    const sourceExit = clearExit(
      source,
      exitPoint(source, stub),
      context.obstacles,
      context.nodePadding,
    );
    const targetExit = clearExit(
      target,
      exitPoint(target, stub),
      context.obstacles,
      context.nodePadding,
    );
    const waypoints = (request.waypoints ?? []).map((point) => context.obstacles.projectOut(point));
    const legs = dedupePoints([sourceExit, ...waypoints, targetExit]);
    const startDirection = sourceExit === source.point ? -1 : directionOfSide(source.side);
    const goalDirection =
      targetExit === target.point ? -1 : oppositeDirection(directionOfSide(target.side));
    const costs = {
      bend: this.options.bendPenalty,
      hug: this.options.hugPenalty,
      crossing: this.options.crossingPenalty,
      overlap: this.options.overlapPenalty,
      weight: HEURISTIC_WEIGHT,
    };
    let margin = this.options.regionMargin;
    const anchors = [source.point, target.point, ...legs];
    for (let growth = 0; growth <= this.options.maxRegionGrowth; growth += 1) {
      const region = expandRect(boundsOfPoints(anchors), margin);
      const grid = this.#grid(request, region, legs);
      if (!grid) break;
      const routed = this.#routeLegs(grid, legs, startDirection, goalDirection, costs);
      if (routed) {
        const points = simplifyOrthogonal([source.point, ...routed, target.point]);
        return this.#finish(request, points, borderRadius, false, stub);
      }
      margin *= 2;
    }
    return this.#fallback(request);
  }

  nudge(routes: readonly FlowRoute[], context: FlowRouteContext): FlowRoute[] {
    return nudgeRoutes(routes, context);
  }

  /** Effective stub: the edge's stub option, else the router stub, never below the padding. */
  stubLength(request: FlowRouteRequest): number {
    const stub = request.options.stub > 0 ? request.options.stub : this.options.stub;
    return Math.max(stub, request.context.nodePadding);
  }

  /** Thinning ladder under the vertex cap: midlines first, then coarser obstacle lines. */
  static readonly THINNING: ReadonlyArray<{ midlines: boolean; quantum?: number }> = [
    { midlines: true },
    { midlines: false },
    { midlines: false, quantum: 4 },
    { midlines: false, quantum: 16 },
  ];

  #grid(request: FlowRouteRequest, region: FlowRect, legs: FlowPoint[]): RoutingGrid | undefined {
    const base = {
      segments: request.context.segments,
      excludeEdge: request.edgeId,
      pool: this.#pool,
      maxVertices: this.options.maxGridVertices,
    };
    for (const step of OrthogonalRouter.THINNING) {
      const grid = buildRoutingGrid(request.context.obstacles, region, legs, { ...base, ...step });
      if (grid) return grid;
    }
    return undefined;
  }

  #routeLegs(
    grid: RoutingGrid,
    legs: FlowPoint[],
    startDirection: number,
    goalDirection: number,
    costs: { bend: number; hug: number; crossing: number; overlap: number },
  ): FlowPoint[] | undefined {
    const points: FlowPoint[] = [legs[0]!];
    let direction = startDirection;
    for (let index = 0; index < legs.length - 1; index += 1) {
      const start = gridVertex(grid, legs[index]!);
      const goal = gridVertex(grid, legs[index + 1]!);
      if (start < 0 || goal < 0) return undefined;
      const last = index === legs.length - 2;
      const path = astarRoute(
        grid,
        { start, startDirection: direction, goal, goalDirection: last ? goalDirection : -1 },
        costs,
        this.#pool,
      );
      if (!path) return undefined;
      for (let at = 1; at < path.length; at += 1) points.push(gridPoint(grid, path[at]!));
      if (path.length >= 2)
        direction = directionBetween(
          gridPoint(grid, path[path.length - 2]!),
          gridPoint(grid, path[path.length - 1]!),
        );
    }
    return points;
  }

  #selfLoop(request: FlowRouteRequest): FlowRoute {
    const { source, target } = request;
    const gap = this.stubLength(request);
    const rect = expandRect(source.rect, gap);
    const p0 = source.point;
    const q0 = target.point;
    const p1 = exitPoint(source, gap);
    const q1 = exitPoint(target, gap);
    const points: FlowPoint[] = [p0, p1];
    if (source.side === target.side) {
      if (p0.x === q0.x && p0.y === q0.y) {
        const tangent = isHorizontalSide(source.side) ? { x: 0, y: 1 } : { x: 1, y: 0 };
        points.push(
          { x: p1.x + tangent.x * gap, y: p1.y + tangent.y * gap },
          { x: q0.x + tangent.x * gap, y: q0.y + tangent.y * gap },
        );
      }
    } else if (isHorizontalSide(source.side) !== isHorizontalSide(target.side)) {
      const horizontal = isHorizontalSide(source.side) ? source.side : target.side;
      const vertical = isHorizontalSide(source.side) ? target.side : source.side;
      points.push({ x: sideCoordinate(rect, horizontal), y: sideCoordinate(rect, vertical) });
    } else if (isHorizontalSide(source.side)) {
      const middle = (p0.y + q0.y) / 2;
      const y = middle - rect.y <= rect.y + rect.height - middle ? rect.y : rect.y + rect.height;
      points.push({ x: p1.x, y }, { x: q1.x, y });
    } else {
      const middle = (p0.x + q0.x) / 2;
      const x = middle - rect.x <= rect.x + rect.width - middle ? rect.x : rect.x + rect.width;
      points.push({ x, y: p1.y }, { x, y: q1.y });
    }
    points.push(q1, q0);
    return this.#finish(
      request,
      simplifyOrthogonal(points),
      request.options.borderRadius,
      true,
      gap,
    );
  }

  #finish(
    request: FlowRouteRequest,
    points: FlowPoint[],
    borderRadius: number,
    selfLoop: boolean,
    stub: number,
  ): FlowRoute {
    const path = request.context.render(points, borderRadius);
    return {
      ...path,
      edgeId: request.edgeId,
      fallback: false,
      selfLoop,
      borderRadius,
      stub,
      hash: routeHash(path.kind, path.points, false, selfLoop),
    };
  }

  #fallback(request: FlowRouteRequest): FlowRoute {
    const path = request.context.fallback(request.source, request.target);
    return {
      ...path,
      edgeId: request.edgeId,
      fallback: true,
      selfLoop: false,
      borderRadius: request.options.borderRadius,
      stub: 0,
      hash: routeHash(path.kind, path.points, true, false),
    };
  }
}

function sideCoordinate(rect: FlowRect, side: FlowSide): number {
  switch (side) {
    case 'left':
      return rect.x;
    case 'right':
      return rect.x + rect.width;
    case 'top':
      return rect.y;
    default:
      return rect.y + rect.height;
  }
}

function dedupePoints(points: FlowPoint[]): FlowPoint[] {
  const result: FlowPoint[] = [];
  for (const point of points) {
    const last = result[result.length - 1];
    if (last && last.x === point.x && last.y === point.y) continue;
    result.push(point);
  }
  return result;
}

function boundsOfPoints(points: readonly FlowPoint[]): FlowRect {
  return unionRects(points.map((point) => ({ x: point.x, y: point.y, width: 0, height: 0 })));
}
