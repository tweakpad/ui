/**
 * Selection-dependent state parts (Widgets `uwg-te-req-engine-4`, `uwg-te-req-blocks-1`).
 */
import { describe, expect, it } from 'vitest';
import { htmlSource } from '../../content/html-source.test.js';
import { importHtml } from '../../content/html.js';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDocument,
  TextEditorPortableInline,
  TextEditorPortableTable,
} from '../../content/portable.js';
import type { TextEditorSelection, TextEditorTextPoint } from '../../model.js';
import { blockTree, findBlock } from './blocks.js';
import { tableModel } from './tables.js';
import {
  blockMarkRuns,
  blockTextEdge,
  cellCaretExit,
  cellCaretKey,
  cellCaretStays,
  cellMarkRuns,
  cellRangeKey,
  firstTextEdge,
  inlineAtCell,
  headBlockId,
  isWholeDocumentSelection,
  linkAtSelection,
  linkRunAt,
  linkRuns,
  markActionAllowed,
  mayBeWholeDocument,
  markTargets,
  normalizeBlockIds,
  rangeMarkRuns,
  sameTextPoint,
  tableState,
  textRangePoints,
  type TextEditorInlineAt,
} from './selection-state.js';

const text = (value: string, link?: string): TextEditorPortableInline =>
  link ? { type: 'text', text: value, marks: { link } } : { type: 'text', text: value };

/** The inline content of a block of a portable document at any depth, as an adapter reads it. */
const inlineIn =
  (document: TextEditorPortableDocument): TextEditorInlineAt =>
  (block, cell) => {
    const found = findBlock(document.blocks, block);
    return found ? inlineAtCell(found, cell) : null;
  };

describe('uwg-te-req-engine-4: the block at the selection head', () => {
  it('is the head block, the table of a cell range or the first selected block', () => {
    const point = { block: 'p1', offset: 0 };
    expect(
      headBlockId({ kind: 'text', anchor: point, head: { block: 'p2', offset: 1 }, empty: false }),
    ).toBe('p2');
    expect(headBlockId({ kind: 'blocks', ids: ['a', 'b'] })).toBe('a');
    expect(
      headBlockId({
        kind: 'cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
      }),
    ).toBe('t1');
    expect(headBlockId({ kind: 'none' })).toBeNull();
  });
});

describe('uwg-te-req-engine-4: the link at the selection', () => {
  const content = [
    text('see '),
    text('har', 'https://a.example/'),
    { type: 'text', text: 'bor', marks: { link: 'https://a.example/', bold: true } },
    text('pier', 'https://b.example/'),
    { type: 'hard-break' },
    text('x'),
  ] as const satisfies readonly TextEditorPortableInline[];

  it('joins adjacent text with one destination into one run', () => {
    expect(linkRuns(content)).toEqual([
      { href: 'https://a.example/', from: 4, to: 10 },
      { href: 'https://b.example/', from: 10, to: 14 },
    ]);
  });

  it('a caret touches a run at either edge, the run after it first; a range must lie inside', () => {
    expect(linkRunAt(content, 4, 4)?.href).toBe('https://a.example/');
    expect(linkRunAt(content, 10, 10)?.href).toBe('https://b.example/');
    expect(linkRunAt(content, 14, 14)?.href).toBe('https://b.example/');
    expect(linkRunAt(content, 3, 3)).toBeNull();
    expect(linkRunAt(content, 5, 9)).toEqual({ href: 'https://a.example/', from: 4, to: 10 });
    expect(linkRunAt(content, 5, 11)).toBeNull();
  });
});

describe('uwg-te-req-engine-4: the table at the selection', () => {
  const table: TextEditorPortableBlock = {
    type: 'table',
    id: 't1',
    headerRow: true,
    headerColumn: false,
    rows: [
      {
        cells: [
          { colSpan: 2, paragraphs: [{ content: [text('ab')] }] },
          { paragraphs: [{ content: [] }] },
        ],
      },
      {
        cells: [
          { paragraphs: [{ content: [] }] },
          { paragraphs: [{ content: [] }] },
          { paragraphs: [{ content: [] }, { content: [text('end')] }] },
        ],
      },
    ],
  };

  it('reports the head cell at its span start, the range, the size, the flags and the merges', () => {
    const model = tableModel('t1', table);
    expect(tableState(model, { row: 0, column: 1 }, null)).toEqual({
      id: 't1',
      cell: { row: 0, column: 0 },
      range: null,
      rows: 2,
      columns: 3,
      headerRow: true,
      headerColumn: false,
      merged: true,
      cellMerged: true,
    });
    const range = { anchor: { row: 1, column: 0 }, head: { row: 1, column: 2 } };
    expect(tableState(model, range.head, range)).toMatchObject({
      cell: { row: 1, column: 2 },
      range,
      cellMerged: false,
    });
    expect(tableState(model, { row: 5, column: 0 }, null)).toBeNull();
  });

  it('gives a table its first and last text points', () => {
    expect(blockTextEdge(table, 'start')).toEqual({
      block: 't1',
      cell: { row: 0, column: 0, paragraph: 0 },
      offset: 0,
    });
    expect(blockTextEdge(table, 'end')).toEqual({
      block: 't1',
      cell: { row: 1, column: 2, paragraph: 1 },
      offset: 3,
    });
  });
});

