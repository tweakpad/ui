import { describe, expect, it } from 'vitest';
import { layoutGroupTree, type LevelLayout } from './groups.js';
import { resolveLayoutOptions, type FlowLayoutNode } from './types.js';

/** A fake level layout: nodes left to right in a row, spaced by 10; lifted edges recorded. */
const calls: Array<{ parentIds: string[]; edges: string[] }> = [];
const rowLayout: LevelLayout = (nodes, edges, direction, options, origin) => {
  calls.push({
    parentIds: nodes.map((n) => n.id),
    edges: edges.map((e) => `${e.source}>${e.target}`),
  });
  void direction;
  void options;
  const positions = new Map<string, { x: number; y: number }>();
  let x = origin?.x ?? 0;
  for (const node of nodes) {
    positions.set(node.id, { x, y: origin?.y ?? 0 });
    x += node.size.width + 10;
  }
  return {
    positions,
    bendPoints: new Map(),
    stats: { layers: 1, dummies: 0, crossings: 0, components: 1 },
  };
};

const node = (id: string, parentId?: string, width = 100): FlowLayoutNode => ({
  id,
  size: { width, height: 50 },
  ports: [],
  ...(parentId ? { parentId } : {}),
});

describe('layoutGroupTree', () => {
  it('lays out groups bottom-up, lifts boundary edges and sizes groups from their children', () => {
    calls.length = 0;
    const nodes = [node('g'), node('a', 'g'), node('b', 'g'), node('c')];
    const edges = [
      { id: 'ab', source: 'a', target: 'b' },
      { id: 'bc', source: 'b', target: 'c' },
    ];
    const options = resolveLayoutOptions({
      groupPadding: { top: 40, right: 16, bottom: 16, left: 16 },
    });
    const result = layoutGroupTree(nodes, edges, 'horizontal', options, rowLayout);
    expect(calls[0]!.parentIds).toEqual(['a', 'b']);
    expect(calls[0]!.edges).toEqual(['a>b']);
    expect(calls[1]!.parentIds).toEqual(['g', 'c']);
    expect(calls[1]!.edges).toEqual(['g>c']);
    expect(result.sizes.get('g')).toEqual({ width: 16 + 210 + 16, height: 40 + 50 + 16 });
    expect(result.positions.get('g')).toEqual({ x: 0, y: 0 });
    expect(result.positions.get('a')).toEqual({ x: 16, y: 40 });
    expect(result.positions.get('b')).toEqual({ x: 126, y: 40 });
    expect(result.positions.get('c')).toEqual({ x: 242 + 10, y: 0 });
  });

  it('nests groups and composes absolute positions', () => {
    calls.length = 0;
    const nodes = [node('outer'), node('inner', 'outer'), node('leaf', 'inner')];
    const result = layoutGroupTree(
      nodes,
      [],
      'horizontal',
      resolveLayoutOptions({ groupPadding: 10 }),
      rowLayout,
    );
    expect(result.sizes.get('inner')).toEqual({ width: 120, height: 70 });
    expect(result.sizes.get('outer')).toEqual({ width: 140, height: 90 });
    expect(result.positions.get('leaf')).toEqual({ x: 20, y: 20 });
  });
});
