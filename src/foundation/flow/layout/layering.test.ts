import { describe, expect, it } from 'vitest';
import { buildLayoutGraph } from './graph.js';
import { assignLayers, layerMembers } from './layering.js';
import type { FlowLayoutNode } from './types.js';

const node = (id: string): FlowLayoutNode => ({ id, size: { width: 10, height: 10 }, ports: [] });

describe('assignLayers', () => {
  it('assigns longest-path layers', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'a', target: 'c' },
        { id: '4', source: 'c', target: 'd' },
      ],
    );
    const layering = assignLayers(graph);
    expect(Array.from(layering.layer)).toEqual([0, 1, 2, 3]);
    expect(layering.count).toBe(4);
    expect(layerMembers(layering)).toEqual([[0], [1], [2], [3]]);
  });

  it('promotes sources toward their successors', () => {
    // `late` feeds `d` only: longest path puts it at 0; promotion moves it next to `d`.
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c'), node('d'), node('late')],
      [
        { id: '1', source: 'a', target: 'b' },
        { id: '2', source: 'b', target: 'c' },
        { id: '3', source: 'c', target: 'd' },
        { id: '4', source: 'late', target: 'd' },
      ],
    );
    const layering = assignLayers(graph);
    expect(layering.layer[4]).toBe(2);
    expect(layering.count).toBe(4);
  });

  it('keeps nodes with more in-edges than out-edges where they are', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('hub'), node('far')],
      [
        { id: '1', source: 'a', target: 'hub' },
        { id: '2', source: 'b', target: 'hub' },
        { id: '3', source: 'a', target: 'far' },
        { id: '4', source: 'far', target: 'hub' },
      ],
    );
    const layering = assignLayers(graph);
    expect(layering.layer[2]).toBe(2);
    expect(layering.layer[3]).toBe(1);
    expect(layering.layer[1]).toBe(1);
  });

  it('handles an empty graph', () => {
    const layering = assignLayers(buildLayoutGraph([], []));
    expect(layering.count).toBe(0);
  });
});
