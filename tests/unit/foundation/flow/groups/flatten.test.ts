import { describe, expect, it } from 'vitest';
import {
  flattenFlowGroups,
  flowEdgeLeafPairs,
  flowLeafEnds,
} from '../../../../../src/foundation/flow/groups/flatten.js';
import type { FlowDocument } from '../../../../../src/foundation/flow/types.js';
import { edge, group, nested, schema, step } from './fixture.js';

const ports = [
  { id: 'gin', direction: 'input' as const },
  { id: 'gout', direction: 'output' as const },
];

function summary(document: FlowDocument): string[] {
  return flattenFlowGroups(document, { schema }).document.edges.map(
    (item) => `${item.id}: ${item.source}.${item.sourcePort}>${item.target}.${item.targetPort}`,
  );
}

describe('flattenFlowGroups', () => {
  it('resolves chains through any depth and removes the groups', () => {
    const document = nested();
    const result = flattenFlowGroups(document, { schema });
    expect(result.document.nodes.map((node) => node.id)).toEqual(['x', 'a', 'b', 'y']);
    expect(summary(document)).toEqual([
      'x-g>g-a: x.out>a.in',
      'a-h>h-b: a.out>b.in',
      'b-h>h-g>g-y: b.out>y.in',
    ]);
    expect(result.chains.get('b-h>h-g>g-y')).toEqual(['b-h', 'h-g', 'g-y']);
    // Cached per document identity.
    expect(flattenFlowGroups(document, { schema })).toBe(result);
    expect(flattenFlowGroups(nested(), { schema })).not.toBe(result);
  });

  it('keeps a document without groups and its edges by identity', () => {
    const document: FlowDocument = {
      version: 1,
      nodes: [step('a', 0, 0), step('b', 200, 0)],
      edges: [edge('ab', 'a', 'out', 'b', 'in')],
    };
    const result = flattenFlowGroups(document, { schema });
    expect(result.document).toBe(document);
    expect(result.chains.get('ab')).toEqual(['ab']);
  });

  it('resolves pass-through, fan-out and fan-in', () => {
    const document: FlowDocument = {
      version: 1,
      nodes: [
        step('x', 0, 0),
        step('z', 0, 200),
        group('G', 200, 0, 400, 300, { ports }),
        step('a', 40, 60, { parentId: 'G' }),
        step('c', 40, 160, { parentId: 'G' }),
        step('y', 800, 0),
      ],
      edges: [
        edge('x-g', 'x', 'out', 'G', 'gin'),
        edge('z-g', 'z', 'out', 'G', 'gin'),
        edge('g-a', 'G', 'gin', 'a', 'in'),
        edge('g-c', 'G', 'gin', 'c', 'in'),
        edge('pass', 'G', 'gin', 'G', 'gout'),
        edge('g-y', 'G', 'gout', 'y', 'in'),
      ],
    };
    expect(summary(document)).toEqual([
      'x-g>g-a: x.out>a.in',
      'x-g>g-c: x.out>c.in',
      'x-g>pass>g-y: x.out>y.in',
      'z-g>g-a: z.out>a.in',
      'z-g>g-c: z.out>c.in',
      'z-g>pass>g-y: z.out>y.in',
    ]);
  });

  it('drops dangling chains', () => {
    const document: FlowDocument = {
      version: 1,
      nodes: [
        step('x', 0, 0),
        group('G', 200, 0, 400, 300, { ports }),
        step('a', 40, 60, { parentId: 'G' }),
      ],
      edges: [edge('x-g', 'x', 'out', 'G', 'gin'), edge('a-g', 'a', 'out', 'G', 'gout')],
    };
    expect(summary(document)).toEqual([]);
  });

  it('resolves a loop through relays to the leaf loop it makes, and stops on relay-only loops', () => {
    const document = nested();
    document.edges.push(edge('loop', 'H', 'hout', 'H', 'hin'));
    const result = flattenFlowGroups(document, { schema });
    expect(result.document.edges.map((item) => `${item.source}>${item.target}`)).toContain('b>b');
    const relays: FlowDocument = {
      version: 1,
      nodes: [step('x', 0, 0), group('R', 200, 0, 200, 200, { ports })],
      edges: [
        edge('x-r', 'x', 'out', 'R', 'gin'),
        edge('pass', 'R', 'gin', 'R', 'gout'),
        edge('back', 'R', 'gout', 'R', 'gin'),
      ],
    };
    expect(summary(relays)).toEqual([]);
  });

  it('resolves the leaf ends of an edge end and the pairs an edge carries', () => {
    const document = nested();
    expect(flowLeafEnds(document, { nodeId: 'G', portId: 'gin' }, 'target', { schema })).toEqual([
      { nodeId: 'a', portId: 'in', chain: ['g-a'] },
    ]);
    expect(flowLeafEnds(document, { nodeId: 'G', portId: 'gout' }, 'source', { schema })).toEqual([
      { nodeId: 'b', portId: 'out', chain: ['b-h', 'h-g'] },
    ]);
    expect(flowLeafEnds(document, { nodeId: 'a', portId: 'in' }, 'source', { schema })).toEqual([
      { nodeId: 'a', portId: 'in', chain: [] },
    ]);
    expect(flowEdgeLeafPairs(document, 'h-g', { schema })).toEqual([
      {
        id: 'b-h>h-g>g-y',
        source: { nodeId: 'b', portId: 'out' },
        target: { nodeId: 'y', portId: 'in' },
        chain: ['b-h', 'h-g', 'g-y'],
      },
    ]);
    expect(flowEdgeLeafPairs(document, 'missing', { schema })).toEqual([]);
  });
});