describe('uwg-te-req-engine-4: the text points of a whole-document selection', () => {
  it('skips blocks without text at either edge', () => {
    const blocks: TextEditorPortableBlock[] = [
      { type: 'divider', id: 'd1' },
      { type: 'heading', id: 'h1', level: 2, content: [text('Tides')] },
      { type: 'code', id: 'c1', text: 'a\nb' },
      { type: 'image', id: 'i1', src: 'https://x.example/a.png', alt: '' },
    ];
    expect(firstTextEdge(blocks, 'start')).toEqual({ block: 'h1', offset: 0 });
    expect(firstTextEdge([...blocks].reverse(), 'end')).toEqual({ block: 'c1', offset: 3 });
    expect(firstTextEdge([blocks[0]!], 'start')).toBeNull();
  });
});

describe('uwg-te-req-blocks-1: marks in code', () => {
  it('a code block takes no mark and no link; inline code only toggles code, clears and links', () => {
    const block = { codeBlock: true, inlineCode: false };
    const inline = { codeBlock: false, inlineCode: true };
    const plain = { codeBlock: false, inlineCode: false };
    for (const type of [
      'mark.toggle',
      'mark.color',
      'mark.clear',
      'link.set',
      'link.unset',
    ] as const)
      expect(markActionAllowed(type, 'bold', block)).toBe(false);
    expect(markActionAllowed('mark.toggle', 'bold', inline)).toBe(false);
    expect(markActionAllowed('mark.toggle', 'code', inline)).toBe(true);
    expect(markActionAllowed('mark.color', null, inline)).toBe(false);
    expect(markActionAllowed('mark.clear', null, inline)).toBe(true);
    expect(markActionAllowed('link.set', null, inline)).toBe(true);
    expect(markActionAllowed('mark.toggle', 'bold', plain)).toBe(true);
  });
});

const read = (html: string): TextEditorPortableDocument =>
  importHtml(htmlSource(html), {}).document;

const rowSpan: TextEditorPortableTable = {
  type: 'table',
  id: 't2',
  headerRow: false,
  headerColumn: false,
  rows: [
    {
      cells: [
        { paragraphs: [{ content: [text('a')] }] },
        { rowSpan: 2, paragraphs: [{ content: [text('b')] }] },
      ],
    },
    { cells: [{ paragraphs: [{ content: [text('cd')] }] }] },
  ],
};

describe('uwg-te-req-engine-4, uwg-te-req-blocks-1: the first and last text points', () => {
  it('a leading table gives cell (0,0); a leading atom is skipped', () => {
    const blocks: TextEditorPortableBlock[] = [
      { type: 'image', id: 'i1', src: 'https://x.example/a.png', alt: '' },
      rowSpan,
      { type: 'paragraph', id: 'p1', content: [] },
    ];
    expect(firstTextEdge(blocks, 'start')).toEqual({
      block: 't2',
      cell: { row: 0, column: 0, paragraph: 0 },
      offset: 0,
    });
    expect(firstTextEdge([{ type: 'divider', id: 'd1' }, ...blocks.slice(2)], 'start')).toEqual({
      block: 'p1',
      offset: 0,
    });
  });

  it('a table’s end is its last cell in document order, not the cell covering the last position', () => {
    expect(blockTextEdge(rowSpan, 'end')).toEqual({
      block: 't2',
      cell: { row: 1, column: 0, paragraph: 0 },
      offset: 2,
    });
  });
});

describe('uwg-te-req-blocks-4, uwg-te-req-engine-4: block selection identifiers', () => {
  it('the topmost selected blocks in document order; nested items are implied', () => {
    const tree = blockTree(
      read(
        '<p data-id="p1">x</p><ul><li data-id="a"><p>a</p><ul><li data-id="b"><p>b</p><ul><li data-id="e"><p>e</p></li></ul></li></ul></li><li data-id="c"><p>c</p></li></ul><p data-id="p2">y</p>',
      ),
      1,
    );
    expect(normalizeBlockIds(tree, ['b', 'a', 'e'])).toEqual(['a']);
    expect(normalizeBlockIds(tree, ['p2', 'e', 'c', 'p1', 'e'])).toEqual(['p1', 'e', 'c', 'p2']);
    expect(normalizeBlockIds(tree, ['b', 'c'])).toEqual(['b', 'c']);
    expect(normalizeBlockIds(tree, [])).toEqual([]);
    expect(normalizeBlockIds(tree, ['a', 'missing'])).toBeNull();
    const ids = normalizeBlockIds(tree, ['c', 'a'])!;
    expect(headBlockId({ kind: 'blocks', ids })).toBe('a');
  });
});

