export * from './types.js';
export { foldText, tokenize, type SearchToken } from './normalize.js';
export { SearchableMap } from './radix-tree.js';
export {
  TextIndex,
  type FieldText,
  type TextIndexOptions,
  type TextSearchOptions,
} from './text-index.js';
export {
  collationRange,
  matchText,
  mergeRanges,
  searchCollator,
  termRanges,
  type CollationMatch,
  type CollationOptions,
} from './match.js';
export {
  createIndexSource,
  createRequestSource,
  isSearchHit,
  searchResults,
  type IndexSource,
  type RequestSourceOptions,
  type SearchSource,
  type SearchSourceContext,
  type SearchSourceResult,
} from './source.js';
export { SearchRun, type SearchRunOptions } from './search-run.js';
export { renderHighlighted, splitByRanges } from './highlight.js';
