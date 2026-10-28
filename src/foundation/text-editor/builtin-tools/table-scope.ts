/**
 * The scope of a table tool (Widgets `uwg-te-tab-tools-tables`, `uwg-te-req-tables-3`,
 * `uwg-te-req-tables-5`): the table, lines and cells that a tool context targets. Shared by the
 * table tools and by the alignment tools, which align the targeted cells inside a table.
 */
import type { TextEditorAction, TextEditorTableTarget } from '../actions.js';
import type {
  TextEditorAlign,
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorTableCell,
  TextEditorTableModel,
} from '../model.js';
import type { TextEditorToolContext } from '../tools.js';

/** The table, lines and cells that a table tool acts on. */
export interface TableScope {
  readonly table: string;
  /** The first and the last targeted row. */
  readonly rows: readonly [number, number];
  /** The first and the last targeted column. */
  readonly columns: readonly [number, number];
  /** The targeted cells, as `table.align` and `table.background` take them. */
  readonly cells: TextEditorTableTarget;
  /** The cell that holds the selection head. */
  readonly cell: TextEditorCellAddress;
  /** The selected cell range, or the head cell alone. */
  readonly range: TextEditorCellRange;
  readonly rowCount: number | null;
  readonly columnCount: number | null;
  /** Some cell of the table spans more than one row or column. */
  readonly merged: boolean;
  /** The cell that holds the selection head spans more than one row or column. */
  readonly cellMerged: boolean;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  readonly model: TextEditorTableModel | null;
}

const span = (from: number, to: number): readonly [number, number] => [
  Math.min(from, to),
  Math.max(from, to),
];

/**
 * The table that a table menu targets, or else the one that the selection lies in, with the row
 * or column of the menu, or else the selected cell range or the cell of the selection head.
 */
export function tableScope(context: TextEditorToolContext): TableScope | null {
  const { target, state } = context;
  const table = target.kind === 'table' ? target.table : state.table?.id;
  if (table === undefined) return null;
  const selected = state.table?.id === table ? state.table : null;
  const model = context.table?.id === table ? context.table : null;
  const cell = selected?.cell ?? { row: 0, column: 0 };
  const range = selected?.range ?? { anchor: cell, head: cell };
  const rowCount = selected?.rows ?? model?.rows ?? null;
  const columnCount = selected?.columns ?? model?.columns ?? null;
  let rows = span(range.anchor.row, range.head.row);
  let columns = span(range.anchor.column, range.head.column);
  let cells: TextEditorTableTarget = { range };
  if (target.kind === 'table' && target.index !== undefined) {
    // A row menu targets the whole row, a column menu the whole column.
    if (target.axis === 'row') {
      rows = [target.index, target.index];
      if (columnCount !== null) columns = [0, columnCount - 1];
      cells = { row: target.index };
    } else if (target.axis === 'column') {
      columns = [target.index, target.index];
      if (rowCount !== null) rows = [0, rowCount - 1];
      cells = { column: target.index };
    }
  }
  return {
    table,
    rows,
    columns,
    cells,
    cell,
    range,
    rowCount,
    columnCount,
    merged: selected?.merged ?? model?.merged ?? false,
    cellMerged: selected?.cellMerged ?? false,
    headerRow: selected?.headerRow ?? model?.headerRow ?? false,
    headerColumn: selected?.headerColumn ?? model?.headerColumn ?? false,
    model,
  };
}

/** The actions of a table tool for its scope, or `null` outside a table. */
export const scoped =
  (actions: (scope: TableScope) => readonly TextEditorAction[] | null) =>
  (context: TextEditorToolContext): readonly TextEditorAction[] | null => {
    const scope = tableScope(context);
    return scope ? actions(scope) : null;
  };

/** The single targeted line along an axis, or `null` for several. */
export const line = (scope: TableScope, axis: 'row' | 'column'): number | null => {
  const [first, last] = axis === 'row' ? scope.rows : scope.columns;
  return first === last ? first : null;
};

/** Whether a cell of the model spans a line and another line along an axis. */
export function spansBeyond(
  model: TextEditorTableModel | null,
  axis: 'row' | 'column',
  index: number,
): boolean {
  if (!model) return false;
  return model.cells.some((cell) =>
    axis === 'row'
      ? cell.rowSpan > 1 && cell.row <= index && index < cell.row + cell.rowSpan
      : cell.colSpan > 1 && cell.column <= index && index < cell.column + cell.colSpan,
  );
}

/** The cells of the model that cover part of the scope's rows and columns. */
export function cellsIn(scope: TableScope): readonly TextEditorTableCell[] {
  if (!scope.model) return [];
  const [top, bottom] = scope.rows;
  const [start, end] = scope.columns;
  return scope.model.cells.filter(
    (cell) =>
      cell.row <= bottom &&
      cell.row + cell.rowSpan - 1 >= top &&
      cell.column <= end &&
      cell.column + cell.colSpan - 1 >= start,
  );
}

/** The alignment that every targeted cell shares, `mixed`, or `null` without a model. */
export function cellAlignment(context: TextEditorToolContext): TextEditorAlign | 'mixed' | null {
  const scope = tableScope(context);
  const cells = scope ? cellsIn(scope) : [];
  if (cells.length === 0) return null;
  const first = cells[0]!.align ?? 'start';
  return cells.every((cell) => (cell.align ?? 'start') === first) ? first : 'mixed';
}