describe('uwg-te-req-engine-4, uwg-te-tab-actions r4: the link at the selection and of the link actions', () => {
  const link = 'https://a.example/';
  const document = read(
    `<p data-id="p1">see <a href="${link}">docs</a> now</p><pre data-id="k"><code>x</code></pre>` +
      `<table data-id="t1"><tbody><tr><td><p>a</p><p><a href="${link}">in</a></p></td></tr></tbody></table>`,
  );
  const at = (
    block: string,
    anchor: number,
    head = anchor,
    cell?: { row: number; column: number; paragraph: number },
  ) =>
    linkAtSelection(
      {
        kind: 'text',
        anchor: { block, offset: anchor, ...(cell ? { cell } : {}) },
        head: { block, offset: head, ...(cell ? { cell } : {}) },
        empty: anchor === head,
      },
      inlineIn(document),
    );
  const whole = { href: link, range: { block: 'p1', from: 4, to: 8 } };

  it('a caret at either edge or inside, and a range inside, give the whole link', () => {
    expect(at('p1', 4)).toEqual(whole);
    expect(at('p1', 8)).toEqual(whole);
    expect(at('p1', 6)).toEqual(whole);
    expect(at('p1', 5, 7)).toEqual(whole);
    expect(at('p1', 3)).toBeNull();
    expect(at('p1', 2, 6)).toBeNull();
    expect(at('k', 0)).toBeNull();
    expect(at('t1', 1, 1, { row: 0, column: 0, paragraph: 1 })).toEqual({
      href: link,
      range: { block: 't1', cell: { row: 0, column: 0, paragraph: 1 }, from: 0, to: 2 },
    });
    expect(
      linkAtSelection(
        {
          kind: 'text',
          anchor: { block: 'p1', offset: 5 },
          head: { block: 't1', cell: { row: 0, column: 0, paragraph: 1 }, offset: 1 },
          empty: false,
        },
        inlineIn(document),
      ),
    ).toBeNull();
    expect(linkAtSelection({ kind: 'blocks', ids: ['p1'] }, inlineIn(document))).toBeNull();
  });
});

