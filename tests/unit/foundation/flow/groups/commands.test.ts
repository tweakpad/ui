import { describe, expect, it } from 'vitest';
import { FlowModel } from '../../../../../src/foundation/flow/model/model.js';
import { flattenFlowGroups } from '../../../../../src/foundation/flow/groups/flatten.js';
import {
  expandParentChanges,
  exposeConnectionChanges,
  groupNodesChanges,
  groupPortChanges,
  groupResizeChanges,
  groupResizeSnapshot,
  reparentChanges,
  ungroupChanges,
} from '../../../../../src/foundation/flow/groups/commands.js';
import type {
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSchema,
} from '../../../../../src/foundation/flow/types.js';
import { edge, group, ids, model, nested, schema, step } from './fixture.js';

const RAW = { cascade: false, clamp: false } as const;

function apply(target: FlowModel, changes: readonly FlowChange[]): void {
  const result = target.apply(changes, RAW);
  expect(result.vetoedBy).toBeUndefined();
}

/** Leaf-to-leaf connections of a document, as `source.port>target.port` strings. */
function pairs(target: FlowModel): string[] {
  return flattenFlowGroups(target.document, { schema: target.schema })
    .document.edges.map(
      (item) => `${item.source}.${item.sourcePort}>${item.target}.${item.targetPort}`,
    )
    .sort();
}

function crossings(target: FlowModel): string[] {
  return target
    .validate()
    .filter((issue) => issue.code === 'boundary-crossing')
    .map((issue) => issue.edgeId!);
}

function flat(): FlowDocument {
  return {
    version: 1,
    nodes: [step('p', 0, 0), step('q', 300, 0), step('s', 300, 200), step('r', 600, 0)],
    edges: [
      edge('e1', 'p', 'out', 'q', 'in', { label: 'one', data: { weight: 2 } }),
      edge('e2', 'q', 'out', 'r', 'in', { kind: 'bezier', markerEnd: 'arrow' }),
      edge('e3', 'p', 'out', 's', 'in'),
    ],
  };
}

