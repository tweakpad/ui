import { describe, expect, it } from 'vitest';
import type { FlowDocument } from '../types.js';
import {
  connectedComponents,
  edgeZ,
  hasCycle,
  nodeZ,
  nodesBounds,
  reachable,
  topologicalOrder,
  wouldCreateCycle,
} from './queries.js';

const dag: FlowDocument = {
  version: 1,
  nodes: ['d', 'b', 'a', 'c', 'lonely'].map((id) => ({
    id,
    type: 't',
    position: { x: 0, y: 0 },
    data: {},
  })),
  edges: [
    { id: 'ab', source: 'a', target: 'b' },
    { id: 'ac', source: 'a', target: 'c' },
    { id: 'bd', source: 'b', target: 'd' },
    { id: 'cd', source: 'c', target: 'd' },
  ],
};

describe('flow graph queries', () => {
  it('orders topologically with document-order ties', () => {
    expect(topologicalOrder(dag)).toEqual(['a', 'b', 'c', 'd', 'lonely']);
    expect(topologicalOrder(dag)).toEqual(topologicalOrder(dag));
    const cyclic: FlowDocument = {
      ...dag,
      edges: [...dag.edges, { id: 'da', source: 'd', target: 'a' }],
    };
    expect(topologicalOrder(cyclic)).toEqual(['lonely', 'd', 'b', 'a', 'c']);
    expect(hasCycle(dag)).toBe(false);
    expect(hasCycle(cyclic)).toBe(true);
  });

  it('detects cycles a new edge would create', () => {
    expect(wouldCreateCycle(dag, 'd', 'a')).toBe(true);
    expect(wouldCreateCycle(dag, 'a', 'd')).toBe(false);
    expect(wouldCreateCycle(dag, 'a', 'a')).toBe(true);
    expect(wouldCreateCycle(dag, 'd', 'a', 'bd') && wouldCreateCycle(dag, 'd', 'a', 'cd')).toBe(
      true,
    );
    const chain: FlowDocument = { ...dag, edges: [{ id: 'ab', source: 'a', target: 'b' }] };
    expect(wouldCreateCycle(chain, 'b', 'a')).toBe(true);
    expect(wouldCreateCycle(chain, 'b', 'a', 'ab')).toBe(false);
  });

  it('walks reachability in both directions', () => {
    expect([...reachable(dag, 'a')].sort()).toEqual(['b', 'c', 'd']);
    expect([...reachable(dag, 'd', 'upstream')].sort()).toEqual(['a', 'b', 'c']);
    expect([...reachable(dag, 'b', 'both')].sort()).toEqual(['a', 'c', 'd']);
    expect(reachable(dag, 'lonely').size).toBe(0);
    expect([...reachable(dag, ['b', 'c'])].sort()).toEqual(['d']);
  });

  it('splits weakly connected components in document order', () => {
    expect(connectedComponents(dag)).toEqual([['d', 'b', 'a', 'c'], ['lonely']]);
  });

  it('unions bounds', () => {
    expect(
      nodesBounds([
        { x: 0, y: 0, width: 10, height: 10 },
        { x: 5, y: -5, width: 1, height: 1 },
      ]),
    ).toEqual({ x: 0, y: -5, width: 10, height: 15 });
  });

  it('computes node and edge z like xyflow', () => {
    expect(nodeZ({}, undefined)).toBe(0);
    expect(nodeZ({ zIndex: 3, selected: true }, undefined)).toBe(1003);
    expect(nodeZ({ zIndex: 2 }, 5)).toBe(6);
    expect(nodeZ({ zIndex: 9 }, 5)).toBe(9);
    expect(edgeZ({ sourceZ: 0, targetZ: 0, sourceElevated: false, targetElevated: false })).toBe(0);
    expect(
      edgeZ({ zIndex: 2, sourceZ: 6, targetZ: 1, sourceElevated: true, targetElevated: false }),
    ).toBe(8);
    expect(
      edgeZ({
        selected: true,
        elevateOnSelect: true,
        sourceZ: 1,
        targetZ: 1,
        sourceElevated: false,
        targetElevated: false,
      }),
    ).toBe(1000);
  });
});
