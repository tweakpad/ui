import { describe, expect, it } from 'vitest';
import {
  pasteChanges,
  serializeSelection,
} from '../../../../../src/widgets/flow/interaction/clipboard.js';
import { model } from '../../../foundation/flow/groups/fixture.js';

const counter = () => {
  let next = 0;
  return (kind: 'node' | 'edge') => `${kind}-${(next += 1)}`;
};

describe('paste into a group', () => {
  it('places top-level copies in the parent, relative to its origin', () => {
    const target = model();
    // `a` is a member of G: copied alone it travels at its absolute position.
    const payload = serializeSelection(target, { nodes: ['a', 'H'], edges: [] });
    const { changes, nodeIds } = pasteChanges(payload, {
      idFactory: counter(),
      offset: { x: 16, y: 16 },
      taken: (id) => target.getNode(id) !== undefined,
      parent: { id: 'H', origin: target.absolutePosition('H')! },
    });
    const added = changes.flatMap((change) => (change.type === 'node-add' ? [change.node] : []));
    expect(nodeIds).toHaveLength(3);
    const [a, h, b] = added;
    // a: absolute 240,250 + 16 − H origin 500,160.
    expect(a).toMatchObject({ parentId: 'H', position: { x: -244, y: 106 } });
    expect(h).toMatchObject({ parentId: 'H', position: { x: 16, y: 16 } });
    // A copied member of a copied group keeps its place inside the copy.
    expect(b).toMatchObject({ parentId: h!.id, position: { x: 100, y: 100 } });
  });

  it('lands at the root without a parent', () => {
    const target = model();
    const payload = serializeSelection(target, { nodes: ['a'], edges: [] });
    const { changes } = pasteChanges(payload, {
      idFactory: counter(),
      offset: { x: 16, y: 16 },
      taken: (id) => target.getNode(id) !== undefined,
    });
    const node = changes[0]?.type === 'node-add' ? changes[0].node : undefined;
    expect(node?.parentId).toBeUndefined();
    expect(node?.position).toEqual({ x: 256, y: 266 });
  });
});
