import { describe, expect, it } from 'vitest';
import type { FlowEdgePath } from '../edges/paths.js';
import type { FlowEdgeKind, FlowEndpoint, FlowPoint, FlowRect, FlowSide } from '../types.js';
import { SpatialIndex } from '../spatial-index.js';
import { ObstacleIndex } from './obstacles.js';
import { OrthogonalRouter, exitPoint, routeHash } from './orthogonal-router.js';
import { SegmentIndex } from './segments.js';
import type { FlowRoute, FlowRouteContext, FlowRouteRequest } from './types.js';

const EPSILON = 1e-6;

function polyline(points: readonly FlowPoint[], kind: FlowEdgeKind = 'orthogonal'): FlowEdgePath {
  const copy = points.map((point) => ({ x: point.x, y: point.y }));
  let length = 0;
  for (let index = 1; index < copy.length; index += 1)
    length += Math.hypot(copy[index]!.x - copy[index - 1]!.x, copy[index]!.y - copy[index - 1]!.y);
  const xs = copy.map((point) => point.x);
  const ys = copy.map((point) => point.y);
  const bbox = {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
  return {
    kind,
    points: copy,
    d: copy.map((point, index) => `${index ? 'L' : 'M'}${point.x} ${point.y}`).join(''),
    bbox,
    center: { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 },
    length,
  };
}

const options = { curvature: 0, borderRadius: 8, offset: 0, stepPosition: 0.5, stub: 24 };

function endpoint(
  nodeId: string,
  rect: FlowRect,
  side: FlowSide,
  portId?: string,
  at = 0.5,
): FlowEndpoint {
  const point =
    side === 'left'
      ? { x: rect.x, y: rect.y + rect.height * at }
      : side === 'right'
        ? { x: rect.x + rect.width, y: rect.y + rect.height * at }
        : side === 'top'
          ? { x: rect.x + rect.width * at, y: rect.y }
          : { x: rect.x + rect.width * at, y: rect.y + rect.height };
  return { point, side, nodeId, portId, rect };
}

interface Scene {
  rects: Map<string, FlowRect>;
  obstacles: ObstacleIndex;
  segments: SegmentIndex;
  order: Map<string, number>;
  context: FlowRouteContext;
}

function scene(rects: Map<string, FlowRect>, edgeIds: readonly string[] = []): Scene {
  const obstacles = new ObstacleIndex(12);
  for (const [id, rect] of rects) obstacles.set(id, rect);
  const segments = new SegmentIndex();
  const order = new Map(edgeIds.map((id, index) => [id, index]));
  const context: FlowRouteContext = {
    obstacles,
    segments,
    edgeSpacing: 12,
    nodePadding: 12,
    order: (id) => order.get(id) ?? 0,
    fallback: (source, target) => polyline([source.point, target.point], 'smoothstep'),
    render: (points) => polyline(points),
  };
  return { rects, obstacles, segments, order, context };
}

function request(
  scn: Scene,
  edgeId: string,
  source: FlowEndpoint,
  target: FlowEndpoint,
  waypoints?: FlowPoint[],
): FlowRouteRequest {
  return {
    edgeId,
    kind: 'orthogonal',
    options,
    source,
    target,
    ...(waypoints ? { waypoints } : {}),
    context: scn.context,
  };
}

/** Routes every edge in order, feeding the segment index, then nudges. */
function routeAll(
  router: OrthogonalRouter,
  scn: Scene,
  edges: ReadonlyArray<{
    id: string;
    source: FlowEndpoint;
    target: FlowEndpoint;
    waypoints?: FlowPoint[];
  }>,
): FlowRoute[] {
  scn.segments.clear();
  const routes: FlowRoute[] = [];
  for (const edge of edges) {
    const route = router.route(request(scn, edge.id, edge.source, edge.target, edge.waypoints));
    routes.push(route);
    if (!route.fallback) scn.segments.set(edge.id, route.points);
  }
  return router.nudge(routes, scn.context);
}

function segmentCrossesRect(a: FlowPoint, b: FlowPoint, rect: FlowRect): boolean {
  const x1 = rect.x;
  const x2 = rect.x + rect.width;
  const y1 = rect.y;
  const y2 = rect.y + rect.height;
  if (Math.abs(a.y - b.y) <= EPSILON) {
    if (a.y <= y1 + EPSILON || a.y >= y2 - EPSILON) return false;
    const lo = Math.min(a.x, b.x);
    const hi = Math.max(a.x, b.x);
    return Math.min(hi, x2) - Math.max(lo, x1) > EPSILON;
  }
  if (a.x <= x1 + EPSILON || a.x >= x2 - EPSILON) return false;
  const lo = Math.min(a.y, b.y);
  const hi = Math.max(a.y, b.y);
  return Math.min(hi, y2) - Math.max(lo, y1) > EPSILON;
}

function expectNoNodeCrossing(routes: readonly FlowRoute[], rects: Map<string, FlowRect>): void {
  const index = new SpatialIndex();
  for (const [id, rect] of rects) index.insert(id, rect);
  const violations: string[] = [];
  for (const route of routes) {
    if (route.fallback) continue;
    for (let at = 0; at < route.points.length - 1; at += 1) {
      const a = route.points[at]!;
      const b = route.points[at + 1]!;
      const bounds = {
        x: Math.min(a.x, b.x) - 1,
        y: Math.min(a.y, b.y) - 1,
        width: Math.abs(a.x - b.x) + 2,
        height: Math.abs(a.y - b.y) + 2,
      };
      for (const id of index.queryRect(bounds))
        if (segmentCrossesRect(a, b, rects.get(id)!))
          violations.push(`${route.edgeId} segment ${at} crosses ${id}`);
    }
  }
  expect(violations).toEqual([]);
}

interface Seg {
  edgeId: string;
  index: number;
  last: number;
  a: FlowPoint;
  b: FlowPoint;
  horizontal: boolean;
  points: readonly FlowPoint[];
}

function samePoint(a: FlowPoint, b: FlowPoint): boolean {
  return Math.abs(a.x - b.x) <= EPSILON && Math.abs(a.y - b.y) <= EPSILON;
}

/** Equal leading (or trailing) points of two polylines. */
function commonRun(a: readonly FlowPoint[], b: readonly FlowPoint[], fromEnd: boolean): number {
  const limit = Math.min(a.length, b.length);
  let count = 0;
  while (count < limit) {
    const pa = fromEnd ? a[a.length - 1 - count]! : a[count]!;
    const pb = fromEnd ? b[b.length - 1 - count]! : b[count]!;
    if (!samePoint(pa, pb)) break;
    count += 1;
  }
  return count;
}

/**
 * Edges sharing a port may overlap along their shared trunk: the identical leading (trailing)
 * segments plus the segment where they diverge. Everything else must be spread apart.
 */
function sharedTrunk(s: Seg, t: Seg): boolean {
  const prefix = commonRun(s.points, t.points, false);
  if (prefix > 0 && s.index < prefix && t.index < prefix) return true;
  const suffix = commonRun(s.points, t.points, true);
  const sFromEnd = s.points.length - 2 - s.index;
  const tFromEnd = t.points.length - 2 - t.index;
  return suffix > 0 && sFromEnd < suffix && tFromEnd < suffix;
}

function expectNoOverlaps(routes: readonly FlowRoute[]): void {
  const segments: Seg[] = [];
  for (const route of routes) {
    if (route.fallback || route.selfLoop) continue;
    for (let index = 0; index < route.points.length - 1; index += 1) {
      const a = route.points[index]!;
      const b = route.points[index + 1]!;
      segments.push({
        edgeId: route.edgeId,
        index,
        last: route.points.length - 2,
        a,
        b,
        horizontal: a.y === b.y,
        points: route.points,
      });
    }
  }
  const violations: string[] = [];
  for (let i = 0; i < segments.length; i += 1)
    for (let j = i + 1; j < segments.length; j += 1) {
      const s = segments[i]!;
      const t = segments[j]!;
      if (s.edgeId === t.edgeId || s.horizontal !== t.horizontal) continue;
      const coordS = s.horizontal ? s.a.y : s.a.x;
      const coordT = t.horizontal ? t.a.y : t.a.x;
      if (Math.abs(coordS - coordT) > EPSILON) continue;
      const [sLo, sHi] = s.horizontal
        ? [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)]
        : [Math.min(s.a.y, s.b.y), Math.max(s.a.y, s.b.y)];
      const [tLo, tHi] = t.horizontal
        ? [Math.min(t.a.x, t.b.x), Math.max(t.a.x, t.b.x)]
        : [Math.min(t.a.y, t.b.y), Math.max(t.a.y, t.b.y)];
      if (Math.min(sHi, tHi) - Math.max(sLo, tLo) <= EPSILON) continue;
      if (sharedTrunk(s, t)) continue;
      violations.push(`${s.edgeId}[${s.index}] overlaps ${t.edgeId}[${t.index}] at ${coordS}`);
    }
  expect(violations).toEqual([]);
}

