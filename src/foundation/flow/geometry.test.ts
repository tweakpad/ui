import { describe, expect, it } from 'vitest';
import {
  clampPointToExtent,
  distanceToRect,
  expandRect,
  overlapArea,
  rectContains,
  rectHash,
  rectsIntersect,
  sideNormal,
  sideOf,
  snapPoint,
  unionRects,
} from './geometry.js';

describe('flow geometry', () => {
  it('unions and intersects rects', () => {
    const union = unionRects([
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 20, y: -5, width: 5, height: 5 },
    ]);
    expect(union).toEqual({ x: 0, y: -5, width: 25, height: 15 });
    expect(
      rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 9, y: 9, width: 5, height: 5 }),
    ).toBe(true);
    expect(
      rectsIntersect({ x: 0, y: 0, width: 10, height: 10 }, { x: 10, y: 0, width: 5, height: 5 }),
    ).toBe(false);
    expect(
      rectContains({ x: 0, y: 0, width: 10, height: 10 }, { x: 2, y: 2, width: 3, height: 3 }),
    ).toBe(true);
    expect(
      overlapArea({ x: 0, y: 0, width: 10, height: 10 }, { x: 5, y: 5, width: 10, height: 10 }),
    ).toBe(25);
    expect(unionRects([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('clamps points to extents by size', () => {
    const extent = [
      [0, 0],
      [100, 100],
    ] as const;
    expect(clampPointToExtent({ x: 95, y: -4 }, extent, { width: 20, height: 10 })).toEqual({
      x: 80,
      y: 0,
    });
    expect(clampPointToExtent({ x: 5, y: 5 }, extent)).toEqual({ x: 5, y: 5 });
  });

  it('snaps to grid and measures distances', () => {
    expect(snapPoint({ x: 17, y: 23 }, [10, 10])).toEqual({ x: 20, y: 20 });
    expect(snapPoint({ x: 17, y: 23 }, [0, 0])).toEqual({ x: 17, y: 23 });
    expect(distanceToRect({ x: 5, y: 5 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(0);
    expect(distanceToRect({ x: 13, y: 14 }, { x: 0, y: 0, width: 10, height: 10 })).toBe(5);
    expect(expandRect({ x: 0, y: 0, width: 10, height: 10 }, 2)).toEqual({
      x: -2,
      y: -2,
      width: 14,
      height: 14,
    });
  });

  it('resolves side normals and facing sides', () => {
    expect(sideNormal('top')).toEqual({ x: 0, y: -1 });
    expect(sideOf({ x: 3, y: -2 })).toBe('right');
    expect(sideOf({ x: -1, y: 5 })).toBe('bottom');
    expect(sideOf({ x: 2, y: 2 })).toBe('right');
  });

  it('hashes equal rects equally and rounds sub-unit noise', () => {
    const a = rectHash({ x: 1.00001, y: 2, width: 3, height: 4 });
    const b = rectHash({ x: 1.0001, y: 2, width: 3, height: 4 });
    const c = rectHash({ x: 1.01, y: 2, width: 3, height: 4 });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
