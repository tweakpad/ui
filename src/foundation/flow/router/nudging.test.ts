import { describe, expect, it } from 'vitest';
import type { FlowEdgePath } from '../edges/paths.js';
import type { FlowEdgeKind, FlowPoint } from '../types.js';
import { nudgeAxis, nudgeItems, nudgeRoutes, splitStubs } from './nudging.js';
import { ObstacleIndex } from './obstacles.js';
import { routeHash } from './orthogonal-router.js';
import type { FlowRoute, FlowRouteContext } from './types.js';

function polyline(points: readonly FlowPoint[], kind: FlowEdgeKind = 'orthogonal'): FlowEdgePath {
  const copy = points.map((point) => ({ x: point.x, y: point.y }));
  let length = 0;
  for (let index = 1; index < copy.length; index += 1)
    length +=
      Math.abs(copy[index]!.x - copy[index - 1]!.x) + Math.abs(copy[index]!.y - copy[index - 1]!.y);
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

function route(edgeId: string, points: FlowPoint[], stub = 24): FlowRoute {
  const path = polyline(points);
  return {
    ...path,
    edgeId,
    fallback: false,
    selfLoop: false,
    borderRadius: 8,
    stub,
    hash: routeHash('orthogonal', path.points, false, false),
  };
}

function context(
  obstacles = new ObstacleIndex(12),
  order = new Map<string, number>(),
): FlowRouteContext {
  return {
    obstacles,
    segments: undefined,
    edgeSpacing: 12,
    nodePadding: 12,
    order: (id) => order.get(id) ?? 0,
    fallback: (source, target) => polyline([source.point, target.point], 'smoothstep'),
    render: (points) => polyline(points),
  };
}

describe('splitStubs', () => {
  it('inserts the exit points when a run continues past the stub', () => {
    const points = splitStubs(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 200, y: 100 },
      ],
      24,
    );
    expect(points).toEqual([
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 176, y: 100 },
      { x: 200, y: 100 },
    ]);
    expect(
      splitStubs(
        [
          { x: 0, y: 0 },
          { x: 24, y: 0 },
          { x: 24, y: 24 },
        ],
        24,
      ),
    ).toHaveLength(3);
    expect(
      splitStubs(
        [
          { x: 0, y: 0 },
          { x: 24, y: 0 },
          { x: 24, y: 100 },
        ],
        24,
      ),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 24, y: 0 },
      { x: 24, y: 76 },
      { x: 24, y: 100 },
    ]);
  });
});

