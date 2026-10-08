/** A half-open range [start, end) of UTF-16 offsets in the original text. */
export type SearchRange = readonly [start: number, end: number];

/** The ranges matched in one field of an item. */
export interface SearchMatch {
  readonly field: string;
  readonly ranges: readonly SearchRange[];
}

/**
 * A ranked result: the item, its identifier, a score (higher is better) and what matched. Sources
 * may return plain items instead; hits that name `terms` without `matches` get their ranges
 * derived from the item text.
 */
export interface SearchHit<T = unknown> {
  readonly item: T;
  readonly id?: unknown;
  readonly score?: number;
  /** Matched terms, folded. */
  readonly terms?: readonly string[];
  readonly matches?: readonly SearchMatch[];
}

/** How a query matches text: ranked typo-tolerant search, or one of the exact modes. */
export type SearchMatching = 'fuzzy' | 'contains' | 'prefix' | 'exact';

/** Status of the search behind a list of results. */
export type SearchStatus = 'idle' | 'loading' | 'loaded' | 'error';
