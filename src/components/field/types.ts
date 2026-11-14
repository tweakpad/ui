import type { ValidationRun } from '../../foundation/validation.js';

/**
 * When a Field validates its control: on submit, when the control loses focus, or on every change.
 */
export type FieldValidationMode = 'on-submit' | 'on-blur' | 'on-change';
/** An error a Field shows, as a message or an object with one; empty entries are skipped. */
export type FieldError = string | { message?: string } | undefined;
/**
 * Validates a Field's value against the form values and returns an error message, a list of them,
 * nothing, or a promise of one of these.
 */
export type FieldValidator = (
  value: unknown,
  formValues: Record<string, unknown>,
) => string | readonly string[] | null | void | Promise<string | readonly string[] | null | void>;
/**
 * A snapshot of a Field's value, errors and interaction state, read from `validityState` and passed
 * to `validityContent`.
 */
export interface FieldValidity {
  value: unknown;
  initialValue: unknown;
  errors: readonly string[];
  error: string;
  validity: ValidityStateFlags & { valid: boolean | null };
  dirty: boolean;
  touched: boolean;
  filled: boolean;
  focused: boolean;
  pending: boolean;
}
/**
 * An element a Field discovers as its control and reads its value, checked state and validity from.
 */
export type FieldControl = HTMLElement & {
  value?: unknown;
  readonly fieldValue?: unknown;
  checked?: boolean;
  pressed?: boolean;
  name?: string;
  disabled?: boolean;
  invalid?: boolean;
  effectiveDisabled?: boolean;
  effectiveName?: string;
  validity?: ValidityState | null;
  validationMessage?: string;
  form?: HTMLFormElement | null;
  /** The control shows the Field's label inside its own anatomy. */
  readonly rendersFieldLabel?: boolean;
  setFieldAssociation?: (association: {
    label?: string;
    description?: string;
    error?: string;
  }) => void;
  setFieldContext?: (context: {
    disabled?: boolean;
    name?: string;
    invalid?: boolean;
    markers?: Record<string, boolean>;
    noAutofill?: boolean;
  }) => void;
  checkValidity?: () => boolean;
  setCustomValidity?: (message: string) => void;
  inputElement?: HTMLInputElement | HTMLTextAreaElement | null;
  activateFromLabel?: () => void;
  validate?: () => ValidationRun;
};
