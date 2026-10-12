import { describe, expect, it } from 'vitest';
import { insertDummies } from './dummies.js';
import { buildLayoutGraph } from './graph.js';
import { assignLayers } from './layering.js';
import { countCrossings, minimizeCrossings } from './ordering.js';
import type { FlowLayoutEdge, FlowLayoutNode } from './types.js';

const node = (id: string, ports: FlowLayoutNode['ports'] = []): FlowLayoutNode => ({
  id,
  size: { width: 10, height: 10 },
  ports,
});

function layeredOf(
  nodes: FlowLayoutNode[],
  edges: FlowLayoutEdge[],
): ReturnType<typeof insertDummies> {
  const graph = buildLayoutGraph(nodes, edges);
  return insertDummies(graph, assignLayers(graph));
}

describe('countCrossings', () => {
  it('counts weighted crossings between adjacent layers', () => {
    const layered = layeredOf(
      [node('a'), node('b'), node('x'), node('y')],
      [
        { id: '1', source: 'a', target: 'y' },
        { id: '2', source: 'b', target: 'x' },
      ],
    );
    const layers = [
      [0, 1],
      [2, 3],
    ];
    const position = new Int32Array([0, 1, 0, 1]);
    expect(countCrossings(layered, layers, position)).toBe(1);
    const swapped = new Int32Array([0, 1, 1, 0]);
    expect(
      countCrossings(
        layered,
        [
          [0, 1],
          [3, 2],
        ],
        swapped,
      ),
    ).toBe(0);
  });
});

describe('minimizeCrossings', () => {
  it('removes crossings a median sweep can fix', () => {
    const layered = layeredOf(
      [node('a'), node('b'), node('c'), node('x'), node('y'), node('z')],
      [
        { id: '1', source: 'a', target: 'z' },
        { id: '2', source: 'b', target: 'y' },
        { id: '3', source: 'c', target: 'x' },
      ],
    );
    const ordering = minimizeCrossings(layered);
    expect(ordering.crossings).toBe(0);
    expect(ordering.layers[1]!.map((n) => layered.layer[n])).toEqual([1, 1, 1]);
    for (const members of ordering.layers)
      members.forEach((n, at) => expect(ordering.position[n]).toBe(at));
  });

  it('keeps edges in port order', () => {
    const ports: FlowLayoutNode['ports'] = [
      { id: 'p0', direction: 'output', index: 0 },
      { id: 'p1', direction: 'output', index: 1 },
      { id: 'p2', direction: 'output', index: 2 },
    ];
    const layered = layeredOf(
      [node('hub', ports), node('x'), node('y'), node('z')],
      [
        { id: '1', source: 'hub', sourcePort: 'p2', target: 'x' },
        { id: '2', source: 'hub', sourcePort: 'p0', target: 'y' },
        { id: '3', source: 'hub', sourcePort: 'p1', target: 'z' },
      ],
    );
    const ordering = minimizeCrossings(layered);
    expect(ordering.layers[1]!.map((n) => layered.layer[n] === 1 && n)).toEqual([2, 3, 1]);
  });

  it('is deterministic and respects the iteration cap', () => {
    const nodes = Array.from({ length: 12 }, (_, i) => node(`n${i}`));
    const edges: FlowLayoutEdge[] = [];
    for (let i = 0; i < 6; i += 1)
      for (let j = 6; j < 12; j += 1)
        if ((i * 7 + j) % 3 === 0)
          edges.push({ id: `${i}-${j}`, source: `n${i}`, target: `n${j}` });
    const first = minimizeCrossings(layeredOf(nodes, edges), { iterations: 4 });
    const second = minimizeCrossings(layeredOf(nodes, edges), { iterations: 4 });
    expect(first.layers).toEqual(second.layers);
    expect(first.crossings).toBe(second.crossings);
    const noTranspose = minimizeCrossings(layeredOf(nodes, edges), {
      iterations: 4,
      transpose: false,
    });
    expect(noTranspose.crossings).toBeGreaterThanOrEqual(first.crossings);
  });
});
