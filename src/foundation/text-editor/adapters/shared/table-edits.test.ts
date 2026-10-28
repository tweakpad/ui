/**
 * Table edits over the portable model (Widgets `uwg-te-req-tables-1`, `uwg-te-tab-actions` r7,
 * `uwg-te-req-tables-3`).
 */
import { describe, expect, it } from 'vitest';
import type { TextEditorAction } from '../../actions.js';
import { htmlSource } from '../../content/html-source.test.js';
import { importHtml, serializeHtml } from '../../content/html.js';
import {
  canonicalize,
  type TextEditorPortableBlock,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import {
  cellRangeInsertEdit,
  deleteTableLines,
  denseRows,
  denseTable,
  duplicateTableLine,
  insertTableLine,
  moveTableLine,
  tableCaret,
  tableEdit,
  keptTableSelection,
  type TextEditorTableEdit,
} from './table-edits.js';
import { tableModel } from './tables.js';

const grid3 =
  '<table data-id="t1"><thead><tr><th><p>a1</p></th><th><p>a2</p></th><th><p>a3</p></th></tr></thead>' +
  '<tbody><tr><td><p>b1</p></td><td><p>b2</p></td><td><p>b3</p></td></tr>' +
  '<tr><td><p>c1</p></td><td><p>c2</p></td><td><p>c3</p></td></tr></tbody></table>';

const tableOf = (html: string): TextEditorPortableTable => {
  const block = importHtml(htmlSource(html), {}).document.blocks[0];
  if (block?.type !== 'table') throw new Error('no table');
  return block;
};

const OPTIONS = { move: true, merge: true };

/** The table an edit leaves, canonical. */
function edited(table: TextEditorPortableTable, action: TextEditorAction, options = OPTIONS) {
  const edit = tableEdit('t1', table, action, options);
  if (!edit) return null;
  const block = canonicalize({ blocks: [edit.table] }).document.blocks[0];
  return { ...edit, table: block as TextEditorPortableTable };
}

const texts = (table: TextEditorPortableTable | undefined) =>
  table
    ? table.rows.map((row) =>
        row.cells.map((cell) =>
          cell.paragraphs
            .map((p) => p.content.map((node) => (node.type === 'text' ? node.text : '')).join(''))
            .join('|'),
        ),
      )
    : null;

describe('uwg-te-req-tables-1: the dense grid', () => {
  it('a table reads into a dense grid and back unchanged', () => {
    const table = tableOf(
      '<table><tbody><tr><td colspan="2" rowspan="2"><p>x</p></td><td><p>y</p></td></tr><tr><td><p>z</p></td></tr></tbody></table>',
    );
    const grid = denseTable(table);
    expect([grid.rows, grid.columns, grid.placed.length]).toEqual([2, 3, 3]);
    expect(denseRows(grid)).toEqual(table.rows);
  });

  it('inserting a line grows the spans that cross it; deleting shrinks them, keeping a starting span’s content', () => {
    const table = tableOf(
      '<table><tbody><tr><td rowspan="2"><p>tall</p></td><td><p>a</p></td></tr><tr><td><p>b</p></td></tr></tbody></table>',
    );
    const grid = denseTable(table);
    const inserted = insertTableLine(grid, 'row', 1)!;
    expect(inserted.placed.find((cell) => cell.row === 0 && cell.column === 0)?.rowSpan).toBe(3);
    expect(inserted.placed.filter((cell) => cell.row === 1)).toHaveLength(1);
    const deleted = deleteTableLines(grid, 'row', 0, 0)!;
    expect(deleted.placed).toMatchObject([
      { row: 0, column: 0, rowSpan: 1, cell: { paragraphs: [{ content: [{ text: 'tall' }] }] } },
      { row: 0, column: 1 },
    ]);
    expect(deleteTableLines(grid, 'row', 0, 1)).toBeNull();
    expect(insertTableLine(grid, 'column', 5)).toBeNull();
  });

  it('moves reorder lines; duplicates copy a line after it', () => {
    const grid = denseTable(tableOf(grid3));
    expect(
      texts({ ...tableOf(grid3), rows: denseRows(moveTableLine(grid, 'row', 0, 2)!) }),
    ).toEqual([
      ['b1', 'b2', 'b3'],
      ['c1', 'c2', 'c3'],
      ['a1', 'a2', 'a3'],
    ]);
    const sources = grid.placed.filter((cell) => cell.column === 1);
    expect(
      texts({
        ...tableOf(grid3),
        rows: denseRows(duplicateTableLine(grid, 'column', 1, sources)!),
      }),
    ).toEqual([
      ['a1', 'a2', 'a2', 'a3'],
      ['b1', 'b2', 'b2', 'b3'],
      ['c1', 'c2', 'c2', 'c3'],
    ]);
    expect(moveTableLine(grid, 'column', 0, 3)).toBeNull();
  });
});

describe('uwg-te-tab-actions r7, uwg-te-req-tables-3: table actions', () => {
  const table = tableOf(grid3);

  it('V-424: positional flags survive every structural change; the table keeps them', () => {
    const steps: TextEditorAction[] = [
      { type: 'table.set-header', table: 't1', column: true },
      { type: 'table.move-row', table: 't1', from: 0, to: 1 },
      { type: 'table.insert-column', table: 't1', index: 0 },
      { type: 'table.duplicate-row', table: 't1', index: 0 },
      { type: 'table.delete-rows', table: 't1', from: 0, to: 0 },
    ];
    let current = table;
    for (const step of steps) {
      current = edited(current, step)!.table;
      const model = tableModel('t1', current);
      expect([model.headerRow, model.headerColumn]).toEqual([true, true]);
      for (const cell of model.cells) expect(cell.header).toBe(cell.row === 0 || cell.column === 0);
    }
    expect(serializeHtml({ blocks: [current] })).toContain('<th scope="row">');
  });

  it('inserted lines with select put the caret in their first cell; kept selections move with their cells', () => {
    const row = edited(table, { type: 'table.insert-row', table: 't1', index: 1, select: true })!;
    expect(row.selection).toEqual(tableCaret('t1', 1, 0));
    const kept = edited(table, { type: 'table.insert-column', table: 't1', index: 1 })!;
    expect(kept.selection).toBe('keep');
    expect(kept.mapCell?.({ row: 2, column: 2 })).toEqual({ row: 2, column: 3 });
    expect(kept.mapCell?.({ row: 2, column: 0 })).toEqual({ row: 2, column: 0 });
    const removed = edited(table, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 })!;
    expect(removed.mapCell?.({ row: 1, column: 1 })).toEqual({ row: 1, column: 1 });
    expect(removed.mapCell?.({ row: 2, column: 1 })).toEqual({ row: 1, column: 1 });
  });

  it('merge joins non-empty contents row-major into the first cell; split copies background and alignment', () => {
    const merged = edited(table, {
      type: 'table.merge-cells',
      table: 't1',
      range: { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } },
    })!;
    expect(texts(merged.table)).toEqual([['a1', 'a2', 'a3'], ['b1|b2|c1|c2', 'b3'], ['c3']]);
    expect(merged.selection).toEqual({
      kind: 'caret',
      block: 't1',
      cell: { row: 1, column: 0 },
      position: 'end',
    });
    expect(
      edited(merged.table, { type: 'table.move-row', table: 't1', from: 0, to: 1 }),
    ).toBeNull();
    const colored = edited(merged.table, {
      type: 'table.background',
      table: 't1',
      target: { all: true },
      color: 'pink',
    })!.table;
    const split = edited(colored, {
      type: 'table.split-cell',
      table: 't1',
      cell: { row: 2, column: 1 },
    })!;
    expect(tableModel('t1', split.table).merged).toBe(false);
    expect(tableModel('t1', split.table).cells.every((cell) => cell.background === 'pink')).toBe(
      true,
    );
    expect(
      edited(table, {
        type: 'table.merge-cells',
        table: 't1',
        range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 0 } },
      }),
    ).toBeNull();
    expect(
      edited(
        table,
        {
          type: 'table.merge-cells',
          table: 't1',
          range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 1 } },
        },
        { move: true, merge: false },
      ),
    ).toBeNull();
  });

  it('moves need the move capability and an unmerged table', () => {
    expect(
      edited(
        table,
        { type: 'table.move-column', table: 't1', from: 0, to: 2 },
        { move: false, merge: true },
      ),
    ).toBeNull();
    expect(
      texts(edited(table, { type: 'table.move-column', table: 't1', from: 0, to: 2 })!.table),
    ).toEqual([
      ['a2', 'a3', 'a1'],
      ['b2', 'b3', 'b1'],
      ['c2', 'c3', 'c1'],
    ]);
  });

  it('align, background, clear-cells and widths follow their targets', () => {
    const aligned = edited(table, {
      type: 'table.align',
      table: 't1',
      target: { row: 2 },
      align: 'justify',
    })!.table;
    expect(tableModel('t1', aligned).cells.map((cell) => cell.align)).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
      'justify',
      'justify',
      'justify',
    ]);
    const cleared = edited(table, {
      type: 'table.clear-cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 0, column: 2 } },
    })!.table;
    expect(texts(cleared)?.[0]).toEqual(['', '', '']);
    expect(edited(table, { type: 'table.column-widths', table: 't1', widths: [1, 2] })).toBeNull();
    const widths = edited(table, {
      type: 'table.column-widths',
      table: 't1',
      widths: [10, 60, 200],
    })!.table;
    expect(widths.widths).toEqual([48, 60, 200]);
    expect(
      edited(widths, { type: 'table.duplicate-column', table: 't1', index: 1 })!.table.widths,
    ).toEqual([48, 60, 60, 200]);
    expect(
      edited(widths, { type: 'table.column-widths', table: 't1', widths: null })!.table.widths,
    ).toBeUndefined();
    expect(edited(table, { type: 'table.set-header', table: 't1' })).toBeNull();
    expect(edited(table, { type: 'text.insert', text: 'x' })).toBeNull();
  });
});

