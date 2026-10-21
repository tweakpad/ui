/**
 * Table edits over the portable model (Widgets `uwg-te-req-tables-1`, `uwg-te-tab-actions` r7,
 * `uwg-te-req-tables-3`, `uwg-te-req-tables-2`).
 *
 * Pure functions that both adapters apply: a table action becomes the next portable table, built
 * on a dense grid of the cells and the planners of `tables.ts`, with the selection the action
 * leaves, a kept selection moving with its cells (`keptTableSelection`). Header state is positional: the table keeps its two flags and every structural change
 * keeps them, so exactly the first row and column are header cells and a moved or copied line
 * never carries header state. Moves are refused while a cell is merged; widths are all or nothing
 * and never below 48 CSS pixels; a split cell's new cells copy its background and alignment, an
 * inserted column takes the previous column's width.
 */
import type { TextEditorAction, TextEditorTableTarget } from '../../actions.js';
import {
  tableGrid,
  type TextEditorPortableCellParagraph,
  type TextEditorPortableTable,
  type TextEditorPortableTableCell,
} from '../../content/portable.js';
import type {
  TextEditorAlign,
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorSelection,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../model.js';
import type { TextEditorColor } from '../../palette.js';
import {
  canMoveLines,
  moveLineOrder,
  planColumnWidths,
  planDuplicateColumn,
  planDuplicateRow,
  planMerge,
  placedCell,
  planSplit,
  tableModel,
  tableTargetCells,
  widthsAfter,
} from './tables.js';
import { inlineLength } from './blocks.js';

type Cell = TextEditorPortableTableCell;

// A dense grid of the portable table

export interface TextEditorDenseCell {
  cell: Cell;
  row: number;
  column: number;
  rowSpan: number;
  colSpan: number;
}

export interface TextEditorDenseTable {
  placed: TextEditorDenseCell[];
  rows: number;
  columns: number;
}

export function denseTable(table: TextEditorPortableTable): TextEditorDenseTable {
  const grid = tableGrid(table);
  return {
    placed: grid.cells.map((entry) => ({ ...entry })),
    rows: grid.rows,
    columns: grid.columns,
  };
}

/** The portable rows of a dense grid: the cells that start in each row, by column. */
export function denseRows(grid: TextEditorDenseTable): TextEditorPortableTable['rows'] {
  return Array.from({ length: grid.rows }, (_, row) => ({
    cells: grid.placed
      .filter((entry) => entry.row === row)
      .sort((a, b) => a.column - b.column)
      .map((entry) => {
        const { rowSpan: _r, colSpan: _c, ...rest } = entry.cell;
        void _r;
        void _c;
        return {
          ...rest,
          ...(entry.rowSpan > 1 ? { rowSpan: entry.rowSpan } : {}),
          ...(entry.colSpan > 1 ? { colSpan: entry.colSpan } : {}),
        };
      }),
  }));
}

const EMPTY: readonly TextEditorPortableCellParagraph[] = Object.freeze([{ content: [] }]);
const emptyCell = (): Cell => ({ paragraphs: EMPTY });
const copyCell = (cell: Cell): Cell => ({
  ...cell,
  paragraphs: cell.paragraphs.map((p) => ({ content: [...p.content] })),
});

export type TextEditorTableAxis = 'row' | 'column';
const spanOf = (axis: TextEditorTableAxis) => (axis === 'row' ? 'rowSpan' : 'colSpan');
const lengthOf = (grid: TextEditorDenseTable, axis: TextEditorTableAxis) =>
  axis === 'row' ? grid.rows : grid.columns;

/** Inserts a line of empty cells at an index; spans crossing it grow. */
export function insertTableLine(
  grid: TextEditorDenseTable,
  axis: TextEditorTableAxis,
  index: number,
): TextEditorDenseTable | null {
  if (index < 0 || index > lengthOf(grid, axis)) return null;
  const other: TextEditorTableAxis = axis === 'row' ? 'column' : 'row';
  const span = spanOf(axis);
  const placed: TextEditorDenseCell[] = [];
  const crossing = new Set<TextEditorDenseCell>();
  for (const entry of grid.placed) {
    const start = entry[axis];
    const end = start + entry[span] - 1;
    if (start >= index) placed.push({ ...entry, [axis]: start + 1 });
    else if (end >= index) {
      const grown = { ...entry, [span]: entry[span] + 1 };
      placed.push(grown);
      crossing.add(grown);
    } else placed.push({ ...entry });
  }
  for (let position = 0; position < lengthOf(grid, other); position += 1) {
    const covered = [...crossing].some(
      (entry) => position >= entry[other] && position < entry[other] + entry[spanOf(other)],
    );
    if (!covered)
      placed.push({
        cell: emptyCell(),
        row: axis === 'row' ? index : position,
        column: axis === 'row' ? position : index,
        rowSpan: 1,
        colSpan: 1,
      });
  }
  return axis === 'row'
    ? { placed, rows: grid.rows + 1, columns: grid.columns }
    : { placed, rows: grid.rows, columns: grid.columns + 1 };
}

/** Deletes the lines from `from` to `to`; spans shrink, a span starting inside keeps its content. */
export function deleteTableLines(
  grid: TextEditorDenseTable,
  axis: TextEditorTableAxis,
  from: number,
  to: number,
): TextEditorDenseTable | null {
  const length = lengthOf(grid, axis);
  if (from < 0 || to >= length || from > to || to - from + 1 >= length) return null;
  const span = spanOf(axis);
  const count = to - from + 1;
  const placed: TextEditorDenseCell[] = [];
  for (const entry of grid.placed) {
    const start = entry[axis];
    const end = start + entry[span] - 1;
    if (end < from) placed.push({ ...entry });
    else if (start > to) placed.push({ ...entry, [axis]: start - count });
    else {
      const kept = Math.max(0, from - start) + Math.max(0, end - to);
      if (kept === 0) continue;
      placed.push({ ...entry, [axis]: Math.min(start, from), [span]: kept });
    }
  }
  return axis === 'row'
    ? { placed, rows: grid.rows - count, columns: grid.columns }
    : { placed, rows: grid.rows, columns: grid.columns - count };
}

/** Reorders the lines of an unmerged grid. */
export function moveTableLine(
  grid: TextEditorDenseTable,
  axis: TextEditorTableAxis,
  from: number,
  to: number,
): TextEditorDenseTable | null {
  const order = moveLineOrder(lengthOf(grid, axis), from, to);
  if (!order) return null;
  const position = new Map(order.map((old, index) => [old, index]));
  return {
    ...grid,
    placed: grid.placed.map((entry) => ({ ...entry, [axis]: position.get(entry[axis])! })),
  };
}

/** Inserts copies of a line's cells after it. */
export function duplicateTableLine(
  grid: TextEditorDenseTable,
  axis: TextEditorTableAxis,
  index: number,
  cells: readonly TextEditorDenseCell[],
): TextEditorDenseTable | null {
  const inserted = insertTableLine(grid, axis, index + 1);
  if (!inserted) return null;
  // The plan refuses lines that a span crosses, so the new line holds only empty cells: copies
  // of the line's cells take their places.
  const placed = inserted.placed.filter((entry) => entry[axis] !== index + 1);
  for (const source of cells)
    placed.push({ ...source, cell: copyCell(source.cell), [axis]: index + 1 });
  return { ...inserted, placed };
}

// Table edits

export interface TextEditorTableEdit {
  readonly table: TextEditorPortableTable;
  /** The selection afterwards, `keep` for the current one moved with its cells. */
  readonly selection: TextEditorSelectionInput | 'keep';
  /** Maps a cell address of the old table to the new one, for a kept cell range. */
  readonly mapCell?: ((cell: TextEditorCellAddress) => TextEditorCellAddress | null) | undefined;
  /**
   * Maps a text point of the old table to the new one, for a kept text selection
   * (`uwg-te-req-tables-1`); present on every `keep` result. A point in a cell that stays keeps
   * its paragraph and offset (clamped to the cell's new content, so a cleared cell gives its
   * start) at the cell's new address. A point in a cell that a deletion removed goes to the start
   * of the cell covering the same column in the next remaining row, else the previous one (rows),
   * or the same row in the next remaining column, else the previous one (columns). A point
   * without `cell`, or in another block, is returned as it is.
   */
  readonly mapPoint?: ((point: TextEditorTextPoint) => TextEditorTextPoint) | undefined;
}

function withGrid(
  table: TextEditorPortableTable,
  grid: TextEditorDenseTable,
  widths: readonly number[] | null | undefined,
): TextEditorPortableTable {
  const { widths: _widths, ...rest } = table;
  void _widths;
  return { ...rest, ...(widths ? { widths } : {}), rows: denseRows(grid) };
}

const shift =
  (axis: TextEditorTableAxis, at: number, by: number) => (cell: TextEditorCellAddress) => {
    const value = axis === 'row' ? cell.row : cell.column;
    if (value < at) return cell;
    return axis === 'row' ? { ...cell, row: cell.row + by } : { ...cell, column: cell.column + by };
  };

/**
 * The `mapPoint` of a kept text selection: the cell that `anchorOf` gives for
 * the point's cell keeps the point, its paragraph and offset clamped to the new content; a cell
 * that `anchorOf` drops sends the point to the start of the cell covering `fallback`'s position.
 */
function pointMapper(
  next: TextEditorPortableTable,
  anchorOf: (cell: TextEditorCellAddress) => TextEditorCellAddress | null,
  fallback: (cell: TextEditorCellAddress) => TextEditorCellAddress,
): (point: TextEditorTextPoint) => TextEditorTextPoint {
  const grid = tableGrid(next);
  return (point) => {
    const { cell } = point;
    if (!cell) return point;
    const moved = anchorOf(cell);
    const kept = moved ? placedCell(next, moved.row, moved.column) : undefined;
    if (kept) {
      const paragraph = Math.max(0, Math.min(cell.paragraph, kept.cell.paragraphs.length - 1));
      const content = kept.cell.paragraphs[paragraph]?.content ?? [];
      return {
        block: point.block,
        cell: { row: kept.row, column: kept.column, paragraph },
        offset: Math.min(point.offset, inlineLength(content)),
      };
    }
    const position = fallback(cell);
    const target = grid.cells[grid.grid[position.row]?.[position.column] ?? -1] ?? grid.cells[0];
    if (!target) return point;
    return {
      block: point.block,
      cell: { row: target.row, column: target.column, paragraph: 0 },
      offset: 0,
    };
  };
}

const sameCell = (cell: TextEditorCellAddress): TextEditorCellAddress => cell;

/** The edit with the identity `mapPoint`, for edits that keep every cell where it is. */
const inPlace = (edit: TextEditorTableEdit): TextEditorTableEdit => ({
  ...edit,
  mapPoint: pointMapper(edit.table, sameCell, sameCell),
});

/**
 * The selection that a table edit with a `keep` selection leaves, from the selection before it:
 * text points in the table through `mapPoint` and a cell range of the table through `mapCell`
 * (each as it is when the edit maps nothing), so a selection moves with its cells; other points,
 * other tables and block selections stay as they are. `null` without a selection, and for a cell
 * range whose anchor or head lies in a removed cell; the adapter then places a fallback.
 */
export function keptTableSelection(
  selection: TextEditorSelection,
  table: string,
  edit: Pick<TextEditorTableEdit, 'mapCell' | 'mapPoint'>,
): TextEditorSelectionInput | null {
  switch (selection.kind) {
    case 'text': {
      const { mapPoint } = edit;
      const move = (point: TextEditorTextPoint) =>
        mapPoint && point.block === table ? mapPoint(point) : point;
      return { kind: 'text', anchor: move(selection.anchor), head: move(selection.head) };
    }
    case 'cells': {
      if (selection.table !== table || !edit.mapCell) return selection;
      const anchor = edit.mapCell(selection.range.anchor);
      const head = edit.mapCell(selection.range.head);
      return anchor && head ? { kind: 'cells', table, range: { anchor, head } } : null;
    }
    case 'blocks':
      return selection;
    case 'none':
      return null;
  }
}

export const tableCaret = (
  table: string,
  row: number,
  column: number,
): TextEditorSelectionInput => ({
  kind: 'caret',
  block: table,
  cell: { row, column },
  position: 'start',
});

/** The edit a table action makes, or `null` when it cannot apply. */
export function tableEdit(
  id: string,
  table: TextEditorPortableTable,
  action: TextEditorAction,
  options: { readonly move: boolean; readonly merge: boolean },
): TextEditorTableEdit | null {
  const model = tableModel(id, table);
  const grid = denseTable(table);
  const widths = model.widths;
  switch (action.type) {
    case 'table.insert-row':
    case 'table.insert-column': {
      const axis: TextEditorTableAxis = action.type === 'table.insert-row' ? 'row' : 'column';
      const next = insertTableLine(grid, axis, action.index);
      if (!next) return null;
      const nextWidths =
        axis === 'column' ? widthsAfter(widths, { type: 'insert', index: action.index }) : widths;
      const nextTable = withGrid(table, next, nextWidths);
      const moved = shift(axis, action.index, 1);
      return {
        table: nextTable,
        selection: action.select
          ? tableCaret(id, axis === 'row' ? action.index : 0, axis === 'row' ? 0 : action.index)
          : 'keep',
        mapCell: moved,
        mapPoint: pointMapper(nextTable, moved, sameCell),
      };
    }
    case 'table.delete-rows':
    case 'table.delete-columns': {
      const axis: TextEditorTableAxis = action.type === 'table.delete-rows' ? 'row' : 'column';
      const next = deleteTableLines(grid, axis, action.from, action.to);
      if (!next) return null;
      const nextWidths =
        axis === 'column'
          ? widthsAfter(widths, { type: 'delete', from: action.from, to: action.to })
          : widths;
      const count = action.to - action.from + 1;
      const remaining = lengthOf(grid, axis) - count;
      const nearest = (value: number) =>
        value < action.from
          ? value
          : value > action.to
            ? value - count
            : Math.min(action.from, remaining - 1);
      const along = (cell: TextEditorCellAddress, value: number): TextEditorCellAddress =>
        axis === 'row' ? { ...cell, row: value } : { ...cell, column: value };
      const span = spanOf(axis);
      // Where the cell starting at an address starts afterwards, or `null` once removed: a span
      // starting inside the deleted lines that reaches past them keeps its content.
      const anchorOf = (cell: TextEditorCellAddress): TextEditorCellAddress | null => {
        const entry = grid.placed.find(
          ({ row, column }) => row === cell.row && column === cell.column,
        );
        if (!entry) return null;
        const start = entry[axis];
        const end = start + entry[span] - 1;
        if (end < action.from) return cell;
        if (start > action.to) return along(cell, start - count);
        const kept = Math.max(0, action.from - start) + Math.max(0, end - action.to);
        return kept === 0 ? null : along(cell, Math.min(start, action.from));
      };
      const nextTable = withGrid(table, next, nextWidths);
      return {
        table: nextTable,
        selection: 'keep',
        mapCell: (cell) => along(cell, nearest(axis === 'row' ? cell.row : cell.column)),
        mapPoint: pointMapper(nextTable, anchorOf, (cell) =>
          along(cell, Math.min(action.from, remaining - 1)),
        ),
      };
    }
    case 'table.move-row':
    case 'table.move-column': {
      if (!options.move || !canMoveLines(model)) return null;
      const axis: TextEditorTableAxis = action.type === 'table.move-row' ? 'row' : 'column';
      const next = moveTableLine(grid, axis, action.from, action.to);
      if (!next) return null;
      const nextWidths =
        axis === 'column'
          ? widthsAfter(widths, { type: 'move', from: action.from, to: action.to })
          : widths;
      const other = lengthOf(grid, axis === 'row' ? 'column' : 'row');
      const range: TextEditorCellRange =
        axis === 'row'
          ? { anchor: { row: action.to, column: 0 }, head: { row: action.to, column: other - 1 } }
          : { anchor: { row: 0, column: action.to }, head: { row: other - 1, column: action.to } };
      return {
        table: withGrid(table, next, nextWidths),
        selection: { kind: 'cells', table: id, range },
      };
    }
    case 'table.duplicate-row':
    case 'table.duplicate-column': {
      const axis: TextEditorTableAxis = action.type === 'table.duplicate-row' ? 'row' : 'column';
      const plan =
        axis === 'row'
          ? planDuplicateRow(model, action.index)
          : planDuplicateColumn(model, action.index);
      if (!plan) return null;
      const sources = plan.cells.map((index) => grid.placed[index]!);
      const next = duplicateTableLine(grid, axis, action.index, sources);
      if (!next) return null;
      const nextWidths =
        axis === 'column'
          ? widthsAfter(widths, { type: 'duplicate', index: action.index })
          : widths;
      const nextTable = withGrid(table, next, nextWidths);
      const moved = shift(axis, action.index + 1, 1);
      return {
        table: nextTable,
        selection: 'keep',
        mapCell: moved,
        mapPoint: pointMapper(nextTable, moved, sameCell),
      };
    }
    case 'table.merge-cells': {
      if (!options.merge) return null;
      const plan = planMerge(model, action.range);
      if (!plan) return null;
      const keep = grid.placed[plan.cell]!;
      const paragraphs = plan.contents.flatMap((index) => grid.placed[index]!.cell.paragraphs);
      const removed = new Set(plan.cells.filter((index) => index !== plan.cell));
      const placed = grid.placed
        .filter((_, index) => !removed.has(index))
        .map((entry) =>
          entry === keep
            ? {
                ...entry,
                rowSpan: plan.rowSpan,
                colSpan: plan.colSpan,
                cell: { ...entry.cell, paragraphs: paragraphs.length > 0 ? paragraphs : EMPTY },
              }
            : entry,
        );
      return {
        table: withGrid(table, { ...grid, placed }, widths),
        selection: {
          kind: 'caret',
          block: id,
          cell: { row: keep.row, column: keep.column },
          position: 'end',
        },
      };
    }
    case 'table.split-cell': {
      if (!options.merge) return null;
      const plan = planSplit(model, action.cell);
      if (!plan) return null;
      const source = grid.placed[plan.cell]!;
      const placed = grid.placed.map((entry) =>
        entry === source ? { ...entry, rowSpan: 1, colSpan: 1 } : entry,
      );
      for (const position of plan.positions.slice(1)) {
        const { background, align } = source.cell;
        placed.push({
          cell: {
            ...(background ? { background } : {}),
            ...(align ? { align } : {}),
            paragraphs: EMPTY,
          },
          row: position.row,
          column: position.column,
          rowSpan: 1,
          colSpan: 1,
        });
      }
      return {
        table: withGrid(table, { ...grid, placed }, widths),
        selection: tableCaret(id, source.row, source.column),
      };
    }
    case 'table.set-header': {
      if (action.row === undefined && action.column === undefined) return null;
      return inPlace({
        table: {
          ...table,
          headerRow: action.row ?? table.headerRow,
          headerColumn: action.column ?? table.headerColumn,
        },
        selection: 'keep',
      });
    }
    case 'table.align':
    case 'table.background': {
      const targets = tableTargetCells(model, action.target as TextEditorTableTarget);
      if (targets.length === 0) return null;
      const chosen = new Set(targets);
      const placed = grid.placed.map((entry, index) => {
        if (!chosen.has(index)) return entry;
        const { align: _align, background: _background, ...rest } = entry.cell;
        void _align;
        void _background;
        const align = action.type === 'table.align' ? action.align : entry.cell.align;
        const background =
          action.type === 'table.background' ? action.color : entry.cell.background;
        return {
          ...entry,
          cell: {
            ...rest,
            ...(align && align !== 'start' ? { align: align as TextEditorAlign } : {}),
            ...(background ? { background: background as TextEditorColor } : {}),
          },
        };
      });
      return inPlace({ table: withGrid(table, { ...grid, placed }, widths), selection: 'keep' });
    }
    case 'table.column-widths': {
      const planned = planColumnWidths(model.columns, action.widths);
      if (planned === undefined) return null;
      return inPlace({ table: withGrid(table, grid, planned), selection: 'keep' });
    }
    case 'table.clear-cells': {
      const targets = tableTargetCells(model, { range: action.range });
      if (targets.length === 0) return null;
      const chosen = new Set(targets);
      const placed = grid.placed.map((entry, index) =>
        chosen.has(index) ? { ...entry, cell: { ...entry.cell, paragraphs: EMPTY } } : entry,
      );
      return inPlace({ table: withGrid(table, { ...grid, placed }, widths), selection: 'keep' });
    }
    default:
      return null;
  }
}
