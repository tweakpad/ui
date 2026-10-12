import { describe, expect, it } from 'vitest';
import { buildLayoutGraph, portFraction, subgraph, layoutTopologicalOrder } from './graph.js';
import type { FlowLayoutNode } from './types.js';

const node = (id: string, ports: FlowLayoutNode['ports'] = []): FlowLayoutNode => ({
  id,
  size: { width: 100, height: 50 },
  ports,
});

describe('buildLayoutGraph', () => {
  it('maps ids to dense ints, merges multi-edges and drops self-loops', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c')],
      [
        { id: 'e1', source: 'a', target: 'b' },
        { id: 'e2', source: 'a', target: 'b' },
        { id: 'loop', source: 'b', target: 'b' },
        { id: 'e3', source: 'b', target: 'c' },
        { id: 'missing', source: 'a', target: 'zzz' },
      ],
    );
    expect(graph.count).toBe(3);
    expect(graph.ids).toEqual(['a', 'b', 'c']);
    expect(graph.edges.map((edge) => [edge.source, edge.target, edge.weight])).toEqual([
      [0, 1, 2],
      [1, 2, 1],
    ]);
    expect(graph.edges[0]!.ids).toEqual(['e1', 'e2']);
    expect(graph.out[0]).toEqual([0]);
    expect(graph.in[2]).toEqual([1]);
    expect(graph.width[0]).toBe(100);
  });

  it('derives port fractions from the port order', () => {
    const ports: FlowLayoutNode['ports'] = [
      { id: 'top', direction: 'output', index: 0 },
      { id: 'mid', direction: 'output', index: 1 },
      { id: 'low', direction: 'output', index: 2 },
      { id: 'in', direction: 'input', index: 0 },
    ];
    expect(portFraction(ports, 'top', 'output')).toBeCloseTo(-1 / 3);
    expect(portFraction(ports, 'mid', 'output')).toBeCloseTo(0);
    expect(portFraction(ports, 'low', 'output')).toBeCloseTo(1 / 3);
    expect(portFraction(ports, 'in', 'input')).toBe(0);
    expect(portFraction(ports, undefined, 'output')).toBe(0);
    expect(portFraction(ports, 'nope', 'output')).toBe(0);
    const graph = buildLayoutGraph(
      [node('a', ports), node('b')],
      [{ id: 'e', source: 'a', sourcePort: 'low', target: 'b' }],
    );
    expect(graph.edges[0]!.sourceFraction).toBeCloseTo(1 / 3);
  });

  it('extracts subgraphs and orders topologically', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d')],
      [
        { id: '1', source: 'a', target: 'c' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'd' },
      ],
    );
    expect(Array.from(layoutTopologicalOrder(graph))).toEqual([0, 1, 2, 3]);
    const sub = subgraph(graph, [1, 2, 3]);
    expect(sub.ids).toEqual(['b', 'c', 'd']);
    expect(sub.edges.map((edge) => [edge.source, edge.target])).toEqual([
      [0, 1],
      [1, 2],
    ]);
    const cyclic = buildLayoutGraph(
      [node('a'), node('b')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'a' },
      ],
    );
    expect(() => layoutTopologicalOrder(cyclic)).toThrow();
  });
});