describe('uwg-te-req-blocks-1, uwg-te-req-tables-5: the runs mark actions act on', () => {
  const document = read(
    '<p data-id="p1">ab<strong>cd</strong></p><pre data-id="k"><code>x\ny</code></pre>' +
      '<ul><li data-id="a"><p><code>q</code></p><ul><li data-id="b"><p>r</p></li></ul></li></ul>' +
      '<table data-id="t1"><tbody><tr><td><p>c1</p></td><td><p>c2</p><p>c3</p></td></tr>' +
      '<tr><td colspan="2"><p>d1</p></td></tr></tbody></table><hr data-id="d1"><p data-id="p2"></p>',
  );
  const ranges = (runs: readonly { range: object }[] | null) => runs?.map((run) => run.range);

  it('code-block text is skipped; can is true when the range covers text outside code blocks', () => {
    const across = rangeMarkRuns(document, { block: 'p1', offset: 1 }, { block: 'k', offset: 2 })!;
    expect(ranges(across)).toEqual([
      { block: 'p1', from: 1, to: 2 },
      { block: 'p1', from: 2, to: 4 },
      { block: 'k', from: 0, to: 1 },
    ]);
    const targets = markTargets(across);
    expect(ranges(targets.runs)).toEqual([
      { block: 'p1', from: 1, to: 2 },
      { block: 'p1', from: 2, to: 4 },
    ]);
    expect(targets.scope).toEqual({ codeBlock: false, inlineCode: false });
    expect(markActionAllowed('mark.toggle', 'bold', targets.scope)).toBe(true);
    const onlyCode = markTargets(
      rangeMarkRuns(document, { block: 'k', offset: 0 }, { block: 'k', offset: 3 })!,
    );
    expect(onlyCode.scope.codeBlock).toBe(true);
    expect(markActionAllowed('mark.toggle', 'bold', onlyCode.scope)).toBe(false);
    // A range without text has nothing to act on.
    const empty = markTargets(
      rangeMarkRuns(document, { block: 'p2', offset: 0 }, { block: 'p2', offset: 0 })!,
    );
    expect(empty).toEqual({ runs: [], scope: { codeBlock: true, inlineCode: false } });
    // Inline code: every run outside code blocks has the code mark.
    const inline = markTargets(
      rangeMarkRuns(document, { block: 'k', offset: 1 }, { block: 'a', offset: 1 })!,
    );
    expect(inline.scope).toEqual({ codeBlock: false, inlineCode: true });
    expect(markActionAllowed('mark.toggle', 'bold', inline.scope)).toBe(false);
    expect(markActionAllowed('mark.toggle', 'code', inline.scope)).toBe(true);
  });

  it('a block selection acts on its blocks’ text, nested items and table cells included', () => {
    expect(ranges(blockMarkRuns(document, ['a', 'd1', 'missing']))).toEqual([
      { block: 'a', from: 0, to: 1 },
      { block: 'b', from: 0, to: 1 },
    ]);
    expect(blockMarkRuns(document, ['k']).every((run) => run.codeBlock)).toBe(true);
    expect(ranges(blockMarkRuns(document, ['t1']))).toEqual([
      { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, from: 0, to: 2 },
      { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, from: 0, to: 2 },
      { block: 't1', cell: { row: 0, column: 1, paragraph: 1 }, from: 0, to: 2 },
      { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, from: 0, to: 2 },
    ]);
    expect(blockMarkRuns(document, ['p1'])[1]?.marks).toEqual({ bold: true });
  });

  it('a cell range acts on every paragraph of its cells, grown over merged cells', () => {
    const table = document.blocks.find((block) => block.id === 't1') as TextEditorPortableTable;
    // (1,0)–(1,0) is the merged cell alone; (0,1)–(1,1) grows to the whole table.
    expect(
      ranges(
        cellMarkRuns('t1', table, { anchor: { row: 1, column: 0 }, head: { row: 1, column: 0 } }),
      ),
    ).toEqual([{ block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, from: 0, to: 2 }]);
    expect(
      cellMarkRuns('t1', table, { anchor: { row: 0, column: 1 }, head: { row: 1, column: 1 } }),
    ).toHaveLength(4);
    expect(
      cellMarkRuns('t1', table, { anchor: { row: 5, column: 0 }, head: { row: 5, column: 0 } }),
    ).toEqual([]);
    // Text within one cell: its paragraphs between the points.
    expect(
      ranges(
        rangeMarkRuns(
          document,
          { block: 't1', cell: { row: 0, column: 1, paragraph: 1 }, offset: 1 },
          { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
        ),
      ),
    ).toEqual([
      { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, from: 1, to: 2 },
      { block: 't1', cell: { row: 0, column: 1, paragraph: 1 }, from: 0, to: 1 },
    ]);
    expect(
      rangeMarkRuns(
        document,
        { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 0 },
        { block: 't1', cell: { row: 0, column: 1, paragraph: 0 }, offset: 1 },
      ),
    ).toBeNull();
    expect(
      rangeMarkRuns(
        document,
        { block: 'p1', offset: 0 },
        { block: 't1', cell: { row: 0, column: 0, paragraph: 0 }, offset: 1 },
      ),
    ).toBeNull();
  });
});

describe('uwg-te-tab-actions r1: the text points of a text range', () => {
  it('are the start and end of the range in its block, in its cell paragraph when it names one', () => {
    expect(textRangePoints({ block: 'p1', from: 2, to: 5 })).toEqual([
      { block: 'p1', offset: 2 },
      { block: 'p1', offset: 5 },
    ]);
    const cell = { row: 1, column: 0, paragraph: 2 };
    const [from, to] = textRangePoints({ block: 't1', cell, from: 0, to: 0 });
    expect(from).toEqual({ block: 't1', cell, offset: 0 });
    expect(to).toEqual({ block: 't1', cell, offset: 0 });
    // A range without a cell gives points without one, never `cell: undefined`.
    expect('cell' in textRangePoints({ block: 'p1', from: 0, to: 1 })[0]).toBe(false);
  });
});

describe('uwg-te-tab-actions r1: the inline content at a text point', () => {
  const doc = read(
    '<ul><li data-id="a"><p>one</p><ul><li data-id="b"><p>two</p></li></ul></li></ul>' +
      '<table data-id="t1"><tbody><tr><td><p>x</p><p>y</p></td><td rowspan="2"><p>z</p></td></tr><tr><td><p>w</p></td></tr></tbody></table>' +
      '<pre data-id="k"><code>c</code></pre>',
  );
  const table = doc.blocks[1]!;

  it('is a textblock’s content, a code block’s text, or a paragraph of the cell that starts there', () => {
    expect(inlineAtCell(table, { row: 0, column: 0, paragraph: 1 })).toEqual([text('y')]);
    expect(inlineAtCell(table, { row: 0, column: 1, paragraph: 0 })).toEqual([text('z')]);
    expect(inlineAtCell(table, { row: 1, column: 1, paragraph: 0 })).toBeNull();
    expect(inlineAtCell(table, { row: 0, column: 0, paragraph: 2 })).toBeNull();
    expect(inlineAtCell(table, undefined)).toBeNull();
    expect(inlineAtCell(doc.blocks[2]!, undefined)).toEqual([text('c')]);
    expect(inlineAtCell(doc.blocks[2]!, { row: 0, column: 0, paragraph: 0 })).toBeNull();
  });
});

describe('uwg-te-req-tables-5: the cell range of Shift with an arrow key', () => {
  // The merged cell (1,1) spans rows 1–2 and columns 1–2 and holds two paragraphs.
  const doc = read(
    '<table data-id="t1"><tbody>' +
      '<tr><td><p>Day</p></td><td><p>A</p></td><td><p>B</p></td><td><p>C</p></td></tr>' +
      '<tr><td><p>Monday</p></td><td rowspan="2" colspan="2"><p>Live</p><p>choir</p></td><td><p>Talk</p></td></tr>' +
      '<tr><td><p>Tuesday</p></td><td><p>News</p></td></tr>' +
      '<tr><td><p>Wednesday</p></td><td><p>Quiz</p></td><td><p>Archive</p></td><td><p>Music</p></td></tr>' +
      '</tbody></table><p data-id="p1">after</p>',
  );
  const tableOf = (id: string): TextEditorPortableTable | null => {
    const found = findBlock(doc.blocks, id);
    return found?.type === 'table' ? found : null;
  };
  const at = (row: number, column: number, paragraph: number, offset: number) => ({
    block: 't1',
    cell: { row, column, paragraph },
    offset,
  });
  const caretIn = (point: ReturnType<typeof at>): TextEditorSelection => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });
  const cells = (anchor: readonly [number, number], head: readonly [number, number]) => ({
    kind: 'cells' as const,
    table: 't1',
    range: {
      anchor: { row: anchor[0], column: anchor[1] },
      head: { row: head[0], column: head[1] },
    },
  });
  const lines: [string, 'first' | 'last'][] = [];
  const key = (
    selection: TextEditorSelection,
    name: string,
    options: { rtl?: boolean; edge?: boolean } = {},
  ) =>
    cellRangeKey({
      selection,
      key: name,
      table: tableOf,
      rtl: () => options.rtl ?? false,
      onEdgeLine: (point, side) => {
        lines.push([`${point.cell?.row},${point.cell?.column},${point.cell?.paragraph}`, side]);
        return options.edge ?? true;
      },
    });

  it('extends a cell range by the grid rule, the anchor staying, also at the table’s edge', () => {
    expect(key(cells([2, 0], [1, 1]), 'ArrowDown')).toEqual(cells([2, 0], [3, 1]));
    expect(key(cells([2, 0], [3, 3]), 'ArrowDown')).toEqual(cells([2, 0], [3, 3]));
    expect(key(cells([2, 0], [2, 0]), 'ArrowLeft', { rtl: true })).toEqual(cells([2, 0], [1, 1]));
    expect(key(cells([2, 0], [2, 0]), 'Enter')).toBeNull();
  });

  it('starts a range from a caret at the cell’s edge in the key’s direction, from that cell alone', () => {
    // The end of the last paragraph going forward, the start of the first going backward.
    expect(key(caretIn(at(2, 0, 0, 7)), 'ArrowRight')).toEqual(cells([2, 0], [1, 1]));
    expect(key(caretIn(at(2, 0, 0, 3)), 'ArrowRight')).toBeNull();
    expect(key(caretIn(at(2, 0, 0, 0)), 'ArrowLeft')).toEqual(cells([2, 0], [2, 0]));
    expect(key(caretIn(at(1, 1, 0, 4)), 'ArrowRight')).toBeNull();
    expect(key(caretIn(at(1, 1, 1, 5)), 'ArrowRight')).toEqual(cells([1, 1], [1, 3]));
    expect(key(caretIn(at(1, 1, 1, 0)), 'ArrowLeft')).toBeNull();
    expect(lines).toEqual([]);
    // The last line of the last paragraph going down, the first line of the first going up.
    expect(key(caretIn(at(1, 1, 1, 2)), 'ArrowDown')).toEqual(cells([1, 1], [3, 1]));
    expect(key(caretIn(at(1, 1, 0, 2)), 'ArrowDown')).toBeNull();
    expect(key(caretIn(at(1, 1, 0, 2)), 'ArrowUp')).toEqual(cells([1, 1], [0, 1]));
    expect(key(caretIn(at(1, 1, 1, 2)), 'ArrowUp')).toBeNull();
    expect(key(caretIn(at(2, 0, 0, 2)), 'ArrowDown', { edge: false })).toBeNull();
    expect(lines).toEqual([
      ['1,1,1', 'last'],
      ['1,1,0', 'first'],
      ['2,0,0', 'last'],
    ]);
  });

  it('a text selection within one cell starts from its head; any other selection is no cell key', () => {
    const within: TextEditorSelection = {
      kind: 'text',
      anchor: at(3, 2, 0, 0),
      head: at(3, 2, 0, 7),
      empty: false,
    };
    expect(key(within, 'ArrowRight')).toEqual(cells([3, 2], [3, 3]));
    const across: TextEditorSelection = { ...within, anchor: at(3, 1, 0, 0) };
    expect(key(across, 'ArrowRight')).toBeNull();
    const outside: TextEditorSelection = {
      kind: 'text',
      anchor: { block: 'p1', offset: 5 },
      head: { block: 'p1', offset: 5 },
      empty: true,
    };
    expect(key(outside, 'ArrowRight')).toBeNull();
    expect(key({ kind: 'blocks', ids: ['t1'] }, 'ArrowDown')).toBeNull();
    expect(key({ kind: 'none' }, 'ArrowDown')).toBeNull();
    expect(key({ ...cells([0, 0], [0, 0]), table: 'p1' }, 'ArrowDown')).toBeNull();
  });
});

