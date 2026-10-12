import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_KIND_OPTIONS } from '../defaults.js';
import {
  closestPointOnSegment,
  distanceToPolyline,
  distanceToSegment,
  hitTestPath,
  hitTestPaths,
} from './hit-test.js';
import { bezierPath, orthogonalPath } from './paths.js';

describe('edge hit testing', () => {
  it('measures distance to segments', () => {
    expect(distanceToSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(distanceToSegment({ x: 15, y: 0 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toBe(5);
    expect(closestPointOnSegment({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 0 })).toEqual({
      point: { x: 5, y: 0 },
      t: 0.5,
    });
    expect(closestPointOnSegment({ x: 5, y: 5 }, { x: 2, y: 2 }, { x: 2, y: 2 })).toEqual({
      point: { x: 2, y: 2 },
      t: 0,
    });
  });

  it('finds the nearest polyline segment', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
    ];
    const hit = distanceToPolyline({ x: 104, y: 50 }, points);
    expect(hit).toEqual({ distance: 4, point: { x: 100, y: 50 }, segment: 1, t: 0.5 });
    expect(distanceToPolyline({ x: 1, y: 1 }, []).distance).toBe(Infinity);
    expect(distanceToPolyline({ x: 3, y: 4 }, [{ x: 0, y: 0 }]).distance).toBe(5);
  });

  it('hit tests paths with a zoom-scaled tolerance', () => {
    const path = orthogonalPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
      ],
      0,
    );
    expect(hitTestPath(path, { x: 50, y: 8 }, 10).hit).toBe(true);
    expect(hitTestPath(path, { x: 50, y: 12 }, 10).hit).toBe(false);
    // At zoom 2 the same 10 screen pixels reach only 5 flow units.
    expect(hitTestPath(path, { x: 50, y: 8 }, 10, 2).hit).toBe(false);
    expect(hitTestPath(path, { x: 50, y: 4 }, 10, 2).hit).toBe(true);
    expect(hitTestPath(path, { x: 500, y: 500 }, 10).distance).toBe(Infinity);
  });

  it('flattens bezier paths for hit tests', () => {
    const path = bezierPath(
      { point: { x: 0, y: 0 }, side: 'right' },
      { point: { x: 100, y: 100 }, side: 'left' },
      DEFAULT_EDGE_KIND_OPTIONS.bezier,
    );
    expect(hitTestPath(path, { x: 50, y: 50 }, 2).hit).toBe(true);
    expect(hitTestPath(path, { x: 50, y: 10 }, 2).hit).toBe(false);
  });

  it('returns the nearest of several paths', () => {
    const near = orthogonalPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      0,
    );
    const far = orthogonalPath(
      [
        { x: 0, y: 20 },
        { x: 100, y: 20 },
      ],
      0,
    );
    const best = hitTestPaths<string>(
      [
        ['far', far],
        ['near', near],
      ],
      { x: 50, y: 5 },
      20,
    );
    expect(best?.id).toBe('near');
    expect(hitTestPaths<string>([['far', far]], { x: 50, y: 500 }, 20)).toBeUndefined();
  });
});
