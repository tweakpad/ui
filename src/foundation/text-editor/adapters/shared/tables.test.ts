import { describe, expect, it } from 'vitest';
import {
  tableGrid,
  type TextEditorPortableTable,
  type TextEditorPortableTableCell,
  type TextEditorPortableDocument,
  type TextEditorPortableTableRow,
} from '../../content/portable.js';
import type { TextEditorTableModel } from '../../model.js';
import {
  canMoveLines,
  cellRangeRect,
  cellStepOfKey,
  edgeCell,
  extendCellRange,
  cellsInRect,
  moveLineOrder,
  planColumnWidths,
  planDuplicateColumn,
  planDuplicateRow,
  planMerge,
  planSplit,
  positionalHeader,
  TABLE_MIN_COLUMN_WIDTH,
  tableModel,
  tableTargetCells,
  widthsAfter,
  type TextEditorMergePlan,
  placedCell,
  tableModelOf,
  verticalCellCaret,
} from './tables.js';

// Portable tables and the structural changes an adapter applies with the plans

const cell = (
  text = '',
  extra: Partial<TextEditorPortableTableCell> = {},
): TextEditorPortableTableCell => ({
  paragraphs: [{ content: text ? [{ type: 'text', text }] : [] }],
  ...extra,
});

function table(
  rows: readonly (readonly (string | TextEditorPortableTableCell)[])[],
  options: Partial<Pick<TextEditorPortableTable, 'headerRow' | 'headerColumn' | 'widths'>> = {},
): TextEditorPortableTable {
  return {
    type: 'table',
    id: 'tb1',
    headerRow: options.headerRow ?? true,
    headerColumn: options.headerColumn ?? false,
    ...(options.widths ? { widths: options.widths } : {}),
    rows: rows.map((row) => ({
      cells: row.map((value) => (typeof value === 'string' ? cell(value) : value)),
    })),
  };
}

const withRows = (
  source: TextEditorPortableTable,
  rows: readonly TextEditorPortableTableRow[],
): TextEditorPortableTable => ({ ...source, rows });

/** The text of each cell of a model's grid positions, row by row, `*` marking header cells. */
function texts(source: TextEditorPortableTable): string[][] {
  const model = tableModel('tb1', source);
  const placed = tableGrid(source).cells;
  return model.grid.map((row) =>
    row.map((index) => {
      const content = placed[index]!.cell.paragraphs.flatMap((paragraph) => paragraph.content);
      const value = content.map((node) => (node.type === 'text' ? node.text : '')).join('|');
      return `${model.cells[index]!.header ? '*' : ''}${value}`;
    }),
  );
}

/** A merge applied to a portable table: the remaining cell spans the area and holds the contents. */
function applyMerge(
  source: TextEditorPortableTable,
  plan: TextEditorMergePlan,
): TextEditorPortableTable {
  const placed = tableGrid(source).cells;
  const removed = new Set(plan.cells.slice(1));
  const paragraphs = plan.contents.flatMap((index) => placed[index]!.cell.paragraphs);
  const rows: TextEditorPortableTableCell[][] = source.rows.map(() => []);
  placed.forEach((entry, index) => {
    if (removed.has(index)) return;
    rows[entry.row]!.push(
      index === plan.cell
        ? {
            ...entry.cell,
            rowSpan: plan.rowSpan,
            colSpan: plan.colSpan,
            paragraphs: paragraphs.length > 0 ? paragraphs : [{ content: [] }],
          }
        : entry.cell,
    );
  });
  return withRows(
    source,
    rows.map((cells) => ({ cells })),
  );
}

