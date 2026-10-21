import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { blockTree } from './block-selection.test.js';
import {
  blockNestPredicate,
  blockTreeModel,
  dropIndex,
  keyboardMoveSlot,
  moveAction,
  projectBlockDrop,
  remainingRows,
} from './block-drag.js';

const doc = blockTree([
  ['p1', 'paragraph'],
  ['l1', 'list-bullet'],
  ['l1a', 'list-bullet', 1],
  ['l1b', 'list-bullet', 1],
  ['l2', 'list-bullet'],
  ['p2', 'paragraph'],
  ['p3', 'paragraph'],
]);

describe('block drag projection', () => {
  it('nests only a list item under a list item', () => {
    const canNest = blockNestPredicate(doc);
    const row = (id: string) => ({ id, depth: 0, parentId: null });
    expect(canNest(row('l1'), row('l2'))).toBe(true);
    expect(canNest(row('l1'), row('p2'))).toBe(false);
    expect(canNest(row('p1'), row('l2'))).toBe(false);
  });

  it('leaves the moved blocks and their nested items out of the rows', () => {
    expect(remainingRows(doc, ['l1']).map((row) => row.id)).toEqual(['p1', 'l2', 'p2', 'p3']);
    expect(remainingRows(doc, ['l1a', 'p3']).map((row) => row.id)).toEqual([
      'p1',
      'l1',
      'l1b',
      'l2',
      'p2',
    ]);
  });

  it('drops before the block whose vertical midpoint lies below the pointer', () => {
    const boxes = [
      { top: 0, bottom: 20 },
      { top: 30, bottom: 50 },
    ];
    expect(dropIndex(boxes, 5)).toBe(0);
    expect(dropIndex(boxes, 15)).toBe(1);
    expect(dropIndex(boxes, 39)).toBe(1);
    expect(dropIndex(boxes, 41)).toBe(2);
  });

  it('projects a list item into a list at the depth the pointer asks for', () => {
    const rows = remainingRows(doc, ['l2']);
    const model = blockTreeModel(doc);
    // After l1b, one level deep: a child of l1 after its two items.
    expect(projectBlockDrop(doc, model, rows, 'l2', 4, 1)).toEqual({
      index: 4,
      depth: 1,
      parentId: 'l1',
      slot: { parent: 'l1', index: 2 },
    });
    // Two levels deep is lowered to the deepest accepted depth: a child of l1b.
    expect(projectBlockDrop(doc, model, rows, 'l2', 4, 2)?.slot).toEqual({
      parent: 'l1b',
      index: 0,
    });
  });

  it('never nests a paragraph and vetoes a slot between nested items', () => {
    const rows = remainingRows(doc, ['p3']);
    const model = blockTreeModel(doc);
    // After l1b with a requested depth of one: lowered to the top level.
    expect(projectBlockDrop(doc, model, rows, 'p3', 4, 1)).toMatchObject({
      depth: 0,
      parentId: null,
      slot: { parent: null, index: 2 },
    });
    // Between l1a and l1b the clamp starts at depth one, which no list item accepts for it.
    expect(projectBlockDrop(doc, model, rows, 'p3', 3, 0)).toBeNull();
  });

  it('rejects a projection that leaves the block where it is', () => {
    const rows = remainingRows(doc, ['p2']);
    expect(projectBlockDrop(doc, blockTreeModel(doc), rows, 'p2', 5, 0)).toBeNull();
  });
});

describe('keyboard block moves', () => {
  it('moves a paragraph to the nearest slot before or after it', () => {
    expect(keyboardMoveSlot(doc, ['p2'], 'down')).toEqual({ parent: null, index: 4 });
    expect(keyboardMoveSlot(doc, ['p3'], 'up')).toEqual({ parent: null, index: 3 });
  });

  it('skips slots where its first block cannot take an accepted depth', () => {
    // Up from p2: the slot before l2, at the top level.
    expect(keyboardMoveSlot(doc, ['p2'], 'up')).toEqual({ parent: null, index: 2 });
    // Up from l2, a list item: the slot between l1a and l1b, which clamps it into l1's items.
    expect(keyboardMoveSlot(doc, ['l2'], 'up')).toEqual({ parent: 'l1', index: 1 });
  });

  it('moves a list item with its nested items as one block', () => {
    expect(keyboardMoveSlot(doc, ['l1'], 'up')).toEqual({ parent: null, index: 0 });
    expect(moveAction(doc, ['l1', 'l1a', 'l1b'], { parent: null, index: 0 })).toEqual({
      type: 'blocks.move',
      ids: ['l1'],
      to: { parent: null, index: 0 },
    });
  });

  it('settles as unchanged at either end', () => {
    expect(keyboardMoveSlot(doc, ['p1'], 'up')).toBeNull();
    expect(keyboardMoveSlot(doc, ['p3'], 'down')).toBeNull();
    expect(keyboardMoveSlot(doc, [], 'down')).toBeNull();
  });
});

describe('block drag source guards', () => {
  const source = readFileSync(new URL('./block-drag.ts', import.meta.url), 'utf8');

  it('configures one pointer sensor at 4 px, no accessibility, no drop animation', () => {
    expect(source).toContain('new DistanceConstraint({ value: 4 })');
    expect(source).toContain('accessibility: false');
    expect(source).toContain('dropAnimation: null');
    expect(source).toContain('autoScroll: { acceleration: 25, threshold: 0.2 }');
    expect(source.match(/new Draggable\(/g)).toHaveLength(1);
    expect(source.match(/new Droppable\(/g)).toHaveLength(1);
    expect(source).not.toContain('Sortable');
  });

  it('commits one blocks.move request with reason drag from the completion hook', () => {
    expect(source).toContain('manager.addCompletion(');
    expect(source).toContain("surface: 'drag',\n        reason: 'drag',");
  });
});
