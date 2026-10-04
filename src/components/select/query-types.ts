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
