import { collator } from '../../foundation/intl.js';
import { cellValue } from './columns.js';
import type { DataViewColumn, DataViewSort } from './types.js';

export interface DataViewSortOptions {
  /** Locale of the text comparison; the document's by default. */
  readonly locale?: string | readonly string[];
}

const isEmpty = (value: unknown) => value === null || value === undefined || value === '';

/**
 * Compares two cell values ascending: numbers, bigints, dates and Booleans by value, everything
 * else as text with a numeric-aware collator.
 */
export function compareCellValues(a: unknown, b: unknown, compareText: Intl.Collator): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b || 0;
  if (typeof a === 'bigint' && typeof b === 'bigint') return a < b ? -1 : a > b ? 1 : 0;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime() || 0;
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
  return compareText.compare(String(a), String(b));
}

/**
 * The rows ordered by a sort, as a new array: stable, so rows that compare equal keep their order,
 * with empty values (null, undefined, '') last in either direction. A column's `compare` replaces
 * the value comparison. Without a sort, or for an unknown or unsortable column, the rows come back
 * as given.
 */
export function sortDataViewRows<T>(
  rows: readonly T[],
  sort: DataViewSort | null | undefined,
  columns: readonly DataViewColumn<T>[],
  options: DataViewSortOptions = {},
): readonly T[] {
  if (!sort) return rows;
  const column = columns.find((candidate) => candidate.id === sort.column);
  if (!column) return rows;
  const sign = sort.direction === 'descending' ? -1 : 1;
  const text = collator(options.locale as string | string[] | undefined, {
    numeric: true,
    sensitivity: 'base',
  });
  const entries = rows.map((row, index) => ({ row, index, value: cellValue(column, row) }));
  entries.sort((left, right) => {
    if (!column.compare) {
      const leftEmpty = isEmpty(left.value);
      const rightEmpty = isEmpty(right.value);
      if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
      if (leftEmpty) return left.index - right.index;
    }
    const order = column.compare
      ? column.compare(left.row, right.row)
      : compareCellValues(left.value, right.value, text);
    return order ? sign * order : left.index - right.index;
  });
  return entries.map((entry) => entry.row);
}

/** The next sort of a header press: ascending, then descending, then none. */
export function nextSort(current: DataViewSort | null, column: string): DataViewSort | null {
  if (!current || current.column !== column) return { column, direction: 'ascending' };
  return current.direction === 'ascending' ? { column, direction: 'descending' } : null;
}
