export type Orientation = 'horizontal' | 'vertical';
export type Direction = 'ltr' | 'rtl';
export type ChangeReason =
  'programmatic' | 'pointer' | 'keyboard' | 'input' | 'selection' | 'dismiss' | 'form-reset';

export type PresenceState = 'entering' | 'present' | 'exiting' | 'unmounted';

export interface ValueChangeDetail<T> {
  value: T;
  previousValue: T;
  reason: ChangeReason;
  sourceEvent?: Event;
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
