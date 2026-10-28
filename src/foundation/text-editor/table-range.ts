/**
 * Cell-range geometry of a table model (Widgets `uwg-te-req-tables-5`), engine-free: the rectangle of
 * grid positions that a cell covers, the one covering a position, and the rectangle a cell range
 * selects once grown over merged cells. The adapters plan with it and the widget measures ranges
 * with it.
 */
import type {
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorTableCell,
  TextEditorTableModel,
} from './model.js';

/** A rectangle of grid positions: rows `top` to `bottom` and columns `left` to `right`, inclusive. */
export interface TextEditorCellRect {
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
}

/** The rectangle that a cell covers. */
export const cellRect = (cell: TextEditorTableCell): TextEditorCellRect =>
  Object.freeze({
    top: cell.row,
    left: cell.column,
    bottom: cell.row + cell.rowSpan - 1,
    right: cell.column + cell.colSpan - 1,
  });

/** The rectangle of the cell covering a grid position, or `null` outside the grid. */
export function spanRect(
  model: TextEditorTableModel,
  at: TextEditorCellAddress,
): TextEditorCellRect | null {
  const index = model.grid[at.row]?.[at.column];
  const cell = index === undefined ? undefined : model.cells[index];
  return cell ? cellRect(cell) : null;
}

const unionOf = (a: TextEditorCellRect, b: TextEditorCellRect): TextEditorCellRect => ({
  top: Math.min(a.top, b.top),
  left: Math.min(a.left, b.left),
  bottom: Math.max(a.bottom, b.bottom),
  right: Math.max(a.right, b.right),
});

const sameRect = (a: TextEditorCellRect, b: TextEditorCellRect): boolean =>
  a.top === b.top && a.left === b.left && a.bottom === b.bottom && a.right === b.right;

/**
 * The rectangle of a cell range: the anchor and head cells with their spans, grown until no
 * merged cell crosses its edge. `null` when the range lies outside the table.
 */
export function cellRangeRect(
  model: TextEditorTableModel,
  range: TextEditorCellRange,
): TextEditorCellRect | null {
  const anchor = spanRect(model, range.anchor);
  const head = spanRect(model, range.head);
  if (!anchor || !head) return null;
  let rect = unionOf(anchor, head);
  for (let grown = true; grown;) {
    grown = false;
    for (let row = rect.top; row <= rect.bottom; row += 1)
      for (let column = rect.left; column <= rect.right; column += 1) {
        const next = unionOf(rect, spanRect(model, { row, column }) ?? rect);
        if (!sameRect(next, rect)) {
          rect = next;
          grown = true;
        }
      }
  }
  return Object.freeze(rect);
}
