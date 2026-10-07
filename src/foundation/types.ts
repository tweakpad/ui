export type Orientation = 'horizontal' | 'vertical' | 'responsive';
export type Direction = 'ltr' | 'rtl';
export type LogicalPosition = 'leading' | 'trailing';
export type ChangeReason =
  | 'programmatic'
  | 'automatic-advance'
  | 'initial'
  | 'missing'
  | 'disabled'
  | 'trigger-press'
  | 'trigger-hover'
  | 'trigger-focus'
  | 'input-press'
  | 'item-press'
  | 'link-press'
  | 'close-action'
  | 'clear'
  | 'chip-remove-press'
  | 'track-press'
  | 'increment'
  | 'decrement'
  | 'input'
  | 'input-clear'
  | 'input-blur'
  | 'input-paste'
  | 'focus-outside'
  | 'escape-key'
  | 'close-watcher'
  | 'list-navigation'
  | 'keyboard'
  | 'pointer'
  | 'drag'
  | 'wheel'
  | 'scrub'
  | 'cancel-open'
  | 'sibling-open'
  | 'imperative-action'
  | 'swipe'
  | 'window-resize'
  | 'outside-press'
  | 'ancestor-scroll'
  | 'reference-press'
  | 'click'
  | 'hover'
  | 'focus'
  | 'safe-polygon'
  | 'form-reset'
  | 'submit'
  | 'anchor-removed'
  | 'selection'
  | 'dismiss'
  /** Media-element-originated state change; never cancelable (Appendix B.8: media element event). */
  | 'media'
  /** Key-binding proposal (Appendix B.8: keyboard event). */
  | 'hotkey'
  /** Recognized tap-gesture proposal (Appendix B.8: pointer event). */
  | 'gesture'
  /** Activity-timeout change (Appendix B.8: synthetic timer event). */
  | 'idle'
  /** Map camera change originated inside the map engine; never cancelable (Appendix B.8). */
  | 'engine'
  /** Scroll-spy change derived from scroll position or layout; never cancelable (Foundation §18.15). */
  | 'scroll';

export type PresenceState = 'absent' | 'starting' | 'open' | 'ending' | 'retained';

export interface ValueChangeDetail<T> {
  value: T;
  previousValue: T;
  reason: ChangeReason;
  sourceEvent: Event;
  trigger?: Element;
  cancelled: boolean;
  allowPropagation: boolean;
  metadata?: Record<string, unknown>;
}

export interface ValidationState {
  valid: boolean;
  message: string;
  flags?: ValidityStateFlags;
}

export interface ValidityStateFlags {
  badInput?: boolean;
  customError?: boolean;
  patternMismatch?: boolean;
  rangeOverflow?: boolean;
  rangeUnderflow?: boolean;
  stepMismatch?: boolean;
  tooLong?: boolean;
  tooShort?: boolean;
  typeMismatch?: boolean;
  valueMissing?: boolean;
}