describe('table model (uwg-te-tab-engine r8, uwg-te-req-tables-1)', () => {
  it('V-424: the shared planners give spans, merged, positional headers, backgrounds, alignment and widths', () => {
    const source = table(
      [
        ['Pier', 'Depth', 'Note'],
        [cell('North', { rowSpan: 2, colSpan: 2, background: 'green', align: 'center' }), ''],
        [cell('', { align: 'start' })],
      ],
      { headerRow: true, headerColumn: true, widths: [120, 80, 64] },
    );
    const model = tableModel('tb1', source);
    expect(model).toMatchObject({
      id: 'tb1',
      rows: 3,
      columns: 3,
      headerRow: true,
      headerColumn: true,
      widths: [120, 80, 64],
      merged: true,
    });
    expect(model.grid).toEqual([
      [0, 1, 2],
      [3, 3, 4],
      [3, 3, 5],
    ]);
    expect(
      model.cells.map(({ row, column, rowSpan, colSpan, header }) => ({
        row,
        column,
        rowSpan,
        colSpan,
        header,
      })),
    ).toEqual([
      { row: 0, column: 0, rowSpan: 1, colSpan: 1, header: true },
      { row: 0, column: 1, rowSpan: 1, colSpan: 1, header: true },
      { row: 0, column: 2, rowSpan: 1, colSpan: 1, header: true },
      { row: 1, column: 0, rowSpan: 2, colSpan: 2, header: true },
      { row: 1, column: 2, rowSpan: 1, colSpan: 1, header: false },
      { row: 2, column: 2, rowSpan: 1, colSpan: 1, header: false },
    ]);
    expect(model.cells[3]).toMatchObject({ background: 'green', align: 'center', empty: false });
    expect(model.cells[4]).toMatchObject({ background: null, align: null, empty: true });
    expect(model.cells[5]!.align).toBeNull();
    expect(
      Object.isFrozen(model) && Object.isFrozen(model.cells[0]) && Object.isFrozen(model.grid[0]),
    ).toBe(true);
    expect(tableModel('tb2', table([['a']], { headerRow: false })).widths).toBeNull();
    expect(tableModel('tb2', table([['a', 'b']])).merged).toBe(false);
  });

  it('places header state by position only', () => {
    const flags = { headerRow: true, headerColumn: false };
    expect(positionalHeader({ row: 0, column: 2 }, flags)).toEqual({ row: true, column: false });
    expect(positionalHeader({ row: 1, column: 0 }, flags)).toEqual({ row: false, column: false });
    const both = { headerRow: true, headerColumn: true };
    expect(positionalHeader({ row: 0, column: 0 }, both)).toEqual({ row: true, column: true });
    expect(positionalHeader({ row: 3, column: 0 }, both)).toEqual({ row: false, column: true });
  });
});

describe('header state after structural changes (uwg-te-req-tables-1, uwg-te-lis-up-i2)', () => {
  const source = table(
    [
      ['h1', 'h2'],
      ['a1', 'a2'],
      ['b1', 'b2'],
    ],
    { headerRow: true, headerColumn: true },
  );

  it('V-424: header flags are applied again after insert, delete and duplicate', () => {
    const inserted = withRows(source, [{ cells: [cell(), cell()] }, ...source.rows]);
    expect(texts(inserted)).toEqual([
      ['*', '*'],
      ['*h1', 'h2'],
      ['*a1', 'a2'],
      ['*b1', 'b2'],
    ]);
    expect(texts(withRows(source, source.rows.slice(1)))).toEqual([
      ['*a1', '*a2'],
      ['*b1', 'b2'],
    ]);
    const plan = planDuplicateRow(tableModel('tb1', source), 0);
    expect(plan).toEqual({ index: 1, cells: [0, 1] });
    const copy = { cells: plan!.cells.map((index) => tableGrid(source).cells[index]!.cell) };
    const duplicated = withRows(source, [source.rows[0]!, copy, ...source.rows.slice(1)]);
    expect(texts(duplicated)).toEqual([
      ['*h1', '*h2'],
      ['*h1', 'h2'],
      ['*a1', 'a2'],
      ['*b1', 'b2'],
    ]);
  });

  it('V-424: a moved row never carries header cells', () => {
    const order = moveLineOrder(3, 0, 2)!;
    expect(order).toEqual([1, 2, 0]);
    const moved = withRows(
      source,
      order.map((index) => source.rows[index]!),
    );
    expect(texts(moved)).toEqual([
      ['*a1', '*a2'],
      ['*b1', 'b2'],
      ['*h1', 'h2'],
    ]);
    const columns = moveLineOrder(2, 1, 0)!;
    const swapped = withRows(
      source,
      source.rows.map((row) => ({ cells: columns.map((index) => row.cells[index]!) })),
    );
    expect(texts(swapped)).toEqual([
      ['*h2', '*h1'],
      ['*a2', 'a1'],
      ['*b2', 'b1'],
    ]);
  });

  it('V-424: a merge joins the non-empty contents row-major into its first cell', () => {
    const grid = table(
      [
        ['h1', '', 'h3'],
        ['a1', 'a2', 'a3'],
        ['b1', '', 'b3'],
      ],
      { headerRow: true },
    );
    const model = tableModel('tb1', grid);
    const plan = planMerge(model, { anchor: { row: 1, column: 1 }, head: { row: 0, column: 0 } })!;
    expect(plan).toEqual({
      rect: { top: 0, left: 0, bottom: 1, right: 1 },
      cell: 0,
      rowSpan: 2,
      colSpan: 2,
      cells: [0, 1, 3, 4],
      contents: [0, 3, 4],
    });
    const merged = applyMerge(grid, plan);
    expect(texts(merged)).toEqual([
      ['*h1|a1|a2', '*h1|a1|a2', '*h3'],
      ['*h1|a1|a2', '*h1|a1|a2', 'a3'],
      ['b1', '', 'b3'],
    ]);
    expect(tableModel('tb1', merged).merged).toBe(true);
    // A merge of empty cells keeps one empty paragraph.
    const empty = planMerge(model, { anchor: { row: 0, column: 1 }, head: { row: 0, column: 1 } });
    expect(empty).toBeNull();
    const blank = planMerge(tableModel('tb1', table([['', '']])), {
      anchor: { row: 0, column: 0 },
      head: { row: 0, column: 1 },
    });
    expect(blank?.contents).toEqual([]);
  });
});

