import type { ComponentPartContract } from './part.js';
/**
 * One option passed as data to a choice component such as Select, Combobox or a menu, with its
 * value, label and optional part contracts.
 */
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
