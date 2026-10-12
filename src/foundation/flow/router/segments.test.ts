import { describe, expect, it } from 'vitest';
import { SegmentIndex } from './segments.js';

describe('SegmentIndex', () => {
  it('splits polylines into axis-aligned segments and removes them', () => {
    const index = new SegmentIndex();
    index.set('e', [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 50 },
      { x: 100, y: 50 },
      { x: 130, y: 80 },
    ]);
    const segments = index.segmentsOf('e');
    expect(segments.map((segment) => [segment.index, segment.horizontal])).toEqual([
      [0, true],
      [1, false],
    ]);
    expect(index.size).toBe(1);
    expect(index.remove('e')).toBe(true);
    expect(index.remove('e')).toBe(false);
    expect(index.query({ x: -10, y: -10, width: 200, height: 200 })).toEqual([]);
  });

  it('counts perpendicular crossings strictly inside both segments', () => {
    const index = new SegmentIndex();
    index.set('v', [
      { x: 50, y: -50 },
      { x: 50, y: 50 },
    ]);
    index.set('touch', [
      { x: 80, y: 0 },
      { x: 80, y: 40 },
    ]);
    index.set('same', [
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ]);
    expect(index.crossings({ x: 0, y: 0 }, { x: 100, y: 0 })).toBe(1);
    expect(index.crossings({ x: 0, y: 0 }, { x: 50, y: 0 })).toBe(0);
    expect(index.crossings({ x: 0, y: 0 }, { x: 100, y: 0 }, 'v')).toBe(0);
    expect(index.crossings({ x: 20, y: -100 }, { x: 20, y: 100 })).toBe(1);
  });

  it('counts colinear overlaps longer than a point', () => {
    const index = new SegmentIndex();
    index.set('a', [
      { x: 0, y: 10 },
      { x: 100, y: 10 },
    ]);
    index.set('b', [
      { x: 100, y: 10 },
      { x: 200, y: 10 },
    ]);
    index.set('c', [
      { x: 0, y: 20 },
      { x: 100, y: 20 },
    ]);
    expect(index.overlaps({ x: 50, y: 10 }, { x: 150, y: 10 })).toBe(2);
    expect(index.overlaps({ x: 50, y: 10 }, { x: 100, y: 10 })).toBe(1);
    expect(index.overlaps({ x: 50, y: 10 }, { x: 150, y: 10 }, 'a')).toBe(1);
    expect(index.overlaps({ x: 50, y: 15 }, { x: 150, y: 15 })).toBe(0);
    expect(index.overlaps({ x: 10, y: 0 }, { x: 10, y: 30 })).toBe(0);
  });

  it('queries by rect in edge and index order', () => {
    const index = new SegmentIndex();
    index.set('b', [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
    ]);
    index.set('a', [
      { x: 5, y: 5 },
      { x: 5, y: 50 },
    ]);
    const hits = index.query({ x: 0, y: 0, width: 20, height: 20 });
    expect(hits.map((segment) => `${segment.edgeId}:${segment.index}`)).toEqual([
      'a:0',
      'b:0',
      'b:1',
    ]);
    expect(index.query({ x: 0, y: 0, width: 20, height: 20 }, 'b').length).toBe(1);
  });
});
