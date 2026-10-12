import { describe, expect, it } from 'vitest';
import { assignCoordinates } from './coordinates.js';
import { insertDummies } from './dummies.js';
import { buildLayoutGraph } from './graph.js';
import { assignLayers } from './layering.js';
import { minimizeCrossings } from './ordering.js';
import type { FlowLayoutEdge, FlowLayoutNode } from './types.js';

const node = (id: string, height = 50): FlowLayoutNode => ({
  id,
  size: { width: 100, height },
  ports: [],
});

function coordinates(
  nodes: FlowLayoutNode[],
  edges: FlowLayoutEdge[],
  align?: 'start' | 'center' | 'end',
): { xs: Float64Array; layered: ReturnType<typeof insertDummies> } {
  const graph = buildLayoutGraph(nodes, edges);
  const layered = insertDummies(graph, assignLayers(graph));
  const ordering = minimizeCrossings(layered);
  const xs = assignCoordinates(layered, ordering, {
    extent: (n) => layered.height[n]!,
    spacing: 40,
    ...(align ? { align } : {}),
  });
  return { xs, layered };
}

describe('assignCoordinates', () => {
  it('separates nodes of a layer by their sizes plus the spacing', () => {
    const { xs } = coordinates([node('a', 50), node('b', 90), node('c', 30)], []);
    const sorted = [0, 1, 2].sort((p, q) => xs[p]! - xs[q]!);
    for (let at = 1; at < sorted.length; at += 1) {
      const left = sorted[at - 1]!;
      const right = sorted[at]!;
      const gap = xs[right]! - xs[left]! - ([50, 90, 30][left]! + [50, 90, 30][right]!) / 2;
      expect(gap).toBeGreaterThanOrEqual(40 - 1e-9);
    }
    expect(Math.min(...[0, 1, 2].map((n) => xs[n]! - [50, 90, 30][n]! / 2))).toBeCloseTo(0);
  });

  it('aligns a straight chain on one line', () => {
    const { xs } = coordinates(
      [node('a'), node('b'), node('c')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
      ],
    );
    expect(xs[0]).toBeCloseTo(xs[1]!);
    expect(xs[1]).toBeCloseTo(xs[2]!);
  });

  it('centres a parent over its children and honours start/end alignment', () => {
    const nodes = [node('root'), node('l'), node('r')];
    const edges: FlowLayoutEdge[] = [
      { id: '1', source: 'root', target: 'l' },
      { id: '2', source: 'root', target: 'r' },
    ];
    const centre = coordinates(nodes, edges).xs;
    expect(centre[0]).toBeCloseTo((centre[1]! + centre[2]!) / 2);
    const start = coordinates(nodes, edges, 'start').xs;
    expect(start[0]).toBeLessThanOrEqual(centre[0]! + 1e-9);
    const end = coordinates(nodes, edges, 'end').xs;
    expect(end[0]).toBeGreaterThanOrEqual(centre[0]! - 1e-9);
  });

  it('keeps long edges straight through their dummies', () => {
    const { xs, layered } = coordinates(
      [node('a'), node('b'), node('c'), node('d')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'd' },
        { id: 'long', source: 'a', target: 'd' },
      ],
    );
    const chain = layered.chains.get(3)!;
    expect(chain.length).toBe(2);
    expect(xs[chain[0]!]).toBeCloseTo(xs[chain[1]!]!);
  });
});