/** Distance along the polyline at which `point` is met, or `-1`. */
function pathParameter(points: readonly FlowPoint[], point: FlowPoint): number {
  let travelled = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const onSegment =
      (a.x === b.x &&
        point.x === a.x &&
        point.y >= Math.min(a.y, b.y) &&
        point.y <= Math.max(a.y, b.y)) ||
      (a.y === b.y &&
        point.y === a.y &&
        point.x >= Math.min(a.x, b.x) &&
        point.x <= Math.max(a.x, b.x));
    if (onSegment) return travelled + Math.abs(point.x - a.x) + Math.abs(point.y - a.y);
    travelled += Math.abs(b.x - a.x) + Math.abs(b.y - a.y);
  }
  return -1;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function gridScene(
  rows: number,
  cols: number,
  cellWidth = 220,
  cellHeight = 150,
): { scn: Scene; edges: Array<{ id: string; source: FlowEndpoint; target: FlowEndpoint }> } {
  const rects = new Map<string, FlowRect>();
  const id = (r: number, c: number): string => `n${r}-${c}`;
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1)
      rects.set(id(r, c), { x: c * cellWidth, y: r * cellHeight, width: 120, height: 60 });
  const edges: Array<{ id: string; source: FlowEndpoint; target: FlowEndpoint }> = [];
  const connect = (from: string, to: string): void => {
    edges.push({
      id: `${from}>${to}`,
      source: endpoint(from, rects.get(from)!, 'right', 'out'),
      target: endpoint(to, rects.get(to)!, 'left', 'in'),
    });
  };
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1) {
      if (c + 1 < cols) connect(id(r, c), id(r, c + 1));
      if (r + 1 < rows && c + 1 < cols) connect(id(r, c), id(r + 1, c + 1));
      if (c % 3 === 0 && r + 2 < rows) connect(id(r, c), id(r + 2, c));
    }
  return {
    scn: scene(
      rects,
      edges.map((edge) => edge.id),
    ),
    edges,
  };
}