describe('uwg-te-req-engine-9: plain ArrowUp and ArrowDown from a cell into the cell above or below', () => {
  // The merged cell (1,1) spans rows 1–2 and columns 1–2 and holds two paragraphs.
  const doc = read(
    '<table data-id="t1"><tbody>' +
      '<tr><td><p>Day</p></td><td><p>A</p></td><td><p>B</p></td><td><p>C</p></td></tr>' +
      '<tr><td><p>Monday</p></td><td rowspan="2" colspan="2"><p>Live</p><p>choir</p></td><td><p>Talk</p></td></tr>' +
      '<tr><td><p>Tuesday</p></td><td><p>News</p></td></tr>' +
      '<tr><td><p>Wednesday</p></td><td><p>Quiz</p></td><td><p>Archive</p></td><td><p>Music</p></td></tr>' +
      '</tbody></table><p data-id="p1">after</p>',
  );
  const tableOf = (id: string): TextEditorPortableTable | null => {
    const found = findBlock(doc.blocks, id);
    return found?.type === 'table' ? found : null;
  };
  const at = (row: number, column: number, paragraph: number, offset: number) => ({
    block: 't1',
    cell: { row, column, paragraph },
    offset,
  });
  const caretIn = (point: ReturnType<typeof at>): TextEditorSelection => ({
    kind: 'text',
    anchor: point,
    head: point,
    empty: true,
  });
  const lines: [string, 'first' | 'last'][] = [];
  const key = (selection: TextEditorSelection, name: string, edge = true) =>
    cellCaretKey({
      selection,
      key: name,
      table: tableOf,
      onEdgeLine: (point, side) => {
        lines.push([`${point.cell?.row},${point.cell?.column},${point.cell?.paragraph}`, side]);
        return edge;
      },
    });

  it('ArrowUp on the first line of a cell’s first paragraph goes to the end of the cell above the span', () => {
    lines.length = 0;
    expect(key(caretIn(at(1, 0, 0, 1)), 'ArrowUp')).toEqual(at(0, 0, 0, 3));
    expect(key(caretIn(at(1, 1, 0, 0)), 'ArrowUp')).toEqual(at(0, 1, 0, 1));
    // Below and beside the merged cell, by the grid's columns, never the cells' order in a row.
    expect(key(caretIn(at(3, 2, 0, 4)), 'ArrowUp')).toEqual(at(1, 1, 1, 5));
    expect(key(caretIn(at(2, 3, 0, 0)), 'ArrowUp')).toEqual(at(1, 3, 0, 4));
    expect(lines).toEqual([
      ['1,0,0', 'first'],
      ['1,1,0', 'first'],
      ['3,2,0', 'first'],
      ['2,3,0', 'first'],
    ]);
  });

  it('ArrowDown on the last line of a cell’s last paragraph goes to the start of the cell below the span', () => {
    lines.length = 0;
    expect(key(caretIn(at(1, 1, 1, 5)), 'ArrowDown')).toEqual(at(3, 1, 0, 0));
    expect(key(caretIn(at(0, 2, 0, 1)), 'ArrowDown')).toEqual(at(1, 1, 0, 0));
    expect(key(caretIn(at(2, 3, 0, 4)), 'ArrowDown')).toEqual(at(3, 3, 0, 0));
    expect(lines).toEqual([
      ['1,1,1', 'last'],
      ['0,2,0', 'last'],
      ['2,3,0', 'last'],
    ]);
  });

  it('inside the cell, off the edge line or at the table’s first or last row the key stays the engine’s', () => {
    lines.length = 0;
    // Not the first paragraph going up, nor the last going down: no line is read.
    expect(key(caretIn(at(1, 1, 1, 0)), 'ArrowUp')).toBeNull();
    expect(key(caretIn(at(1, 1, 0, 4)), 'ArrowDown')).toBeNull();
    // The first row going up and the last going down leave the table by the same rule.
    expect(key(caretIn(at(0, 1, 0, 0)), 'ArrowUp')).toBeNull();
    expect(key(caretIn(at(3, 0, 0, 0)), 'ArrowDown')).toBeNull();
    expect(lines).toEqual([]);
    expect(key(caretIn(at(2, 0, 0, 3)), 'ArrowUp', false)).toBeNull();
    expect(key(caretIn(at(2, 0, 0, 3)), 'ArrowDown', false)).toBeNull();
    expect(lines).toEqual([
      ['2,0,0', 'first'],
      ['2,0,0', 'last'],
    ]);
  });

  it('only a caret in a cell moves, and only by ArrowUp or ArrowDown', () => {
    const range: TextEditorSelection = {
      kind: 'text',
      anchor: at(2, 0, 0, 0),
      head: at(2, 0, 0, 3),
      empty: false,
    };
    expect(key(range, 'ArrowUp')).toBeNull();
    for (const other of ['ArrowLeft', 'ArrowRight', 'Enter'])
      expect(key(caretIn(at(2, 0, 0, 0)), other)).toBeNull();
    const outside: TextEditorSelection = {
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p1', offset: 0 },
      empty: true,
    };
    expect(key(outside, 'ArrowUp')).toBeNull();
    expect(key({ kind: 'blocks', ids: ['t1'] }, 'ArrowUp')).toBeNull();
    expect(
      key(
        {
          kind: 'cells',
          table: 't1',
          range: { anchor: { row: 1, column: 0 }, head: { row: 1, column: 0 } },
        },
        'ArrowUp',
      ),
    ).toBeNull();
    expect(key({ kind: 'none' }, 'ArrowDown')).toBeNull();
  });
});

