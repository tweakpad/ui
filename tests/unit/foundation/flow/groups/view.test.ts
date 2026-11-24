import { describe, expect, it } from 'vitest';
import { FlowModel } from '../../../../../src/foundation/flow/model/model.js';
import type { FlowChangeEvent } from '../../../../../src/foundation/flow/model/hooks.js';
import {
  FlowScopeView,
  type FlowGraphView,
} from '../../../../../src/foundation/flow/groups/view.js';
import { edge, model, nested, schema, step } from './fixture.js';

const ids = (items: readonly { id: string }[]): string[] => items.map((item) => item.id);

describe('FlowScopeView', () => {
  it('delegates everything at the root of a document without nesting', () => {
    const target = new FlowModel({
      document: {
        version: 1,
        nodes: [step('a', 0, 0), step('b', 300, 0)],
        edges: [edge('ab', 'a', 'out', 'b', 'in')],
      },
      schema,
    });
    // The model is a graph view of the whole document.
    const whole: FlowGraphView = target;
    const view = new FlowScopeView(target);
    expect(view.nodes).toBe(whole.nodes);
    expect(view.edges).toBe(target.edges);
    expect(view.getNode('a')).toBe(target.getNode('a'));
    expect(view.ports('a')).toBe(target.ports('a'));
    expect(view.nodesInRect({ x: -10, y: -10, width: 500, height: 100 })).toEqual(['a', 'b']);
    expect(view.endpoints('ab')).toEqual(target.endpoints('ab'));
    expect(view.terminalIds).toEqual([]);
    expect(view.scope).toBeUndefined();
    view.dispose();
  });

  it('hides the members of collapsed groups at the root', () => {
    const target = model();
    const view = new FlowScopeView(target);
    expect(ids(view.nodes)).toEqual(['x', 'G', 'a', 'H', 'b', 'y']);
    expect(ids(view.edges)).toEqual(['x-g', 'g-a', 'a-h', 'h-b', 'b-h', 'h-g', 'g-y']);
    target.apply([{ type: 'node-update', id: 'G', patch: { collapsed: true } }]);
    expect(ids(view.nodes)).toEqual(['x', 'G', 'y']);
    expect(ids(view.edges)).toEqual(['x-g', 'g-y']);
    expect(view.getNode('a')).toBeUndefined();
    expect(view.nodeRect('a')).toBeUndefined();
    expect(view.getEdge('g-a')).toBeUndefined();
    view.dispose();
  });

  it('shows the inside of the entered group with its terminals', () => {
    const target = model();
    const view = new FlowScopeView(target, { path: ['G'] });
    expect(view.scope).toBe('G');
    expect(ids(view.nodes)).toEqual(['a', 'H', 'b', 'G#inputs', 'G#outputs']);
    expect(ids(view.edges)).toEqual(['g-a', 'a-h', 'h-b', 'b-h', 'h-g']);
    expect(view.getNode('x')).toBeUndefined();
    expect(view.getNode('G')).toBeUndefined();
    expect(view.terminalIds).toEqual(['G#inputs', 'G#outputs']);

    const inputs = view.getNode('G#inputs')!;
    expect(inputs).toMatchObject({
      type: '@inputs',
      selectable: false,
      deletable: false,
      position: { x: -60, y: 205 },
    });
    expect(inputs.parentId).toBeUndefined();
    expect(view.getNode('G#inputs')).toBe(inputs);
    expect(view.definitionOf(inputs)).toMatchObject({ shape: 'panel', label: 'Inputs' });
    expect(view.isGroup('G#inputs')).toBe(false);
    expect(view.nodeRect('G#outputs')).toEqual({ x: 880, y: 205, width: 220, height: 160 });
    const [port] = view.ports('G#inputs');
    expect(port).toMatchObject({
      id: 'gin',
      direction: 'output',
      nodeId: 'G#inputs',
      geometry: { x: 216, y: 76, side: 'right' },
    });
    expect(view.ports('G#outputs').map((item) => `${item.id}:${item.direction}`)).toEqual([
      'gout:input',
    ]);
    expect(view.nodeZ('G#inputs')).toBe(target.nodeZ('G') + 1);
    expect(view.endpoint('g-a', 'source')).toMatchObject({
      nodeId: 'G#inputs',
      portId: 'gin',
      side: 'right',
      point: { x: 164, y: 285 },
    });
    expect(view.endpoint('h-g', 'target')?.nodeId).toBe('G#outputs');
    expect(view.endpoints('a-h')).toEqual(target.endpoints('a-h'));
    expect(view.portConnections('G#inputs', 'output', 'gin')).toEqual(['g-a']);
    expect(view.portConnections('G#inputs', 'input')).toEqual([]);
    expect(view.portConnections('G#outputs', undefined, 'gout')).toEqual(['h-g']);
    expect(view.portConnections('a')).toEqual(['a-h', 'g-a']);
    view.dispose();
  });

  it('places persisted terminals relative to the group and follows the layout axis', () => {
    const document = nested();
    document.nodes[1] = { ...document.nodes[1]!, terminals: { outputs: { x: 10, y: 20 } } };
    const target = model(document);
    const view = new FlowScopeView(target, { path: ['G'], direction: 'vertical' });
    expect(view.absolutePosition('G#outputs')).toEqual({ x: 210, y: 120 });
    // Above the members, centred on them.
    expect(view.absolutePosition('G#inputs')).toEqual({ x: 410, y: -80 });
    view.direction = undefined;
    expect(view.absolutePosition('G#inputs')).toEqual({ x: -60, y: 205 });
    view.dispose();
  });

  it('scopes nested collapsed groups and truncates an invalid path', () => {
    const target = model();
    target.apply([{ type: 'node-update', id: 'H', patch: { collapsed: true } }]);
    const view = new FlowScopeView(target, { path: ['G', 'missing'] });
    expect(view.effectivePath).toEqual(['G']);
    expect(ids(view.nodes)).toEqual(['a', 'H', 'G#inputs', 'G#outputs']);
    expect(ids(view.edges)).toEqual(['g-a', 'a-h', 'h-g']);
    view.path = ['G', 'H'];
    expect(view.scope).toBe('H');
    expect(ids(view.nodes)).toEqual(['b', 'H#inputs', 'H#outputs']);
    expect(ids(view.edges)).toEqual(['h-b', 'b-h']);
    view.path = ['G', 'a'];
    expect(view.effectivePath).toEqual(['G']);
    view.dispose();
  });

  it('caches membership per document and path', () => {
    const target = model();
    const view = new FlowScopeView(target, { path: ['G'] });
    const nodes = view.nodes;
    const edges = view.edges;
    expect(view.nodes).toBe(nodes);
    expect(view.edges).toBe(edges);
    target.apply([{ type: 'node-data', id: 'x', data: { note: 1 } }]);
    expect(view.edges).not.toBe(edges);
    expect(view.edges).toEqual(edges);
    view.dispose();
  });

  it('leaves a terminal out when a document node takes its id', () => {
    const document = nested();
    document.nodes.push(step('G#inputs', 0, 0, { parentId: 'G' }));
    const view = new FlowScopeView(model(document), { path: ['G'] });
    expect(view.terminalIds).toEqual(['G#outputs']);
    expect(ids(view.edges)).not.toContain('g-a');
    expect(view.getNode('G#inputs')?.type).toBe('step');
    view.dispose();
  });

  it('measures terminals itself and forwards other measurements', () => {
    const target = model();
    const view = new FlowScopeView(target, { path: ['G'] });
    const events: FlowChangeEvent[] = [];
    const stop = view.subscribe((event) => events.push(event));
    expect(view.measure('G#inputs', { width: 200, height: 100 }).applied).toBe(true);
    expect(view.nodeRect('G#inputs')).toEqual({ x: -40, y: 235, width: 200, height: 100 });
    expect(target.measuredSize('G#inputs')).toBeUndefined();
    expect(events).toHaveLength(1);
    expect(events[0]!.changes).toEqual([
      { type: 'node-measure', id: 'G#inputs', measured: { width: 200, height: 100 } },
    ]);
    expect([...events[0]!.affectedEdges]).toEqual(['g-a']);
    expect(view.measure('G#inputs', { width: 200, height: 100 }).applied).toBe(false);
    view.measure('G#inputs', undefined, [
      { id: 'gin', x: 190, y: 40, width: 10, height: 10, side: 'right' },
    ]);
    expect(view.ports('G#inputs')[0]).toMatchObject({ measured: true, geometry: { x: 190 } });
    view.measure('a', { width: 120, height: 60 });
    expect(target.measuredSize('a')).toEqual({ width: 120, height: 60 });
    // Moving a member moves the automatic terminals: listeners hear about them.
    events.length = 0;
    target.apply([{ type: 'node-position', id: 'a', position: { x: 0, y: 150 } }]);
    expect(events).toHaveLength(1);
    expect(events[0]!.affectedNodes.has('G#inputs')).toBe(true);
    expect(events[0]!.affectedEdges.has('h-g')).toBe(true);
    stop();
    view.dispose();
  });

  it('answers spatial queries inside the scope', () => {
    const target = model();
    const view = new FlowScopeView(target, { path: ['G'] });
    const everything = { x: -1000, y: -1000, width: 4000, height: 4000 };
    expect(view.nodesInRect(everything)).toEqual(['a', 'H', 'b', 'G#inputs', 'G#outputs']);
    expect(view.nodesInRect({ x: -70, y: 200, width: 240, height: 170 }, false)).toEqual([
      'G#inputs',
    ]);
    expect(view.nodeAt({ x: 50, y: 285 })?.id).toBe('G#inputs');
    expect(view.nodeAt({ x: 610, y: 270 })?.id).toBe('b');
    expect(view.nodeAt({ x: 1150, y: 225 })).toBeUndefined();
    const hit = view.portNear({ x: 161, y: 285 }, 10);
    expect(hit).toMatchObject({ nodeId: 'G#inputs', point: { x: 160, y: 285 } });
    expect(hit?.port.id).toBe('gin');
    expect(view.portCenter('G#inputs', 'gin')).toEqual({ x: 160, y: 285 });
    expect(view.bounds()).toEqual({ x: -60, y: 160, width: 1160, height: 250 });
    view.dispose();
  });

  it('finds the deepest expanded group under a point', () => {
    const target = model();
    const view = new FlowScopeView(target);
    expect(view.groupAt({ x: 600, y: 300 })).toBe('H');
    expect(view.groupAt({ x: 250, y: 120 })).toBe('G');
    expect(view.groupAt({ x: 10, y: 10 })).toBeUndefined();
    target.apply([{ type: 'node-update', id: 'H', patch: { collapsed: true } }]);
    expect(view.groupAt({ x: 520, y: 170 })).toBe('G');
    view.path = ['G'];
    expect(view.groupAt({ x: 250, y: 120 })).toBeUndefined();
    view.dispose();
  });

  it('resolves terminal ends to the group and rewrites terminal moves', () => {
    const target = model();
    const view = new FlowScopeView(target, { path: ['G'] });
    expect(
      view.resolve({ source: 'G#inputs', sourcePort: 'gin', target: 'a', targetPort: 'in' }),
    ).toEqual({ source: 'G', sourcePort: 'gin', target: 'a', targetPort: 'in' });
    const plain = { source: 'a', target: 'b' };
    expect(view.resolve(plain)).toBe(plain);
    expect(
      view.edgeRelation({ source: 'G#inputs', sourcePort: 'gin', target: 'a', targetPort: 'in' }),
    ).toBe('inner-input');
    const rewritten = view.rewrite([
      { type: 'node-position', id: 'G#inputs', position: { x: 0, y: 200 } },
      { type: 'node-select', id: 'G#outputs', selected: true },
      { type: 'node-position', id: 'G#outputs', position: { x: 1000, y: 300 } },
      { type: 'node-position', id: 'a', position: { x: 50, y: 150 } },
    ]);
    expect(rewritten).toEqual([
      {
        type: 'node-update',
        id: 'G',
        patch: { terminals: { inputs: { x: -200, y: 100 }, outputs: { x: 800, y: 200 } } },
      },
      { type: 'node-position', id: 'a', position: { x: 50, y: 150 } },
    ]);
    target.apply(rewritten);
    expect(view.absolutePosition('G#inputs')).toEqual({ x: 0, y: 200 });
    view.dispose();
  });
});