describe('cell ranges and targets (uwg-te-req-tables-5, uwg-te-tab-actions r7)', () => {
  // A 4×4 table whose cell (1,1) spans two rows and two columns.
  const spanned = table([
    ['a', 'b', 'c', 'd'],
    ['e', cell('F', { rowSpan: 2, colSpan: 2 }), 'g'],
    ['h', 'i'],
    ['j', 'k', 'l', 'm'],
  ]);
  const model = tableModel('tb1', spanned);

  it('grows a range until no merged cell crosses its edge', () => {
    expect(model.grid[2]).toEqual([7, 5, 5, 8]);
    expect(
      cellRangeRect(model, { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } }),
    ).toEqual({
      top: 0,
      left: 0,
      bottom: 2,
      right: 2,
    });
    expect(
      cellRangeRect(model, { anchor: { row: 2, column: 2 }, head: { row: 2, column: 2 } }),
    ).toEqual({
      top: 1,
      left: 1,
      bottom: 2,
      right: 2,
    });
    expect(
      cellRangeRect(model, { anchor: { row: 4, column: 0 }, head: { row: 0, column: 0 } }),
    ).toBeNull();
    const rect = { top: 1, left: 1, bottom: 2, right: 3 };
    expect(cellsInRect(model, rect)).toEqual([5, 6, 8]);
  });

  it('names the cells of a row, a column, a range or the whole table', () => {
    expect(tableTargetCells(model, { row: 2 })).toEqual([5, 7, 8]);
    expect(tableTargetCells(model, { column: 2 })).toEqual([2, 5, 11]);
    expect(
      tableTargetCells(model, {
        range: { anchor: { row: 3, column: 3 }, head: { row: 2, column: 2 } },
      }),
    ).toEqual([5, 6, 8, 10, 11, 12]);
    expect(tableTargetCells(model, { all: true })).toHaveLength(model.cells.length);
    expect(tableTargetCells(model, { row: 9 })).toEqual([]);
    expect(tableTargetCells(model, { column: -1 })).toEqual([]);
  });

  it('splits a merged cell into its positions in reading order, the first keeping the content', () => {
    expect(planSplit(model, { row: 2, column: 2 })).toEqual({
      cell: 5,
      rect: { top: 1, left: 1, bottom: 2, right: 2 },
      positions: [
        { row: 1, column: 1 },
        { row: 1, column: 2 },
        { row: 2, column: 1 },
        { row: 2, column: 2 },
      ],
    });
    expect(planSplit(model, { row: 0, column: 0 })).toBeNull();
    expect(planSplit(model, { row: 7, column: 0 })).toBeNull();
  });

  it('disables moves while merged and duplicates across merged cells', () => {
    expect(canMoveLines(model)).toBe(false);
    expect(canMoveLines(tableModel('tb1', table([['a', 'b']])))).toBe(true);
    expect(planDuplicateRow(model, 1)).toBeNull();
    expect(planDuplicateRow(model, 2)).toBeNull();
    expect(planDuplicateRow(model, 3)).toEqual({ index: 4, cells: [9, 10, 11, 12] });
    expect(planDuplicateColumn(model, 1)).toBeNull();
    expect(planDuplicateColumn(model, 3)).toEqual({ index: 4, cells: [3, 6, 8, 12] });
    expect(planDuplicateRow(model, 4)).toBeNull();
    expect(planDuplicateColumn(model, -1)).toBeNull();
    // A cell merged only within the duplicated line is copied with its span.
    const wide = tableModel(
      'tb1',
      table([
        [cell('ab', { colSpan: 2 }), 'c'],
        ['d', 'e', 'f'],
      ]),
    );
    expect(planDuplicateRow(wide, 0)).toEqual({ index: 1, cells: [0, 1] });
    expect(planDuplicateColumn(wide, 0)).toBeNull();
    const tall = tableModel('tb1', table([[cell('ad', { rowSpan: 2 }), 'b'], ['e']]));
    expect(planDuplicateColumn(tall, 0)).toEqual({ index: 1, cells: [0] });
    expect(planDuplicateRow(tall, 0)).toBeNull();
  });

  it('orders lines after a move, the moved line ending at its target', () => {
    expect(moveLineOrder(4, 1, 3)).toEqual([0, 2, 3, 1]);
    expect(moveLineOrder(4, 3, 0)).toEqual([3, 0, 1, 2]);
    expect(moveLineOrder(4, 2, 2)).toEqual([0, 1, 2, 3]);
    expect(moveLineOrder(4, 4, 0)).toBeNull();
    expect(moveLineOrder(4, 0, -1)).toBeNull();
    expect(moveLineOrder(4, 0.5, 1)).toBeNull();
  });
});

