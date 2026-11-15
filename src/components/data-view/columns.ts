import type { DataViewColumn } from './types.js';

/** The default track of a column without a width. */
export const DEFAULT_COLUMN_WIDTH = 'minmax(8rem, 1fr)';

/** The `grid-template-columns` of a column set. */
export function columnTracks(columns: readonly DataViewColumn<never>[]): string {
  return columns.map((column) => column.width?.trim() || DEFAULT_COLUMN_WIDTH).join(' ') || '1fr';
}

/** A cell's value: the column's accessor, or the row property named by the column id. */
export function cellValue<T>(column: DataViewColumn<T>, row: T): unknown {
  if (column.value) return column.value(row);
  return row !== null && typeof row === 'object'
    ? (row as Record<string, unknown>)[column.id]
    : undefined;
}

/** A cell's text: the column's formatter, or the value as a string, empty for none. */
export function cellText<T>(
  column: DataViewColumn<T>,
  row: T,
  value = cellValue(column, row),
): string {
  if (column.format) return column.format(value, row);
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toLocaleString();
  return String(value);
}

/** The default row identity: `row.id`. */
export function defaultRowId(row: unknown): string | undefined {
  if (row === null || typeof row !== 'object') return undefined;
  const id = (row as { id?: unknown }).id;
  return typeof id === 'string' || typeof id === 'number' || typeof id === 'bigint'
    ? String(id)
    : undefined;
}

/** Row identities, with the problems found: a missing or repeated id falls back to its index. */
export interface RowIdentities {
  readonly ids: readonly string[];
  /** Index of each id. */
  readonly index: ReadonlyMap<string, number>;
  readonly missing: number;
  readonly duplicates: readonly string[];
}

export function rowIdentities<T>(
  rows: readonly T[],
  getRowId: (row: T, index: number) => string | number | undefined | null,
): RowIdentities {
  const ids: (string | undefined)[] = [];
  const index = new Map<string, number>();
  const duplicates: string[] = [];
  let missing = 0;
  // Authored ids first, so a fallback key never takes an id a later row authored.
  rows.forEach((row, position) => {
    const raw = getRowId(row, position);
    const id = raw === undefined || raw === null || raw === '' ? undefined : String(raw);
    if (id === undefined) missing += 1;
    else if (index.has(id)) duplicates.push(id);
    else {
      index.set(id, position);
      ids[position] = id;
    }
  });
  rows.forEach((_, position) => {
    if (ids[position] !== undefined) return;
    let id = `#${position}`;
    while (index.has(id)) id = `${id}'`;
    index.set(id, position);
    ids[position] = id;
  });
  return { ids: ids as string[], index, missing, duplicates };
}

/** The column ids that repeat, for a diagnostic. */
export function duplicateColumnIds(columns: readonly DataViewColumn<never>[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const column of columns) {
    if (seen.has(column.id)) repeated.add(column.id);
    seen.add(column.id);
  }
  return [...repeated];
}
