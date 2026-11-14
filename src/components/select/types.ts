import type { ComponentPartContract } from '../../foundation/part.js';
import type { AnchorGeometry } from '../../foundation/positioning.js';
import type { SurfaceFocusTarget } from '../../foundation/surface-focus.js';

export type SelectValue = unknown;
/** `inline`: one compact row with the label at the start and the selection at the end. */
export type SelectVariant = 'default' | 'inline';
/** One choice given as data in a Select's `items`, in place of an authored option. */
export interface SelectOption {
  value: unknown;
  index?: number;
  row?: number;
  label?: unknown;
  text?: string;
  disabled?: boolean;
  nativeAction?: boolean;
  indicatorKeepMounted?: boolean;
  partContract?: ComponentPartContract;
  textContract?: ComponentPartContract;
  indicatorContract?: ComponentPartContract;
}
/** A labeled group of entries in a Select's `items`. */
export interface SelectGroup {
  type: 'group';
  label?: unknown;
  items: readonly SelectEntry[];
  partContract?: ComponentPartContract;
  labelContract?: ComponentPartContract;
}
/** A divider between entries in a Select's `items`. */
export interface SelectSeparator {
  type: 'separator';
  orientation?: 'horizontal' | 'vertical';
  partContract?: ComponentPartContract;
}
/** One entry of a Select's `items`: an option record, a group, a separator, or a plain value. */
export type SelectEntry =
  SelectOption | SelectGroup | SelectSeparator | string | number | boolean | null;
/**
 * Where a Select renders its popup when `container` is set: an element or shadow root, a reference
 * holding one, or a function returning one.
 */
export type SelectContainer =
  | HTMLElement
  | ShadowRoot
  | { current: HTMLElement | ShadowRoot | null }
  | (() => HTMLElement | ShadowRoot | null)
  | null;
/** What a Select's popup positions against when `anchor` is set, in place of the trigger. */
export type SelectAnchor =
  AnchorGeometry | { current: AnchorGeometry | null } | (() => AnchorGeometry | null) | null;
/**
 * Where focus goes when a Select's list opens or closes, as `initialFocus` and `finalFocus` take
 * it.
 */
export type SelectFocusTarget = SurfaceFocusTarget;
/**
 * The imperative handle a Select exposes as `actions`, for opening, closing or unmounting its popup
 * from code.
 */
export interface SelectActions {
  open(): void;
  close(): void;
  unmount(): void;
}
