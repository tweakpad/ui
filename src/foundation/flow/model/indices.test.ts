import { describe, expect, it } from 'vitest';
import type { FlowDocument } from '../types.js';
import {
  ancestorsOf,
  applyMeasure,
  buildIndices,
  connectionKey,
  createRuntime,
  descendantsOf,
  incidentEdges,
  measureChanges,
  pruneRuntime,
} from './indices.js';

const doc: FlowDocument = {
  version: 1,
  nodes: [
    { id: 'group', type: 'group', position: { x: 100, y: 100 }, data: {} },
    { id: 'a', type: 't', position: { x: 10, y: 10 }, data: {}, parentId: 'group' },
    { id: 'b', type: 't', position: { x: 5, y: 5 }, data: {}, parentId: 'a' },
    { id: 'c', type: 't', position: { x: 500, y: 0 }, data: {} },
    { id: 'orphan', type: 't', position: { x: 1, y: 1 }, data: {}, parentId: 'missing' },
  ],
  edges: [
    { id: 'e1', source: 'a', sourcePort: 'out', target: 'c', targetPort: 'in' },
    { id: 'e2', source: 'b', target: 'c' },
    { id: 'e3', source: 'c', target: 'a' },
  ],
};

describe('flow indices', () => {
  it('builds lookups, order and children', () => {
    const indices = buildIndices(doc);
    expect(indices.nodes.get('a')).toBe(doc.nodes[1]);
    expect(indices.nodeIndex.get('c')).toBe(3);
    expect(indices.edgeIndex.get('e3')).toBe(2);
    expect(indices.children.get('group')).toEqual(['a']);
    expect(indices.children.get('a')).toEqual(['b']);
    expect(indices.children.get('missing')).toBeUndefined();
  });

  it('resolves absolute positions through parent chains regardless of order', () => {
    const indices = buildIndices(doc);
    expect(indices.absolute.get('b')).toEqual({ x: 115, y: 115 });
    expect(indices.depth.get('b')).toBe(2);
    expect(indices.absolute.get('orphan')).toEqual({ x: 1, y: 1 });
    const reversed = buildIndices({ ...doc, nodes: [...doc.nodes].reverse() });
    expect(reversed.absolute.get('b')).toEqual({ x: 115, y: 115 });
  });

  it('tolerates parent cycles', () => {
    const cyclic = buildIndices({
      version: 1,
      nodes: [
        { id: 'x', type: 't', position: { x: 1, y: 1 }, data: {}, parentId: 'y' },
        { id: 'y', type: 't', position: { x: 2, y: 2 }, data: {}, parentId: 'x' },
      ],
      edges: [],
    });
    expect(cyclic.absolute.get('x')).toBeDefined();
    expect(ancestorsOf(cyclic, 'x')).toEqual(['y']);
  });

  it('indexes edges by node, port and direction', () => {
    const indices = buildIndices(doc);
    expect(indices.outgoing.get('a')).toEqual(['e1']);
    expect(indices.incoming.get('c')).toEqual(['e1', 'e2']);
    expect(
      indices.connections.get(connectionKey('source', 'a'))?.map((record) => record.edgeId),
    ).toEqual(['e1']);
    expect(
      indices.connections.get(connectionKey('source', 'a', 'out'))?.map((record) => record.edgeId),
    ).toEqual(['e1']);
    expect(
      indices.connections.get(connectionKey('target', 'c', ''))?.map((record) => record.edgeId),
    ).toEqual(['e2']);
    expect(indices.connections.get(connectionKey('target', 'c', 'in'))?.[0]).toEqual({
      edgeId: 'e1',
      source: 'a',
      sourcePort: 'out',
      target: 'c',
      targetPort: 'in',
    });
    expect(incidentEdges(indices, 'a')).toEqual(['e1', 'e3']);
    expect(incidentEdges(indices, 'c')).toEqual(['e3', 'e1', 'e2']);
  });

  it('walks descendants and ancestors', () => {
    const indices = buildIndices(doc);
    expect(descendantsOf(indices, 'group')).toEqual(['a', 'b']);
    expect(ancestorsOf(indices, 'b')).toEqual(['a', 'group']);
    expect(ancestorsOf(indices, 'orphan')).toEqual([]);
  });

  it('keeps runtime measurements apart from the document', () => {
    const runtime = createRuntime();
    expect(
      applyMeasure(runtime, { type: 'node-measure', id: 'a', measured: { width: 10, height: 10 } }),
    ).toBe(true);
    expect(runtime.version).toBe(1);
    expect(
      measureChanges(runtime, {
        type: 'node-measure',
        id: 'a',
        measured: { width: 10, height: 10 },
      }),
    ).toBe(false);
    expect(
      applyMeasure(runtime, { type: 'node-measure', id: 'a', measured: { width: 10, height: 10 } }),
    ).toBe(false);
    expect(
      applyMeasure(runtime, {
        type: 'node-measure',
        id: 'a',
        ports: [{ id: 'p', x: 0, y: 0, width: 8, height: 8, side: 'left' }],
      }),
    ).toBe(true);
    expect(runtime.measured.get('a')).toEqual({ width: 10, height: 10 });
    expect(applyMeasure(runtime, { type: 'node-measure', id: 'a', measured: undefined })).toBe(
      true,
    );
    expect(runtime.measured.has('a')).toBe(false);
    expect(runtime.ports.get('a')).toHaveLength(1);
    expect(pruneRuntime(runtime, new Map())).toBe(true);
    expect(runtime.ports.size).toBe(0);
    expect(pruneRuntime(runtime, new Map())).toBe(false);
  });
});