describe('uwg-te-req-tables-5: Shift with an arrow key over a cell range', () => {
  // The cell (1,1) spans rows 1–2 and columns 1–2.
  const model = tableModel(
    'tb1',
    table([
      ['a', 'b', 'c', 'd'],
      ['e', cell('F', { rowSpan: 2, colSpan: 2 }), 'g'],
      ['h', 'i'],
      ['j', 'k', 'l', 'm'],
    ]),
  );
  const range = (anchor: readonly [number, number], head: readonly [number, number]) => ({
    anchor: { row: anchor[0], column: anchor[1] },
    head: { row: head[0], column: head[1] },
  });

  it('maps the arrow keys to grid steps, ArrowLeft and ArrowRight by the table’s direction', () => {
    const keys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'];
    expect(keys.map((key) => cellStepOfKey(key, false))).toEqual([
      'up',
      'down',
      'backward',
      'forward',
      null,
    ]);
    expect(keys.map((key) => cellStepOfKey(key, true))).toEqual([
      'up',
      'down',
      'forward',
      'backward',
      null,
    ]);
  });

  it('moves the head to the cell beside its span, the anchor staying; the cells are the grown rectangle', () => {
    const across = extendCellRange(model, range([2, 0], [2, 0]), 'forward')!;
    expect(across).toEqual(range([2, 0], [1, 1]));
    expect(tableTargetCells(model, { range: across })).toEqual([4, 5, 7]);
    const down = extendCellRange(model, across, 'down')!;
    expect(down).toEqual(range([2, 0], [3, 1]));
    expect(tableTargetCells(model, { range: down })).toEqual([4, 5, 7, 9, 10, 11]);
    // Back over the merged cell, and out of it on every side.
    expect(extendCellRange(model, down, 'up')).toEqual(range([2, 0], [1, 1]));
    expect(extendCellRange(model, across, 'forward')).toEqual(range([2, 0], [1, 3]));
    expect(extendCellRange(model, across, 'backward')).toEqual(range([2, 0], [1, 0]));
    expect(extendCellRange(model, across, 'up')).toEqual(range([2, 0], [0, 1]));
    expect(extendCellRange(model, range([0, 2], [0, 2]), 'down')).toEqual(range([0, 2], [1, 1]));
  });

  it('keeps the range at the table’s edge and names cells by the start of their spans', () => {
    expect(extendCellRange(model, range([2, 0], [3, 3]), 'down')).toEqual(range([2, 0], [3, 3]));
    expect(extendCellRange(model, range([2, 0], [3, 3]), 'forward')).toEqual(range([2, 0], [3, 3]));
    expect(extendCellRange(model, range([0, 0], [0, 0]), 'up')).toEqual(range([0, 0], [0, 0]));
    expect(extendCellRange(model, range([0, 0], [0, 0]), 'backward')).toEqual(
      range([0, 0], [0, 0]),
    );
    expect(extendCellRange(model, range([2, 2], [2, 1]), 'down')).toEqual(range([1, 1], [3, 1]));
    expect(extendCellRange(model, range([4, 0], [0, 0]), 'down')).toBeNull();
  });
});

