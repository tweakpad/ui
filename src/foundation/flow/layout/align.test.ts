import { describe, expect, it } from 'vitest';
import { alignNodes, distributeNodes, snapNodesToGrid } from './align.js';

const items = [
  { id: 'a', rect: { x: 0, y: 0, width: 100, height: 50 } },
  { id: 'b', rect: { x: 150, y: 80, width: 50, height: 30 } },
  { id: 'c', rect: { x: 400, y: 20, width: 80, height: 40 } },
];

describe('alignNodes', () => {
  it('aligns to edges and centres, reporting only moved items', () => {
    expect(alignNodes(items, 'left')).toEqual([
      { id: 'b', position: { x: 0, y: 80 } },
      { id: 'c', position: { x: 0, y: 20 } },
    ]);
    expect(alignNodes(items, 'right')).toEqual([
      { id: 'a', position: { x: 380, y: 0 } },
      { id: 'b', position: { x: 430, y: 80 } },
    ]);
    expect(alignNodes(items, 'top').map((m) => m.id)).toEqual(['b', 'c']);
    // `b` already sits on the bottom line (80 + 30 = 110), so only `a` and `c` move.
    expect(alignNodes(items, 'bottom').map((m) => [m.id, m.position.y])).toEqual([
      ['a', 60],
      ['c', 70],
    ]);
    expect(alignNodes(items, 'center-x').map((m) => m.position.x)).toEqual([190, 215, 200]);
    expect(alignNodes(items, 'center-y').map((m) => m.position.y)).toEqual([30, 40, 35]);
    expect(alignNodes([items[0]!], 'left')).toEqual([]);
  });
});

describe('distributeNodes', () => {
  it('spreads gaps evenly between the outer items', () => {
    const moved = distributeNodes(items, 'x', 'even');
    expect(moved).toEqual([{ id: 'b', position: { x: 225, y: 80 } }]);
  });

  it('applies a fixed gap in order', () => {
    const moved = distributeNodes(items, 'y', 10);
    expect(moved.map((m) => [m.id, m.position.y])).toEqual([
      ['b', 110],
      ['c', 60],
    ]);
    expect(distributeNodes(items.slice(0, 2), 'x', 'even')).toEqual([]);
  });
});

describe('snapNodesToGrid', () => {
  it('rounds positions to the grid', () => {
    const moved = snapNodesToGrid(
      [
        { id: 'a', rect: { x: 17, y: 23, width: 10, height: 10 } },
        { id: 'b', rect: { x: 20, y: 40, width: 1, height: 1 } },
      ],
      [10, 10],
    );
    expect(moved).toEqual([{ id: 'a', position: { x: 20, y: 20 } }]);
  });
});
