import { describe, expect, it } from 'vitest';
import { extractBendPoints, insertDummies } from './dummies.js';
import { buildLayoutGraph } from './graph.js';
import { assignLayers } from './layering.js';
import type { FlowLayoutNode } from './types.js';

const node = (id: string): FlowLayoutNode => ({ id, size: { width: 10, height: 10 }, ports: [] });

describe('insertDummies', () => {
  it('chains dummies across spanned layers and keeps unit edges', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'd' },
        { id: 'long', source: 'a', target: 'd' },
      ],
    );
    const layering = assignLayers(graph);
    const layered = insertDummies(graph, layering);
    expect(layered.realCount).toBe(4);
    expect(layered.dummies).toBe(2);
    expect(layered.count).toBe(6);
    expect(Array.from(layered.isDummy)).toEqual([0, 0, 0, 0, 1, 1]);
    expect(extractBendPoints(layered, 3)).toEqual([4, 5]);
    expect(layered.layer[4]).toBe(1);
    expect(layered.layer[5]).toBe(2);
    expect(layered.edgeSource.length).toBe(6);
    expect(layered.layers).toEqual([[0], [1, 4], [2, 5], [3]]);
    // The chain keeps the original edge index and fractions at its ends.
    const chainEdges = Array.from(layered.edgeOrigin)
      .map((origin, index) => (origin === 3 ? index : -1))
      .filter((i) => i >= 0);
    expect(chainEdges.length).toBe(3);
    expect(layered.out[0]).toContain(chainEdges[0]);
    expect(layered.in[3]).toContain(chainEdges[2]);
  });

  it('skips long edges past the dummy cap', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'd' },
        { id: 'long', source: 'a', target: 'd' },
      ],
    );
    const layering = assignLayers(graph);
    const layered = insertDummies(graph, layering, 1);
    expect(layered.dummies).toBe(0);
    expect(layered.skipped).toEqual([3]);
    expect(extractBendPoints(layered, 3)).toEqual([]);
  });
});
