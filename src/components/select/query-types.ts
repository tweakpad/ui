import type { ComponentPartContract } from '../../foundation/part.js';
export type SelectClearBehavior = 'query' | 'selection' | 'both' | 'contextual';
export type SelectCompletionMode = 'list' | 'both' | 'inline' | 'none';
export interface SelectOptionConfiguration {
  label?: unknown;
  disabled?: boolean;
  nativeAction?: boolean;
  index?: number;
  row?: number;
  onClick?: (event: MouseEvent) => void;
  indicatorKeepMounted?: boolean;
  partContract?: ComponentPartContract;
  indicatorContract?: ComponentPartContract;
  textContract?: ComponentPartContract;
}

export interface SelectQueryRecordMetadata {
  source: unknown;
  logicalIndex: number;
  row: number;
}

/** Replaceable texts of the editable list; each defaults to English. */
export interface SelectMessages {
  /** Announced while a search source is loading. */
  loading?: string;
  /** Announced when a search source fails. */
  error?: string;
  /** Empty-state content when nothing matches. */
  empty?: string;
  /** Announced result count. */
  results?: (count: number) => string;
}

export const DEFAULT_SELECT_MESSAGES: Required<SelectMessages> = {
  loading: 'Loading suggestions.',
  error: 'Suggestions could not be loaded.',
  empty: 'No results found.',
  results: (count) => `${count} ${count === 1 ? 'result' : 'results'} available.`,
};

/** Extra searchable text of an item, such as keywords or a description. */
export type SelectMatchFields = (item: unknown) => string | readonly string[] | null | undefined;