describe('uwg-te-req-tables-1, uwg-te-tab-actions r7: a kept text selection after a table edit', () => {
  const table = tableOf(grid3);
  const at = (row: number, column: number, offset: number, paragraph = 0) => ({
    block: 't1',
    cell: { row, column, paragraph },
    offset,
  });

  it('a point in a deleted row goes to the start of the same column in the next row, else the previous', () => {
    const middle = edited(table, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 })!;
    expect(middle.mapPoint?.(at(1, 2, 2))).toEqual(at(1, 2, 0));
    expect(middle.mapPoint?.(at(2, 1, 1))).toEqual(at(1, 1, 1));
    expect(middle.mapPoint?.(at(0, 0, 2))).toEqual(at(0, 0, 2));
    const last = edited(table, { type: 'table.delete-rows', table: 't1', from: 1, to: 2 })!;
    expect(last.mapPoint?.(at(2, 1, 2))).toEqual(at(0, 1, 0));
    // A point outside the table's cells is kept.
    expect(last.mapPoint?.({ block: 'p1', offset: 3 })).toEqual({ block: 'p1', offset: 3 });
  });

  it('a point in a deleted column goes to the same row in the next column, else the previous', () => {
    const first = edited(table, { type: 'table.delete-columns', table: 't1', from: 0, to: 0 })!;
    expect(first.mapPoint?.(at(2, 0, 1))).toEqual(at(2, 0, 0));
    expect(first.mapPoint?.(at(2, 2, 1))).toEqual(at(2, 1, 1));
    const lastColumns = edited(table, {
      type: 'table.delete-columns',
      table: 't1',
      from: 1,
      to: 2,
    })!;
    expect(lastColumns.mapPoint?.(at(1, 2, 2))).toEqual(at(1, 0, 0));
  });

  it('merged cells keep their points; a span left in the deleted rows keeps its content', () => {
    const merged = tableOf(
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td rowspan="3"><p>tall</p></td></tr>' +
        '<tr><td><p>b</p></td></tr><tr><td><p>c</p></td></tr></tbody></table>',
    );
    const edit = edited(merged, { type: 'table.delete-rows', table: 't1', from: 0, to: 0 })!;
    expect(edit.mapPoint?.(at(0, 1, 3))).toEqual(at(0, 1, 3));
    expect(edit.mapPoint?.(at(0, 0, 1))).toEqual(at(0, 0, 0));
    expect(edit.mapPoint?.(at(2, 0, 1))).toEqual(at(1, 0, 1));
  });

  it('inserts and duplicates move points with their cells; a cleared cell gives its start', () => {
    const inserted = edited(table, { type: 'table.insert-row', table: 't1', index: 1 })!;
    expect(inserted.mapPoint?.(at(1, 1, 2))).toEqual(at(2, 1, 2));
    const duplicated = edited(table, { type: 'table.duplicate-column', table: 't1', index: 0 })!;
    expect(duplicated.mapPoint?.(at(1, 1, 1))).toEqual(at(1, 2, 1));
    const cleared = edited(table, {
      type: 'table.clear-cells',
      table: 't1',
      range: { anchor: { row: 1, column: 1 }, head: { row: 1, column: 1 } },
    })!;
    expect(cleared.mapPoint?.(at(1, 1, 2))).toEqual(at(1, 1, 0));
    expect(cleared.mapPoint?.(at(1, 0, 2))).toEqual(at(1, 0, 2));
    const aligned = edited(table, {
      type: 'table.align',
      table: 't1',
      target: { row: 0 },
      align: 'center',
    })!;
    expect(aligned.mapPoint?.(at(0, 2, 1, 0))).toEqual(at(0, 2, 1));
  });
});

