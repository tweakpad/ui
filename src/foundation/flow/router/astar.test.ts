import { describe, expect, it } from 'vitest';
import {
  DOWN,
  LEFT,
  RIGHT,
  UP,
  astarRoute,
  directionBetween,
  directionOfSide,
  simplifyOrthogonal,
} from './astar.js';
import { GridPool, buildRoutingGrid, gridPoint, gridVertex, type RoutingGrid } from './grid.js';
import { ObstacleIndex } from './obstacles.js';
import { SegmentIndex } from './segments.js';

const costs = { bend: 30, hug: 4, crossing: 10, overlap: 20 };
const region = { x: 0, y: 0, width: 400, height: 400 };

function route(
  grid: RoutingGrid,
  from: { x: number; y: number },
  to: { x: number; y: number },
  startDirection = -1,
  goalDirection = -1,
  pool = new GridPool(),
): Array<{ x: number; y: number }> | undefined {
  const path = astarRoute(
    grid,
    { start: gridVertex(grid, from), startDirection, goal: gridVertex(grid, to), goalDirection },
    costs,
    pool,
  );
  return path && simplifyOrthogonal(path.map((vertex) => gridPoint(grid, vertex)));
}

describe('astarRoute', () => {
  it('routes straight when nothing is in the way', () => {
    const grid = buildRoutingGrid(new ObstacleIndex(0), region, [
      { x: 50, y: 50 },
      { x: 350, y: 50 },
    ])!;
    expect(route(grid, { x: 50, y: 50 }, { x: 350, y: 50 })).toEqual([
      { x: 50, y: 50 },
      { x: 350, y: 50 },
    ]);
  });

  it('detours around an obstacle without entering it', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 150, y: 0, width: 100, height: 100 });
    const grid = buildRoutingGrid(obstacles, region, [
      { x: 50, y: 50 },
      { x: 350, y: 50 },
    ])!;
    const points = route(grid, { x: 50, y: 50 }, { x: 350, y: 50 })!;
    expect(points[0]).toEqual({ x: 50, y: 50 });
    expect(points[points.length - 1]).toEqual({ x: 350, y: 50 });
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index]!;
      const b = points[index + 1]!;
      if (a.y === b.y) {
        expect(a.y > 0 && a.y < 100 && Math.min(b.x, a.x) < 250 && Math.max(a.x, b.x) > 150).toBe(
          false,
        );
      }
    }
    expect(points.length).toBeGreaterThanOrEqual(4);
  });

  it('prefers the midline over hugging a padded boundary', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 100, y: 0, width: 200, height: 100 });
    obstacles.set('b', { x: 100, y: 200, width: 200, height: 100 });
    const grid = buildRoutingGrid(
      obstacles,
      region,
      [
        { x: 50, y: 150 },
        { x: 350, y: 150 },
      ],
      { midlines: true },
    )!;
    const points = route(grid, { x: 50, y: 150 }, { x: 350, y: 150 })!;
    expect(points).toEqual([
      { x: 50, y: 150 },
      { x: 350, y: 150 },
    ]);
    const hugged = route(grid, { x: 50, y: 100 }, { x: 350, y: 100 })!;
    // Leaving the boundary costs two bends (60) against hugging 2 grid edges (8): hugging wins.
    expect(hugged).toEqual([
      { x: 50, y: 100 },
      { x: 350, y: 100 },
    ]);
  });

  it('pays for crossings and overlaps of already routed segments', () => {
    const segments = new SegmentIndex();
    segments.set('busy', [
      { x: 0, y: 150 },
      { x: 400, y: 150 },
    ]);
    const obstacles = new ObstacleIndex(0);
    const anchors = [50, 100, 150, 200, 250, 300, 350].map((x) => ({ x, y: 140 }));
    const grid = buildRoutingGrid(
      obstacles,
      region,
      [{ x: 50, y: 150 }, { x: 350, y: 150 }, ...anchors],
      {
        segments,
      },
    )!;
    const points = route(grid, { x: 50, y: 150 }, { x: 350, y: 150 })!;
    // Overlapping twelve grid edges of the busy run costs 240; the detour over y=140 costs
    // two bends (60) plus 20 units of length.
    expect(points.length).toBe(4);
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index]!;
      const b = points[index + 1]!;
      if (a.y === b.y) expect(a.y).not.toBe(150);
    }
    const crossing = route(grid, { x: 200, y: 140 }, { x: 200, y: 150 })!;
    expect(crossing).toEqual([
      { x: 200, y: 140 },
      { x: 200, y: 150 },
    ]);
  });

  it('honours the start and goal directions', () => {
    const grid = buildRoutingGrid(new ObstacleIndex(0), region, [
      { x: 100, y: 100 },
      { x: 300, y: 300 },
    ])!;
    const down = route(grid, { x: 100, y: 100 }, { x: 300, y: 300 }, DOWN, RIGHT)!;
    expect(down[1]!.x).toBe(100);
    expect(down[down.length - 2]!.y).toBe(300);
    const right = route(grid, { x: 100, y: 100 }, { x: 300, y: 300 }, RIGHT, DOWN)!;
    expect(right[1]!.y).toBe(100);
    expect(right[right.length - 2]!.x).toBe(300);
  });

  it('never reverses in place at the goal', () => {
    const grid = buildRoutingGrid(new ObstacleIndex(0), region, [
      { x: 100, y: 100 },
      { x: 300, y: 100 },
    ])!;
    const points = route(grid, { x: 100, y: 100 }, { x: 300, y: 100 }, RIGHT, LEFT)!;
    // The stub leaves the goal moving left, so arriving while moving right is forbidden; the
    // search arrives perpendicular (one bend) instead of reversing in place.
    for (let index = 0; index < points.length - 1; index += 1)
      expect(directionBetween(points[index]!, points[index + 1]!)).not.toBe(-1);
    expect(directionBetween(points[points.length - 2]!, points[points.length - 1]!)).not.toBe(
      RIGHT,
    );
    // Two equally cheap shapes exist (one or two bends before the goal); never more.
    expect(points.length).toBeLessThanOrEqual(5);
  });

  it('returns undefined when the goal is enclosed', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('wall', { x: 150, y: 150, width: 100, height: 100 });
    const grid = buildRoutingGrid(obstacles, region, [
      { x: 50, y: 50 },
      { x: 200, y: 200 },
    ])!;
    expect(route(grid, { x: 50, y: 50 }, { x: 200, y: 200 })).toBeUndefined();
  });

  it('is deterministic for symmetric alternatives', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 150, y: 150, width: 100, height: 100 });
    const pool = new GridPool();
    const results = new Set<string>();
    for (let run = 0; run < 5; run += 1) {
      const grid = buildRoutingGrid(
        obstacles,
        region,
        [
          { x: 50, y: 200 },
          { x: 350, y: 200 },
        ],
        { pool },
      )!;
      results.add(
        JSON.stringify(route(grid, { x: 50, y: 200 }, { x: 350, y: 200 }, RIGHT, RIGHT, pool)),
      );
    }
    expect(results.size).toBe(1);
  });

  it('maps sides to directions', () => {
    expect(directionOfSide('right')).toBe(RIGHT);
    expect(directionOfSide('bottom')).toBe(DOWN);
    expect(directionOfSide('left')).toBe(LEFT);
    expect(directionOfSide('top')).toBe(UP);
    expect(directionBetween({ x: 0, y: 0 }, { x: 0, y: -5 })).toBe(UP);
    expect(directionBetween({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(-1);
  });
});

describe('simplifyOrthogonal', () => {
  it('merges same-direction runs and drops duplicates', () => {
    expect(
      simplifyOrthogonal([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 10 },
        { x: 20, y: 30 },
      ]),
    ).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 30 },
    ]);
  });

  it('keeps reversals', () => {
    expect(
      simplifyOrthogonal([
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toHaveLength(3);
  });
});
