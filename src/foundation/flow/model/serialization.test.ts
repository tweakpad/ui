import { describe, expect, it } from 'vitest';
import type { FlowDocument, FlowNode } from '../types.js';
import {
  FlowParseError,
  migrateFlowDocument,
  normalizeNodeOrder,
  parseFlowDocument,
  serializeFlowDocument,
  UNVERSIONED_MIGRATION,
} from './serialization.js';

function node(id: string, extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type: 't', position: { x: 0, y: 0 }, data: {}, ...extra };
}

describe('normalizeNodeOrder', () => {
  it('puts parents before children and keeps identity when already ordered', () => {
    const ordered = [
      node('g'),
      node('a', { parentId: 'g' }),
      node('b', { parentId: 'a' }),
      node('c'),
    ];
    expect(normalizeNodeOrder(ordered)).toBe(ordered);
    const shuffled = [
      node('b', { parentId: 'a' }),
      node('c'),
      node('a', { parentId: 'g' }),
      node('g'),
    ];
    expect(normalizeNodeOrder(shuffled).map((item) => item.id)).toEqual(['c', 'g', 'a', 'b']);
  });

  it('treats missing parents as roots and appends parent cycles', () => {
    const nodes = [
      node('x', { parentId: 'y' }),
      node('y', { parentId: 'x' }),
      node('o', { parentId: 'nope' }),
    ];
    expect(normalizeNodeOrder(nodes).map((item) => item.id)).toEqual(['o', 'x', 'y']);
  });
});

describe('serializeFlowDocument', () => {
  const doc: FlowDocument = {
    version: 1,
    nodes: [
      node('a', {
        selected: true,
        size: { width: 1, height: 1 },
        ports: [{ id: 'p', label: 'P' }],
        extent: [
          [0, 0],
          [1, 1],
        ],
      }),
      node('b', { selected: false, parentId: 'a' }),
    ],
    edges: [
      {
        id: 'e',
        source: 'a',
        target: 'b',
        selected: true,
        waypoints: [{ x: 1, y: 1 }],
        labels: [{ text: 'l' }],
        options: { curvature: 1 },
        markerEnd: { type: 'arrow' },
      },
    ],
    viewport: { x: 1, y: 2, zoom: 3 },
    layout: { direction: 'horizontal' },
    metadata: { k: 1 },
  };

  it('strips selection and runtime fields by default and deep-copies', () => {
    const out = serializeFlowDocument(doc);
    expect(out.nodes.every((item) => !('selected' in item))).toBe(true);
    expect('selected' in out.edges[0]!).toBe(false);
    expect(out.viewport).toEqual({ x: 1, y: 2, zoom: 3 });
    expect(out.layout).toEqual({ direction: 'horizontal' });
    expect(out.metadata).toEqual({ k: 1 });
    out.nodes[0]!.position.x = 99;
    out.edges[0]!.waypoints![0]!.x = 99;
    (out.edges[0]!.markerEnd as { type: string }).type = 'circle';
    expect(doc.nodes[0]!.position.x).toBe(0);
    expect(doc.edges[0]!.waypoints![0]!.x).toBe(1);
    expect((doc.edges[0]!.markerEnd as { type: string }).type).toBe('arrow');
    expect(JSON.parse(JSON.stringify(out))).toEqual(out);
  });

  it('keeps selection and drops the viewport on request', () => {
    const out = serializeFlowDocument(doc, { selection: true, viewport: false });
    expect(out.nodes[0]!.selected).toBe(true);
    expect('selected' in out.nodes[1]!).toBe(false);
    expect(out.edges[0]!.selected).toBe(true);
    expect('viewport' in out).toBe(false);
  });
});

