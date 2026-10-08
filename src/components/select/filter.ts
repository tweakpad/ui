import {
  collationRange,
  searchCollator,
  type CollationMatch,
  type CollationOptions,
} from '../../foundation/search/match.js';

export type SelectFilterOptions = CollationOptions;
export interface SelectFilter {
  contains<T>(item: T, query: string, text?: (item: T) => string): boolean;
  startsWith<T>(item: T, query: string, text?: (item: T) => string): boolean;
  endsWith<T>(item: T, query: string, text?: (item: T) => string): boolean;
}
const filters = new Map<Intl.Collator, SelectFilter>();

/** The collation predicates of Text search, as one filter per locale and option set. */
export function createSelectFilter(options: SelectFilterOptions = {}): SelectFilter {
  const collator = searchCollator(options);
  const cached = filters.get(collator);
  if (cached) return cached;
  const match = <T>(
    item: T,
    query: string,
    text: ((item: T) => string) | undefined,
    kind: CollationMatch,
  ) =>
    !query ||
    collationRange(text ? text(item) : String(item ?? ''), query, kind, collator) !== null;
  const filter: SelectFilter = {
    contains: (item, query, text) => match(item, query, text, 'contains'),
    startsWith: (item, query, text) => match(item, query, text, 'startsWith'),
    endsWith: (item, query, text) => match(item, query, text, 'endsWith'),
  };
  filters.set(collator, filter);
  return filter;
}
