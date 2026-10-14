/**
 * Overflow list partitions (Foundation §18.24): how many Items to show under a count limit or a
 * row limit, and from which side. Items outside the shown run are replaced by one Count.
 */

/** The side whose Items are omitted; the Count takes their place. */
export type OverflowCollapseFrom = 'start' | 'end';

/** A limit as an Item count: fractions truncate, and a value below one or not a number is none. */
export function resolveItemLimit(value: unknown): number | undefined {
  const limit = Number(value);
  if (value === null || value === undefined || value === '' || !Number.isFinite(limit))
    return undefined;
  return limit >= 1 ? Math.floor(limit) : undefined;
}

/** The number of Items shown under `limit`. */
export function limitPartition(total: number, limit: number | undefined): number {
  return limit === undefined ? total : Math.min(total, limit);
}

/** Indices `[from, to)` of the shown run of `shown` Items out of `total`. */
export function shownRange(
  total: number,
  shown: number,
  from: OverflowCollapseFrom,
): readonly [number, number] {
  return from === 'start' ? [total - shown, total] : [0, shown];
}

export interface FitRequest {
  /** Inline sizes of the Items' margin boxes, in document order. */
  readonly sizes: readonly number[];
  /** Gap between neighbors in a row. */
  readonly gap: number;
  /** Inline size available to a row. */
  readonly available: number;
  /** Most rows. */
  readonly maxRows: number;
  /** Most Items shown. */
  readonly limit?: number | undefined;
  readonly from: OverflowCollapseFrom;
  /** Inline size of the Count presenting `hidden` omitted Items. */
  countSize(hidden: number): number;
}

const EPSILON = 0.01;

/**
 * Rows used by boxes of `sizes` placed in order, as flex lines wrap them: a box that does not
 * fit beside the previous ones starts a new row, and a box wider than a row occupies one alone.
 */
export function rowCount(sizes: Iterable<number>, gap: number, available: number): number {
  let rows = 0;
  let used = 0;
  for (const size of sizes) {
    if (rows && used + gap + size <= available + EPSILON) used += gap + size;
    else {
      rows += 1;
      used = size;
    }
  }
  return rows;
}

/**
 * The largest number of Items, at most `limit`, that fits within `maxRows` rows together with a
 * Count for the Items it omits. With no room for even one Item the Count shows alone (zero).
 */
export function fitPartition(request: FitRequest): number {
  const { sizes, gap, available, maxRows, from } = request;
  const total = sizes.length;
  const cap = limitPartition(total, request.limit);
  if (cap === total && rowCount(sizes, gap, available) <= maxRows) return total;
  for (let shown = Math.min(cap, total - 1); shown > 0; shown--) {
    const [start, end] = shownRange(total, shown, from);
    const count = request.countSize(total - shown);
    const run = sizes.slice(start, end);
    if (rowCount(from === 'start' ? [count, ...run] : [...run, count], gap, available) <= maxRows)
      return shown;
  }
  return 0;
}
