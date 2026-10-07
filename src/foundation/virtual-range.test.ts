import { describe, expect, it } from 'vitest';
import { ExtentIndex, virtualRange } from './virtual-range.js';

describe('extent index', () => {
  it('sums, updates and locates offsets', () => {
    const index = new ExtentIndex([10, 20, 30, 40]);
    expect(index.total).toBe(100);
    expect(index.offset(2)).toBe(30);
    expect(index.indexAt(0)).toBe(0);
    expect(index.indexAt(29.9)).toBe(1);
    expect(index.indexAt(30)).toBe(2);
    expect(index.indexAt(1000)).toBe(3);
    expect(index.set(1, 25)).toBe(5);
    expect(index.offset(2)).toBe(35);
    expect(index.indexAt(34)).toBe(1);
  });

  it('matches naive prefix sums after many updates', () => {
    const count = 5_000;
    const sizes = new Float64Array(count).fill(32);
    const index = new ExtentIndex(sizes);
    for (let i = 0; i < 2_000; i++) {
      const at = (i * 97) % count;
      sizes[at] = 20 + (i % 50);
      index.set(at, sizes[at]!);
    }
    let offset = 0;
    for (let i = 0; i < count; i++) {
      expect(index.offset(i)).toBe(offset);
      expect(index.indexAt(offset)).toBe(i);
      offset += sizes[i]!;
    }
    expect(index.total).toBe(offset);
  });
});

describe('virtual range', () => {
  it('mounts the visible items plus overscan and reports the spaces around them', () => {
    const index = new ExtentIndex(new Array(100).fill(10));
    expect(virtualRange(index, 205, 305, 2)).toEqual({ from: 18, to: 33, before: 180, after: 670 });
    expect(virtualRange(index, 0, 50, 4)).toMatchObject({ from: 0, to: 9, before: 0 });
    expect(virtualRange(new ExtentIndex(), 0, 100, 4)).toEqual({
      from: 0,
      to: 0,
      before: 0,
      after: 0,
    });
  });
});
