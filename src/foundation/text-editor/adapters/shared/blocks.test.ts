import { describe, expect, it } from 'vitest';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDocument,
} from '../../content/portable.js';
import { blockInline, blockModel, blockTree, locatedBlocks, textblockState } from './blocks.js';

const text = (value: string) => ({ type: 'text' as const, text: value });

const DOCUMENT: TextEditorPortableDocument = {
  blocks: [
    { type: 'heading', id: 'h1', level: 2, align: 'center', content: [text('Berths')] },
    { type: 'paragraph', id: 'p1', content: [] },
    { type: 'quote', id: 'q1', content: [text('Slack water')] },
    { type: 'code', id: 'c1', language: 'sh', text: 'moor --stern' },
    { type: 'code', id: 'c2', text: '' },
    {
      type: 'list-ordered',
      id: 'o1',
      start: 3,
      content: [text('Fenders')],
      children: [
        {
          type: 'list-bullet',
          id: 'b1',
          content: [],
          children: [
            { type: 'list-task', id: 't1', checked: true, content: [text('Cleat')], children: [] },
          ],
        },
        { type: 'list-bullet', id: 'b2', align: 'end', content: [text('Warps')], children: [] },
      ],
    },
    { type: 'divider', id: 'd1' },
    { type: 'image', id: 'i1', src: 'https://example.test/quay.png', alt: 'Quay', width: 320 },
    {
      type: 'table',
      id: 'tb1',
      headerRow: true,
      headerColumn: false,
      rows: [
        { cells: [{ colSpan: 2, paragraphs: [{ content: [text('Tide')] }] }] },
        { cells: [{ paragraphs: [{ content: [] }] }, { paragraphs: [{ content: [] }] }] },
      ],
    },
    { type: 'custom', id: 'n1', name: 'note', attrs: { tone: 'warn' }, content: [] },
    { type: 'custom', id: 'm1', name: 'map', attrs: { zoom: 4 } },
  ],
};

describe('block tree (uwg-te-tab-engine r7, uwg-te-req-blocks-1)', () => {
  it('lists every block in document order, each list item before its nested items', () => {
    const tree = blockTree(DOCUMENT, 5);
    expect(tree.version).toBe(5);
    expect(tree.roots).toEqual(['h1', 'p1', 'q1', 'c1', 'c2', 'o1', 'd1', 'i1', 'tb1', 'n1', 'm1']);
    expect(
      tree
        .ordered()
        .map(({ id, kind, parentId, depth, index, children }) => [
          id,
          kind,
          parentId,
          depth,
          index,
          children,
        ]),
    ).toEqual([
      ['h1', 'heading', null, 0, 0, []],
      ['p1', 'paragraph', null, 0, 1, []],
      ['q1', 'quote', null, 0, 2, []],
      ['c1', 'code', null, 0, 3, []],
      ['c2', 'code', null, 0, 4, []],
      ['o1', 'list-ordered', null, 0, 5, ['b1', 'b2']],
      ['b1', 'list-bullet', 'o1', 1, 0, ['t1']],
      ['t1', 'list-task', 'b1', 2, 0, []],
      ['b2', 'list-bullet', 'o1', 1, 1, []],
      ['d1', 'divider', null, 0, 6, []],
      ['i1', 'image', null, 0, 7, []],
      ['tb1', 'table', null, 0, 8, []],
      ['n1', 'note', null, 0, 9, []],
      ['m1', 'map', null, 0, 10, []],
    ]);
    expect(tree.get('t1')).toBe(tree.ordered()[7]);
    expect(tree.get('missing')).toBeUndefined();
  });

  it('reports the attributes of each kind', () => {
    const attrs = Object.fromEntries(
      blockTree(DOCUMENT, 1)
        .ordered()
        .map((b) => [b.id, b.attrs]),
    );
    expect(attrs).toEqual({
      h1: { level: 2, align: 'center' },
      p1: { align: null },
      q1: { align: null },
      c1: { language: 'sh' },
      c2: { language: null },
      o1: { align: null, start: 3 },
      b1: { align: null },
      t1: { align: null, checked: true },
      b2: { align: 'end' },
      d1: {},
      i1: { src: 'https://example.test/quay.png', alt: 'Quay', width: 320 },
      tb1: { rows: 2, columns: 2, headerRow: true, headerColumn: false },
      n1: { tone: 'warn' },
      m1: { zoom: 4 },
    });
    expect(blockModel({ type: 'list-ordered', id: 'x', content: [], children: [] })).toEqual({
      kind: 'list-ordered',
      attrs: { align: null, start: 1 },
    });
    expect(blockModel({ type: 'image', id: 'y', src: 'a.png', alt: '' }).attrs.width).toBeNull();
  });

  it('counts a code block as a textblock, empty when its text is', () => {
    const tree = blockTree(DOCUMENT, 1);
    const flags = Object.fromEntries(
      tree.ordered().map(({ id, textblock, empty }) => [id, [textblock, empty]]),
    );
    expect(flags).toEqual({
      h1: [true, false],
      p1: [true, true],
      q1: [true, false],
      c1: [true, false],
      c2: [true, true],
      o1: [true, false],
      b1: [true, true],
      t1: [true, false],
      b2: [true, false],
      d1: [false, false],
      i1: [false, false],
      tb1: [false, false],
      n1: [true, true],
      m1: [false, false],
    });
    const code: TextEditorPortableBlock = { type: 'code', id: 'c', text: '\n' };
    expect(textblockState(code)).toEqual({ textblock: true, empty: false });
    // Its text reads as text and hard breaks, one per line feed.
    expect(blockInline(code)).toEqual([{ type: 'hard-break' }]);
    expect(blockInline({ type: 'code', id: 'c', text: 'a\nb' })).toEqual([
      { type: 'text', text: 'a' },
      { type: 'hard-break' },
      { type: 'text', text: 'b' },
    ]);
  });

  it('is pure: a new frozen tree on every call, the document left as it is', () => {
    const before = structuredClone(DOCUMENT);
    const first = blockTree(DOCUMENT, 2);
    const second = blockTree(DOCUMENT, 2);
    expect(second).not.toBe(first);
    expect(second.ordered()).toEqual(first.ordered());
    expect(DOCUMENT).toEqual(before);
    expect(Object.isFrozen(DOCUMENT.blocks[9])).toBe(false);
    const custom = DOCUMENT.blocks[9]!;
    expect(first.get('n1')!.attrs).not.toBe(custom.type === 'custom' ? custom.attrs : null);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first.roots)).toBe(true);
    expect(Object.isFrozen(first.ordered())).toBe(true);
    expect(first.ordered()).toBe(first.ordered());
    for (const block of first.ordered()) {
      expect(Object.isFrozen(block)).toBe(true);
      expect(Object.isFrozen(block.attrs)).toBe(true);
      expect(Object.isFrozen(block.children)).toBe(true);
    }
  });

  it('locates every block with its path, parent, depth and index, an item before its nested items', () => {
    expect(
      locatedBlocks(DOCUMENT.blocks)
        .filter(({ path }) => path[0] === 5)
        .map(({ block, path, parentId, depth, index }) => [block.id, path, parentId, depth, index]),
    ).toEqual([
      ['o1', [5], null, 0, 5],
      ['b1', [5, 0], 'o1', 1, 0],
      ['t1', [5, 0, 0], 'b1', 2, 0],
      ['b2', [5, 1], 'o1', 1, 1],
    ]);
    expect(locatedBlocks([])).toEqual([]);
  });
});
