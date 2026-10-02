import type { ComponentPartContract } from '../../foundation/part.js';
import type { AnchorGeometry } from '../../foundation/positioning.js';

export type SelectValue = unknown;
export interface SelectOption {
  value: unknown;
  label?: unknown;
  text?: string;
  disabled?: boolean;
  nativeAction?: boolean;
  indicatorKeepMounted?: boolean;
  partContract?: ComponentPartContract;
  textContract?: ComponentPartContract;
  indicatorContract?: ComponentPartContract;
}
export interface SelectGroup {
  type: 'group';
  label?: unknown;
  items: readonly SelectEntry[];
  partContract?: ComponentPartContract;
  labelContract?: ComponentPartContract;
}
export interface SelectSeparator {
  type: 'separator';
  orientation?: 'horizontal' | 'vertical';
  partContract?: ComponentPartContract;
}
export type SelectEntry =
  SelectOption | SelectGroup | SelectSeparator | string | number | boolean | null;
export type SelectContainer =
  | HTMLElement
  | ShadowRoot
  | { current: HTMLElement | ShadowRoot | null }
  | (() => HTMLElement | ShadowRoot | null)
  | null;
export type SelectAnchor =
  AnchorGeometry | { current: AnchorGeometry | null } | (() => AnchorGeometry | null) | null;
export type SelectFocusTarget =
  | HTMLElement
  | { current: HTMLElement | null }
  | ((
      interaction: 'mouse' | 'touch' | 'pen' | 'keyboard' | '',
    ) => HTMLElement | boolean | null | void)
  | 'trigger'
  | 'first'
  | 'popup'
  | 'previous'
  | 'none'
  | number
  | boolean;
export interface SelectActions {
  open(): void;
  close(): void;
  unmount(): void;
}