describe('uwg-te-req-engine-9: ArrowUp and ArrowDown from a cell into the cell above or below', () => {
  // The cell (1,1) spans rows 1–2 and columns 1–2; (3,0) holds two paragraphs, (0,3) none.
  const merged = table([
    ['a', 'b', 'c', cell()],
    ['e', cell('Fig', { rowSpan: 2, colSpan: 2 }), 'g'],
    ['h', 'i'],
    [
      {
        paragraphs: [
          { content: [{ type: 'text', text: 'one' }] },
          { content: [{ type: 'text', text: 'three' }] },
        ],
      },
      'k',
      'l',
      'm',
    ],
  ]);
  const point = (row: number, column: number, paragraph: number, offset: number) => ({
    block: 'tb1',
    cell: { row, column, paragraph },
    offset,
  });
  const move = (row: number, column: number, step: 'up' | 'down') =>
    verticalCellCaret('tb1', merged, { row, column }, step);

  it('goes up to the end of the last paragraph of the cell covering the span’s first column in the row above', () => {
    expect(move(1, 0, 'up')).toEqual(point(0, 0, 0, 1));
    expect(move(1, 1, 'up')).toEqual(point(0, 1, 0, 1));
    // Below the merged cell, from either of its columns: the merged cell, named by its start.
    expect(move(3, 1, 'up')).toEqual(point(1, 1, 0, 3));
    expect(move(3, 2, 'up')).toEqual(point(1, 1, 0, 3));
    // Beside the merged cell, the column stays: (2,3) is the second cell of its row.
    expect(move(2, 3, 'up')).toEqual(point(1, 3, 0, 1));
    expect(move(1, 3, 'up')).toEqual(point(0, 3, 0, 0));
  });

  it('goes down to the start of the first paragraph of the cell below the span', () => {
    expect(move(0, 2, 'down')).toEqual(point(1, 1, 0, 0));
    expect(move(1, 1, 'down')).toEqual(point(3, 1, 0, 0));
    expect(move(2, 0, 'down')).toEqual(point(3, 0, 0, 0));
    expect(move(1, 3, 'down')).toEqual(point(2, 3, 0, 0));
    // Into a cell of two paragraphs: its first going down, the end of its last going up.
    expect(verticalCellCaret('tb1', merged, { row: 2, column: 0 }, 'down')).toEqual(
      point(3, 0, 0, 0),
    );
    const above = table([
      [
        {
          paragraphs: [
            { content: [{ type: 'text', text: 'one' }] },
            { content: [{ type: 'text', text: 'three' }] },
          ],
        },
      ],
      ['x'],
    ]);
    expect(verticalCellCaret('tb1', above, { row: 1, column: 0 }, 'up')).toEqual(point(0, 0, 1, 5));
  });

  it('has no cell beyond the first or last row, and none for a cell outside the table', () => {
    expect(move(0, 0, 'up')).toBeNull();
    expect(move(0, 3, 'up')).toBeNull();
    expect(move(3, 3, 'down')).toBeNull();
    // The merged cell reaches the last row but one; a cell of the last row has none below.
    expect(move(3, 1, 'down')).toBeNull();
    expect(move(4, 0, 'up')).toBeNull();
    expect(move(0, 4, 'down')).toBeNull();
  });
});

