import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { dragDepth } from '../../../foundation/tree/projection.js';
import { blockTree } from './block-selection.test.js';
import {
  droppedSelection,
  blockNestPredicate,
  blockTreeModel,
  columnExtent,
  dropIndex,
  TextEditorRowBoxes,
  keepListMarkers,
  keyboardMoveSlot,
  listItemOrdinal,
  moveAction,
  originIndex,
  previewListOf,
  previewSourcesOf,
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

  it('V-587: the origin index is the remaining rows before the source, fixed for a drag', () => {
    expect(originIndex(doc, remainingRows(doc, ['l1']), 'l1')).toBe(1);
    expect(originIndex(doc, remainingRows(doc, ['p1']), 'p1')).toBe(0);
    // A nested item: its list stays a row before it, its moved sibling does not.
    expect(originIndex(doc, remainingRows(doc, ['l1b', 'p3']), 'l1b')).toBe(3);
    expect(originIndex(doc, remainingRows(doc, ['p3']), 'p3')).toBe(6);
    // The move handler compares the index with it; nothing per move walks the document.
    const source = readFileSync(new URL('./block-drag.ts', import.meta.url), 'utf8');
    const move = source.slice(source.indexOf('  #move(event: DragEvent)'));
    expect(move.slice(0, move.indexOf('\n  }\n'))).toContain('index === session.origin');
    expect(source).not.toContain('tree.ordered().slice');
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

  it('mirrors the depth the pointer asks for in right-to-left content', () => {
    const rows = remainingRows(doc, ['l2']);
    const model = blockTreeModel(doc);
    const indent = 24;
    // A move toward the inline end: to the right in LTR, to the left in RTL, nests one level.
    const ltr = projectBlockDrop(doc, model, rows, 'l2', 4, dragDepth(26, indent));
    const rtl = projectBlockDrop(doc, model, rows, 'l2', 4, dragDepth(-26, indent, true));
    expect(rtl).toEqual(ltr);
    expect(rtl).toMatchObject({ depth: 1, parentId: 'l1' });
    // The same physical move in RTL asks for the inline start, one level out.
    expect(dragDepth(26, indent, true)).toBe(-1);
    expect(dragDepth(26, indent, true)).toBe(dragDepth(-26, indent));
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

  it('selects the moved blocks, with focus in the editing root, after an applied drop (uwg-te-req-key-8)', () => {
    expect(droppedSelection(['b', 'c'])).toEqual({
      type: 'selection.set',
      selection: { kind: 'blocks', ids: ['b', 'c'] },
    });
    const drop = source.slice(source.indexOf('async #drop('), source.indexOf('#end(): void'));
    expect(drop).toContain("if (outcome !== 'applied') return false;");
    expect(drop).toContain("instance.execute([select], { reason: 'drag', focus: true })");
  });

  it('commits one blocks.move request with reason drag from the completion hook', () => {
    expect(source).toContain('manager.addCompletion(');
    expect(source).toContain("surface: 'drag',\n        reason: 'drag',");
  });
});

/** A minimal element tree: tag, classes, attributes and children, with parent and sibling links. */
interface FakeElement {
  localName: string;
  classList: { contains(name: string): boolean };
  parentElement: FakeElement | null;
  nextElementSibling: FakeElement | null;
  children: FakeElement[];
  attributes: Map<string, string>;
  style: Record<string, string>;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  setAttribute(name: string, value: string): void;
}

function fake(
  localName: string,
  classes = '',
  attributes: Record<string, string> = {},
  children: FakeElement[] = [],
): FakeElement {
  const names = new Set(classes.split(' ').filter(Boolean));
  const element: FakeElement = {
    localName,
    classList: { contains: (name) => names.has(name) },
    parentElement: null,
    nextElementSibling: null,
    children,
    attributes: new Map(Object.entries(attributes)),
    style: {},
    getAttribute: (name) => element.attributes.get(name) ?? null,
    hasAttribute: (name) => element.attributes.has(name),
    setAttribute: (name, value) => void element.attributes.set(name, value),
  };
  children.forEach((child, index) => {
    child.parentElement = element;
    child.nextElementSibling = children[index + 1] ?? null;
  });
  return element;
}

const asElement = (element: FakeElement) => element as unknown as Element;

describe('block drag preview of list items', () => {
  it('numbers a copied item as its ordered list shows it: start, own values, then one more', () => {
    const items = [fake('li', 'tp-te-item'), fake('li', 'tp-te-item'), fake('li', 'tp-te-item')];
    fake('ol', 'tp-te-list tp-te-list-ordered', { start: '3' }, items);
    expect(items.map((item) => listItemOrdinal(asElement(item)))).toEqual([3, 4, 5]);
    // An engine that writes each item's value: a wrapper item takes a number the next one repeats.
    const valued = [
      fake('li', 'tp-te-item', { value: '3' }),
      fake('li', 'tp-te-item tp-te-nested-item', { value: '4' }),
      fake('li', 'tp-te-item', { value: '4' }),
    ];
    fake('ol', 'tp-te-list tp-te-list-ordered', { start: '3' }, valued);
    expect(listItemOrdinal(asElement(valued[2]!))).toBe(4);
    const plain = [fake('li', 'tp-te-item'), fake('li', 'tp-te-item')];
    fake('ol', 'tp-te-list tp-te-list-ordered', {}, plain);
    expect(listItemOrdinal(asElement(plain[1]!))).toBe(2);
  });

  it('copies a list item inside its list, with the nested-item wrapper that follows it', () => {
    const item = fake('li', 'tp-te-item');
    const wrapper = fake('li', 'tp-te-item tp-te-nested-item', {}, [
      fake('ul', 'tp-te-list tp-te-list-bullet', {}, [fake('li', 'tp-te-item')]),
    ]);
    const last = fake('li', 'tp-te-item');
    const list = fake('ul', 'tp-te-list tp-te-list-bullet', {}, [item, wrapper, last]);
    expect(previewListOf(asElement(item))).toBe(list);
    expect(previewSourcesOf(asElement(item))).toEqual([item, wrapper]);
    expect(previewSourcesOf(asElement(last))).toEqual([last]);
    const paragraph = fake('p', 'tp-te-paragraph');
    fake('div', '', {}, [paragraph]);
    expect(previewListOf(asElement(paragraph))).toBeNull();
    expect(previewSourcesOf(asElement(paragraph))).toEqual([paragraph]);
  });

  it("gives each copied item its original's marker type and ordered number", () => {
    const second = fake('li', 'tp-te-item');
    fake('ol', 'tp-te-list tp-te-list-ordered', { start: '5' }, [fake('li', 'tp-te-item'), second]);
    const bullet = fake('li', 'tp-te-item');
    fake('ul', 'tp-te-list tp-te-list-bullet', {}, [bullet]);
    const paragraph = fake('p', 'tp-te-paragraph');
    const copies = [
      fake('li', 'tp-te-item'),
      fake('li', 'tp-te-item'),
      fake('p', 'tp-te-paragraph'),
    ];
    const mapping = new Map([
      [asElement(second), asElement(copies[0]!)],
      [asElement(bullet), asElement(copies[1]!)],
      [asElement(paragraph), asElement(copies[2]!)],
    ]);
    const types = new Map([
      [second, 'decimal'],
      [bullet, 'circle'],
    ]);
    keepListMarkers(mapping, {
      getComputedStyle: (element: Element) =>
        ({
          listStyleType: types.get(element as unknown as FakeElement) ?? 'disc',
        }) as CSSStyleDeclaration,
    });
    expect(copies[0]!.style.listStyleType).toBe('decimal');
    expect(copies[0]!.getAttribute('value')).toBe('6');
    expect(copies[1]!.style.listStyleType).toBe('circle');
    expect(copies[1]!.hasAttribute('value')).toBe(false);
    expect(copies[2]!.style.listStyleType).toBeUndefined();
  });

  it("keeps a copied task marker at its original's opacity (the copy's checkbox is disabled)", () => {
    const marker = fake('span', 'tp-te-task-marker', {}, [fake('input')]);
    const item = fake('li', 'tp-te-item tp-te-task-item', {}, [marker]);
    fake('ul', 'tp-te-list tp-te-list-task', {}, [item]);
    const markerCopy = fake('span', 'tp-te-task-marker');
    const itemCopy = fake('li', 'tp-te-item tp-te-task-item');
    keepListMarkers(
      new Map([
        [asElement(item), asElement(itemCopy)],
        [asElement(marker), asElement(markerCopy)],
      ]),
      {
        getComputedStyle: (element: Element) =>
          ({
            listStyleType: 'none',
            opacity: (element as unknown as FakeElement) === marker ? '1' : '0.5',
          }) as CSSStyleDeclaration,
      },
    );
    expect(markerCopy.style.opacity).toBe('1');
    expect(itemCopy.style.listStyleType).toBe('none');
    expect(itemCopy.style.opacity).toBeUndefined();
  });

  it('wraps the copies of one list in a copy of that list whose inset the backdrop covers', () => {
    const source = readFileSync(new URL('./block-drag.ts', import.meta.url), 'utf8');
    const fill = source.slice(
      source.indexOf('  #fillPreview(\n'),
      source.indexOf('#place(id: string'),
    );
    expect(fill).toContain('const list: Element | null = previewListOf(element);');
    expect(fill).toContain('copy.style.marginInlineStart = `${-start}px`;');
    expect(fill).toContain('for (const source of previewSourcesOf(element))');
    expect(fill).toContain('keepListMarkers(clone.mapping, view)');
    expect(fill).toContain('preview.style.setProperty(PREVIEW_INSET, `${inset}px`);');
    const styles = readFileSync(new URL('./blocks.ts', import.meta.url), 'utf8');
    expect(styles).toContain('var(--_tp-text-editor-preview-inset, 0px)');
  });
});

describe('block drag row boxes (V-587: a drag start measures only what it reads)', () => {
  const rect = (top: number, height: number, left = 10, width = 200) =>
    ({ top, bottom: top + height, left, right: left + width }) as DOMRectReadOnly;
  const rows = doc.ordered().map((block) => ({
    id: block.id,
    depth: block.depth,
    parentId: block.parentId,
  }));

  it('measures a row the first time it is read, relative to the content origin, once', () => {
    const measured: string[] = [];
    const boxes = new TextEditorRowBoxes(
      rows,
      (id) => {
        measured.push(id);
        const index = rows.findIndex((row) => row.id === id);
        return rect(100 + index * 40, 30);
      },
      () => ({ left: 4, top: 100 }),
    );
    expect(boxes.length).toBe(7);
    expect(measured).toEqual([]);
    expect(boxes.get(2)).toEqual({ top: 80, bottom: 110, left: 6, right: 206 });
    boxes.get(2);
    expect(measured).toEqual(['l1a']);
    // The drop index searches: a pointer in the fifth row reads three rows, not seven.
    expect(dropIndex(boxes, 175)).toBe(5);
    expect(measured.length).toBeLessThanOrEqual(4);
    // Same answers as the full list of boxes.
    const all = rows.map((_, index) => boxes.get(index));
    for (const y of [-5, 0, 14, 16, 56, 175, 400])
      expect(dropIndex(boxes, y)).toBe(dropIndex(all, y));
  });

  it('gives a row without a layout box the end of the row before it', () => {
    const boxes = new TextEditorRowBoxes(
      rows,
      (id) => (id === 'l1b' ? null : rect(rows.findIndex((row) => row.id === id) * 40, 30)),
      () => ({ left: 0, top: 0 }),
    );
    expect(boxes.get(3)).toEqual({ top: 110, bottom: 110, left: 10, right: 210 });
    const first = new TextEditorRowBoxes(
      rows,
      () => null,
      () => ({ left: 0, top: 0 }),
    );
    expect(first.get(0)).toEqual({ top: 0, bottom: 0, left: 0, right: 0 });
  });

  it('takes the content column from the first and last top-level rows that are not list items', () => {
    const measured: string[] = [];
    const boxes = new TextEditorRowBoxes(
      rows,
      (id) => {
        measured.push(id);
        const block = doc.get(id)!;
        return block.kind.startsWith('list') ? rect(0, 10, 34, 176) : rect(0, 10, 10, 200);
      },
      () => ({ left: 0, top: 0 }),
    );
    expect(columnExtent(doc, rows, boxes, { start: 0, end: 999 })).toEqual({ start: 10, end: 210 });
    expect(measured).toEqual(['p1', 'p3']);
    const lists = rows.filter((row) => doc.get(row.id)!.kind.startsWith('list'));
    const listBoxes = new TextEditorRowBoxes(
      lists,
      () => rect(0, 10, 34, 176),
      () => ({ left: 0, top: 0 }),
    );
    expect(columnExtent(doc, lists, listBoxes, { start: 0, end: 999 })).toEqual({
      start: 34,
      end: 210,
    });
    expect(columnExtent(doc, [], listBoxes, { start: 0, end: 999 })).toEqual({
      start: 0,
      end: 999,
    });
  });

  it('builds the session boxes lazily instead of measuring every row at the start', () => {
    const source = readFileSync(new URL('./block-drag.ts', import.meta.url), 'utf8');
    const start = source.slice(
      source.indexOf('  #start(event: DragEvent)'),
      source.indexOf('  #move(event: DragEvent)'),
    );
    expect(start).toContain('new TextEditorRowBoxes(');
    expect(start).not.toContain('rows.map(');
  });
});
