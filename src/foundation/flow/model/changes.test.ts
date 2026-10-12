import { describe, expect, it } from 'vitest';
import type { FlowChange, FlowDocument, FlowNode } from '../types.js';
import {
  applyFlowChanges,
  clampChanges,
  expandRemoveCascade,
  invertFlowChanges,
  pruneNoopChanges,
  reduceFlowChanges,
  squashFlowChanges,
} from './changes.js';

function node(id: string, extra: Partial<FlowNode> = {}): FlowNode {
  return { id, type: 't', position: { x: 0, y: 0 }, data: {}, ...extra };
}

function sample(): FlowDocument {
  return {
    version: 1,
    nodes: [
      node('group', { type: 'group' }),
      node('a', { parentId: 'group', position: { x: 10, y: 10 } }),
      node('b', { parentId: 'a' }),
      node('c', { position: { x: 300, y: 0 } }),
      node('locked', { deletable: false, parentId: 'group' }),
    ],
    edges: [
      { id: 'e-ac', source: 'a', target: 'c' },
      { id: 'e-bc', source: 'b', target: 'c' },
      { id: 'e-cc', source: 'c', target: 'c' },
      { id: 'e-locked', source: 'a', target: 'c', deletable: false },
    ],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

describe('flow change reducer', () => {
  it('returns a new document and keeps untouched items by identity', () => {
    const doc = sample();
    const next = applyFlowChanges(doc, [
      { type: 'node-position', id: 'c', position: { x: 1, y: 2 } },
    ]);
    expect(next).not.toBe(doc);
    expect(next.nodes).not.toBe(doc.nodes);
    expect(next.edges).toBe(doc.edges);
    expect(next.nodes[0]).toBe(doc.nodes[0]);
    expect(next.nodes[3]).not.toBe(doc.nodes[3]);
    expect(next.nodes[3]!.position).toEqual({ x: 1, y: 2 });
    expect(doc.nodes[3]!.position).toEqual({ x: 300, y: 0 });
    expect(applyFlowChanges(doc, [])).toBe(doc);
  });

  it('clones a node once per batch and applies patches with undefined as delete', () => {
    const doc = sample();
    const next = applyFlowChanges(doc, [
      { type: 'node-update', id: 'c', patch: { hidden: true, label: 'C' } },
      { type: 'node-position', id: 'c', position: { x: 9, y: 9 } },
      { type: 'node-update', id: 'c', patch: { label: undefined } },
      { type: 'node-size', id: 'c', size: { width: 1, height: 2 } },
      { type: 'node-select', id: 'c', selected: true },
      { type: 'node-data', id: 'c', data: { k: 1 } },
    ]);
    const c = next.nodes[3]!;
    expect(c).toMatchObject({
      hidden: true,
      position: { x: 9, y: 9 },
      size: { width: 1, height: 2 },
      selected: true,
      data: { k: 1 },
    });
    expect('label' in c).toBe(false);
    const deselected = applyFlowChanges(next, [{ type: 'node-select', id: 'c', selected: false }]);
    expect('selected' in deselected.nodes[3]!).toBe(false);
  });

  it('adds at an index, removes, replaces by identity and edits edges', () => {
    const doc = sample();
    const added = node('z');
    const replacement = { ...doc.edges[0]!, label: 'x' };
    const next = applyFlowChanges(doc, [
      { type: 'node-add', node: added, index: 1 },
      { type: 'node-remove', id: 'locked' },
      { type: 'edge-replace', id: 'e-ac', edge: replacement },
      { type: 'edge-update', id: 'e-bc', patch: { animated: true } },
      { type: 'edge-waypoints', id: 'e-cc', waypoints: [{ x: 1, y: 1 }] },
      { type: 'edge-select', id: 'e-cc', selected: true },
      { type: 'edge-add', edge: { id: 'new', source: 'a', target: 'b' } },
      { type: 'viewport', viewport: { x: 5, y: 5, zoom: 2 } },
    ]);
    expect(next.nodes.map((item) => item.id)).toEqual(['group', 'z', 'a', 'b', 'c']);
    expect(next.nodes[1]).toBe(added);
    expect(next.edges[0]).toBe(replacement);
    expect(next.edges[1]!.animated).toBe(true);
    expect(next.edges[2]!.waypoints).toEqual([{ x: 1, y: 1 }]);
    expect(next.edges[2]!.selected).toBe(true);
    expect(next.edges[4]!.id).toBe('new');
    expect(next.viewport).toEqual({ x: 5, y: 5, zoom: 2 });
  });

  it('prunes no-op changes sequentially', () => {
    const doc = sample();
    const kept = pruneNoopChanges(doc, [
      { type: 'node-position', id: 'c', position: { x: 300, y: 0 } },
      { type: 'node-position', id: 'c', position: { x: 1, y: 1 } },
      { type: 'node-position', id: 'c', position: { x: 1, y: 1 } },
      { type: 'node-select', id: 'c', selected: false },
      { type: 'node-add', node: node('a') },
      { type: 'node-remove', id: 'nope' },
      { type: 'node-update', id: 'c', patch: { hidden: undefined } },
      { type: 'node-data', id: 'c', data: {} },
      { type: 'edge-waypoints', id: 'e-cc', waypoints: undefined },
      { type: 'viewport', viewport: { x: 0, y: 0, zoom: 1 } },
      { type: 'node-measure', id: 'c', measured: { width: 1, height: 1 } },
      { type: 'node-position', id: 'missing', position: { x: 1, y: 1 } },
    ]);
    expect(kept).toEqual([
      { type: 'node-position', id: 'c', position: { x: 1, y: 1 } },
      { type: 'node-measure', id: 'c', measured: { width: 1, height: 1 } },
    ]);
  });

  it('inverts batches so that applying the inverse restores the document exactly', () => {
    const doc = sample();
    const changes: FlowChange[] = [
      { type: 'node-position', id: 'a', position: { x: 50, y: 60 } },
      { type: 'node-update', id: 'c', patch: { label: 'C', hidden: true } },
      { type: 'node-remove', id: 'b' },
      { type: 'node-add', node: node('n'), index: 0 },
      { type: 'edge-remove', id: 'e-ac' },
      { type: 'edge-update', id: 'e-bc', patch: { target: 'a', label: 'moved' } },
      { type: 'node-data', id: 'a', data: { v: 1 } },
      { type: 'node-size', id: 'a', size: { width: 7, height: 7 } },
      { type: 'viewport', viewport: { x: 1, y: 1, zoom: 3 } },
      { type: 'node-select', id: 'c', selected: true },
      { type: 'edge-select', id: 'e-cc', selected: true },
      { type: 'edge-waypoints', id: 'e-cc', waypoints: [{ x: 2, y: 2 }] },
      { type: 'node-replace', id: 'group', node: node('group', { type: 'other' }) },
      { type: 'edge-replace', id: 'e-locked', edge: { id: 'e-locked', source: 'c', target: 'a' } },
    ];
    const inverse = invertFlowChanges(doc, changes);
    const forward = applyFlowChanges(doc, changes);
    const restored = applyFlowChanges(forward, inverse);
    expect(restored).toEqual(doc);
    expect(restored.nodes.map((item) => item.id)).toEqual(doc.nodes.map((item) => item.id));
    expect(restored.edges.map((item) => item.id)).toEqual(doc.edges.map((item) => item.id));
    // The redo of the inverse's inverse lands on the forward document again.
    expect(applyFlowChanges(restored, invertFlowChanges(forward, inverse))).toEqual(forward);
  });

  it('round-trips random change sequences', () => {
    const next = random(11);
    for (let run = 0; run < 40; run += 1) {
      const doc = sample();
      const changes: FlowChange[] = [];
      const ids = doc.nodes.map((item) => item.id);
      for (let step = 0; step < 12; step += 1) {
        const pick = next();
        const id = ids[Math.floor(next() * ids.length)]!;
        if (pick < 0.3)
          changes.push({
            type: 'node-position',
            id,
            position: { x: Math.floor(next() * 100), y: 0 },
          });
        else if (pick < 0.45) changes.push({ type: 'node-remove', id });
        else if (pick < 0.6) {
          const fresh = `n${run}-${step}`;
          ids.push(fresh);
          changes.push({ type: 'node-add', node: node(fresh), index: Math.floor(next() * 6) });
        } else if (pick < 0.75)
          changes.push({
            type: 'node-update',
            id,
            patch: { label: next() > 0.5 ? 'x' : undefined },
          });
        else if (pick < 0.85)
          changes.push({
            type: 'edge-remove',
            id: doc.edges[Math.floor(next() * doc.edges.length)]!.id,
          });
        else changes.push({ type: 'node-select', id, selected: next() > 0.5 });
      }
      const reduced = reduceFlowChanges(doc, changes);
      const restored = applyFlowChanges(reduced.document, reduced.inverse);
      expect(restored).toEqual(doc);
      expect(applyFlowChanges(restored, reduced.changes)).toEqual(reduced.document);
    }
  });

  it('squashes sequential changes per element', () => {
    const squashed = squashFlowChanges([
      { type: 'node-position', id: 'a', position: { x: 1, y: 1 } },
      { type: 'node-select', id: 'b', selected: true },
      { type: 'node-position', id: 'a', position: { x: 2, y: 2 } },
      { type: 'node-add', node: node('n') },
      { type: 'node-position', id: 'n', position: { x: 5, y: 5 } },
      { type: 'node-update', id: 'b', patch: { hidden: true } },
      { type: 'node-update', id: 'b', patch: { label: 'B' } },
      { type: 'node-add', node: node('gone') },
      { type: 'node-remove', id: 'gone' },
      { type: 'edge-update', id: 'e', patch: { animated: true } },
      { type: 'edge-remove', id: 'e' },
      { type: 'viewport', viewport: { x: 1, y: 1, zoom: 1 } },
      { type: 'viewport', viewport: { x: 2, y: 2, zoom: 1 } },
      { type: 'node-measure', id: 'a', measured: { width: 1, height: 1 } },
    ]);
    expect(squashed).toEqual([
      { type: 'node-position', id: 'a', position: { x: 2, y: 2 } },
      { type: 'node-select', id: 'b', selected: true },
      { type: 'node-add', node: node('n', { position: { x: 5, y: 5 } }) },
      { type: 'node-update', id: 'b', patch: { hidden: true, label: 'B' } },
      { type: 'edge-remove', id: 'e' },
      { type: 'viewport', viewport: { x: 2, y: 2, zoom: 1 } },
    ]);
  });

  it('expands removal cascades independent of order and honors deletable: false', () => {
    const doc = sample();
    const forward = expandRemoveCascade(doc, [{ type: 'node-remove', id: 'a' }]);
    expect(forward).toEqual([
      { type: 'edge-remove', id: 'e-ac' },
      { type: 'edge-remove', id: 'e-bc' },
      { type: 'node-remove', id: 'a' },
      { type: 'node-remove', id: 'b' },
    ]);
    const one = expandRemoveCascade(doc, [
      { type: 'node-remove', id: 'group' },
      { type: 'node-remove', id: 'b' },
      { type: 'edge-remove', id: 'e-cc' },
    ]);
    const two = expandRemoveCascade(doc, [
      { type: 'edge-remove', id: 'e-cc' },
      { type: 'node-remove', id: 'b' },
      { type: 'node-remove', id: 'group' },
    ]);
    expect(one).toEqual(two);
    expect(one.map((change) => (change as { id: string }).id)).toEqual([
      'e-ac',
      'e-bc',
      'e-cc',
      'group',
      'a',
      'b',
    ]);
    // `locked` (deletable: false) and `e-locked` survive even though their parent/source goes.
    expect(one.some((change) => (change as { id: string }).id === 'locked')).toBe(false);
    expect(expandRemoveCascade(doc, [{ type: 'node-remove', id: 'locked' }])).toEqual([]);
    expect(expandRemoveCascade(doc, [{ type: 'edge-remove', id: 'e-locked' }])).toEqual([]);
    const mixed = expandRemoveCascade(doc, [
      { type: 'node-position', id: 'c', position: { x: 1, y: 1 } },
      { type: 'node-remove', id: 'c' },
    ]);
    expect(mixed[0]).toEqual({ type: 'node-position', id: 'c', position: { x: 1, y: 1 } });
    expect(mixed.filter((change) => change.type === 'edge-remove')).toHaveLength(3);
  });

  it('clamps positions to parent and explicit extents', () => {
    const doc = sample();
    const nodes = new Map(doc.nodes.map((item) => [item.id, item]));
    nodes.set('a', { ...nodes.get('a')!, extent: 'parent' });
    nodes.set('c', {
      ...nodes.get('c')!,
      extent: [
        [0, 0],
        [100, 100],
      ],
    });
    const context = {
      getNode: (id: string) => nodes.get(id),
      sizeOf: (item: FlowNode) =>
        item.id === 'group' ? { width: 300, height: 200 } : { width: 50, height: 20 },
    };
    const clamped = clampChanges(
      [
        { type: 'node-position', id: 'a', position: { x: 290, y: -5 } },
        { type: 'node-position', id: 'c', position: { x: 500, y: 50 } },
        { type: 'node-position', id: 'b', position: { x: 999, y: 999 } },
        {
          type: 'node-add',
          node: node('d', {
            extent: [
              [0, 0],
              [100, 100],
            ],
            position: { x: 99, y: 99 },
          }),
        },
      ],
      context,
    );
    expect(clamped[0]).toEqual({ type: 'node-position', id: 'a', position: { x: 250, y: 0 } });
    expect(clamped[1]).toEqual({ type: 'node-position', id: 'c', position: { x: 50, y: 50 } });
    expect(clamped[2]).toEqual({ type: 'node-position', id: 'b', position: { x: 999, y: 999 } });
    expect((clamped[3] as { node: FlowNode }).node.position).toEqual({ x: 50, y: 80 });
  });
});