describe('uwg-te-req-tables-7: the table that plain ArrowUp or ArrowDown leaves', () => {
  // The cell (1,1) spans rows 1–2, the last two rows, and holds two paragraphs; row 2 holds (2,0).
  const doc = read(
    '<p data-id="p0">above</p><table data-id="t2"><tbody>' +
      '<tr><td><p>a</p></td><td><p>b</p></td></tr>' +
      '<tr><td><p>c</p></td><td rowspan="2"><p>tall</p><p>end</p></td></tr>' +
      '<tr><td><p>d</p></td></tr>' +
      '</tbody></table><p data-id="p1">below</p>',
  );
  const tableOf = (id: string): TextEditorPortableTable | null => {
    const found = findBlock(doc.blocks, id);
    return found?.type === 'table' ? found : null;
  };
  const caretIn = (row: number, column: number, paragraph: number): TextEditorSelection => {
    const point = { block: 't2', cell: { row, column, paragraph }, offset: 0 };
    return { kind: 'text', anchor: point, head: point, empty: true };
  };
  const lines: [string, 'first' | 'last'][] = [];
  const exit = (selection: TextEditorSelection, name: string, edge = true) =>
    cellCaretExit({
      selection,
      key: name,
      table: tableOf,
      onEdgeLine: (point, side) => {
        lines.push([`${point.cell?.row},${point.cell?.column},${point.cell?.paragraph}`, side]);
        return edge;
      },
    });

  it('ArrowDown leaves from the last line of every cell whose span ends on the last row, ArrowUp from every cell on the first', () => {
    lines.length = 0;
    expect(exit(caretIn(1, 1, 1), 'ArrowDown')).toBe('t2');
    expect(exit(caretIn(2, 0, 0), 'ArrowDown')).toBe('t2');
    expect(exit(caretIn(0, 0, 0), 'ArrowUp')).toBe('t2');
    expect(exit(caretIn(0, 1, 0), 'ArrowUp')).toBe('t2');
    expect(lines).toEqual([
      ['1,1,1', 'last'],
      ['2,0,0', 'last'],
      ['0,0,0', 'first'],
      ['0,1,0', 'first'],
    ]);
  });

  it('a key that moves the caret within its cell or into another cell does not leave the table', () => {
    lines.length = 0;
    // Not the last paragraph going down, nor the first going up: no line is read.
    expect(exit(caretIn(1, 1, 0), 'ArrowDown')).toBeNull();
    expect(exit(caretIn(1, 1, 1), 'ArrowUp')).toBeNull();
    // A row lies beyond the span: `cellCaretKey` moves the caret into that row.
    expect(exit(caretIn(1, 0, 0), 'ArrowDown')).toBeNull();
    expect(exit(caretIn(1, 1, 0), 'ArrowUp')).toBeNull();
    expect(lines).toEqual([]);
    expect(exit(caretIn(2, 0, 0), 'ArrowDown', false)).toBeNull();
    expect(lines).toEqual([['2,0,0', 'last']]);
  });

  it('only a caret in a cell leaves, and only by ArrowUp or ArrowDown', () => {
    const point = { block: 't2', cell: { row: 2, column: 0, paragraph: 0 }, offset: 0 };
    expect(
      exit(
        { kind: 'text', anchor: { ...point, offset: 1 }, head: point, empty: false },
        'ArrowDown',
      ),
    ).toBeNull();
    for (const other of ['ArrowLeft', 'ArrowRight', 'Enter'])
      expect(exit(caretIn(2, 0, 0), other)).toBeNull();
    const outside: TextEditorSelection = {
      kind: 'text',
      anchor: { block: 'p1', offset: 0 },
      head: { block: 'p1', offset: 0 },
      empty: true,
    };
    expect(exit(outside, 'ArrowUp')).toBeNull();
    expect(exit({ kind: 'blocks', ids: ['t2'] }, 'ArrowDown')).toBeNull();
    expect(exit({ kind: 'none' }, 'ArrowDown')).toBeNull();
  });
});