describe('uwg-te-req-tables-1, uwg-te-tab-actions r7: the selection a kept table edit leaves', () => {
  const at = (row: number, column: number, offset = 0) => ({
    block: 't1',
    cell: { row, column, paragraph: 0 },
    offset,
  });
  const edit: Pick<TextEditorTableEdit, 'mapCell' | 'mapPoint'> = {
    mapCell: (cell) => (cell.row === 0 ? null : { row: cell.row - 1, column: cell.column }),
    mapPoint: (point) => ({ ...point, offset: point.offset + 1 }),
  };

  it('moves points and cell ranges in the table with their cells, and keeps the rest as it is', () => {
    expect(
      keptTableSelection(
        { kind: 'text', anchor: at(1, 0), head: at(1, 1), empty: false },
        't1',
        edit,
      ),
    ).toEqual({ kind: 'text', anchor: at(1, 0, 1), head: at(1, 1, 1) });
    const outside = { block: 'p1', offset: 2 };
    expect(
      keptTableSelection(
        { kind: 'text', anchor: outside, head: at(1, 0), empty: false },
        't1',
        edit,
      ),
    ).toEqual({ kind: 'text', anchor: outside, head: at(1, 0, 1) });
    const range = { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } };
    expect(keptTableSelection({ kind: 'cells', table: 't1', range }, 't1', edit)).toEqual({
      kind: 'cells',
      table: 't1',
      range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
    });
    expect(keptTableSelection({ kind: 'cells', table: 't2', range }, 't1', edit)).toEqual({
      kind: 'cells',
      table: 't2',
      range,
    });
    expect(keptTableSelection({ kind: 'blocks', ids: ['p1'] }, 't1', edit)).toEqual({
      kind: 'blocks',
      ids: ['p1'],
    });
  });

  it('collapses a range of deleted lines to a caret in the nearest cell, and keeps any other', () => {
    const table = tableOf(grid3);
    const range = (r0: number, c0: number, r1: number, c1: number) => ({
      kind: 'cells' as const,
      table: 't1',
      range: { anchor: { row: r0, column: c0 }, head: { row: r1, column: c1 } },
    });
    const caret = (row: number, column: number) => ({
      kind: 'caret',
      block: 't1',
      cell: { row, column },
      position: 'start',
    });
    const middle = edited(table, { type: 'table.delete-rows', table: 't1', from: 1, to: 1 })!;
    expect(keptTableSelection(range(1, 0, 1, 2), 't1', middle)).toEqual(caret(1, 0));
    // A range reaching past the deleted lines moves with its cells.
    expect(keptTableSelection(range(0, 1, 1, 2), 't1', middle)).toEqual(range(0, 1, 1, 2));
    const last = edited(table, { type: 'table.delete-rows', table: 't1', from: 1, to: 2 })!;
    expect(keptTableSelection(range(2, 2, 2, 1), 't1', last)).toEqual(caret(0, 1));
    const column = edited(table, { type: 'table.delete-columns', table: 't1', from: 2, to: 2 })!;
    expect(keptTableSelection(range(0, 2, 2, 2), 't1', column)).toEqual(caret(0, 1));
  });

  it('is null without a selection or for a cell range whose end lies in a removed cell', () => {
    expect(keptTableSelection({ kind: 'none' }, 't1', edit)).toBeNull();
    const range = { anchor: { row: 0, column: 0 }, head: { row: 1, column: 0 } };
    expect(keptTableSelection({ kind: 'cells', table: 't1', range }, 't1', edit)).toBeNull();
  });

  it('keeps points and cells as they are when the edit maps nothing', () => {
    const text = { kind: 'text', anchor: at(0, 0), head: at(0, 1), empty: false } as const;
    expect(keptTableSelection(text, 't1', {})).toEqual({
      kind: 'text',
      anchor: at(0, 0),
      head: at(0, 1),
    });
  });
});

