import { describe, expect, it } from 'vitest';
import type { FlowChange, FlowDocument, FlowNode, FlowSchema } from '../types.js';
import type { FlowChangeEvent } from './hooks.js';
import { FlowModel } from './model.js';

const schema: FlowSchema = {
  nodes: [
    {
      type: 'proc',
      label: 'Process',
      size: { width: 200, height: 100 },
      ports: [
        { id: 'in', direction: 'input' },
        { id: 'in2', direction: 'input' },
        { id: 'out', direction: 'output' },
      ],
    },
    { type: 'group', label: 'Group', shape: 'group', ports: [] },
    {
      type: 'tiny',
      label: 'Tiny',
      shape: 'compact',
      ports: [{ id: 'o', direction: 'output', side: 'top' }],
    },
  ],
};

function node(id: string, extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type: 'proc', position: { x: 0, y: 0 }, data: {}, ...extra };
}

function doc(): FlowDocument {
  return {
    version: 1,
    nodes: [
      node('g', {
        type: 'group',
        position: { x: 1000, y: 1000 },
        size: { width: 400, height: 300 },
      }),
      node('a', { position: { x: 0, y: 0 } }),
      node('b', { position: { x: 400, y: 0 } }),
      node('child', { parentId: 'g', position: { x: 20, y: 30 }, extent: 'parent' }),
      node('locked', { position: { x: 0, y: 500 }, deletable: false }),
    ],
    edges: [
      { id: 'ab', source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' },
      { id: 'a-child', source: 'a', target: 'child' },
      { id: 'a-locked', source: 'a', target: 'locked', deletable: false },
    ],
  };
}

function make(options: ConstructorParameters<typeof FlowModel>[0] = {}): FlowModel {
  return new FlowModel({ document: doc(), schema, ...options });
}

describe('FlowModel', () => {
  it('exposes the document, rects and definitions', () => {
    const model = make();
    expect(model.nodes).toBe(model.document.nodes);
    expect(model.getNode('a')?.id).toBe('a');
    expect(model.getEdge('ab')?.id).toBe('ab');
    expect(model.definitionOf('a')?.label).toBe('Process');
    expect(model.definitionOf(model.getNode('g')!)?.shape).toBe('group');
    expect(model.nodeRect('a')).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    expect(model.nodeRect('g')).toEqual({ x: 1000, y: 1000, width: 400, height: 300 });
    expect(model.nodeRect('child')).toEqual({ x: 1020, y: 1030, width: 200, height: 100 });
    expect(model.nodeRect('nope')).toBeUndefined();
    model.measure('a', { width: 10, height: 10 });
    expect(model.nodeRect('a')).toEqual({ x: 0, y: 0, width: 10, height: 10 });
    const bare = new FlowModel({
      document: { version: 1, nodes: [node('x', { type: 'unknown' })], edges: [] },
    });
    expect(bare.nodeRect('x')).toEqual({ x: 0, y: 0, width: 240, height: 96 });
    expect(bare.viewport).toEqual({ x: 0, y: 0, zoom: 1 });
  });

  it('normalizes node order on construction', () => {
    const model = new FlowModel({
      document: { version: 1, nodes: [node('c', { parentId: 'p' }), node('p')], edges: [] },
    });
    expect(model.nodes.map((item) => item.id)).toEqual(['p', 'c']);
  });

  it('applies changes persistently and reports affected ids and dirty rects', () => {
    const model = make();
    const before = model.document;
    const events: FlowChangeEvent[] = [];
    model.subscribe((event) => events.push(event));
    const result = model.apply([{ type: 'node-position', id: 'a', position: { x: 10, y: 10 } }], {
      reason: 'drag',
    });
    expect(result.applied).toBe(true);
    expect(result.inverse).toEqual([{ type: 'node-position', id: 'a', position: { x: 0, y: 0 } }]);
    expect(model.document).not.toBe(before);
    expect(model.nodes.map((item) => item.id)).toEqual(['g', 'child', 'a', 'b', 'locked']);
    expect(model.getNode('b')).toBe(before.nodes.find((item) => item.id === 'b'));
    expect(model.getNode('a')).not.toBe(before.nodes.find((item) => item.id === 'a'));
    expect(model.document.edges).toBe(before.edges);
    expect(events).toHaveLength(1);
    expect(events[0]!.reason).toBe('drag');
    expect(events[0]!.origin).toBe('user');
    expect([...events[0]!.affectedNodes]).toEqual(['a']);
    expect([...events[0]!.affectedEdges].sort()).toEqual(['a-child', 'a-locked', 'ab']);
    expect(events[0]!.dirtyRects).toEqual([{ x: -8, y: -8, width: 226, height: 126 }]);
    expect(events[0]!.previousDocument).toBe(before);
    const noop = model.apply([{ type: 'node-position', id: 'a', position: { x: 10, y: 10 } }]);
    expect(noop.applied).toBe(false);
    expect(events).toHaveLength(1);
  });

  it('cascades removals through descendants and connected edges, honoring deletable', () => {
    const model = make();
    const result = model.removeNodes(['a']);
    expect(result.changes.map((change) => (change as { id: string }).id)).toEqual([
      'ab',
      'a-child',
      'a',
    ]);
    expect(model.getEdge('a-locked')).toBeDefined();
    expect(model.removeNodes(['locked']).applied).toBe(false);
    const other = make();
    other.removeNodes(['g']);
    expect(other.getNode('child')).toBeUndefined();
    expect(other.getEdge('a-child')).toBeUndefined();
    const forward = make();
    const backward = make();
    forward.removeNodes(['g', 'b']);
    backward.removeNodes(['b', 'g']);
    expect(forward.document).toEqual(backward.document);
  });

  it('clamps parent-relative positions to the parent extent', () => {
    const model = make();
    model.apply([{ type: 'node-position', id: 'child', position: { x: 390, y: -40 } }]);
    expect(model.getNode('child')?.position).toEqual({ x: 200, y: 0 });
    model.apply([{ type: 'node-position', id: 'child', position: { x: 390, y: -40 } }], {
      clamp: false,
    });
    expect(model.getNode('child')?.position).toEqual({ x: 390, y: -40 });
  });

  it('lets middleware veto or transform and reports the vetoer', () => {
    const events: FlowChangeEvent[] = [];
    const seenAfter: string[] = [];
    const model = make({
      middleware: [
        {
          name: 'guard',
          before: (changes, context) => (context.reason === 'drag' ? false : undefined),
        },
        {
          name: 'tagger',
          before: (changes) => [...changes, { type: 'node-select', id: 'a', selected: true }],
          after: (event) => seenAfter.push(event.origin),
        },
      ],
    });
    model.subscribe((event) => events.push(event));
    const vetoed = model.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 1 } }], {
      reason: 'drag',
    });
    expect(vetoed).toEqual({ applied: false, changes: [], inverse: [], vetoedBy: 'guard' });
    expect(model.getNode('a')?.position).toEqual({ x: 0, y: 0 });
    expect(events).toHaveLength(0);
    const ok = model.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 1 } }]);
    expect(ok.changes).toHaveLength(2);
    expect(model.getNode('a')?.selected).toBe(true);
    expect(seenAfter).toEqual(['user']);
    const off = model.use({ before: () => false });
    expect(
      model.apply([{ type: 'node-position', id: 'a', position: { x: 2, y: 2 } }]).vetoedBy,
    ).toBe('middleware:2');
    off();
    expect(
      model.apply([{ type: 'node-position', id: 'a', position: { x: 2, y: 2 } }]).applied,
    ).toBe(true);
    expect(
      model.apply([{ type: 'node-position', id: 'a', position: { x: 3, y: 3 } }], {
        middleware: [{ name: 'once', before: () => false }],
      }).vetoedBy,
    ).toBe('once');
    const previewed: number[] = [];
    model.apply([{ type: 'node-position', id: 'a', position: { x: 7, y: 7 } }], {
      middleware: [
        {
          before: (changes, context) => {
            previewed.push(
              context.preview().nodes.find((item) => item.id === 'a')!.position.x,
              context.model.getNode('a')!.position.x,
            );
          },
        },
      ],
    });
    expect(previewed).toEqual([7, 2]);
  });

  it('records history and undoes/redoes through hooks', () => {
    const model = make();
    const original = model.document;
    const states: number[] = [];
    model.on('history', (state) => states.push(state.depth));
    model.apply([{ type: 'node-position', id: 'a', position: { x: 10, y: 10 } }], {
      label: 'Move',
    });
    model.removeNodes(['b'], { label: 'Delete' });
    model.select(['a']);
    model.apply([{ type: 'viewport', viewport: { x: 1, y: 1, zoom: 2 } }]);
    model.measure('a', { width: 5, height: 5 });
    expect(model.history).toEqual({ canUndo: true, canRedo: false, depth: 2, undoLabel: 'Delete' });
    expect(states).toEqual([1, 2]);
    expect(model.undo()).toBe(true);
    expect(model.getNode('b')).toBeDefined();
    expect(model.getEdge('ab')).toBeDefined();
    expect(model.history.redoLabel).toBe('Delete');
    expect(model.undo()).toBe(true);
    expect(model.undo()).toBe(false);
    // Selection, viewport and measurement were never recorded, so they survive undo.
    expect(model.getNode('a')?.selected).toBe(true);
    expect(model.viewport).toEqual({ x: 1, y: 1, zoom: 2 });
    expect(model.nodeRect('a')?.width).toBe(5);
    const restored = model.toJSON({ viewport: false });
    const expected = new FlowModel({ document: original }).toJSON({ viewport: false });
    expect(restored).toEqual(expected);
    expect(model.redo()).toBe(true);
    expect(model.getNode('a')?.position).toEqual({ x: 10, y: 10 });
    expect(model.redo()).toBe(true);
    expect(model.getNode('b')).toBeUndefined();
    expect(model.redo()).toBe(false);
    const guarded = make({
      middleware: [
        {
          name: 'owner',
          before: (changes, context) => (context.origin === 'undo' ? false : undefined),
        },
      ],
    });
    guarded.apply([{ type: 'node-position', id: 'a', position: { x: 3, y: 3 } }]);
    expect(guarded.undo()).toBe(false);
    expect(guarded.history.depth).toBe(1);
    const disabled = make({ history: false });
    disabled.apply([{ type: 'node-position', id: 'a', position: { x: 3, y: 3 } }]);
    expect(disabled.history).toEqual({ canUndo: false, canRedo: false, depth: 0 });
    expect(disabled.undo()).toBe(false);
  });

  it('coalesces keyed applies within the window', () => {
    let now = 0;
    const model = make({ now: () => now });
    model.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 0 } }], {
      coalesce: 'nudge',
      reason: 'keyboard',
    });
    now = 100;
    model.apply([{ type: 'node-position', id: 'a', position: { x: 2, y: 0 } }], {
      coalesce: 'nudge',
      reason: 'keyboard',
    });
    expect(model.history.depth).toBe(1);
    now = 1000;
    model.apply([{ type: 'node-position', id: 'a', position: { x: 3, y: 0 } }], {
      coalesce: 'nudge',
      reason: 'keyboard',
    });
    expect(model.history.depth).toBe(2);
    model.undo();
    expect(model.getNode('a')?.position).toEqual({ x: 2, y: 0 });
    model.undo();
    expect(model.getNode('a')?.position).toEqual({ x: 0, y: 0 });
  });

  it('squashes transactions into one entry and rolls back without recording', () => {
    const model = make();
    const events: FlowChangeEvent[] = [];
    model.subscribe((event) => events.push(event));
    const tx = model.transaction({ label: 'Drag', reason: 'drag' });
    expect(tx.open).toBe(true);
    tx.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 1 }, dragging: true }]);
    tx.apply([{ type: 'node-position', id: 'a', position: { x: 2, y: 2 }, dragging: true }]);
    tx.apply([{ type: 'node-position', id: 'a', position: { x: 3, y: 3 } }]);
    expect(events).toHaveLength(3);
    expect(events[0]!.transaction).toBe(tx.id);
    expect(model.history.depth).toBe(0);
    const entry = tx.commit();
    expect(tx.open).toBe(false);
    expect(entry?.changes).toEqual([{ type: 'node-position', id: 'a', position: { x: 3, y: 3 } }]);
    expect(entry?.inverse).toEqual([{ type: 'node-position', id: 'a', position: { x: 0, y: 0 } }]);
    expect(model.history).toEqual({ canUndo: true, canRedo: false, depth: 1, undoLabel: 'Drag' });
    expect(tx.apply([{ type: 'node-position', id: 'a', position: { x: 9, y: 9 } }]).applied).toBe(
      false,
    );

    const rolled = model.transaction();
    rolled.apply([{ type: 'node-position', id: 'b', position: { x: 1, y: 1 } }]);
    rolled.apply([{ type: 'node-remove', id: 'b' }]);
    const back = rolled.rollback();
    expect(back.applied).toBe(true);
    expect(model.getNode('b')?.position).toEqual({ x: 400, y: 0 });
    expect(model.getEdge('ab')).toBeDefined();
    expect(model.history.depth).toBe(1);
    expect(events[events.length - 1]!.origin).toBe('rollback');
    expect(model.transaction().commit()).toBeUndefined();

    const outer = model.transaction({ label: 'Outer' });
    const inner = model.transaction();
    inner.apply([{ type: 'node-position', id: 'a', position: { x: 5, y: 5 } }]);
    expect(inner.commit()).toBeUndefined();
    expect(outer.open).toBe(true);
    outer.apply([{ type: 'node-position', id: 'b', position: { x: 5, y: 5 } }]);
    expect(outer.commit()?.changes).toHaveLength(2);
    expect(model.history.undoLabel).toBe('Outer');
  });

  it('queues reentrant applies until the current one finishes', () => {
    const model = make();
    const order: string[] = [];
    model.subscribe((event) => {
      order.push(`event:${(event.changes[0] as { id: string }).id}`);
      if (
        event.changes[0]!.type === 'node-position' &&
        (event.changes[0] as { id: string }).id === 'a'
      ) {
        const nested = model.apply([{ type: 'node-position', id: 'b', position: { x: 1, y: 1 } }]);
        expect(nested.queued).toBe(true);
        order.push('nested-returned');
      }
    });
    model.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 1 } }]);
    expect(order).toEqual(['event:a', 'nested-returned', 'event:b']);
    expect(model.getNode('b')?.position).toEqual({ x: 1, y: 1 });
  });

  it('keeps measurement out of the document, history and JSON', () => {
    const model = make();
    const events: FlowChangeEvent[] = [];
    model.subscribe((event) => events.push(event));
    const before = model.document;
    const result = model.measure('a', { width: 123, height: 45 }, [
      { id: 'out', x: 119, y: 10, width: 8, height: 8, side: 'right' },
    ]);
    expect(result.applied).toBe(false);
    expect(model.document).toBe(before);
    expect(events).toHaveLength(1);
    expect(events[0]!.origin).toBe('measure');
    expect(events[0]!.changes[0]!.type).toBe('node-measure');
    expect([...events[0]!.affectedEdges].sort()).toEqual(['a-child', 'a-locked', 'ab']);
    expect(model.history.depth).toBe(0);
    expect(model.nodeRect('a')).toEqual({ x: 0, y: 0, width: 123, height: 45 });
    expect(model.ports('a').find((port) => port.id === 'out')?.measured).toBe(true);
    expect(model.portGeometry('a', 'out')).toEqual({
      id: 'out',
      x: 119,
      y: 10,
      width: 8,
      height: 8,
      side: 'right',
    });
    expect(JSON.stringify(model.toJSON())).not.toContain('123');
    expect(model.measure('a', { width: 123, height: 45 }).applied).toBe(false);
    expect(events).toHaveLength(1);
    expect(model.measure('ghost', { width: 1, height: 1 }).applied).toBe(false);
    model.removeNodes(['a']);
    expect(model.measuredSize('a')).toBeUndefined();
  });

  it('reconciles an owner document by identity without history', () => {
    const model = make();
    const events: FlowChangeEvent[] = [];
    model.subscribe((event) => events.push(event));
    const current = model.document;
    const byId = (id: string) => current.nodes.find((item) => item.id === id)!;
    const replacedA = { ...byId('a'), position: { x: 50, y: 50 } };
    const owner: FlowDocument = {
      ...current,
      nodes: [byId('g'), byId('child'), replacedA, byId('b'), node('new')],
      edges: [current.edges[0]!, current.edges[2]!],
      viewport: { x: 9, y: 9, zoom: 1 },
    };
    const result = model.reconcile(owner);
    expect(result.applied).toBe(true);
    expect(result.changes).toEqual([
      { type: 'node-replace', id: 'a', node: replacedA },
      { type: 'node-add', node: owner.nodes[4], index: 4 },
      { type: 'node-remove', id: 'locked' },
      { type: 'edge-remove', id: 'a-child' },
      { type: 'viewport', viewport: { x: 9, y: 9, zoom: 1 } },
    ]);
    expect(model.document).toBe(owner);
    expect(model.getNode('a')).toBe(replacedA);
    expect(model.getNode('b')).toBe(byId('b'));
    expect(model.history.depth).toBe(0);
    expect(events[0]!.origin).toBe('external');
    expect(events[0]!.inverse.length).toBe(5);
    expect(model.spatialIndex.has('new')).toBe(true);
    expect(model.spatialIndex.has('locked')).toBe(false);
    expect(model.reconcile(owner).applied).toBe(false);
    expect(events).toHaveLength(1);
    const unordered: FlowDocument = {
      version: 1,
      nodes: [node('c', { parentId: 'p' }), node('p')],
      edges: [],
    };
    model.reconcile(unordered);
    expect(model.nodes.map((item) => item.id)).toEqual(['p', 'c']);
    const vetoing = make({ middleware: [{ before: () => false }] });
    expect(vetoing.reconcile({ version: 1, nodes: [], edges: [] }).applied).toBe(true);
    expect(vetoing.nodes).toHaveLength(0);
  });

  it('loads documents and clears history unless kept', () => {
    const model = make();
    model.apply([{ type: 'node-position', id: 'a', position: { x: 1, y: 1 } }]);
    model.load({ version: 1, nodes: [node('solo')], edges: [] });
    expect(model.nodes.map((item) => item.id)).toEqual(['solo']);
    expect(model.history.depth).toBe(0);
    model.apply([{ type: 'node-position', id: 'solo', position: { x: 1, y: 1 } }]);
    model.load({ version: 1, nodes: [node('solo2')], edges: [] }, { keepHistory: true });
    expect(model.history.depth).toBe(1);
  });

  it('connects with validation, strict reorientation and reconnect', () => {
    const model = make({ idFactory: (kind) => `${kind}-made` });
    const rejected = model.connect({
      source: 'a',
      sourcePort: 'out',
      target: 'b',
      targetPort: 'in',
    });
    expect(rejected.applied).toBe(false);
    expect(rejected.validation.reasons).toEqual(['duplicate', 'input-occupied']);
    const flipped = model.connect(
      { source: 'b', sourcePort: 'in2', target: 'a', targetPort: 'out' },
      { animated: true },
      { reason: 'connect' },
    );
    expect(flipped.applied).toBe(true);
    expect(flipped.edge).toEqual({
      id: 'edge-made',
      source: 'a',
      sourcePort: 'out',
      target: 'b',
      targetPort: 'in2',
      animated: true,
    });
    expect(model.getEdge('edge-made')).toBe(flipped.edge);
    const moved = model.connect(
      { source: 'b', sourcePort: 'out', target: 'child', targetPort: 'in' },
      {},
      { reconnect: 'a-child' },
    );
    expect(moved.applied).toBe(true);
    expect(model.getEdge('a-child')).toMatchObject({
      source: 'b',
      sourcePort: 'out',
      target: 'child',
      targetPort: 'in',
    });
    expect(moved.edge?.id).toBe('a-child');
    expect(
      model.connect({ source: 'b', target: 'child' }, {}, { reconnect: 'missing' }).applied,
    ).toBe(false);
    const predicate = make({ isValidConnection: () => 'nope' });
    expect(
      predicate.connect({ source: 'b', sourcePort: 'out', target: 'a', targetPort: 'in' })
        .validation.message,
    ).toBe('nope');
  });

  it('selects in replace, add and toggle modes', () => {
    const model = make();
    model.apply([{ type: 'node-update', id: 'locked', patch: { selectable: false } }]);
    model.select(['a', 'ab', 'locked']);
    expect(model.selection).toEqual({ nodes: ['a'], edges: ['ab'] });
    model.select(['b'], 'add');
    expect(model.selection.nodes).toEqual(['a', 'b']);
    model.select(['a', 'g'], 'toggle');
    expect(model.selection.nodes).toEqual(['g', 'b']);
    model.select(['ghost'], 'toggle');
    model.clearSelection();
    expect(model.selection).toEqual({ nodes: [], edges: [] });
    expect(model.selection).toBe(model.selection);
  });

  it('resolves ports with instance overrides and endpoints by side rules', () => {
    const model = make();
    const ports = model.ports('a');
    expect(
      ports.map((port) => `${port.id}:${port.geometry.side}:${port.index}/${port.count}`),
    ).toEqual(['in:left:0/2', 'in2:left:1/2', 'out:right:0/1']);
    expect(ports[0]!.geometry).toEqual({
      id: 'in',
      x: -4,
      y: 100 * (1 / 3) - 4,
      width: 8,
      height: 8,
      side: 'left',
    });
    expect(model.ports('a')).toBe(ports);
    model.apply([
      {
        type: 'node-update',
        id: 'a',
        patch: {
          ports: [
            { id: 'in2', hidden: true },
            { id: 'extra', direction: 'output', side: 'bottom' },
          ],
        },
      },
    ]);
    const merged = model.ports('a');
    expect(merged.map((port) => port.id)).toEqual(['in', 'in2', 'out', 'extra']);
    expect(merged.find((port) => port.id === 'in')?.count).toBe(1);
    expect(merged.find((port) => port.id === 'extra')?.geometry.side).toBe('bottom');
    expect(model.ports('nope')).toEqual([]);

    const source = model.endpoint('ab', 'source');
    const target = model.endpoint('ab', 'target');
    expect(source).toMatchObject({
      nodeId: 'a',
      portId: 'out',
      side: 'right',
      point: { x: 204, y: 50 },
    });
    expect(target).toMatchObject({
      nodeId: 'b',
      portId: 'in',
      side: 'left',
      point: { x: 396, y: 100 * (1 / 3) },
    });
    expect(model.endpoints('ab')?.target).toEqual(target);
    expect(model.endpoint('missing', 'source')).toBeUndefined();

    // Vertical layouts flip the defaults for routed edges; smoothstep still faces the other end.
    model.reconcile({ ...model.document, layout: { direction: 'vertical' } });
    const routed = { ...model.getEdge('ab')!, kind: 'orthogonal' as const };
    expect(model.endpoint(routed, 'source')?.side).toBe('bottom');
    expect(model.endpoint(routed, 'target')?.side).toBe('top');
    expect(model.endpoint('ab', 'source')?.side).toBe('right');

    // Declared sides win over layout, measured geometry wins over defaults.
    const tiny = model.addNode(node('t', { type: 'tiny', position: { x: 800, y: 800 } })).node;
    const edge = model.addEdge({
      source: tiny.id,
      sourcePort: 'o',
      target: 'a',
      targetPort: 'in',
    }).edge;
    expect(model.endpoint(edge, 'source')?.side).toBe('top');
    model.measure('a', undefined, [
      { id: 'in', x: 50, y: 100, width: 10, height: 10, side: 'bottom' },
    ]);
    expect(model.endpoint(edge, 'target')).toMatchObject({
      side: 'bottom',
      point: { x: 55, y: 110 },
    });

    // Without declared or measured sides, a bezier faces the other end; orthogonal keeps the default.
    const facing = new FlowModel({
      document: {
        version: 1,
        nodes: [
          node('top', { position: { x: 0, y: 0 } }),
          node('below', { position: { x: 0, y: 600 } }),
        ],
        edges: [
          { id: 'e', source: 'top', target: 'below', kind: 'bezier' },
          { id: 'o', source: 'top', target: 'below', kind: 'orthogonal' },
        ],
      },
      schema,
    });
    expect(facing.endpoint('e', 'source')?.side).toBe('bottom');
    expect(facing.endpoint('e', 'target')?.side).toBe('top');
    expect(facing.endpoint('o', 'source')?.side).toBe('right');
    const bare = new FlowModel({
      document: {
        version: 1,
        nodes: [node('x', { position: { x: 0, y: 0 } }), node('y', { position: { x: 500, y: 0 } })],
        edges: [{ id: 'e', source: 'x', target: 'y' }],
      },
    });
    expect(bare.endpoint('e', 'source')).toMatchObject({
      portId: undefined,
      side: 'right',
      point: { x: 240, y: 48 },
    });
  });

  it('answers graph and spatial queries', () => {
    const model = make();
    expect(model.incomers('b').map((item) => item.id)).toEqual(['a']);
    expect(model.outgoers('a').map((item) => item.id)).toEqual(['b', 'child', 'locked']);
    expect(model.connectedEdges(['b']).map((item) => item.id)).toEqual(['ab']);
    expect(model.portConnections('a')).toEqual(['ab', 'a-child', 'a-locked']);
    expect(model.portConnections('a', 'output', 'out')).toEqual(['ab', 'a-child', 'a-locked']);
    expect(model.portConnections('child', 'input', 'in')).toEqual(['a-child']);
    expect(model.portConnections('child', 'input', 'in2')).toEqual([]);
    expect(model.topologicalOrder()).toEqual(['g', 'a', 'child', 'b', 'locked']);
    expect(model.hasCycle()).toBe(false);
    expect(model.wouldCreateCycle('b', 'a')).toBe(true);
    expect(model.wouldCreateCycle('b', 'a', 'ab')).toBe(false);
    expect([...model.reachable('a')].sort()).toEqual(['b', 'child', 'locked']);
    expect(model.connectedComponents()).toEqual([['g'], ['child', 'a', 'b', 'locked']]);
    expect(model.bounds()).toEqual({ x: 0, y: 0, width: 1400, height: 1300 });
    expect(model.bounds(['a', 'b'])).toEqual({ x: 0, y: 0, width: 600, height: 100 });
    expect(model.children('g')).toEqual(['child']);
    expect(model.descendants('g')).toEqual(['child']);
    expect(model.ancestors('child')).toEqual(['g']);
    expect(model.absolutePosition('child')).toEqual({ x: 1020, y: 1030 });
    expect(model.toRelativePosition({ x: 1020, y: 1030 }, 'g')).toEqual({ x: 20, y: 30 });
    expect(model.toRelativePosition({ x: 5, y: 5 })).toEqual({ x: 5, y: 5 });

    expect(model.nodesInRect({ x: -10, y: -10, width: 700, height: 200 })).toEqual(['a', 'b']);
    expect(model.nodesInRect({ x: -10, y: -10, width: 300, height: 200 }, false)).toEqual(['a']);
    expect(model.nodeAt({ x: 1030, y: 1040 })?.id).toBe('child');
    expect(model.nodeAt({ x: 1005, y: 1005 })?.id).toBe('g');
    expect(model.nodeAt({ x: -50, y: -50 })).toBeUndefined();
    model.apply([{ type: 'node-position', id: 'b', position: { x: 100, y: 0 } }]);
    expect(model.nodeAt({ x: 150, y: 50 })?.id).toBe('b');
    model.select(['a']);
    expect(model.nodeAt({ x: 150, y: 50 })?.id).toBe('a');
    expect(model.nodeZ('a')).toBe(1000);
    expect(model.nodeZ('child')).toBe(1);

    const near = model.portNear({ x: 206, y: 52 }, 20);
    expect(near).toMatchObject({
      nodeId: 'a',
      distance: Math.hypot(6, 2),
      point: { x: 200, y: 50 },
    });
    expect(near?.port.id).toBe('out');
    expect(
      model.portNear({ x: 206, y: 52 }, 20, (port) => port.direction === 'input'),
    ).toBeUndefined();
    expect(model.portNear({ x: -2, y: 35 }, 20)).toMatchObject({ nodeId: 'a', distance: 0 });
    expect(
      model.portNear({ x: -2, y: 60 }, 20, (port) => port.direction === 'input')?.port.id,
    ).toBe('in2');
    expect(model.portNear({ x: 5000, y: 5000 }, 20)).toBeUndefined();
    model.apply([{ type: 'node-update', id: 'a', patch: { hidden: true } }]);
    expect(model.spatialIndex.has('a')).toBe(false);
    expect(model.nodesInRect({ x: -10, y: -10, width: 50, height: 50 })).toEqual([]);
  });

  it('serializes, parses and migrates', () => {
    const model = make();
    model.select(['a']);
    expect(model.toJSON().nodes.every((item) => !('selected' in item))).toBe(true);
    expect(model.toJSON({ selection: true }).nodes.find((item) => item.id === 'a')!.selected).toBe(
      true,
    );
    const parsed = FlowModel.fromJSON(
      {
        nodes: [{ id: '1', position: { x: 0, y: 0 }, data: {} }],
        edges: [{ id: 'e', source: '1', target: '1', sourceHandle: 'h' }],
      },
      { schema },
    );
    expect(parsed.getEdge('e')?.sourcePort).toBe('h');
    expect(parsed.schema).toBe(schema);
    expect(() =>
      FlowModel.fromJSON({ version: 1, nodes: [{ id: 'x' }], edges: [] }, { strict: true }),
    ).toThrow();
    expect((FlowModel.migrate({ nodes: [], edges: [] }) as { version: number }).version).toBe(1);
  });

  it('adds, moves and updates through the convenience API', () => {
    const model = make();
    const added = model.addNode({ type: 'proc', position: { x: 1, y: 1 }, data: {} }, { index: 0 });
    expect(added.applied).toBe(true);
    expect(added.node.id).toBe('node-1');
    expect(model.nodes[0]).toBe(added.node);
    const dup = model.addNode({ id: 'a', type: 'proc', position: { x: 1, y: 1 }, data: {} });
    expect(dup.applied).toBe(false);
    expect(model.moveNodes(['a', 'b'], { x: 3, y: 4 }, { snap: [10, 10] }).applied).toBe(false);
    const moved = model.moveNodes(
      ['a', 'b', 'ghost'],
      { x: 13, y: 4 },
      { snap: [10, 10], dragging: true },
    );
    expect(moved.changes).toEqual([
      { type: 'node-position', id: 'a', position: { x: 10, y: 0 }, dragging: true },
      { type: 'node-position', id: 'b', position: { x: 410, y: 0 }, dragging: true },
    ]);
    expect(model.moveNodes(['a'], { x: 7, y: 8 }).changes).toEqual([
      { type: 'node-position', id: 'a', position: { x: 17, y: 8 } },
    ]);
    model.updateNodeData('a', { k: 1 });
    model.updateNodeData('a', { j: 2 });
    expect(model.getNode('a')?.data).toEqual({ k: 1, j: 2 });
    expect(model.updateNodeData('ghost', {}).applied).toBe(false);
    model.updateNode('a', { label: 'A' });
    expect(model.getNode('a')?.label).toBe('A');
    model.updateEdge('ab', { animated: true });
    expect(model.getEdge('ab')?.animated).toBe(true);
    expect(model.removeEdges(['ab']).applied).toBe(true);
    const seen: Array<FlowSchema | undefined> = [];
    model.on('schema', (next) => seen.push(next));
    model.schema = undefined;
    model.schema = undefined;
    expect(seen).toEqual([undefined]);
    expect(model.nodeRect('a')?.width).toBe(240);
  });

  it('resolves edge kinds and options through the schema', () => {
    const model = new FlowModel({
      document: { version: 1, nodes: [], edges: [] },
      schema: {
        nodes: [],
        edgeKinds: { bezier: { curvature: 0.5 } },
        rules: { defaultEdgeKind: 'bezier' },
      },
    });
    expect(model.edgeKind({ id: 'e', source: 'a', target: 'b' })).toBe('bezier');
    expect(model.edgeOptions({ id: 'e', source: 'a', target: 'b' }).curvature).toBe(0.5);
    expect(
      model.edgeOptions({ id: 'e', source: 'a', target: 'b', options: { curvature: 0.1 } })
        .curvature,
    ).toBe(0.1);
    expect(
      model.edgeOptions({ id: 'e', source: 'a', target: 'b', kind: 'step' }).borderRadius,
    ).toBe(0);
    const plain = new FlowModel();
    expect(plain.edgeKind({ id: 'e', source: 'a', target: 'b' })).toBe('smoothstep');
  });

  it('keeps every FlowChange type round-trippable through undo', () => {
    const model = make();
    const original = model.toJSON();
    const batches: FlowChange[][] = [
      [{ type: 'node-add', node: node('n1'), index: 1 }],
      [{ type: 'node-replace', id: 'a', node: node('a', { position: { x: 9, y: 9 } }) }],
      [{ type: 'node-update', id: 'b', patch: { hidden: true, label: 'B' } }],
      [{ type: 'node-size', id: 'b', size: { width: 1, height: 1 } }],
      [{ type: 'node-data', id: 'b', data: { x: 1 } }],
      [{ type: 'edge-add', edge: { id: 'e9', source: 'a', target: 'b' }, index: 0 }],
      [{ type: 'edge-replace', id: 'ab', edge: { id: 'ab', source: 'b', target: 'a' } }],
      [{ type: 'edge-update', id: 'a-child', patch: { label: 'x' } }],
      [{ type: 'edge-waypoints', id: 'a-child', waypoints: [{ x: 1, y: 1 }] }],
      [{ type: 'layout-settings', layout: { direction: 'vertical', rankSpacing: 60 } }],
      [{ type: 'node-remove', id: 'g' }],
      [{ type: 'edge-remove', id: 'a-locked' }],
    ];
    for (const batch of batches) expect(model.apply(batch, { cascade: false }).applied).toBe(true);
    expect(model.history.depth).toBe(batches.length);
    while (model.undo()) {
      /* unwind */
    }
    expect(model.toJSON()).toEqual(original);
    while (model.redo()) {
      /* replay */
    }
    expect(model.getEdge('a-locked')).toBeUndefined();
    expect(model.getNode('g')).toBeUndefined();
  });

  it('applies layout settings as a document change that moves default port sides', () => {
    const model = make();
    const sides = () => model.ports('a').map((port) => `${port.id}:${port.geometry.side}`);
    expect(sides()).toEqual(['in:left', 'in2:left', 'out:right']);
    // Measured geometry from the old direction must not pin the sides.
    model.measure('a', { width: 200, height: 100 }, [
      { id: 'in', side: 'left', x: 0, y: 40, width: 8, height: 8 },
    ]);
    const events: FlowChangeEvent[] = [];
    model.subscribe((event) => events.push(event));
    const result = model.apply([{ type: 'layout-settings', layout: { direction: 'vertical' } }]);
    expect(result.applied).toBe(true);
    expect(model.document.layout).toEqual({ direction: 'vertical' });
    expect(model.layoutDirection).toBe('vertical');
    expect(sides()).toEqual(['in:top', 'in2:top', 'out:bottom']);
    expect(events.at(-1)!.affectedNodes.has('a')).toBe(true);
    expect(events.at(-1)!.affectedEdges.has('ab')).toBe(true);
    // The same settings again are a no-op.
    expect(
      model.apply([{ type: 'layout-settings', layout: { direction: 'vertical' } }]).applied,
    ).toBe(false);
    expect(model.toJSON().layout).toEqual({ direction: 'vertical' });
    expect(model.undo()).toBe(true);
    expect(model.document.layout).toBeUndefined();
    expect(sides()).toEqual(['in:left', 'in2:left', 'out:right']);
  });

  it('reconciles a changed layout direction from an owner document', () => {
    const model = make();
    const next = { ...model.document, layout: { direction: 'vertical' as const } };
    const result = model.reconcile(next);
    expect(result.changes).toContainEqual({ type: 'layout-settings', layout: next.layout });
    expect(model.layoutDirection).toBe('vertical');
    expect(model.history.depth).toBe(0);
  });
});
