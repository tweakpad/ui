import { describe, expect, it } from 'vitest';
import { rectsIntersect } from '../geometry.js';
import { packComponents, splitComponents } from './components.js';
import { buildLayoutGraph } from './graph.js';
import type { FlowLayoutNode } from './types.js';

const node = (id: string): FlowLayoutNode => ({ id, size: { width: 10, height: 10 }, ports: [] });

describe('splitComponents', () => {
  it('groups connected nodes, ordered by their smallest member', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d'), node('e')],
      [
        { id: '1', source: 'b', target: 'd' },
        { id: '2', source: 'a', target: 'e' },
      ],
    );
    expect(splitComponents(graph)).toEqual([[0, 4], [1, 3], [2]]);
  });
});

describe('packComponents', () => {
  const boxes = [
    { x: 0, y: 0, width: 300, height: 100 },
    { x: 0, y: 0, width: 200, height: 150 },
    { x: 0, y: 0, width: 100, height: 100 },
    { x: 0, y: 0, width: 400, height: 50 },
  ];
  const placed = (
    offsets: { x: number; y: number }[],
  ): Array<{ x: number; y: number; width: number; height: number }> =>
    boxes.map((box, index) => ({ ...box, x: offsets[index]!.x, y: offsets[index]!.y }));

  it('packs shelves without overlap', () => {
    const rects = placed(
      packComponents(boxes, { mode: 'grid', spacing: 20, direction: 'horizontal', aspect: 1.6 }),
    );
    for (let i = 0; i < rects.length; i += 1)
      for (let j = i + 1; j < rects.length; j += 1)
        expect(rectsIntersect(rects[i]!, rects[j]!)).toBe(false);
    expect(new Set(rects.map((rect) => rect.y)).size).toBeGreaterThan(1);
  });

  it('stacks rows along the cross axis', () => {
    const horizontal = packComponents(boxes, {
      mode: 'rows',
      spacing: 20,
      direction: 'horizontal',
      aspect: 1.6,
    });
    expect(horizontal.map((offset) => offset.y)).toEqual([0, 120, 290, 410]);
    expect(horizontal.every((offset) => offset.x === 0)).toBe(true);
    const vertical = packComponents(boxes, {
      mode: 'rows',
      spacing: 20,
      direction: 'vertical',
      aspect: 1.6,
    });
    expect(vertical.map((offset) => offset.x)).toEqual([0, 320, 540, 660]);
  });

  it('returns zero offsets for none and single components', () => {
    expect(
      packComponents(boxes, { mode: 'none', spacing: 20, direction: 'horizontal', aspect: 1.6 }),
    ).toEqual(boxes.map(() => ({ x: 0, y: 0 })));
    expect(
      packComponents([boxes[0]!], {
        mode: 'grid',
        spacing: 20,
        direction: 'horizontal',
        aspect: 1.6,
      }),
    ).toEqual([{ x: 0, y: 0 }]);
  });
});
