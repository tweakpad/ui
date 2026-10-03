import type { ComponentPartContract } from './part.js';
export interface ChoiceOption {
  value: unknown;
  label?: unknown;
  text?: string;
  disabled?: boolean;
  nativeAction?: boolean;
  index?: number;
  indicatorKeepMounted?: boolean;
  partContract?: ComponentPartContract;
  textContract?: ComponentPartContract;
  indicatorContract?: ComponentPartContract;
}
export interface ChoiceGroup {
  type: 'group';
  label?: unknown;
  items: readonly ChoiceEntry[];
  partContract?: ComponentPartContract;
  labelContract?: ComponentPartContract;
}
export interface ChoiceSeparator {
  type: 'separator';
  orientation?: 'horizontal' | 'vertical';
  partContract?: ComponentPartContract;
}
export type ChoiceEntry =
  ChoiceOption | ChoiceGroup | ChoiceSeparator | string | number | boolean | null;
