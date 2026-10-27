/**
 * Table planners of every engine adapter (Widgets `uwg-te-req-tables-1`, `uwg-te-req-tables-3`,
 * `uwg-te-req-tables-5`, `uwg-te-tab-engine` r8, `uwg-te-lis-up-i2`).
 *
 * Pure plans over the span-aware table model, so that both engines apply one rule set: the table
 * model of a portable table or of a document's table, the cell that starts at a position,
 * positional header state, cell rectangles and targets (the cells a range selects), the step of
 * Shift with an arrow key over a range, the caret of ArrowUp and ArrowDown from one cell into the
 * next, merging and splitting, line moves, duplicates and all-or-nothing column widths of at
 * least 48 CSS pixels.
 * Each adapter applies a plan with its own engine.
 */
import { storedAlign, type TextEditorTableTarget } from '../../actions.js';
import {
  tableGrid,
  type TextEditorPortableDocument,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import type {
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorTableCell,
  TextEditorTableModel,
  TextEditorTextPoint,
} from '../../model.js';
import { cellTextEdge } from '../../content/edges.js';
import {
  cellRangeRect,
  cellRect as rectOf,
  spanRect,
  type TextEditorCellRect,
} from '../../table-range.js';
import { findBlock } from './blocks.js';

export { cellTextEdge, placedCell } from '../../content/edges.js';
export { cellRangeRect, type TextEditorCellRect } from '../../table-range.js';

/** The least width of a column in CSS pixels. */
export const TABLE_MIN_COLUMN_WIDTH = 48;

/** The header flags of a table: the first row and the first column. */
export interface TextEditorHeaderFlags {
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
}

/** The header state of a cell: in the header row, in the header column, or both. */
export interface TextEditorCellHeader {
  readonly row: boolean;
  readonly column: boolean;
}

/**
 * The header state of the cell that starts at `cell`, by position only: in the header row when
 * it starts in the first row and the table has one, in the header column likewise. Applied again
 * after every structural change, it never moves with a row or column.
 */
export function positionalHeader(
  cell: TextEditorCellAddress,
  flags: TextEditorHeaderFlags,
): TextEditorCellHeader {
  return Object.freeze({
    row: flags.headerRow && cell.row === 0,
    column: flags.headerColumn && cell.column === 0,
  });
}

/**
 * The table model of a canonical portable table: its grid, the cells at the start of their spans
 * in row-major order with positional header state, background, alignment and emptiness, the
 * header flags, the widths or `null`, and whether any cell is merged. Frozen.
 */
export function tableModel(id: string, table: TextEditorPortableTable): TextEditorTableModel {
  const grid = tableGrid(table);
  const cells = grid.cells.map((placed): TextEditorTableCell => {
    const header = positionalHeader(placed, table);
    const { align, background, paragraphs } = placed.cell;
    return Object.freeze({
      row: placed.row,
      column: placed.column,
      rowSpan: placed.rowSpan,
      colSpan: placed.colSpan,
      header: header.row || header.column,
      background: background ?? null,
      align: storedAlign(align) ?? null,
      empty: paragraphs.every((paragraph) => paragraph.content.length === 0),
    });
  });
  return Object.freeze({
    id,
    rows: grid.rows,
    columns: grid.columns,
    cells: Object.freeze(cells),
    grid: Object.freeze(grid.grid.map((row) => Object.freeze([...row]))),
    headerRow: table.headerRow,
    headerColumn: table.headerColumn,
    widths: table.widths ? Object.freeze([...table.widths]) : null,
    merged: cells.some((cell) => cell.rowSpan > 1 || cell.colSpan > 1),
  });
}

/** The table model of the table `id` of a document (`getTable`), or `null` for no table. */
export function tableModelOf(
  document: TextEditorPortableDocument,
  id: string,
): TextEditorTableModel | null {
  const block = findBlock(document.blocks, id);
  return block?.type === 'table' ? tableModel(id, block) : null;
}

/**
 * The first or the last cell of a table in document order (`uwg-te-req-tables-1`): the
 * cells at the start of their spans in row-major order, as `model.cells` holds them, so the first
 * is the cell at row 0 and column 0 and the last is the one that starts last, which a row span
 * from the last column does not change. `null` for a table without cells.
 */
export function edgeCell(
  model: TextEditorTableModel,
  side: 'start' | 'end',
): TextEditorTableCell | null {
  return (side === 'start' ? model.cells[0] : model.cells[model.cells.length - 1]) ?? null;
}

/** The distinct cells of a line of grid indices, in row-major order; none for no line. */
function coveringCells(line: readonly number[] | undefined): readonly number[] {
  const cells = new Set((line ?? []).filter((index) => index >= 0));
  return Object.freeze([...cells].sort((a, b) => a - b));
}

/** The cells that start inside a rectangle, as indices into `model.cells`, in row-major order. */
export function cellsInRect(
  model: TextEditorTableModel,
  rect: TextEditorCellRect,
): readonly number[] {
  const inside: number[] = [];
  model.cells.forEach((cell, index) => {
    if (
      cell.row >= rect.top &&
      cell.row <= rect.bottom &&
      cell.column >= rect.left &&
      cell.column <= rect.right
    )
      inside.push(index);
  });
  return Object.freeze(inside);
}

/**
 * The cells that a target of `table.align` or `table.background` names, as indices into
 * `model.cells` in row-major order: every cell covering a row or a column, the cells of a range's
 * rectangle, or every cell; empty for a row or column outside the table.
 */
export function tableTargetCells(
  model: TextEditorTableModel,
  target: TextEditorTableTarget,
): readonly number[] {
  if ('row' in target) return coveringCells(model.grid[target.row]);
  if ('column' in target)
    return coveringCells(
      target.column >= 0 && target.column < model.columns
        ? model.grid.map((row) => row[target.column] ?? -1)
        : undefined,
    );
  if ('range' in target) {
    const rect = cellRangeRect(model, target.range);
    return rect ? cellsInRect(model, rect) : Object.freeze([]);
  }
  return Object.freeze(model.cells.map((_, index) => index));
}

// Shift with an arrow key over a cell range

/** A step over a table's grid: a row up or down, or a column backward or forward. */
export type TextEditorCellStep = 'up' | 'down' | 'backward' | 'forward';

/**
 * The grid step of Shift with an arrow key (`uwg-te-req-tables-5`): ArrowUp and ArrowDown a row,
 * ArrowLeft and ArrowRight a column toward that side, so that in a right-to-left table ArrowLeft
 * steps forward; `null` for any other key.
 */
export function cellStepOfKey(key: string, rtl: boolean): TextEditorCellStep | null {
  switch (key) {
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    case 'ArrowLeft':
      return rtl ? 'forward' : 'backward';
    case 'ArrowRight':
      return rtl ? 'backward' : 'forward';
    default:
      return null;
  }
}

/**
 * The span of the cell beside a span in a step's direction: the cell covering the span's first row
 * in the column after or before it, or the span's first column in the row below or above it;
 * `null` at the table's edge. There is no goal column.
 */
function spanBeside(
  model: TextEditorTableModel,
  span: TextEditorCellRect,
  step: TextEditorCellStep,
): TextEditorCellRect | null {
  const beside: TextEditorCellAddress =
    step === 'forward'
      ? { row: span.top, column: span.right + 1 }
      : step === 'backward'
        ? { row: span.top, column: span.left - 1 }
        : step === 'down'
          ? { row: span.bottom + 1, column: span.left }
          : { row: span.top - 1, column: span.left };
  return spanRect(model, beside);
}

/**
 * The cell range after one step of Shift with an arrow key (`uwg-te-req-tables-5`): the anchor
 * stays, and the head moves to the cell beside the head cell's span in the step's direction, the
 * one covering the span's first row in the column after or before the span, or the span's first
 * column in the row below or above it; at the table's edge the range stays. Both cells are named
 * by the start of their spans. The range selects the cells of its grown rectangle
 * (`tableTargetCells`), so a step onto a merged cell selects all of it. `null` when the range lies
 * outside the table.
 */
export function extendCellRange(
  model: TextEditorTableModel,
  range: TextEditorCellRange,
  step: TextEditorCellStep,
): TextEditorCellRange | null {
  const anchor = spanRect(model, range.anchor);
  const head = spanRect(model, range.head);
  if (!anchor || !head) return null;
  const next = spanBeside(model, head, step) ?? head;
  return Object.freeze({
    anchor: Object.freeze({ row: anchor.top, column: anchor.left }),
    head: Object.freeze({ row: next.top, column: next.left }),
  });
}

/**
 * The caret that plain ArrowUp or ArrowDown places when it moves from a cell into the cell above or
 * below (`uwg-te-req-engine-9`: into the nearest cell in that direction, at its end moving backward
 * and at its start moving forward): in the cell beside the cell's span in the step's direction,
 * the one covering the span's first column in the row above or below the span, named by the start
 * of its span as `extendCellRange` names it, at the end of its last paragraph going up and at the
 * start of its first going down. There is no goal column. `null` when no row lies beyond the span,
 * where the key leaves the table, or for a cell outside the table.
 */
export function verticalCellCaret(
  id: string,
  table: TextEditorPortableTable,
  cell: TextEditorCellAddress,
  step: 'up' | 'down',
): TextEditorTextPoint | null {
  const model = tableModel(id, table);
  const span = spanRect(model, cell);
  const next = span ? spanBeside(model, span, step) : null;
  if (!next) return null;
  return cellTextEdge(
    id,
    table,
    { row: next.top, column: next.left },
    step === 'up' ? 'end' : 'start',
  );
}

/** How `table.merge-cells` joins a range. */
export interface TextEditorMergePlan {
  readonly rect: TextEditorCellRect;
  /** The cell that remains, at the rectangle's first row and column, as an index into `model.cells`. */
  readonly cell: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  /** Every cell of the rectangle, the remaining one first, in row-major order. */
  readonly cells: readonly number[];
  /** The cells whose content the merged cell holds, in that order: the non-empty ones, row-major. */
  readonly contents: readonly number[];
}

/**
 * The merge of a range into its first cell, with the non-empty cell contents in row-major order;
 * `null` when the rectangle holds a single cell or lies outside the table.
 */
export function planMerge(
  model: TextEditorTableModel,
  range: TextEditorCellRange,
): TextEditorMergePlan | null {
  const rect = cellRangeRect(model, range);
  if (!rect) return null;
  const cells = cellsInRect(model, rect);
  if (cells.length < 2) return null;
  return Object.freeze({
    rect,
    cell: cells[0]!,
    rowSpan: rect.bottom - rect.top + 1,
    colSpan: rect.right - rect.left + 1,
    cells,
    contents: Object.freeze(cells.filter((index) => !model.cells[index]!.empty)),
  });
}

/** How `table.split-cell` divides a merged cell. */
export interface TextEditorSplitPlan {
  /** The merged cell, as an index into `model.cells`. */
  readonly cell: number;
  readonly rect: TextEditorCellRect;
  /**
   * Every position of its area in reading order: the first keeps the content, every other one
   * holds one empty paragraph.
   */
  readonly positions: readonly TextEditorCellAddress[];
}

/** The split of the merged cell covering `cell`; `null` when that cell is not merged. */
export function planSplit(
  model: TextEditorTableModel,
  cell: TextEditorCellAddress,
): TextEditorSplitPlan | null {
  const index = model.grid[cell.row]?.[cell.column];
  const merged = index === undefined ? undefined : model.cells[index];
  if (index === undefined || !merged || (merged.rowSpan === 1 && merged.colSpan === 1)) return null;
  const rect = rectOf(merged);
  const positions: TextEditorCellAddress[] = [];
  for (let row = rect.top; row <= rect.bottom; row += 1)
    for (let column = rect.left; column <= rect.right; column += 1)
      positions.push(Object.freeze({ row, column }));
  return Object.freeze({ cell: index, rect, positions: Object.freeze(positions) });
}

/** Whether rows and columns may move: never while a cell of the table is merged. */
export function canMoveLines(model: TextEditorTableModel): boolean {
  return !model.merged;
}

/**
 * The order of `count` lines after the line at `from` moves so that it ends at `to`: entry `i`
 * holds the former index of the line now at `i`. `null` when `from` or `to` is outside the lines.
 */
export function moveLineOrder(count: number, from: number, to: number): readonly number[] | null {
  const inside = (index: number) => Number.isInteger(index) && index >= 0 && index < count;
  if (!inside(from) || !inside(to)) return null;
  const order = Array.from({ length: count }, (_, index) => index);
  order.splice(to, 0, ...order.splice(from, 1));
  return Object.freeze(order);
}

/** How a duplicate copies a row or a column. */
export interface TextEditorDuplicatePlan {
  /** The index the copy takes, right after the duplicated line. */
  readonly index: number;
  /**
   * The cells to copy, as indices into `model.cells` along the line, each with its content,
   * background, alignment and its span within the line.
   */
  readonly cells: readonly number[];
}

/**
 * The copy of a line of grid indices along a row or a column: `null` without the line or when a
 * cell of it spans across the line (`across`), else its cells in order, each once.
 */
function duplicatePlan(
  model: TextEditorTableModel,
  line: readonly number[] | undefined,
  index: number,
  across: 'rowSpan' | 'colSpan',
): TextEditorDuplicatePlan | null {
  if (!line) return null;
  const cells: number[] = [];
  for (const cell of line) {
    if (cell < 0 || model.cells[cell]![across] > 1) return null;
    if (cells[cells.length - 1] !== cell) cells.push(cell);
  }
  return Object.freeze({ index: index + 1, cells: Object.freeze(cells) });
}

/**
 * The copy of the row at `index`; `null` when the row is outside the table or a merged cell spans
 * it and another row.
 */
export function planDuplicateRow(
  model: TextEditorTableModel,
  index: number,
): TextEditorDuplicatePlan | null {
  return duplicatePlan(model, model.grid[index], index, 'rowSpan');
}

/**
 * The copy of the column at `index`; `null` when the column is outside the table or a merged cell
 * spans it and another column.
 */
export function planDuplicateColumn(
  model: TextEditorTableModel,
  index: number,
): TextEditorDuplicatePlan | null {
  const line =
    Number.isInteger(index) && index >= 0 && index < model.columns
      ? model.grid.map((row) => row[index] ?? -1)
      : undefined;
  return duplicatePlan(model, line, index, 'colSpan');
}

/**
 * The widths that `table.column-widths` stores for a table of `columns` columns: `null` for
 * automatic widths, else one width per column, each at least 48; `undefined`, refused, when the
 * count of widths differs from the columns.
 */
export function planColumnWidths(
  columns: number,
  widths: readonly number[] | null,
): readonly number[] | null | undefined {
  if (widths === null) return null;
  if (widths.length !== columns || !widths.every((width) => Number.isFinite(width) && width > 0))
    return undefined;
  return Object.freeze(widths.map((width) => Math.max(TABLE_MIN_COLUMN_WIDTH, width)));
}

/** A structural change of a table's columns. */
export type TextEditorColumnChange =
  | { readonly type: 'insert'; readonly index: number }
  | { readonly type: 'delete'; readonly from: number; readonly to: number }
  | { readonly type: 'move'; readonly from: number; readonly to: number }
  | { readonly type: 'duplicate'; readonly index: number };

/**
 * The widths after a column change, all or nothing: `null` stays `null`; an inserted column takes
 * the width of the column before it (the first column's at index 0), a duplicate the width of its
 * column, deleted columns lose theirs and a moved column keeps its own.
 */
export function widthsAfter(
  widths: readonly number[] | null,
  change: TextEditorColumnChange,
): readonly number[] | null {
  if (widths === null) return null;
  const next = [...widths];
  switch (change.type) {
    case 'insert': {
      const index = Math.min(Math.max(0, change.index), next.length);
      next.splice(index, 0, next[index - 1] ?? next[0] ?? TABLE_MIN_COLUMN_WIDTH);
      break;
    }
    case 'delete':
      next.splice(change.from, change.to - change.from + 1);
      break;
    case 'move': {
      const order = moveLineOrder(next.length, change.from, change.to);
      if (!order) return widths;
      return Object.freeze(order.map((index) => widths[index]!));
    }
    case 'duplicate':
      if (change.index < 0 || change.index >= next.length) return widths;
      next.splice(change.index + 1, 0, next[change.index]!);
      break;
  }
  return next.length === 0 ? null : Object.freeze(next);
}
