import {
  rowEdgeCell,
  stepGridCell,
  type GridCells,
  type GridKeyMove,
} from '../../foundation/grid-navigation.js';
import type { DataViewNavigation } from './types.js';

/**
 * A focus position: `row` -1 is the header row, 0 and up the shown rows; `column` is a column
 * index, or -1 for a whole row under row navigation.
 */
export interface DataViewPosition {
  readonly row: number;
  readonly column: number;
}

export interface DataViewGrid {
  readonly mode: DataViewNavigation;
  /** Number of shown rows. */
  readonly rows: number;
  readonly columns: number;
  /** Rows a page key moves by. */
  readonly page: number;
  /** Whether a header cell takes focus: every header under cell navigation, sortable ones under row navigation. */
  header(column: number): boolean;
}

/** The first position of a grid: the first row, or the first focusable header without rows. */
export function firstPosition(grid: DataViewGrid): DataViewPosition | null {
  if (grid.rows > 0) return { row: 0, column: grid.mode === 'row' ? -1 : 0 };
  return headerEdge(grid, 'start');
}

/** A position kept within the grid after rows or columns changed. */
export function clampPosition(
  grid: DataViewGrid,
  position: DataViewPosition,
): DataViewPosition | null {
  if (position.row < 0) {
    const column = Math.min(position.column, grid.columns - 1);
    if (column >= 0 && grid.header(column)) return { row: -1, column };
    return headerEdge(grid, 'start') ?? firstPosition(grid);
  }
  if (grid.rows === 0) return headerEdge(grid, 'start');
  const row = Math.min(position.row, grid.rows - 1);
  if (grid.mode === 'row') return { row, column: -1 };
  return { row, column: Math.max(0, Math.min(position.column, grid.columns - 1)) };
}

function headerEdge(grid: DataViewGrid, edge: 'start' | 'end'): DataViewPosition | null {
  for (let i = 0; i < grid.columns; i += 1) {
    const column = edge === 'start' ? i : grid.columns - 1 - i;
    if (grid.header(column)) return { row: -1, column };
  }
  return null;
}

/** Header row at grid row 0, shown rows from grid row 1. */
function cells(grid: DataViewGrid): GridCells {
  return {
    columns: grid.columns,
    rows: grid.rows + 1,
    present: (column, row) => (row === 0 ? grid.header(column) : grid.mode === 'cell'),
  };
}

/** Where a navigation key moves focus from `from`; null when it stays. */
export function movePosition(
  grid: DataViewGrid,
  from: DataViewPosition,
  move: GridKeyMove,
): DataViewPosition | null {
  return grid.mode === 'row' ? moveRow(grid, from, move) : moveCell(grid, from, move);
}

function moveCell(
  grid: DataViewGrid,
  from: DataViewPosition,
  move: GridKeyMove,
): DataViewPosition | null {
  const layout = cells(grid);
  const at = (cell: { column: number; row: number } | null) =>
    cell ? { row: cell.row - 1, column: cell.column } : null;
  switch (move.kind) {
    case 'step':
      return at(stepGridCell(layout, from.column, from.row + 1, move.columns, move.rows));
    case 'line':
      return at(rowEdgeCell(layout, move.edge, from.row + 1));
    case 'grid':
      return move.edge === 'start'
        ? (headerEdge(grid, 'start') ?? firstPosition(grid))
        : grid.rows > 0
          ? { row: grid.rows - 1, column: grid.columns - 1 }
          : headerEdge(grid, 'end');
    case 'page': {
      if (grid.rows === 0) return null;
      const row = Math.max(0, Math.min(grid.rows - 1, from.row + move.direction * grid.page));
      return row === from.row ? null : { row, column: Math.max(0, from.column) };
    }
  }
}

function moveRow(
  grid: DataViewGrid,
  from: DataViewPosition,
  move: GridKeyMove,
): DataViewPosition | null {
  const lastRow = grid.rows - 1;
  if (from.row < 0) {
    // On a sortable header: arrows rove among the headers, Down returns to the rows.
    if (move.kind === 'step' && move.columns) {
      for (
        let column = from.column + move.columns;
        column >= 0 && column < grid.columns;
        column += move.columns
      )
        if (grid.header(column)) return { row: -1, column };
      return null;
    }
    if (move.kind === 'line') return headerEdge(grid, move.edge);
    if ((move.kind === 'step' && move.rows > 0) || (move.kind === 'page' && move.direction > 0))
      return grid.rows > 0 ? { row: 0, column: -1 } : null;
    if (move.kind === 'grid' && move.edge === 'end')
      return grid.rows > 0 ? { row: lastRow, column: -1 } : null;
    return null;
  }
  switch (move.kind) {
    case 'step': {
      if (!move.rows) return null;
      const row = from.row + move.rows;
      if (row < 0) return headerEdge(grid, 'start');
      return row > lastRow ? null : { row, column: -1 };
    }
    case 'line':
    case 'grid':
      return { row: move.edge === 'start' ? 0 : lastRow, column: -1 };
    case 'page': {
      const row = Math.max(0, Math.min(lastRow, from.row + move.direction * grid.page));
      return row === from.row ? null : { row, column: -1 };
    }
  }
}