describe('uwg-te-req-engine-9: ArrowUp or ArrowDown out of a table with no block beyond it', () => {
  // The table opens and ends the document; the cell (0,0) spans rows 0–1, (1,1) spans rows 1–2.
  const doc = read(
    '<table data-id="t3"><tbody>' +
      '<tr><td rowspan="2"><p>a</p></td><td><p>b</p></td></tr>' +
      '<tr><td rowspan="2"><p>c</p><p>c2</p></td></tr>' +
      '<tr><td><p>d</p></td></tr>' +
      '</tbody></table>',
  );
  const tableOf = (id: string): TextEditorPortableTable | null => {
    const found = findBlock(doc.blocks, id);
    return found?.type === 'table' ? found : null;
  };
  const caretIn = (row: number, column: number, paragraph: number): TextEditorSelection => {
    const point = { block: 't3', cell: { row, column, paragraph }, offset: 1 };
    return { kind: 'text', anchor: point, head: point, empty: true };
  };
  const lines: [string, 'first' | 'last'][] = [];
  const asked: [string, 'up' | 'down'][] = [];
  const stays = (
    selection: TextEditorSelection,
    name: string,
    beyond: { up?: boolean; down?: boolean } = {},
    edge = true,
  ) =>
    cellCaretStays({
      selection,
      key: name,
      table: tableOf,
      blockBeyond: (table, step) => {
        asked.push([table, step]);
        return beyond[step] ?? false;
      },
      onEdgeLine: (point, side) => {
        lines.push([`${point.cell?.row},${point.cell?.column},${point.cell?.paragraph}`, side]);
        return edge;
      },
    });

  it('ArrowUp from the first row of a table that opens the document, or ArrowDown from the last row of one that ends it, leaves the selection unchanged', () => {
    lines.length = 0;
    asked.length = 0;
    expect(stays(caretIn(0, 1, 0), 'ArrowUp')).toBe(true);
    // A cell spanning several rows from the first row, and one spanning down to the last.
    expect(stays(caretIn(0, 0, 0), 'ArrowUp')).toBe(true);
    expect(stays(caretIn(1, 1, 1), 'ArrowDown')).toBe(true);
    expect(stays(caretIn(2, 0, 0), 'ArrowDown')).toBe(true);
    expect(asked).toEqual([
      ['t3', 'up'],
      ['t3', 'up'],
      ['t3', 'down'],
      ['t3', 'down'],
    ]);
    expect(lines).toEqual([
      ['0,1,0', 'first'],
      ['0,0,0', 'first'],
      ['1,1,1', 'last'],
      ['2,0,0', 'last'],
    ]);
  });

  it('a block beyond the table takes the caret, and no line is read for it', () => {
    lines.length = 0;
    expect(stays(caretIn(0, 1, 0), 'ArrowUp', { up: true })).toBe(false);
    expect(stays(caretIn(2, 0, 0), 'ArrowDown', { down: true })).toBe(false);
    expect(lines).toEqual([]);
  });

  it('a key that stays within the cell or moves into another cell is no exit', () => {
    lines.length = 0;
    asked.length = 0;
    // Off the edge line, the caret moves within its cell.
    expect(stays(caretIn(0, 1, 0), 'ArrowUp', {}, false)).toBe(false);
    // Not the first paragraph going up, nor the last going down: no line is read.
    expect(stays(caretIn(1, 1, 1), 'ArrowUp')).toBe(false);
    expect(stays(caretIn(1, 1, 0), 'ArrowDown')).toBe(false);
    // A row lies beyond the span: `cellCaretKey` moves the caret into that row.
    expect(stays(caretIn(0, 1, 0), 'ArrowDown')).toBe(false);
    expect(stays(caretIn(2, 0, 0), 'ArrowUp')).toBe(false);
    expect(asked).toEqual([['t3', 'up']]);
    expect(lines).toEqual([['0,1,0', 'first']]);
    // Only a caret in a cell, and only ArrowUp or ArrowDown.
    const point = { block: 't3', cell: { row: 0, column: 1, paragraph: 0 }, offset: 0 };
    expect(
      stays(
        { kind: 'text', anchor: { ...point, offset: 1 }, head: point, empty: false },
        'ArrowUp',
      ),
    ).toBe(false);
    for (const other of ['ArrowLeft', 'ArrowRight', 'Home'])
      expect(stays(caretIn(0, 1, 0), other)).toBe(false);
    expect(stays({ kind: 'blocks', ids: ['t3'] }, 'ArrowUp')).toBe(false);
    expect(stays({ kind: 'none' }, 'ArrowDown')).toBe(false);
  });
});