describe('OrthogonalRouter', () => {
  it('shortens a stub that would end inside a close neighbour instead of falling back', () => {
    // `b` sits 30 px right of `a` (closer than a stub plus the padding); the edge leaves `a`
    // to the right and turns down to `c` below. The 24 px stub would end inside `b`'s padding.
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 130, y: 0, width: 100, height: 50 }],
      ['c', { x: 0, y: 200, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const router = new OrthogonalRouter();
    const route = router.route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('c', rects.get('c')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(false);
    // The free run to `b`'s padding (118) is shorter than two stubs, so the stub takes the
    // smallest length that clears its own padding (100 + 12 + 1), leaving room for a stub from
    // `b` facing it.
    expect(route.points[1]).toEqual({ x: 113, y: 25 });
  });

  it('routes a straight connection as a single segment', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 300, y: 0, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const router = new OrthogonalRouter();
    const route = router.route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(false);
    expect(route.points).toEqual([
      { x: 100, y: 25 },
      { x: 300, y: 25 },
    ]);
    expect(route.stub).toBe(24);
    expect(route.borderRadius).toBe(8);
    expect(route.kind).toBe('orthogonal');
    expect(route.hash).toBe(routeHash('orthogonal', route.points, false, false));
  });

  it('keeps the stub out of the port and bends after it', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 300, y: 300, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const route = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.points[0]).toEqual({ x: 100, y: 25 });
    expect(route.points[1]!.y).toBe(25);
    expect(route.points[1]!.x).toBeGreaterThanOrEqual(124);
    expect(route.points[route.points.length - 1]).toEqual({ x: 300, y: 325 });
    expect(route.points[route.points.length - 2]!.x).toBeLessThanOrEqual(276);
    expectNoNodeCrossing([route], rects);
  });

  it('routes around a node in the way', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['wall', { x: 200, y: -100, width: 100, height: 250 }],
      ['b', { x: 400, y: 0, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const route = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(false);
    expect(route.points.length).toBeGreaterThanOrEqual(6);
    expectNoNodeCrossing([route], rects);
  });

  it('routes backwards connections around both nodes', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 300, y: 0, width: 100, height: 50 }],
      ['b', { x: 0, y: 0, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const route = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(false);
    expectNoNodeCrossing([route], rects);
    expect(route.points[1]!.x).toBeGreaterThanOrEqual(424);
    expect(route.points[route.points.length - 2]!.x).toBeLessThanOrEqual(-24);
  });

  it('passes waypoints in order and projects inside waypoints out of obstacles', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 600, y: 0, width: 100, height: 50 }],
      ['c', { x: 300, y: 200, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const waypoints = [
      { x: 250, y: 150 },
      { x: 450, y: 100 },
    ];
    const route = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
        waypoints,
      ),
    );
    expect(route.fallback).toBe(false);
    const first = pathParameter(route.points, { x: 250, y: 150 });
    const second = pathParameter(route.points, { x: 450, y: 100 });
    expect(first).toBeGreaterThan(0);
    expect(second).toBeGreaterThan(first);
    expectNoNodeCrossing([route], rects);
    const inside = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
        [{ x: 350, y: 240 }],
      ),
    );
    expect(inside.fallback).toBe(false);
    expect(pathParameter(inside.points, { x: 350, y: 262 })).toBeGreaterThan(0);
    expectNoNodeCrossing([inside], rects);
  });

  it('draws self-loops as a fixed loop', () => {
    const rects = new Map<string, FlowRect>([['a', { x: 100, y: 100, width: 100, height: 50 }]]);
    const scn = scene(rects);
    const router = new OrthogonalRouter();
    const rect = rects.get('a')!;
    const adjacent = router.route(
      request(scn, 'e', endpoint('a', rect, 'right'), endpoint('a', rect, 'bottom')),
    );
    expect(adjacent.selfLoop).toBe(true);
    expect(adjacent.points).toEqual([
      { x: 200, y: 125 },
      { x: 224, y: 125 },
      { x: 224, y: 174 },
      { x: 150, y: 174 },
      { x: 150, y: 150 },
    ]);
    const opposite = router.route(
      request(scn, 'e', endpoint('a', rect, 'right'), endpoint('a', rect, 'left')),
    );
    expect(opposite.selfLoop).toBe(true);
    expect(opposite.points).toEqual([
      { x: 200, y: 125 },
      { x: 224, y: 125 },
      { x: 224, y: 76 },
      { x: 76, y: 76 },
      { x: 76, y: 125 },
      { x: 100, y: 125 },
    ]);
    const same = router.route(
      request(
        scn,
        'e',
        endpoint('a', rect, 'right', 'p', 0.25),
        endpoint('a', rect, 'right', 'q', 0.75),
      ),
    );
    expect(same.points).toEqual([
      { x: 200, y: 112.5 },
      { x: 224, y: 112.5 },
      { x: 224, y: 137.5 },
      { x: 200, y: 137.5 },
    ]);
    expectNoNodeCrossing([adjacent, opposite, same], rects);
  });

  it('falls back to the injected smoothstep when an exit is enclosed', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['cage', { x: 100, y: -50, width: 60, height: 150 }],
      ['b', { x: 400, y: 0, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const router = new OrthogonalRouter({ maxRegionGrowth: 1 });
    const route = router.route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(true);
    expect(route.kind).toBe('smoothstep');
    expect(route.selfLoop).toBe(false);
    expect(route.stub).toBe(0);
  });

  it('routes free endpoints without a stub (connection line preview)', () => {
    const rects = new Map<string, FlowRect>([['a', { x: 0, y: 0, width: 100, height: 50 }]]);
    const scn = scene(rects);
    const free: FlowEndpoint = {
      point: { x: 300, y: 200 },
      side: 'left',
      nodeId: '',
      portId: undefined,
      rect: { x: 300, y: 200, width: 0, height: 0 },
    };
    expect(exitPoint(free, 24)).toBe(free.point);
    const route = new OrthogonalRouter().route(
      request(scn, 'preview', endpoint('a', rects.get('a')!, 'right'), free),
    );
    expect(route.fallback).toBe(false);
    expect(route.points[route.points.length - 1]).toEqual({ x: 300, y: 200 });
  });

  it('grows the region when the first one is too tight', () => {
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 300, y: 0, width: 100, height: 50 }],
      ['top', { x: -150, y: -400, width: 700, height: 300 }],
      ['bottom', { x: -150, y: 150, width: 700, height: 300 }],
      ['wall', { x: 180, y: -110, width: 40, height: 270 }],
    ]);
    const scn = scene(rects);
    const route = new OrthogonalRouter().route(
      request(
        scn,
        'e',
        endpoint('a', rects.get('a')!, 'right'),
        endpoint('b', rects.get('b')!, 'left'),
      ),
    );
    expect(route.fallback).toBe(false);
    expectNoNodeCrossing([route], rects);
  });

  it('honours option overrides and the padding floor on the stub', () => {
    const router = new OrthogonalRouter({ bendPenalty: 5, stub: 4 });
    expect(router.options.bendPenalty).toBe(5);
    expect(router.options.nodePadding).toBe(12);
    const rects = new Map<string, FlowRect>([
      ['a', { x: 0, y: 0, width: 100, height: 50 }],
      ['b', { x: 300, y: 200, width: 100, height: 50 }],
    ]);
    const scn = scene(rects);
    const rq = request(
      scn,
      'e',
      endpoint('a', rects.get('a')!, 'right'),
      endpoint('b', rects.get('b')!, 'left'),
    );
    expect(router.stubLength({ ...rq, options: { ...options, stub: 0 } })).toBe(12);
    expect(router.stubLength({ ...rq, options: { ...options, stub: 40 } })).toBe(40);
  });

  describe('invariants over a 10×10 node grid', () => {
    const { scn, edges } = gridScene(10, 10);
    const router = new OrthogonalRouter();
    const routes = routeAll(router, scn, edges);

    it('routes every edge orthogonally', () => {
      expect(routes.length).toBe(edges.length);
      expect(routes.filter((route) => route.fallback)).toEqual([]);
      for (const route of routes)
        for (let index = 0; index < route.points.length - 1; index += 1) {
          const a = route.points[index]!;
          const b = route.points[index + 1]!;
          expect(a.x === b.x || a.y === b.y).toBe(true);
        }
    });

    it('never crosses a node rect except at its endpoints', () => {
      expectNoNodeCrossing(routes, scn.rects);
    });

    it('has no colinear overlaps between different edges after nudging, except shared port trunks', () => {
      expectNoOverlaps(routes);
    });

    it('is deterministic across runs', () => {
      const again = routeAll(new OrthogonalRouter(), scn, edges);
      expect(again.map((route) => route.hash)).toEqual(routes.map((route) => route.hash));
      expect(again.map((route) => route.d)).toEqual(routes.map((route) => route.d));
    });
  });

  describe('invariants over seeded random DAGs', () => {
    for (const seed of [1, 7, 42]) {
      it(`seed ${seed}`, () => {
        const next = random(seed);
        const rects = new Map<string, FlowRect>();
        const count = 48;
        const cols = 8;
        for (let index = 0; index < count; index += 1) {
          const col = index % cols;
          const row = Math.floor(index / cols);
          rects.set(`n${index}`, {
            x: col * 240 + Math.floor(next() * 40),
            y: row * 170 + Math.floor(next() * 40),
            width: 100 + Math.floor(next() * 40),
            height: 40 + Math.floor(next() * 30),
          });
        }
        const edges: Array<{ id: string; source: FlowEndpoint; target: FlowEndpoint }> = [];
        for (let index = 0; index < count; index += 1) {
          const links = 1 + Math.floor(next() * 2);
          for (let link = 0; link < links; link += 1) {
            const target = index + 1 + Math.floor(next() * Math.min(10, count - index - 1));
            if (target >= count || target === index) continue;
            const id = `e${index}-${target}-${link}`;
            edges.push({
              id,
              source: endpoint(`n${index}`, rects.get(`n${index}`)!, 'right', 'out'),
              target: endpoint(`n${target}`, rects.get(`n${target}`)!, 'left', 'in'),
            });
          }
        }
        const scn = scene(
          rects,
          edges.map((edge) => edge.id),
        );
        const routes = routeAll(new OrthogonalRouter(), scn, edges);
        expect(routes.filter((route) => route.fallback)).toEqual([]);
        expectNoNodeCrossing(routes, rects);
        expectNoOverlaps(routes);
        const again = routeAll(new OrthogonalRouter(), scn, edges);
        expect(again.map((route) => route.hash)).toEqual(routes.map((route) => route.hash));
      });
    }
  });

  it.skipIf(!process.env.FLOW_PERF)(
    'routes 1000 nodes / 1500 edges within budget (FLOW_PERF)',
    () => {
      const next = random(3);
      const rects = new Map<string, FlowRect>();
      const count = 1000;
      const cols = 40;
      for (let index = 0; index < count; index += 1) {
        const col = index % cols;
        const row = Math.floor(index / cols);
        rects.set(`n${index}`, {
          x: col * 240 + Math.floor(next() * 40),
          y: row * 170 + Math.floor(next() * 40),
          width: 120,
          height: 60,
        });
      }
      const edges: Array<{ id: string; source: FlowEndpoint; target: FlowEndpoint }> = [];
      while (edges.length < 1500) {
        const index = Math.floor(next() * (count - 1));
        const target = index + 1 + Math.floor(next() * Math.min(45, count - index - 1));
        if (target >= count) continue;
        const id = `e${edges.length}`;
        edges.push({
          id,
          source: endpoint(`n${index}`, rects.get(`n${index}`)!, 'right', 'out'),
          target: endpoint(`n${target}`, rects.get(`n${target}`)!, 'left', 'in'),
        });
      }
      const scn = scene(
        rects,
        edges.map((edge) => edge.id),
      );
      const router = new OrthogonalRouter();
      const start = performance.now();
      const routes = routeAll(router, scn, edges);
      const elapsed = performance.now() - start;
      const fallbacks = routes.filter((route) => route.fallback).length;
      process.stdout.write(
        `[FLOW_PERF] router: 1000 nodes / 1500 edges routed + nudged in ${elapsed.toFixed(1)} ms (${fallbacks} fallbacks)\n`,
      );
      expect(fallbacks).toBe(0);
      expectNoNodeCrossing(routes, rects);
      expect(elapsed).toBeLessThan(5000);
    },
  );
});
