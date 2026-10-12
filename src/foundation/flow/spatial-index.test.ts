import { describe, expect, it } from 'vitest';
import { SpatialIndex } from './spatial-index.js';
import { rectContains, rectsIntersect } from './geometry.js';
import type { FlowRect } from './types.js';

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('SpatialIndex', () => {
  it('inserts, queries and removes', () => {
    const index = new SpatialIndex({ cellSize: 100 });
    index.insert('a', { x: 10, y: 10, width: 50, height: 50 });
    index.insert('b', { x: 400, y: 400, width: 20, height: 20 });
    expect(index.queryRect({ x: 0, y: 0, width: 100, height: 100 })).toEqual(['a']);
    expect(index.queryPoint({ x: 410, y: 410 })).toEqual(['b']);
    index.remove('a');
    expect(index.queryRect({ x: 0, y: 0, width: 100, height: 100 })).toEqual([]);
    expect(index.size).toBe(1);
  });

  it('keeps the cell range on a small update and re-places on a big one', () => {
    const index = new SpatialIndex({ cellSize: 100 });
    index.insert('a', { x: 10, y: 10, width: 50, height: 50 });
    index.update('a', { x: 20, y: 20, width: 50, height: 50 });
    expect(index.rectOf('a')).toEqual({ x: 20, y: 20, width: 50, height: 50 });
    index.update('a', { x: 500, y: 500, width: 50, height: 50 });
    expect(index.queryRect({ x: 0, y: 0, width: 100, height: 100 })).toEqual([]);
    expect(index.queryRect({ x: 450, y: 450, width: 200, height: 200 })).toEqual(['a']);
  });

  it('returns oversized items from every query', () => {
    const index = new SpatialIndex({ cellSize: 10, oversizedThreshold: 4 });
    index.insert('group', { x: 0, y: 0, width: 1000, height: 1000 });
    index.insert('small', { x: 5, y: 5, width: 2, height: 2 });
    expect(index.queryRect({ x: 900, y: 900, width: 10, height: 10 })).toEqual(['group']);
    expect(index.queryPoint({ x: 6, y: 6 }).sort()).toEqual(['group', 'small']);
  });

  it('distinguishes partial overlap from containment', () => {
    const index = new SpatialIndex({ cellSize: 100 });
    index.insert('a', { x: 90, y: 90, width: 50, height: 50 });
    expect(index.queryRect({ x: 0, y: 0, width: 100, height: 100 })).toEqual(['a']);
    expect(index.queryRect({ x: 0, y: 0, width: 100, height: 100 }, false)).toEqual([]);
    expect(index.queryRect({ x: 0, y: 0, width: 200, height: 200 }, false)).toEqual(['a']);
  });

  it('finds the nearest item with deterministic ties', () => {
    const index = new SpatialIndex({ cellSize: 100 });
    index.insert('left', { x: 0, y: 0, width: 10, height: 10 });
    index.insert('right', { x: 30, y: 0, width: 10, height: 10 });
    expect(index.nearest({ x: 20, y: 5 }, 50)).toEqual({ id: 'left', distance: 10 });
    expect(index.nearest({ x: 20, y: 5 }, 5)).toBeUndefined();
    expect(index.nearest({ x: 20, y: 5 }, 50, (id) => id === 'right')).toEqual({
      id: 'right',
      distance: 10,
    });
  });

  it('agrees with brute force over random rects', () => {
    const next = random(7);
    const index = new SpatialIndex();
    const rects = new Map<string, FlowRect>();
    for (let i = 0; i < 1000; i += 1) {
      const rect = {
        x: next() * 5000,
        y: next() * 5000,
        width: 20 + next() * 200,
        height: 20 + next() * 100,
      };
      rects.set(`n${i}`, rect);
      index.insert(`n${i}`, rect);
    }
    expect(index.cellSize).toBeGreaterThanOrEqual(128);
    for (let q = 0; q < 50; q += 1) {
      const query = {
        x: next() * 5000,
        y: next() * 5000,
        width: next() * 800,
        height: next() * 600,
      };
      const expected = [...rects]
        .filter(([, rect]) => rectsIntersect(query, rect))
        .map(([id]) => id)
        .sort();
      expect(index.queryRect(query).sort()).toEqual(expected);
      const contained = [...rects]
        .filter(([, rect]) => rectContains(query, rect))
        .map(([id]) => id)
        .sort();
      expect(index.queryRect(query, false).sort()).toEqual(contained);
    }
    for (let i = 0; i < 1000; i += 2) index.remove(`n${i}`);
    expect(index.size).toBe(500);
    const all = index.queryRect({ x: -1, y: -1, width: 10000, height: 10000 }).sort();
    expect(all).toEqual([...rects.keys()].filter((_, i) => i % 2 === 1).sort());
  });
});
