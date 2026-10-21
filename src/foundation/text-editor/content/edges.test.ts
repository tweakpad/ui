import { describe, expect, it } from 'vitest';
import {
  blockInline,
  blockTextEdge,
  cellTextEdge,
  firstTextEdge,
  inlineLength,
  placedCell,
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
