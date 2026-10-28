/**
 * Structure edits over the portable model: the `blocks.*` actions (Widgets `uwg-te-tab-actions`
 * r3, `uwg-te-req-blocks-1`, `uwg-te-req-blocks-4`).
 */
import { describe, expect, it } from 'vitest';
import { placeInList } from './block-edits.js';
import {
  caretSelection,
  deleteBlocks,
  duplicateBlocks,
  insertAfterBlock,
  insertBeforeBlock,
  insertBlocks,
  moveBlocks,
  newBlock,
  placeAtPoint,
  replaceInPlace,
  selectionAfterInsert,
} from './structure-edits.js';
import { findPath } from './blocks.js';
import {
  editContext,
  NESTED_LIST,
  readHtml,
  ROW_SPAN_TABLE,
  textRun,
  writeHtml,
} from './test-helpers.test.js';

describe('uwg-te-tab-actions r3: blocks.insert, blocks.move, blocks.duplicate, blocks.delete', () => {
  it('new blocks need their required attributes; a new table has a header row by default', () => {
    expect(newBlock('heading', {}, editContext())).toBeNull();
    expect(newBlock('image', { src: 'javascript:x' }, editContext())).toBeNull();
    expect(newBlock('image', { src: '/a.png' }, editContext())).toMatchObject({
      type: 'image',
      src: '/a.png',
      alt: '',
    });
    expect(newBlock('table', { rows: 1, columns: 2 }, editContext())).toMatchObject({
      headerRow: true,
      headerColumn: false,
      rows: [{ cells: [{}, {}] }],
    });
    expect(newBlock('callout', {}, editContext())).toMatchObject({
      type: 'custom',
      name: 'callout',
      content: [],
    });
    expect(newBlock('unknown', {}, editContext())).toBeNull();
  });

  it('uwg-te-req-blocks-1: items placed among items of another kind take it; blocks after a nested item split the list', () => {
    const doc = readHtml(NESTED_LIST);
    const task = newBlock('list-task', { checked: true }, editContext())!;
    expect(writeHtml(insertBlocks(doc, { parent: 'a', index: 1 }, [task], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="new001"><p></p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
    const divider = newBlock('divider', {}, editContext())!;
    expect(writeHtml(insertAfterBlock(doc, 'b', [divider], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul>\n<hr data-id="new001">\n<ul><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    expect(writeHtml(insertBeforeBlock(doc, 'c', [divider], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li></ul></li></ul>\n<hr data-id="new001">\n<ul><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    expect(insertBlocks(doc, { parent: 'a', index: 0 }, [divider], editContext())).toBeNull();
    expect(placeInList(doc.blocks, findPath(doc.blocks, 'd')!, 'replace', [])).toHaveLength(1);
  });

  it('moves blocks with their nested items to a slot, never into their own subtree', () => {
    const doc = readHtml(`${NESTED_LIST}<p data-id="p1">p</p>`);
    expect(writeHtml(moveBlocks(doc, ['a'], { parent: null, index: 1 }, editContext()))).toBe(
      '<ul><li data-id="d"><p>d</p></li><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li></ul>\n<p data-id="p1">p</p>',
    );
    expect(writeHtml(moveBlocks(doc, ['p1'], { parent: null, index: 0 }, editContext()))).toBe(
      `<p data-id="p1">p</p>\n${NESTED_LIST}`,
    );
    expect(moveBlocks(doc, ['a'], { parent: 'b', index: 0 }, editContext())).toBeNull();
    expect(moveBlocks(doc, ['p1'], { parent: 'd', index: 0 }, editContext())).toBeNull();
    expect(moveBlocks(doc, ['p1'], { parent: null, index: 9 }, editContext())).toBeNull();
  });

  it('duplicates blocks after the last of them with fresh identifiers', () => {
    const result = duplicateBlocks(
      readHtml('<p data-id="p1">a</p><p data-id="p2">b</p><p data-id="p3">c</p>'),
      ['p2', 'p1'],
      editContext(),
    );
    expect(result?.copies).toEqual(['new001', 'new002']);
    expect(writeHtml(result?.document)).toBe(
      '<p data-id="p1">a</p>\n<p data-id="p2">b</p>\n<p data-id="new001">a</p>\n<p data-id="new002">b</p>\n<p data-id="p3">c</p>',
    );
  });

  it('uwg-te-req-blocks-4: after a deletion the caret goes to the nearest textblock before, else after, else the new paragraph', () => {
    const doc = readHtml('<p data-id="p1">a</p><hr data-id="d1"><p data-id="p2">b</p>');
    expect(deleteBlocks(doc, ['d1'], editContext())?.caret).toEqual({
      block: 'p1',
      position: 'end',
    });
    expect(deleteBlocks(doc, ['p1', 'd1'], editContext())?.caret).toEqual({
      block: 'p2',
      position: 'start',
    });
    const emptied = deleteBlocks(doc, ['p1', 'd1', 'p2'], editContext());
    expect(writeHtml(emptied?.document)).toBe('<p data-id="new001"></p>');
    expect(emptied?.caret).toEqual({ block: 'new001', position: 'start' });
    expect(deleteBlocks(doc, ['missing'], editContext())).toBeNull();
  });
});

describe('uwg-te-req-blocks-1: where a block that a tool inserts goes', () => {
  it('replaces an empty paragraph or an empty list item at the point, else follows its block', () => {
    const doc = readHtml(
      '<p data-id="p1">a</p><p data-id="p2"></p><ul><li data-id="l1"><p></p></li>' +
        '<li data-id="l2"><p>b</p><ul><li data-id="l3"><p></p></li></ul></li></ul>',
    );
    expect(placeAtPoint(doc, 'p2')).toEqual({ replace: 'p2' });
    expect(placeAtPoint(doc, 'l1')).toEqual({ replace: 'l1' });
    expect(placeAtPoint(doc, 'l3')).toEqual({ replace: 'l3' });
    expect(placeAtPoint(doc, 'p1')).toEqual({ after: 'p1' });
    expect(placeAtPoint(doc, 'l2')).toEqual({ after: 'l2' });
    expect(placeAtPoint(doc, 'missing')).toBeNull();
  });

  it('with no point, as with no selection, uses the end of the document: its last block', () => {
    expect(placeAtPoint(readHtml('<p data-id="p1">a</p><p data-id="p2"></p>'), null)).toEqual({
      replace: 'p2',
    });
    expect(placeAtPoint(readHtml('<p data-id="p1">a</p><p data-id="p2">b</p>'), null)).toEqual({
      after: 'p2',
    });
    const nested = (text: string) =>
      readHtml(
        `<ul><li data-id="l1"><p>a</p><ul><li data-id="l2"><p>${text}</p></li></ul></li></ul>`,
      );
    expect(placeAtPoint(nested(''), null)).toEqual({ replace: 'l2' });
    expect(placeAtPoint(nested('b'), null)).toEqual({ after: 'l2' });
    expect(placeAtPoint({ blocks: [] }, null)).toBeNull();
  });
});

describe('uwg-te-req-blocks-1, uwg-te-tab-actions r3: the selection after blocks.insert', () => {
  it('an atom is block-selected whatever select says; a table and a textblock follow select', () => {
    const doc = readHtml(
      `<p data-id="p1">ab</p><hr data-id="d1">${ROW_SPAN_TABLE}<p data-id="p2">cd</p>`,
    );
    for (const select of [undefined, 'start', 'end'] as const)
      expect(selectionAfterInsert(doc, 'd1', select)).toEqual({ kind: 'blocks', ids: ['d1'] });
    expect(selectionAfterInsert(doc, 'd1', 'none')).toBe('keep');
    expect(selectionAfterInsert(doc, 'p1', 'block')).toEqual({ kind: 'blocks', ids: ['p1'] });
    expect(selectionAfterInsert(doc, 't1', undefined)).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 0, column: 0 },
      position: 'start',
    });
    expect(selectionAfterInsert(doc, 't1', 'end')).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 1, column: 0 },
      position: 'end',
    });
    expect(selectionAfterInsert(doc, 'p2', undefined)).toEqual({
      kind: 'caret',
      block: 'p2',
      position: 'start',
    });
    expect(selectionAfterInsert(doc, 'p2', 'end')).toEqual({
      kind: 'caret',
      block: 'p2',
      position: 'end',
    });
    expect(selectionAfterInsert(doc, 'missing', 'end')).toBeNull();
  });

  it('the last cell is the last cell in document order, a row span from the last column included', () => {
    const doc = readHtml(ROW_SPAN_TABLE);
    expect(caretSelection(doc, 't1', 'end')).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 1, column: 0 },
      position: 'end',
    });
    expect(caretSelection(doc, 't1', 'start')).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 0, column: 0 },
      position: 'start',
    });
    const withDivider = readHtml('<p data-id="p1">a</p><hr data-id="d1">');
    expect(caretSelection(withDivider, 'd1', 'end')).toBeNull();
    expect(caretSelection(withDivider, 'p1', 'end')).toEqual({
      kind: 'caret',
      block: 'p1',
      position: 'end',
    });
  });

  it('replaceInPlace never puts a block under a list item and keeps a replaced item’s nested items', () => {
    const doc = readHtml(NESTED_LIST);
    const paragraph = { type: 'paragraph' as const, id: 'x1', content: [textRun('x')] };
    // An empty nested item replaced by a paragraph splits the list; no hard breaks in the parent.
    const nested = replaceInPlace(
      readHtml(
        '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p></p></li><li data-id="c"><p>c</p></li></ul></li></ul>',
      ),
      'b',
      [paragraph],
      editContext(),
    );
    expect(writeHtml(nested)).toBe(
      '<ul><li data-id="a"><p>a</p></li></ul>\n<p data-id="x1">x</p>\n<ul><li data-id="c"><p>c</p></li></ul>',
    );
    // An item with nested items replaced by a paragraph: they stay, as items after it.
    expect(writeHtml(replaceInPlace(doc, 'a', [paragraph], editContext()))).toBe(
      '<p data-id="x1">x</p>\n<ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    // A list item in place of a list item, and a block in place of a paragraph.
    const item = { type: 'list-bullet' as const, id: 'y1', content: [textRun('y')], children: [] };
    expect(writeHtml(replaceInPlace(doc, 'd', [item], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="y1"><p>y</p></li></ul>',
    );
    expect(
      writeHtml(replaceInPlace(readHtml('<p data-id="p1"></p>'), 'p1', [paragraph], editContext())),
    ).toBe('<p data-id="x1">x</p>');
    expect(replaceInPlace(doc, 'missing', [paragraph], editContext())).toBeNull();
    expect(replaceInPlace(doc, 'a', [], editContext())).toBeNull();
  });
});

describe('uwg-te-req-blocks-1, uwg-te-tab-actions r3: a replaced list item keeps its nested items', () => {
  const item = (id: string, value: string) => ({
    type: 'list-bullet' as const,
    id,
    content: [textRun(value)],
    children: [],
  });
  const paragraph = { type: 'paragraph' as const, id: 'x1', content: [textRun('x')] };

  it('a replacing list item adopts the nested items', () => {
    const topLevel = replaceInPlace(readHtml(NESTED_LIST), 'a', [item('y1', 'y')], editContext());
    expect(writeHtml(topLevel)).toBe(
      '<ul><li data-id="y1"><p>y</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
    const nested = readHtml(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="n"><p>n</p><ul><li data-id="b"><p>b</p></li></ul></li></ul></li></ul>',
    );
    expect(writeHtml(replaceInPlace(nested, 'n', [item('y1', 'y')], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="y1"><p>y</p><ul><li data-id="b"><p>b</p></li></ul></li></ul></li></ul>',
    );
    // A paragraph and then an item: the item, last, adopts them; nothing is kept twice.
    expect(
      writeHtml(
        replaceInPlace(readHtml(NESTED_LIST), 'a', [paragraph, item('y1', 'y')], editContext()),
      ),
    ).toBe(
      '<p data-id="x1">x</p>\n<ul><li data-id="y1"><p>y</p><ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li></ul></li><li data-id="d"><p>d</p></li></ul>',
    );
  });

  it('after a replacing paragraph the nested items move up, never dropped', () => {
    expect(writeHtml(replaceInPlace(readHtml(NESTED_LIST), 'a', [paragraph], editContext()))).toBe(
      '<p data-id="x1">x</p>\n<ul><li data-id="b"><p>b</p></li><li data-id="c"><p>c</p></li><li data-id="d"><p>d</p></li></ul>',
    );
    const nested = readHtml(
      '<ul><li data-id="a"><p>a</p><ul><li data-id="n"><p>n</p><ul><li data-id="b"><p>b</p></li></ul></li></ul></li></ul>',
    );
    expect(writeHtml(replaceInPlace(nested, 'n', [paragraph], editContext()))).toBe(
      '<ul><li data-id="a"><p>a</p></li></ul>\n<p data-id="x1">x</p>\n<ul><li data-id="b"><p>b</p></li></ul>',
    );
  });
});
