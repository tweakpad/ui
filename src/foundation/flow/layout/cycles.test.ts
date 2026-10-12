import { describe, expect, it } from 'vitest';
import { layoutHasCycle, removeCycles, restoreCycles } from './cycles.js';
import { buildLayoutGraph } from './graph.js';
import type { FlowLayoutNode } from './types.js';

const node = (id: string): FlowLayoutNode => ({ id, size: { width: 10, height: 10 }, ports: [] });

describe('removeCycles', () => {
  it('reverses back edges, records them and restores', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c')],
      [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'bc', source: 'b', target: 'c' },
        { id: 'ca', source: 'c', target: 'a' },
      ],
    );
    expect(layoutHasCycle(graph)).toBe(true);
    const { reversed } = removeCycles(graph);
    expect(reversed).toEqual([2]);
    expect(layoutHasCycle(graph)).toBe(false);
    expect(graph.edges[2]).toMatchObject({ source: 0, target: 2, reversed: true });
    expect(graph.out[0]).toEqual([0, 2]);
    restoreCycles(graph, reversed);
    expect(graph.edges[2]).toMatchObject({ source: 2, target: 0, reversed: false });
    expect(layoutHasCycle(graph)).toBe(true);
  });

  it('leaves acyclic graphs alone and is deterministic', () => {
    const graph = buildLayoutGraph(
      [node('a'), node('b'), node('c')],
      [
        { id: 'ab', source: 'a', target: 'b' },
        { id: 'ac', source: 'a', target: 'c' },
        { id: 'bc', source: 'b', target: 'c' },
      ],
    );
    expect(removeCycles(graph).reversed).toEqual([]);
    const twoCycles = (): ReturnType<typeof buildLayoutGraph> =>
      buildLayoutGraph(
        [node('a'), node('b'), node('c'), node('d')],
        [
          { id: '1', source: 'a', target: 'b' },
          { id: '2', source: 'b', target: 'a' },
          { id: '3', source: 'c', target: 'd' },
          { id: '4', source: 'd', target: 'c' },
          { id: '5', source: 'b', target: 'c' },
        ],
      );
    const first = twoCycles();
    const second = twoCycles();
    expect(removeCycles(first).reversed).toEqual(removeCycles(second).reversed);
    expect(layoutHasCycle(first)).toBe(false);
  });
});