describe('column widths (uwg-te-req-tables-1, uwg-te-req-tables-6)', () => {
  it('V-424: widths are null until the first commit, then every column at least 48', () => {
    expect(TABLE_MIN_COLUMN_WIDTH).toBe(48);
    expect(tableModel('tb1', table([['a', 'b', 'c']])).widths).toBeNull();
    expect(planColumnWidths(3, null)).toBeNull();
    const widths = planColumnWidths(3, [30, 100, 47.5]);
    expect(widths).toEqual([48, 100, 48]);
    expect(Object.isFrozen(widths)).toBe(true);
    expect(planColumnWidths(3, [100, 100])).toBeUndefined();
    expect(planColumnWidths(2, [100, Number.NaN])).toBeUndefined();
  });

  it('keeps widths all or nothing through column changes', () => {
    const widths = [100, 60, 80];
    expect(widthsAfter(null, { type: 'insert', index: 1 })).toBeNull();
    expect(widthsAfter(widths, { type: 'insert', index: 1 })).toEqual([100, 100, 60, 80]);
    expect(widthsAfter(widths, { type: 'insert', index: 0 })).toEqual([100, 100, 60, 80]);
    expect(widthsAfter(widths, { type: 'insert', index: 3 })).toEqual([100, 60, 80, 80]);
    expect(widthsAfter(widths, { type: 'delete', from: 0, to: 1 })).toEqual([80]);
    expect(widthsAfter(widths, { type: 'delete', from: 0, to: 2 })).toBeNull();
    expect(widthsAfter(widths, { type: 'move', from: 0, to: 2 })).toEqual([60, 80, 100]);
    expect(widthsAfter(widths, { type: 'duplicate', index: 1 })).toEqual([100, 60, 60, 80]);
    expect(widths).toEqual([100, 60, 80]);
  });
});

/** The model type is plain data: a planner result never refers to an engine. */
const model: TextEditorTableModel = tableModel('tb1', table([['a']]));
void model;

describe('the first and last cells (uwg-te-req-tables-1)', () => {
  it('the last cell in document order, a row span from the last column included', () => {
    const table: TextEditorPortableTable = {
      type: 'table',
      headerRow: false,
      headerColumn: false,
      rows: [{ cells: [cell('a'), { ...cell('b'), rowSpan: 2 }] }, { cells: [cell('c')] }],
    };
    const model = tableModel('t1', table);
    expect(edgeCell(model, 'start')).toMatchObject({ row: 0, column: 0 });
    expect(edgeCell(model, 'end')).toMatchObject({ row: 1, column: 0 });
    expect(edgeCell({ ...model, cells: [] }, 'end')).toBeNull();
  });
});

describe('tables of a document (uwg-te-tab-engine r8)', () => {
  const table: TextEditorPortableTable = {
    type: 'table',
    id: 't1',
    headerRow: true,
    headerColumn: false,
    rows: [
      { cells: [{ paragraphs: [{ content: [] }] }, { rowSpan: 2, paragraphs: [{ content: [] }] }] },
      { cells: [{ paragraphs: [{ content: [] }] }] },
    ],
  };

  it('answer the model of a table by identifier, null for another block or none', () => {
    const document: TextEditorPortableDocument = {
      blocks: [{ type: 'paragraph', id: 'p1', content: [] }, table],
    };
    expect(tableModelOf(document, 't1')).toEqual(tableModel('t1', table));
    expect(tableModelOf(document, 'p1')).toBeNull();
    expect(tableModelOf(document, 'missing')).toBeNull();
  });

  it('answer the cell that starts at a row and column, never one a span covers there', () => {
    expect(placedCell(table, 0, 1)).toMatchObject({ row: 0, column: 1, rowSpan: 2 });
    expect(placedCell(table, 1, 0)).toMatchObject({ row: 1, column: 0 });
    expect(placedCell(table, 1, 1)).toBeUndefined();
    expect(placedCell(table, 5, 0)).toBeUndefined();
  });
});