describe('uwg-te-req-tables-5: keys and pastes over a cell range', () => {
  const paragraphsOf = (blocks: readonly TextEditorPortableBlock[]) =>
    blocks.map((block) => ({ content: block.type === 'paragraph' ? block.content : [] }));
  const insert = (
    table: TextEditorPortableTable,
    range: { anchor: { row: number; column: number }; head: { row: number; column: number } },
    blocks: readonly TextEditorPortableBlock[],
  ) => {
    const edit = cellRangeInsertEdit('t1', table, range, blocks, paragraphsOf);
    if (!edit) return null;
    const block = canonicalize({ blocks: [edit.table] }).document.blocks[0];
    return { ...edit, table: block as TextEditorPortableTable };
  };
  const paragraph = (text: string): TextEditorPortableBlock => ({
    type: 'paragraph',
    content: text ? [{ type: 'text', text }] : [],
  });

  it('V-834: a key clears the range and lands in its first cell; Enter leaves two paragraphs there', () => {
    const range = { anchor: { row: 2, column: 1 }, head: { row: 1, column: 0 } };
    const typed = insert(tableOf(grid3), range, [paragraph('x')]);
    expect(texts(typed?.table)).toEqual([
      ['a1', 'a2', 'a3'],
      ['x', '', 'b3'],
      ['', '', 'c3'],
    ]);
    expect(typed?.selection).toEqual({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 0, paragraph: 0 }, offset: 1 },
    });
    const enter = insert(tableOf(grid3), range, [paragraph(''), paragraph('')]);
    expect(texts(enter?.table)?.[1]).toEqual(['|', '', 'b3']);
    expect(enter?.selection).toEqual({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 0, paragraph: 1 }, offset: 0 },
    });
  });

  it('V-834: a pasted table fills the range from its first cell, clipped, without repetition, splitting what it covers', () => {
    const pasted = tableOf(
      '<table><tbody><tr><td><p>p1</p></td><td data-background="blue" style="text-align: center"><p>p2</p></td><td><p>p3</p></td></tr></tbody></table>',
    );
    const range = { anchor: { row: 1, column: 0 }, head: { row: 2, column: 1 } };
    const filled = insert(tableOf(grid3), range, [pasted]);
    expect(texts(filled?.table)).toEqual([
      ['a1', 'a2', 'a3'],
      ['p1', 'p2', 'b3'],
      ['c1', 'c2', 'c3'],
    ]);
    const cell = filled?.table.rows[1]?.cells[1];
    expect([cell?.background, cell?.align]).toEqual(['blue', 'center']);
    expect(filled?.selection).toEqual({
      kind: 'text',
      anchor: { block: 't1', cell: { row: 1, column: 1, paragraph: 0 }, offset: 2 },
    });
    // A merged cell the paste covers in part is split: its content stays in its first cell.
    const merged = tableOf(
      '<table data-id="t1"><tbody><tr><td><p>a</p></td><td data-background="green" colspan="2"><p>m</p></td></tr>' +
        '<tr><td><p>b</p></td><td><p>c</p></td><td><p>d</p></td></tr></tbody></table>',
    );
    const spanning = tableOf(
      '<table><tbody><tr><td colspan="2"><p>q</p></td></tr></tbody></table>',
    );
    const split = insert(merged, { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } }, [
      spanning,
    ]);
    expect(texts(split?.table)).toEqual([
      ['q', ''],
      ['b', 'c', 'd'],
    ]);
    expect(
      split?.table.rows[0]?.cells.map((entry) => [entry.colSpan ?? 1, entry.background]),
    ).toEqual([
      [2, undefined],
      [1, 'green'],
    ]);
  });
});
