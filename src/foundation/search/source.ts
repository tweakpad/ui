import { TextIndex, type TextIndexOptions, type TextSearchOptions } from './text-index.js';
import type { SearchHit } from './types.js';

export interface SearchSourceContext {
  /** Aborted when a newer query starts or the owner goes away. */
  readonly signal: AbortSignal;
  /** The owner's limit; -1 means unlimited. */
  readonly limit: number;
  readonly locale: string | undefined;
}

/** Ordered results: plain items, hits, or hits with a total count. */
export type SearchSourceResult<T> =
  | Iterable<T | SearchHit<T>>
  | { readonly hits: Iterable<T | SearchHit<T>>; readonly total?: number };

/**
 * Supplies results for a query instead of the owner's own matching: a server endpoint, another
 * search engine, or the built-in index. Results are presented in the order given.
 */
export interface SearchSource<T = unknown> {
  search(
    query: string,
    context: SearchSourceContext,
  ): SearchSourceResult<T> | PromiseLike<SearchSourceResult<T>>;
}

/** Whether `value` is a search hit rather than a plain item. */
export function isSearchHit<T>(value: unknown): value is SearchHit<T> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'item' in value &&
    ('score' in value || 'matches' in value || 'terms' in value)
  );
}

/** Normalizes a source result to hits and a total. */
export function searchResults<T>(result: SearchSourceResult<T>): {
  hits: SearchHit<T>[];
  total: number;
} {
  const entries =
    typeof result === 'object' && result !== null && 'hits' in result
      ? result.hits
      : (result as Iterable<T | SearchHit<T>>);
  const hits = [...entries].map((entry) =>
    isSearchHit<T>(entry) ? entry : ({ item: entry } as SearchHit<T>),
  );
  const total =
    typeof result === 'object' && result !== null && 'hits' in result
      ? (result.total ?? hits.length)
      : hits.length;
  return { hits, total };
}

/** A source over the built-in ranked index, with the index exposed for updates. */
export interface IndexSource<T> extends SearchSource<T> {
  readonly index: TextIndex<T>;
}

/** The built-in local source: a ranked, typo-tolerant index over `items`. */
export function createIndexSource<T>(
  items: Iterable<T>,
  options: TextIndexOptions<T> & { readonly search?: TextSearchOptions<T> } = {},
): IndexSource<T> {
  const index = new TextIndex<T>(options);
  index.addAll(items);
  return {
    index,
    search: (query, context) =>
      index.search(
        query,
        context.limit < 0 ? options.search : { ...options.search, limit: context.limit },
      ),
  };
}

export interface RequestSourceOptions<T> {
  /** The request URL for a query. */
  readonly url: (query: string) => string | URL;
  /** Request options; the signal is supplied. */
  readonly init?: RequestInit;
  /** Maps the parsed JSON response to results; default the response itself. */
  readonly map?: (response: unknown, query: string) => SearchSourceResult<T>;
  /** Queries shorter than this return no results without a request; default 0. */
  readonly minLength?: number;
}

/** A source that requests results from a JSON endpoint, aborting superseded requests. */
export function createRequestSource<T>(options: RequestSourceOptions<T>): SearchSource<T> {
  return {
    async search(query, context) {
      if (query.trim().length < (options.minLength ?? 0)) return [];
      const response = await fetch(options.url(query), {
        ...options.init,
        signal: context.signal,
      });
      if (!response.ok) throw new Error(`Search request failed with status ${response.status}`);
      const json: unknown = await response.json();
      return options.map ? options.map(json, query) : (json as SearchSourceResult<T>);
    },
  };
}