describe('nudgeAxis', () => {
  it('stacks a long run against a row of short ones in two lanes, not one lane each', () => {
    // A corridor 40 px tall between two obstacle rows: a wrap-around run spans it and six
    // short runs that do not overlap each other share its line. One lane per member (seven)
    // cannot fit; two lanes can.
    const obstacles = new ObstacleIndex(0);
    obstacles.set('top', { x: -100, y: 0, width: 2000, height: 80 });
    obstacles.set('bottom', { x: -100, y: 120, width: 2000, height: 80 });
    const long = route('long', [
      { x: 1700, y: 40 },
      { x: 1700, y: 100 },
      { x: 0, y: 100 },
      { x: 0, y: 160 },
    ]);
    const shorts = Array.from({ length: 6 }, (_, index) =>
      route(`short${index}`, [
        { x: 250 * index + 200, y: 40 },
        { x: 250 * index + 200, y: 100 },
        { x: 250 * index + 20, y: 100 },
        { x: 250 * index + 20, y: 160 },
      ]),
    );
    const items = nudgeItems([long, ...shorts]);
    nudgeAxis(items, 'y', context(obstacles));
    const runY = (index: number): number => {
      const points = items[index]!.points;
      for (let at = 1; at < points.length; at += 1)
        if (points[at]!.y === points[at - 1]!.y && Math.abs(points[at]!.x - points[at - 1]!.x) > 50)
          return points[at]!.y;
      return Number.NaN;
    };
    const longY = runY(0);
    for (let index = 1; index <= 6; index += 1) {
      expect(Math.abs(runY(index) - longY)).toBeGreaterThanOrEqual(12 - 1e-6);
      expect(runY(index)).toBeGreaterThan(80);
      expect(runY(index)).toBeLessThan(120);
    }
  });

  it('spreads two overlapping vertical runs by the edge spacing', () => {
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ]);
    const b = route('b', [
      { x: 0, y: 300 },
      { x: 100, y: 300 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);
    const items = nudgeItems([a, b]);
    const moved = nudgeAxis(items, 'x', context());
    expect([...moved].sort()).toEqual([0, 1]);
    const xa = items[0]!.points.find((point) => point.y === 150)?.x ?? items[0]!.points[2]!.x;
    const xb = items[1]!.points[2]!.x;
    expect(Math.abs(xa - xb)).toBeCloseTo(12);
    expect(items[0]!.points[0]).toEqual({ x: 0, y: 0 });
    expect(items[0]!.points[items[0]!.points.length - 1]).toEqual({ x: 200, y: 200 });
  });

  it('orders lanes by the connecting legs so the routes do not cross', () => {
    // `left` comes from and goes to the left, `right` from and to the right.
    const left = route('left', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ]);
    const right = route('right', [
      { x: 200, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 150 },
      { x: 200, y: 150 },
    ]);
    const items = nudgeItems([right, left]);
    nudgeAxis(items, 'x', context());
    const rightX = items[0]!.points[2]!.x;
    const leftX = items[1]!.points[2]!.x;
    expect(leftX).toBeLessThan(rightX);
  });

  it('keeps stubs fixed and jogs a straight continuation at the exit', () => {
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 200, y: 0 },
      { x: 200, y: 100 },
    ]);
    const b = route('b', [
      { x: 50, y: 100 },
      { x: 50, y: 0 },
      { x: 300, y: 0 },
      { x: 300, y: 100 },
    ]);
    const items = nudgeItems([a, b]);
    const moved = nudgeAxis(items, 'y', context());
    expect(moved.size).toBeGreaterThan(0);
    // The stub of `a` (0,0 → 24,0) never moves.
    expect(items[0]!.points[0]).toEqual({ x: 0, y: 0 });
    expect(items[0]!.points[1]).toEqual({ x: 24, y: 0 });
    const horizontalYs = (points: FlowPoint[]): number[] =>
      points.slice(1).flatMap((point, index) => (point.y === points[index]!.y ? [point.y] : []));
    const ya = horizontalYs(items[0]!.points).filter((y) => y !== 0);
    const yb = horizontalYs(items[1]!.points);
    expect(new Set([...ya, ...yb]).size).toBeGreaterThan(1);
    expect(ya.every((y) => !yb.includes(y)) || yb.every((y) => !ya.includes(y))).toBe(true);
  });

  it('stays inside the corridor between obstacles', () => {
    const obstacles = new ObstacleIndex(12);
    obstacles.set('wall', { x: 112, y: 0, width: 100, height: 300 });
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 0, y: 200 },
    ]);
    const b = route('b', [
      { x: 0, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 150 },
      { x: 0, y: 150 },
    ]);
    const items = nudgeItems([a, b]);
    nudgeAxis(items, 'x', { ...context(obstacles) });
    for (const item of items)
      for (const point of item.points) expect(point.x).toBeLessThanOrEqual(100);
    expect(items[0]!.points[2]!.x).not.toBe(items[1]!.points[2]!.x);
  });

  it('lets lanes into half the padding when the padded corridor is too narrow', () => {
    // Two nodes 28 px apart: the padded corridor between them is 4 px wide.
    const obstacles = new ObstacleIndex(12);
    obstacles.set('left', { x: 0, y: 0, width: 100, height: 300 });
    obstacles.set('right', { x: 128, y: 0, width: 100, height: 300 });
    const a = route('a', [
      { x: 400, y: -100 },
      { x: 114, y: -100 },
      { x: 114, y: 400 },
      { x: 400, y: 400 },
    ]);
    const b = route('b', [
      { x: 400, y: -50 },
      { x: 114, y: -50 },
      { x: 114, y: 350 },
      { x: 400, y: 350 },
    ]);
    const items = nudgeItems([a, b]);
    nudgeAxis(items, 'x', context(obstacles));
    const xa = items[0]!.points[2]!.x;
    const xb = items[1]!.points[2]!.x;
    expect(Math.abs(xa - xb)).toBeGreaterThanOrEqual(6);
    for (const x of [xa, xb]) {
      expect(x).toBeGreaterThanOrEqual(100 + 6);
      expect(x).toBeLessThanOrEqual(128 - 6);
    }
  });

  it('never moves a run that is already inside a padding deeper toward the node', () => {
    // Runs 6 px into the node's top padding (a relaxed lane from an earlier round) whose legs
    // run down past the node: the obstacle still bounds them, so the spread goes up.
    const obstacles = new ObstacleIndex(12);
    obstacles.set('node', { x: 100, y: 100, width: 200, height: 100 });
    const a = route('a', [
      { x: 0, y: 400 },
      { x: 0, y: 94 },
      { x: 400, y: 94 },
      { x: 400, y: 400 },
    ]);
    const b = route('b', [
      { x: 50, y: 400 },
      { x: 50, y: 94 },
      { x: 350, y: 94 },
      { x: 350, y: 400 },
    ]);
    const items = nudgeItems([a, b]);
    nudgeAxis(items, 'y', context(obstacles));
    const runY = (points: FlowPoint[]): number =>
      points.find((point, index) => index > 0 && point.y === points[index + 1]?.y)!.y;
    const ya = runY(items[0]!.points);
    const yb = runY(items[1]!.points);
    expect(Math.abs(ya - yb)).toBeGreaterThanOrEqual(6);
    expect(Math.max(ya, yb)).toBeLessThanOrEqual(94);
  });

  it('moves a lone run clear of a neighbour a pixel away', () => {
    // Coordinates from different sources (a midline, a port exit) leave two runs 1 px apart:
    // not one channel, but one line on screen.
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 300 },
      { x: 200, y: 300 },
    ]);
    const b = route('b', [
      { x: 0, y: 50 },
      { x: 101, y: 50 },
      { x: 101, y: 250 },
      { x: 200, y: 250 },
    ]);
    const items = nudgeItems([a, b]);
    nudgeAxis(items, 'x', context());
    const xa = items[0]!.points[2]!.x;
    const xb = items[1]!.points[2]!.x;
    expect(Math.abs(xa - xb)).toBeGreaterThanOrEqual(6);
  });

  it('does not move a lone run where its stretched leg would lie along another edge', () => {
    // `b`'s run sits 1 px left of `a`'s and its legs go right. The nearest clear spot is 11 px
    // left, but that stretches `b`'s lower leg along `c`; it moves right instead.
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 300 },
      { x: 0, y: 300 },
    ]);
    const b = route('b', [
      { x: 300, y: 50 },
      { x: 99, y: 50 },
      { x: 99, y: 200 },
      { x: 300, y: 200 },
    ]);
    const c = route('c', [
      { x: 80, y: 200 },
      { x: 95, y: 200 },
    ]);
    const items = nudgeItems([a, b, c]);
    nudgeAxis(items, 'x', context());
    const runA = items[0]!.points[2]!.x;
    // Points after the stub split: exit, run start, run end, exit.
    const runB = items[1]!.points[2]!.x;
    expect(items[1]!.points[3]!.x).toBe(runB);
    expect(runB).toBeGreaterThan(95);
    expect(Math.abs(runA - runB)).toBeGreaterThanOrEqual(6);
  });

  it('shrinks the spacing when a leg cannot take the full spread', () => {
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 30, y: 0 },
      { x: 30, y: 200 },
      { x: 200, y: 200 },
    ]);
    const b = route('b', [
      { x: 0, y: 300 },
      { x: 30, y: 300 },
      { x: 30, y: 100 },
      { x: 200, y: 100 },
    ]);
    const items = nudgeItems([a, b]);
    nudgeAxis(items, 'x', context());
    // The 6-unit leg past the exit can shrink to zero but never reverse: the run may move
    // 6 left (joining the exit) and freely right.
    const runX = (points: FlowPoint[]): number =>
      points.find((point, index) => index > 0 && point.x === points[index + 1]?.x)!.x;
    for (const item of items) expect(item.points[1]).toEqual({ x: 24, y: item.points[0]!.y });
    expect(runX(items[0]!.points)).toBeGreaterThanOrEqual(24);
    expect(runX(items[1]!.points)).toBeGreaterThanOrEqual(24);
    expect(runX(items[0]!.points)).not.toBe(runX(items[1]!.points));
  });
});

describe('nudgeRoutes', () => {
  it('keeps untouched routes by identity and re-hashes moved ones', () => {
    const a = route('a', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 200 },
      { x: 200, y: 200 },
    ]);
    const b = route('b', [
      { x: 0, y: 300 },
      { x: 100, y: 300 },
      { x: 100, y: 100 },
      { x: 200, y: 100 },
    ]);
    const lonely = route('lonely', [
      { x: 500, y: 500 },
      { x: 600, y: 500 },
    ]);
    const fallback: FlowRoute = {
      ...route('fallback', [
        { x: 100, y: -50 },
        { x: 100, y: 400 },
      ]),
      fallback: true,
    };
    const result = nudgeRoutes([a, b, lonely, fallback], context());
    expect(result[2]).toBe(lonely);
    expect(result[3]).toBe(fallback);
    expect(result[0]).not.toBe(a);
    expect(result[0]!.hash).not.toBe(a.hash);
    expect(result[0]!.d).not.toBe(a.d);
    expect(result[0]!.points[0]).toEqual({ x: 0, y: 0 });
  });
});
