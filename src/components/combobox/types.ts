import type { ComponentPartContract } from '../../foundation/part.js';
import type { ChoiceModelRecord } from '../../foundation/choice-model.js';
export type { SurfaceFocusTarget as ComboboxFocusTarget } from '../../foundation/surface-focus.js';
export type {
  SelectAnchor as ComboboxAnchor,
  SelectContainer as ComboboxContainer,
} from '../select/types.js';
export type ComboboxClearBehavior = 'query' | 'selection' | 'both' | 'contextual';
export type ComboboxCompletionMode = 'list' | 'both' | 'inline' | 'none';
export interface ComboboxOptionConfiguration {
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
export interface ComboboxChoiceOption extends ChoiceModelRecord {
  source: unknown;
  logicalIndex: number;
  row: number;
}