describe('migrateFlowDocument', () => {
  it('migrates unversioned documents to version 1', () => {
    const unversioned = {
      nodes: [
        {
          id: '1',
          type: 'input',
          position: { x: 0, y: 0 },
          data: { label: 'In' },
          width: 150,
          height: 40,
          sourcePosition: 'right',
        },
        {
          id: '2',
          position: { x: 200, y: 0 },
          data: { label: 'Out' },
          measured: { width: 120, height: 36 },
          parentNode: '1',
          style: { color: 'red' },
        },
        { id: '3', position: { x: 0, y: 0 } },
      ],
      edges: [
        {
          id: 'e',
          source: '1',
          sourceHandle: 'a',
          target: '2',
          targetHandle: 'b',
          type: 'default',
          label: 'Yes',
          markerEnd: { type: 'ArrowClosed', color: '#f00', markerUnits: 'userSpaceOnUse' },
        },
        { id: 'f', source: '1', target: '2', type: 'smoothstep', markerStart: 'arrow', label: 3 },
      ],
      viewport: { x: 1, y: 2, zoom: 0.5 },
    };
    const migrated = migrateFlowDocument(unversioned) as Record<string, unknown>;
    expect(migrated.version).toBe(1);
    const nodes = migrated.nodes as Array<Record<string, unknown>>;
    expect(nodes[0]).toEqual({
      id: '1',
      type: 'input',
      position: { x: 0, y: 0 },
      data: { label: 'In' },
      size: { width: 150, height: 40 },
    });
    expect(nodes[1]).toEqual({
      id: '2',
      type: 'default',
      position: { x: 200, y: 0 },
      data: { label: 'Out' },
      size: { width: 120, height: 36 },
      parentId: '1',
    });
    expect(nodes[2]).toEqual({ id: '3', type: 'default', position: { x: 0, y: 0 }, data: {} });
    const edges = migrated.edges as Array<Record<string, unknown>>;
    expect(edges[0]).toEqual({
      id: 'e',
      source: '1',
      sourcePort: 'a',
      target: '2',
      targetPort: 'b',
      kind: 'bezier',
      label: 'Yes',
      markerEnd: { type: 'arrowclosed', color: '#f00', units: 'userSpaceOnUse' },
    });
    expect(edges[1]).toEqual({
      id: 'f',
      source: '1',
      target: '2',
      kind: 'smoothstep',
      markerStart: 'arrow',
      label: '3',
    });
    expect(migrated.viewport).toEqual({ x: 1, y: 2, zoom: 0.5 });
    expect(UNVERSIONED_MIGRATION.to).toBe(1);
  });

  it('chains custom migrations and leaves current documents alone', () => {
    const current = { version: 1, nodes: [], edges: [] };
    expect(migrateFlowDocument(current)).toBe(current);
    const custom = migrateFlowDocument({ version: 0, nodes: [], edges: [], legacy: true }, [
      {
        from: 0,
        to: 1,
        migrate: (input) => ({
          ...input,
          nodes: [{ id: 'm', type: 'migrated', position: { x: 0, y: 0 } }],
          edges: [],
        }),
      },
    ]) as Record<string, unknown>;
    expect(custom.version).toBe(1);
    expect((custom.nodes as unknown[]).length).toBe(1);
    expect(migrateFlowDocument('nope')).toBe('nope');
  });
});

describe('parseFlowDocument', () => {
  it('drops invalid items leniently and reports issues', () => {
    const { document, issues } = parseFlowDocument({
      version: 1,
      nodes: [
        { id: 'a', type: 't', position: { x: 0, y: 0 } },
        { id: 'a', type: 't', position: { x: 0, y: 0 } },
        { id: 'b', type: 't', position: { x: 0, y: 0 }, parentId: 'ghost', size: 'wrong' },
        { id: 'c', type: 't', position: { x: 0, y: 0 }, parentId: 'a' },
        { id: 'no-position', type: 't' },
        'junk',
      ],
      edges: [
        { id: 'e', source: 'a', target: 'c', waypoints: 'bad' },
        { id: 'e', source: 'a', target: 'c' },
        { id: 'dangling', source: 'a', target: 'zzz' },
        { id: 'no-target', source: 'a' },
      ],
      viewport: { x: 1, y: 2, zoom: 3 },
      layout: { direction: 'vertical' },
      metadata: { m: true },
    });
    expect(document.nodes.map((item) => item.id)).toEqual(['a', 'c', 'b']);
    expect(document.nodes[0]!.data).toEqual({});
    expect('parentId' in document.nodes[2]!).toBe(false);
    expect('size' in document.nodes[2]!).toBe(false);
    expect(document.edges.map((item) => item.id)).toEqual(['e']);
    expect('waypoints' in document.edges[0]!).toBe(false);
    expect(document.viewport).toEqual({ x: 1, y: 2, zoom: 3 });
    expect(document.layout).toEqual({ direction: 'vertical' });
    expect(document.metadata).toEqual({ m: true });
    expect(issues.map((issue) => issue.code)).toEqual([
      'duplicate-node-id',
      'invalid-node',
      'invalid-node',
      'invalid-node',
      'missing-parent',
      'invalid-edge',
      'duplicate-edge-id',
      'missing-endpoint',
      'invalid-edge',
    ]);
  });

  it('throws in strict mode and handles non-objects', () => {
    expect(() =>
      parseFlowDocument({ version: 1, nodes: [{ id: 'x' }], edges: [] }, { strict: true }),
    ).toThrow(FlowParseError);
    try {
      parseFlowDocument(null, { strict: true });
    } catch (error) {
      expect(error).toBeInstanceOf(FlowParseError);
      expect((error as FlowParseError).issues[0]?.code).toBe('invalid-document');
    }
    const lenient = parseFlowDocument(42);
    expect(lenient.document).toEqual({ version: 1, nodes: [], edges: [] });
    expect(
      parseFlowDocument({ version: 1, nodes: 'x', edges: null }).issues.map((issue) => issue.code),
    ).toEqual(['invalid-document', 'invalid-document']);
    expect(parseFlowDocument({ version: 7, nodes: [], edges: [] }).issues[0]?.code).toBe(
      'unsupported-version',
    );
  });

  it('migrates unversioned input while parsing', () => {
    const { document, issues } = parseFlowDocument({
      nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
      edges: [{ id: 'e', source: '1', target: '1', sourceHandle: 'h' }],
    });
    expect(issues).toEqual([]);
    expect(document.edges[0]!.sourcePort).toBe('h');
    expect(document.nodes[0]!.type).toBe('default');
  });
});
