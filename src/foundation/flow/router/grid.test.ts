import { describe, expect, it } from 'vitest';
import {
  GridPool,
  buildRoutingGrid,
  coordinateIndex,
  gridPoint,
  gridVertex,
  lowerBound,
  upperBound,
} from './grid.js';
import { ObstacleIndex } from './obstacles.js';
import { SegmentIndex } from './segments.js';

const region = { x: 0, y: 0, width: 300, height: 300 };

describe('routing grid', () => {
  it('searches sorted coordinates', () => {
    const values = [0, 10, 20, 30];
    expect(lowerBound(values, 10)).toBe(1);
    expect(lowerBound(values, 11)).toBe(2);
    expect(upperBound(values, 10)).toBe(2);
    expect(upperBound(values, 35)).toBe(4);
    expect(coordinateIndex(values, 20)).toBe(2);
    expect(coordinateIndex(values, 21)).toBe(-1);
  });

  it('flags edges inside an obstacle as blocked and boundary edges as hugging', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 100, y: 100, width: 100, height: 100 });
    const grid = buildRoutingGrid(obstacles, region, [], { midlines: false })!;
    expect(grid.xs).toEqual([0, 100, 200, 300]);
    expect(grid.ys).toEqual([0, 100, 200, 300]);
    const vertex = (x: number, y: number): number => gridVertex(grid, { x, y });
    // Horizontal edge along the top boundary hugs; nothing inside is blocked horizontally
    // because the obstacle spans exactly one cell.
    expect(grid.hugH[vertex(100, 100)]).toBe(1);
    expect(grid.hugH[vertex(100, 200)]).toBe(1);
    expect(grid.blockedH[vertex(100, 100)]).toBe(0);
    expect(grid.hugV[vertex(100, 100)]).toBe(1);
    expect(grid.hugV[vertex(200, 100)]).toBe(1);
    expect(grid.hugH[vertex(0, 100)]).toBe(0);
    expect(gridPoint(grid, vertex(200, 100))).toEqual({ x: 200, y: 100 });
  });

  it('blocks interior grid lines of an obstacle', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 100, y: 100, width: 100, height: 100 });
    const grid = buildRoutingGrid(obstacles, region, [{ x: 150, y: 150 }], { midlines: false })!;
    const vertex = (x: number, y: number): number => gridVertex(grid, { x, y });
    expect(grid.blockedH[vertex(100, 150)]).toBe(1);
    expect(grid.blockedH[vertex(150, 150)]).toBe(1);
    expect(grid.blockedV[vertex(150, 100)]).toBe(1);
    expect(grid.blockedV[vertex(150, 150)]).toBe(1);
    expect(grid.hugH[vertex(100, 150)]).toBe(0);
    expect(grid.hugV[vertex(100, 150)]).toBe(1);
  });

  it('clips obstacles that extend beyond the region', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: -100, y: 100, width: 250, height: 100 });
    const grid = buildRoutingGrid(obstacles, region, [{ x: 0, y: 150 }], { midlines: false })!;
    const vertex = (x: number, y: number): number => gridVertex(grid, { x, y });
    expect(grid.blockedH[vertex(0, 150)]).toBe(1);
    expect(grid.blockedV[vertex(0, 100)]).toBe(1);
  });

  it('rasterizes crossing and overlap counts from the segment index', () => {
    const obstacles = new ObstacleIndex(0);
    const segments = new SegmentIndex();
    segments.set('other', [
      { x: 150, y: 50 },
      { x: 150, y: 250 },
      { x: 250, y: 250 },
    ]);
    segments.set('self', [
      { x: 0, y: 20 },
      { x: 300, y: 20 },
    ]);
    const grid = buildRoutingGrid(
      obstacles,
      region,
      [
        { x: 100, y: 100 },
        { x: 150, y: 250 },
        { x: 250, y: 250 },
      ],
      {
        midlines: false,
        segments,
        excludeEdge: 'self',
      },
    )!;
    const vertex = (x: number, y: number): number => gridVertex(grid, { x, y });
    expect(grid.crossH).toBeDefined();
    // Horizontal grid edge from x=100 to x=150 at y=100 crosses the vertical run at x=150? No:
    // the run is on the line x=150, the edge ending there touches, so the crossing lies on
    // the edge from 100 to 250 only when 150 is strictly inside.
    expect(grid.crossH![vertex(100, 100)]).toBe(0);
    expect(grid.overlapV![vertex(150, 100)]).toBe(1);
    expect(grid.overlapH![vertex(150, 250)]).toBe(1);
    expect(grid.crossV![vertex(0, 0)]).toBe(0);
  });

  it('honours the vertex cap and reuses pooled arrays', () => {
    const obstacles = new ObstacleIndex(0);
    for (let index = 0; index < 20; index += 1)
      obstacles.set(`n${index}`, { x: index * 10, y: index * 10, width: 5, height: 5 });
    expect(buildRoutingGrid(obstacles, region, [], { maxVertices: 10 })).toBeUndefined();
    const pool = new GridPool();
    const first = buildRoutingGrid(obstacles, region, [], { pool, midlines: false })!;
    const second = buildRoutingGrid(obstacles, { x: 0, y: 0, width: 50, height: 50 }, [], {
      pool,
      midlines: false,
    })!;
    expect(second.blockedH).toBe(first.blockedH);
    expect(second.vertices).toBeLessThan(first.vertices);
  });
});
