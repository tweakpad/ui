import { describe, expect, it } from 'vitest';
import { partitionPinned, placeAroundPinned } from './pinned.js';

describe('pinned', () => {
  it('partitions pinned nodes', () => {
    const { pinned, free } = partitionPinned([
      { id: 'a', pinned: true },
      { id: 'b' },
      { id: 'c', pinned: false },
    ]);
    expect(pinned.map((n) => n.id)).toEqual(['a']);
    expect(free.map((n) => n.id)).toEqual(['b', 'c']);
  });

  it('slides a block along the main axis past pinned rects', () => {
    const pinned = [
      { x: 50, y: 0, width: 100, height: 100 },
      { x: 180, y: 20, width: 50, height: 50 },
    ];
    expect(
      placeAroundPinned({ width: 100, height: 60 }, { x: 0, y: 0 }, pinned, 'horizontal', 20),
    ).toEqual({ x: 250, y: 0 });
    expect(
      placeAroundPinned({ width: 100, height: 60 }, { x: 0, y: 0 }, pinned, 'vertical', 20),
    ).toEqual({ x: 0, y: 120 });
    expect(
      placeAroundPinned({ width: 10, height: 10 }, { x: 0, y: 200 }, pinned, 'horizontal', 20),
    ).toEqual({ x: 0, y: 200 });
    expect(
      placeAroundPinned({ width: 10, height: 10 }, { x: 5, y: 5 }, [], 'horizontal', 20),
    ).toEqual({ x: 5, y: 5 });
  });
});
