import { describe, expect, it } from 'vitest';
import {
  blockInline,
  blockTextEdge,
  cellTextEdge,
  firstTextEdge,
  inlineLength,
  inlineStep,
  placedCell,
  stepTextPoint,
  textStep,
} from './edges.js';
import type {
  TextEditorPortableBlock,
  TextEditorPortableInline,
  TextEditorPortableTable,
} from './portable.js';

const text = (value: string): TextEditorPortableInline => ({ type: 'text', text: value });
const paragraph = (id: string, ...content: TextEditorPortableInline[]): TextEditorPortableBlock =>
  ({ type: 'paragraph', id, content }) as TextEditorPortableBlock;
const cell = (value: string, extra: object = {}) => ({
  paragraphs: [{ content: value ? [text(value)] : [] }],
  ...extra,
});

/** A 2×2 table whose first cell spans both rows, and whose last cell holds two paragraphs. */
const table = {
  type: 'table',
  id: 't1',
  headerRow: false,
  headerColumn: false,
  rows: [
    { cells: [cell('tall', { rowSpan: 2 }), cell('b')] },
    {
      cells: [
        {
          paragraphs: [
            { content: [text('c')] },
            { content: [text('last'), { type: 'hard-break' }] },
          ],
        },
      ],
    },
  ],
} as unknown as TextEditorPortableTable;

describe('uwg-te-req-engine-3, uwg-te-req-engine-4: text edges of portable blocks', () => {
  it('counts text by code unit and every other inline node as one', () => {
    expect(inlineLength([text('ab'), { type: 'hard-break' } as TextEditorPortableInline])).toBe(3);
    expect(inlineLength([])).toBe(0);
  });

  it('reads the inline content of textblocks and none of atoms or tables', () => {
    expect(blockInline(paragraph('p', text('x')))).toEqual([text('x')]);
    expect(
      blockInline({ type: 'code', id: 'c', text: 'a\nb' } as TextEditorPortableBlock),
    ).toHaveLength(3);
    expect(blockInline({ type: 'divider', id: 'd' } as TextEditorPortableBlock)).toBeNull();
    expect(blockInline(table)).toBeNull();
  });

  it('finds placed cells and their edges; a covered position holds none', () => {
    expect(placedCell(table, 0, 0)?.cell.paragraphs[0]?.content).toEqual([text('tall')]);
    expect(placedCell(table, 1, 0)).toBeUndefined();
    expect(cellTextEdge('t1', table, { row: 1, column: 1 }, 'end')).toEqual({
      block: 't1',
      cell: { row: 1, column: 1, paragraph: 1 },
      offset: 5,
    });
  });

  it('a table’s edges are its first and last cells in row-major order', () => {
    expect(blockTextEdge(table, 'start')).toEqual({
      block: 't1',
      cell: { row: 0, column: 0, paragraph: 0 },
      offset: 0,
    });
    expect(blockTextEdge(table, 'end')).toEqual({
      block: 't1',
      cell: { row: 1, column: 1, paragraph: 1 },
      offset: 5,
    });
  });

  it('skips blocks without text from either end, reading only the blocks it reaches', () => {
    const divider = { type: 'divider', id: 'd' } as TextEditorPortableBlock;
    const blocks = [
      divider,
      paragraph('a', text('one')),
      paragraph('b', text('two words')),
      divider,
    ];
    const read: string[] = [];
    function* tracked(list: readonly TextEditorPortableBlock[]) {
      for (const block of list) {
        read.push(block.id ?? '');
        yield block;
      }
    }
    expect(firstTextEdge(tracked(blocks), 'start')).toEqual({ block: 'a', offset: 0 });
    expect(firstTextEdge(tracked([...blocks].reverse()), 'end')).toEqual({ block: 'b', offset: 9 });
    expect(read).toEqual(['d', 'a', 'd', 'b']);
    expect(firstTextEdge([divider], 'start')).toBeNull();
    expect(blockTextEdge(paragraph(''), 'start')).toBeNull();
  });
});

describe('uwg-te-req-a11y-1: one character from a text point', () => {
  it('steps over a grapheme of text, never splitting a surrogate pair or a cluster', () => {
    expect([textStep('ab', 0, 'forward'), textStep('ab', 1, 'forward')]).toEqual([1, 2]);
    expect([textStep('ab', 2, 'forward'), textStep('ab', 0, 'backward')]).toEqual([null, null]);
    expect(textStep('ab', 2, 'backward')).toBe(1);
    expect([textStep('a😀b', 1, 'forward'), textStep('a😀b', 3, 'backward')]).toEqual([3, 1]);
    // A combining accent stays with its letter, also from inside the cluster.
    expect([textStep('e\u0301x', 0, 'forward'), textStep('e\u0301x', 2, 'backward')]).toEqual([
      2, 0,
    ]);
    expect([textStep('e\u0301x', 1, 'forward'), textStep('e\u0301x', 1, 'backward')]).toEqual([
      2, 0,
    ]);
    expect(textStep('🇫🇷!', 0, 'forward')).toBe(4);
  });

  it('steps over a hard break or an inline node as one unit', () => {
    const content = [text('ab'), { type: 'hard-break' } as TextEditorPortableInline, text('c')];
    expect(inlineStep(content, 2, 'forward')).toBe(3);
    expect(inlineStep(content, 3, 'backward')).toBe(2);
    expect(inlineStep(content, 3, 'forward')).toBe(4);
    expect([inlineStep(content, 4, 'forward'), inlineStep(content, 0, 'backward')]).toEqual([
      null,
      null,
    ]);
    expect(inlineStep([], 0, 'forward')).toBeNull();
  });

  it('stays in a textblock; a block without text gives none', () => {
    const block = paragraph('a', text('one'));
    expect(stepTextPoint(block, { block: 'a', offset: 0 }, 'forward')).toEqual({
      block: 'a',
      offset: 1,
    });
    expect(stepTextPoint(block, { block: 'a', offset: 3 }, 'forward')).toBeNull();
    expect(stepTextPoint(block, { block: 'a', offset: 0 }, 'backward')).toBeNull();
    const code = { type: 'code', id: 'c', text: 'x\ny' } as TextEditorPortableBlock;
    expect(stepTextPoint(code, { block: 'c', offset: 1 }, 'forward')).toEqual({
      block: 'c',
      offset: 2,
    });
    const divider = { type: 'divider', id: 'd' } as TextEditorPortableBlock;
    expect(stepTextPoint(divider, { block: 'd', offset: 0 }, 'forward')).toBeNull();
  });

  it('moves between the paragraphs of a table cell and stops at the cell’s edges', () => {
    const at = (paragraph: number, offset: number) => ({
      block: 't1',
      cell: { row: 1, column: 1, paragraph },
      offset,
    });
    expect(stepTextPoint(table, at(0, 0), 'forward')).toEqual(at(0, 1));
    expect(stepTextPoint(table, at(0, 1), 'forward')).toEqual(at(1, 0));
    expect(stepTextPoint(table, at(1, 0), 'backward')).toEqual(at(0, 1));
    expect(stepTextPoint(table, at(1, 5), 'forward')).toBeNull();
    expect(stepTextPoint(table, at(0, 0), 'backward')).toBeNull();
    // A covered position, and a cell point in a block that is no table, hold none.
    const covered = { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 0 };
    expect(stepTextPoint(table, covered, 'forward')).toBeNull();
    expect(
      stepTextPoint(paragraph('a', text('one')), { ...at(0, 0), block: 'a' }, 'forward'),
    ).toBeNull();
  });
});