describe('group commands', () => {
  it('apply a node and edges on it in one change list', () => {
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: { version: 1, nodes: [step('a', 0, 0)], edges: [] },
      schema,
    });
    const result = target.apply(
      [
        { type: 'node-add', node: step('n', 200, 0) },
        { type: 'edge-add', edge: edge('e', 'a', 'out', 'n', 'in') },
        { type: 'edge-add', edge: edge('f', 'n', 'out', 'a', 'in') },
      ],
      RAW,
    );
    expect(result.applied).toBe(true);
    expect(target.getEdge('e')).toMatchObject({ source: 'a', target: 'n' });
    expect(target.portConnections('n')).toEqual(['f', 'e']);
    expect(target.validate()).toEqual([]);
    expect(target.undo()).toBe(true);
    expect(target.getNode('n')).toBeUndefined();
    expect(target.edges).toEqual([]);
    expect(target.redo()).toBe(true);
    expect(target.edges.map((item) => item.id)).toEqual(['e', 'f']);
  });

  it('groups and ungroups back to the same document, keeping the segment ids', () => {
    const original = flat();
    const target = new FlowModel<FlowNode, FlowEdge>({ document: original, schema });
    const before = pairs(target);
    const grouped = groupNodesChanges(target, { ids: ['q', 's'], label: 'Stage' }, ids())!;
    expect(grouped.groupId).toBe('node-1');
    expect(grouped.members).toEqual(['q', 's']);
    apply(target, grouped.changes);
    const g = target.getNode('node-1')!;
    expect(g).toMatchObject({
      type: 'group',
      label: 'Stage',
      position: { x: 284, y: -40 },
      size: { width: 132, height: 306 },
    });
    expect(target.document.nodes.map((node) => node.id)).toEqual(['p', 'node-1', 'q', 's', 'r']);
    expect(target.getNode('q')).toMatchObject({ parentId: 'node-1', position: { x: 16, y: 40 } });
    // p feeds q and s through one shared input; q leaves through one output.
    expect(g.ports).toEqual([
      { id: 'in', direction: 'input', label: 'Input', dataType: 'number' },
      { id: 'out', direction: 'output', label: 'Output', dataType: 'number' },
    ]);
    expect(target.getEdge('e1')).toMatchObject({
      source: 'node-1',
      sourcePort: 'in',
      target: 'q',
      label: 'one',
      data: { weight: 2 },
    });
    expect(target.getEdge('e2')).toMatchObject({
      source: 'q',
      target: 'node-1',
      targetPort: 'out',
      kind: 'bezier',
      markerEnd: 'arrow',
    });
    expect(target.getEdge('e3')).toMatchObject({ source: 'node-1', sourcePort: 'in', target: 's' });
    expect(grouped.edges.map((item) => `${item.source}>${item.target}`)).toEqual([
      'p>node-1',
      'node-1>r',
    ]);
    expect(pairs(target)).toEqual(before);
    expect(crossings(target)).toEqual([]);
    expect(target.hasCycle()).toBe(false);

    const ungrouped = ungroupChanges(target, { id: 'node-1' }, ids())!;
    expect(ungrouped.members).toEqual(['q', 's']);
    apply(target, ungrouped.changes);
    expect(target.document).toEqual(original);
  });

  it('shares one port per source endpoint for fan-out and keeps both edge ids', () => {
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: {
        version: 1,
        nodes: [
          step('x', 0, 0),
          step('t1', 300, 0),
          step('t2', 300, 150),
          step('s', 300, 300),
          step('y1', 600, 250),
          step('y2', 600, 400),
        ],
        edges: [
          edge('in1', 'x', 'out', 't1', 'in'),
          edge('in2', 'x', 'out', 't2', 'in'),
          edge('out1', 's', 'out', 'y1', 'in'),
          edge('out2', 's', 'out', 'y2', 'in'),
        ],
      },
      schema,
    });
    const original = target.document;
    const before = pairs(target);
    const grouped = groupNodesChanges(target, { ids: ['t1', 't2', 's'] }, ids())!;
    apply(target, grouped.changes);
    const g = grouped.groupId;
    expect(target.getNode(g)!.ports!.map((port) => `${port.direction}:${port.id}`)).toEqual([
      'input:in',
      'output:out',
    ]);
    // Into the group: x feeds one input; both inner segments keep their edges.
    expect(target.getEdge('in1')).toMatchObject({ source: g, sourcePort: 'in', target: 't1' });
    expect(target.getEdge('in2')).toMatchObject({ source: g, sourcePort: 'in', target: 't2' });
    // Out of the group: one output; the second edge keeps its id on the outer segment.
    expect(target.getEdge('out1')).toMatchObject({ source: 's', target: g, targetPort: 'out' });
    expect(target.getEdge('out2')).toMatchObject({ source: g, sourcePort: 'out', target: 'y2' });
    expect(grouped.edges).toHaveLength(2);
    expect(pairs(target)).toEqual(before);
    apply(target, ungroupChanges(target, { id: g }, ids())!.changes);
    expect(target.document).toEqual(original);
  });

  it('gives distinct sources distinct ports with unique slugged ids from the leaf port', () => {
    const imaging: FlowSchema = {
      nodes: [
        ...schema.nodes,
        {
          type: 'image',
          label: 'Image',
          ports: [{ id: 'Image', label: 'Picture', direction: 'output', dataType: 'image' }],
        },
        {
          type: 'sink',
          label: 'Sink',
          ports: [{ id: 'in', direction: 'input', multiple: true, dataType: 'image' }],
        },
      ],
    };
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: {
        version: 1,
        nodes: [
          { id: 's1', type: 'image', position: { x: 0, y: 0 }, data: {} },
          { id: 's2', type: 'image', position: { x: 0, y: 200 }, data: {} },
          { id: 'y', type: 'sink', position: { x: 400, y: 100 }, data: {} },
        ],
        edges: [edge('a', 's1', 'Image', 'y', 'in'), edge('b', 's2', 'Image', 'y', 'in')],
      },
      schema: imaging,
    });
    const grouped = groupNodesChanges(target, { ids: ['s1', 's2'] }, ids())!;
    apply(target, grouped.changes);
    expect(target.getNode(grouped.groupId)!.ports).toEqual([
      { id: 'image', direction: 'output', label: 'Picture', dataType: 'image' },
      { id: 'image-2', direction: 'output', label: 'Picture', dataType: 'image' },
    ]);
    expect(crossings(target)).toEqual([]);
  });

  it('exposes a connection through two levels, reusing the ports that carry the endpoint', () => {
    const document = nested();
    document.nodes.push(
      step('c', 100, 180, { parentId: 'H' }),
      step('d', 200, 180, { parentId: 'H' }),
    );
    const target = model(document);
    const first = exposeConnectionChanges(
      target,
      { connection: { source: 'x', sourcePort: 'out', target: 'c', targetPort: 'in' } },
      ids(),
    );
    // x already reaches G through `gin`; H gets a new input.
    expect(first.ports).toEqual([
      {
        nodeId: 'H',
        port: { id: 'in', direction: 'input', label: 'Input', dataType: 'number' },
      },
    ]);
    expect(
      first.edges.map(
        (item) => `${item.source}.${item.sourcePort}>${item.target}.${item.targetPort}`,
      ),
    ).toEqual(['G.gin>H.in', 'H.in>c.in']);
    apply(target, first.changes);
    expect(
      target.validateConnection(
        { source: 'G', sourcePort: 'gin', target: 'H', targetPort: 'in' },
        { ignoreEdge: first.edges[0]!.id },
      ).valid,
    ).toBe(true);
    const second = exposeConnectionChanges(
      target,
      {
        connection: { source: 'x', sourcePort: 'out', target: 'd', targetPort: 'in' },
        edge: { id: 'mine', kind: 'orthogonal' },
      },
      ids(),
    );
    expect(second.ports).toEqual([]);
    expect(second.edges).toEqual([
      {
        id: 'mine',
        kind: 'orthogonal',
        source: 'H',
        sourcePort: 'in',
        target: 'd',
        targetPort: 'in',
      },
    ]);
    apply(target, second.changes);
    // Outward from inside H: one output per border.
    const third = exposeConnectionChanges(
      target,
      { connection: { source: 'c', sourcePort: 'out', target: 'y', targetPort: 'in' } },
      ids(),
    );
    expect(third.ports.map((item) => `${item.nodeId}:${item.port.id}`)).toEqual(['H:out', 'G:out']);
    expect(third.edges.map((item) => `${item.source}>${item.target}`)).toEqual([
      'c>H',
      'H>G',
      'G>y',
    ]);
    apply(target, third.changes);
    expect(pairs(target)).toEqual(
      ['x.out>a.in', 'a.out>b.in', 'b.out>y.in', 'x.out>c.in', 'x.out>d.in', 'c.out>y.in'].sort(),
    );
    expect(crossings(target)).toEqual([]);
    // a already enters H through `hin`: only the inner edge is new.
    const inner = exposeConnectionChanges(
      target,
      { connection: { source: 'a', sourcePort: 'out', target: 'c', targetPort: 'in' } },
      ids(),
    );
    expect(inner.ports).toEqual([]);
    expect(inner.edges.map((item) => `${item.source}.${item.sourcePort}>${item.target}`)).toEqual([
      'H.hin>c',
    ]);
    // Same-level ends make one plain edge.
    const plain = exposeConnectionChanges(
      target,
      { connection: { source: 'c', sourcePort: 'out', target: 'd', targetPort: 'in' } },
      ids(),
    );
    expect(plain.edges.map((item) => `${item.source}>${item.target}`)).toEqual(['c>d']);
  });

  it('reparents out of and back into a group, rewiring through the borders', () => {
    const target = model();
    const before = pairs(target);
    const out = reparentChanges(target, { ids: ['b'], parentId: 'G' }, ids());
    expect(out.moved).toEqual(['b']);
    apply(target, out.changes);
    expect(target.getNode('b')).toMatchObject({ parentId: 'G', position: { x: 400, y: 160 } });
    expect(target.absolutePosition('b')).toEqual({ x: 600, y: 260 });
    // The segments at b keep their ids; the emptied chain through H is gone.
    expect(target.getEdge('h-b')).toMatchObject({ source: 'a', sourcePort: 'out', target: 'b' });
    expect(target.getEdge('b-h')).toMatchObject({ source: 'b', target: 'G', targetPort: 'gout' });
    expect(target.getEdge('a-h')).toBeUndefined();
    expect(target.getEdge('h-g')).toBeUndefined();
    expect(target.getEdge('g-y')).toBeDefined();
    expect(target.getNode('H')!.ports).toBeUndefined();
    expect(target.getNode('G')!.ports!.map((port) => port.id)).toEqual(['gin', 'gout']);
    expect(pairs(target)).toEqual(before);
    expect(crossings(target)).toEqual([]);

    const back = reparentChanges(target, { ids: ['b'], parentId: 'H' }, ids());
    apply(target, back.changes);
    expect(target.getNode('b')).toMatchObject({ parentId: 'H', position: { x: 100, y: 100 } });
    expect(target.getNode('H')!.ports!.map((port) => `${port.direction}:${port.id}`)).toEqual([
      'input:in',
      'output:out',
    ]);
    expect(target.getEdge('h-b')).toMatchObject({ source: 'H', sourcePort: 'in', target: 'b' });
    expect(target.getEdge('b-h')).toMatchObject({ source: 'b', target: 'H', targetPort: 'out' });
    expect(pairs(target)).toEqual(before);
    expect(crossings(target)).toEqual([]);
    // Moving a group into its own member is refused.
    expect(reparentChanges(target, { ids: ['G'], parentId: 'H' }, ids()).changes).toEqual([]);
  });

  it('moves a group with its members, keeping the outer edge on the new segment', () => {
    const target = model();
    apply(target, [{ type: 'node-add', node: group('P', 1000, 0, 500, 500) }]);
    const before = pairs(target);
    const moved = reparentChanges(target, { ids: ['G'], parentId: 'P' }, ids());
    apply(target, moved.changes);
    expect(target.getNode('a')!.parentId).toBe('G');
    expect(target.getEdge('g-y')).toMatchObject({ source: 'G', sourcePort: 'gout', target: 'P' });
    expect(target.getEdge('x-g')).toMatchObject({ source: 'P', target: 'G', targetPort: 'gin' });
    expect(pairs(target)).toEqual(before);
    expect(crossings(target)).toEqual([]);
  });

  it('refuses to group nodes of different parents', () => {
    const target = model();
    expect(groupNodesChanges(target, { ids: ['x', 'a'] }, ids())).toBeUndefined();
    expect(groupNodesChanges(target, { ids: [] }, ids())).toBeUndefined();
    // A member whose ancestor is selected follows it.
    expect(groupNodesChanges(target, { ids: ['G', 'a', 'y'] }, ids())?.members).toEqual(['G', 'y']);
  });

  it('grows the parent of a dragged member and compensates siblings and terminals', () => {
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: {
        version: 1,
        nodes: [
          group('G', 100, 100, 300, 200, { terminals: { inputs: { x: -100, y: 50 } } }),
          step('c1', 20, 50, { parentId: 'G' }),
          step('c2', 150, 50, { parentId: 'G' }),
        ],
        edges: [],
      },
      schema,
    });
    expect(expandParentChanges(target, { ids: ['c1'] }).changes).toEqual([]);
    apply(target, [{ type: 'node-position', id: 'c1', position: { x: -40, y: 30 } }]);
    const result = expandParentChanges(target, { ids: ['c1'] });
    expect(result.changes).toEqual([
      { type: 'node-size', id: 'G', size: { width: 356, height: 210 } },
      { type: 'node-position', id: 'G', position: { x: 44, y: 90 } },
      { type: 'node-position', id: 'c1', position: { x: 16, y: 40 } },
      { type: 'node-position', id: 'c2', position: { x: 206, y: 60 } },
      { type: 'node-update', id: 'G', patch: { terminals: { inputs: { x: -44, y: 60 } } } },
    ]);
    const absolute = target.absolutePosition('c2');
    apply(target, result.changes);
    expect(target.absolutePosition('c2')).toEqual(absolute);
    expect(target.absolutePosition('c1')).toEqual({ x: 60, y: 130 });
  });

  it('grows nested parents in turn', () => {
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: {
        version: 1,
        nodes: [
          group('P', 0, 0, 500, 400),
          group('G', 50, 60, 200, 150, { parentId: 'P' }),
          step('c', 20, 50, { parentId: 'G' }),
        ],
        edges: [],
      },
      schema,
    });
    apply(target, [{ type: 'node-position', id: 'c', position: { x: 500, y: 50 } }]);
    apply(target, expandParentChanges(target, { ids: ['c'] }).changes);
    // c sits at x 550…650: G reaches 666, P 682.
    expect(target.nodeRect('G')).toMatchObject({ x: 50, width: 616 });
    expect(target.nodeRect('P')).toMatchObject({ x: 0, width: 682 });
  });

  it('clamps a resize to the members and keeps them in place from the start edge', () => {
    const target = new FlowModel<FlowNode, FlowEdge>({
      document: {
        version: 1,
        nodes: [
          group('G', 100, 100, 300, 200, { terminals: { outputs: { x: 320, y: 50 } } }),
          step('c', 50, 60, { parentId: 'G' }),
        ],
        edges: [],
      },
      schema,
    });
    const snapshot = groupResizeSnapshot(target, 'G');
    const first = groupResizeChanges(target, {
      id: 'G',
      rect: { x: 140, y: 150, width: 260, height: 150 },
      snapshot,
    })!;
    expect(first.rect).toEqual({ x: 134, y: 120, width: 266, height: 180 });
    apply(target, first.changes);
    expect(target.getNode('G')).toMatchObject({
      position: { x: 134, y: 120 },
      size: { width: 266, height: 180 },
      terminals: { outputs: { x: 286, y: 30 } },
    });
    expect(target.absolutePosition('c')).toEqual({ x: 150, y: 160 });
    // Later frames of the same gesture start from the snapshot, not from the last frame.
    const second = groupResizeChanges(target, {
      id: 'G',
      rect: { x: 120, y: 100, width: 280, height: 200 },
      snapshot,
    })!;
    apply(target, second.changes);
    expect(target.getNode('c')!.position).toEqual({ x: 30, y: 60 });
    expect(target.absolutePosition('c')).toEqual({ x: 150, y: 160 });
    // The end edges cannot cut the member either.
    const shrink = groupResizeChanges(target, {
      id: 'G',
      rect: { x: 120, y: 100, width: 50, height: 50 },
    })!;
    expect(shrink.rect).toEqual({ x: 120, y: 100, width: 146, height: 126 });
  });

  it('adds, renames and removes ports; removal deletes the edges on both sides', () => {
    const target = model();
    const added = groupPortChanges(target, {
      action: 'add',
      groupId: 'G',
      port: { direction: 'input', label: 'Image' },
    })!;
    expect(added.port).toEqual({ id: 'image', direction: 'input', label: 'Image' });
    apply(target, added.changes);
    const again = groupPortChanges(target, {
      action: 'add',
      groupId: 'G',
      port: { direction: 'input', label: 'Image' },
    })!;
    expect(again.port!.id).toBe('image-2');
    const renamed = groupPortChanges(target, {
      action: 'update',
      groupId: 'G',
      portId: 'image',
      patch: { label: 'Picture' },
    })!;
    apply(target, renamed.changes);
    expect(target.getNode('G')!.ports![2]).toEqual({
      id: 'image',
      direction: 'input',
      label: 'Picture',
    });
    const removed = groupPortChanges(target, { action: 'remove', groupId: 'G', portId: 'gin' })!;
    apply(target, removed.changes);
    expect(target.getEdge('x-g')).toBeUndefined();
    expect(target.getEdge('g-a')).toBeUndefined();
    expect(target.getNode('G')!.ports!.map((port) => port.id)).toEqual(['gout', 'image']);
    expect(
      groupPortChanges(target, { action: 'remove', groupId: 'G', portId: 'missing' }),
    ).toBeUndefined();
    expect(
      groupPortChanges(target, { action: 'remove', groupId: 'a', portId: 'in' }),
    ).toBeUndefined();
  });

  it('needs cascade off: the default cascade deletes the members being moved out', () => {
    const changes = ungroupChanges(model(), { id: 'H' }, ids())!.changes;
    const cascading = model();
    cascading.apply(changes);
    expect(cascading.getNode('b')).toBeUndefined();
    const raw = model();
    apply(raw, changes);
    expect(raw.getNode('b')).toMatchObject({ parentId: 'G', position: { x: 400, y: 160 } });
    expect(raw.getNode('H')).toBeUndefined();
    expect(raw.getEdge('h-b')).toMatchObject({ source: 'a', target: 'b' });
    expect(raw.getEdge('b-h')).toMatchObject({ source: 'b', target: 'G', targetPort: 'gout' });
    expect(pairs(raw)).toEqual(pairs(model()));
  });
});