describe('uwg-te-req-engine-4: the whole-document selection, however it was made', () => {
  const first = { block: 'p1', offset: 0 };
  const last = { block: 'p2', offset: 3 };
  const edges = { first, last };
  const textSelection = (
    anchor: TextEditorTextPoint,
    head: TextEditorTextPoint,
    empty = false,
  ): TextEditorSelection => ({ kind: 'text', anchor, head, empty });

  it('is a text selection from the first to the last text point of the document, either way round', () => {
    expect(isWholeDocumentSelection(textSelection(first, last), edges)).toBe(true);
    expect(isWholeDocumentSelection(textSelection(last, first), edges)).toBe(true);
    expect(isWholeDocumentSelection(textSelection(first, { block: 'p2', offset: 2 }), edges)).toBe(
      false,
    );
    expect(isWholeDocumentSelection(textSelection({ block: 'p1', offset: 1 }, last), edges)).toBe(
      false,
    );
    expect(isWholeDocumentSelection(textSelection(first, first), edges)).toBe(false);
    expect(isWholeDocumentSelection({ kind: 'blocks', ids: ['p1', 'p2'] }, edges)).toBe(false);
    expect(isWholeDocumentSelection({ kind: 'none' }, edges)).toBe(false);
    expect(isWholeDocumentSelection(textSelection(first, last), null)).toBe(false);
  });

  it('only a text selection with a point at offset 0 can be one, before any edge is read', () => {
    expect(mayBeWholeDocument(textSelection(first, last))).toBe(true);
    expect(mayBeWholeDocument(textSelection(last, first))).toBe(true);
    expect(mayBeWholeDocument(textSelection({ block: 'p1', offset: 1 }, last))).toBe(false);
    expect(mayBeWholeDocument(textSelection(first, first, true))).toBe(false);
    expect(mayBeWholeDocument({ kind: 'blocks', ids: ['p1'] })).toBe(false);
  });

  it('a collapsed selection is a caret, also the one point of a document of one empty textblock, unless reported as the whole document', () => {
    const only = { block: 'h1', offset: 0 };
    const one = { first: only, last: only };
    expect(isWholeDocumentSelection(textSelection(only, only, true), one)).toBe(false);
    // The engine's own select-all of that document, which the state reports as not empty.
    expect(isWholeDocumentSelection(textSelection(only, only, false), one)).toBe(true);
  });

  it('table edges compare by cell and paragraph', () => {
    const cell = (row: number, column: number, paragraph: number, offset: number) => ({
      block: 't1',
      cell: { row, column, paragraph },
      offset,
    });
    const tableEdges = { first: cell(0, 0, 0, 0), last: cell(1, 1, 1, 2) };
    expect(
      isWholeDocumentSelection(textSelection(cell(0, 0, 0, 0), cell(1, 1, 1, 2)), tableEdges),
    ).toBe(true);
    expect(
      isWholeDocumentSelection(textSelection(cell(0, 0, 0, 0), cell(1, 1, 0, 2)), tableEdges),
    ).toBe(false);
    expect(sameTextPoint(cell(1, 1, 1, 2), cell(1, 1, 1, 2))).toBe(true);
    expect(sameTextPoint(cell(1, 1, 1, 2), cell(1, 0, 1, 2))).toBe(false);
    expect(sameTextPoint({ block: 't1', offset: 2 }, cell(1, 1, 1, 2))).toBe(false);
  });
});
