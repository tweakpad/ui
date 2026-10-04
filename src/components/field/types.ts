import type { ValidationRun } from '../../foundation/validation.js';

export type FieldValidationMode = 'on-submit' | 'on-blur' | 'on-change';
export type FieldError = string | { message?: string } | undefined;
export type FieldValidator = (
  value: unknown,
  formValues: Record<string, unknown>,
) => string | readonly string[] | null | void | Promise<string | readonly string[] | null | void>;
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
  }) => void;
  checkValidity?: () => boolean;
  setCustomValidity?: (message: string) => void;
  inputElement?: HTMLInputElement | HTMLTextAreaElement | null;
  activateFromLabel?: () => void;
  validate?: () => ValidationRun;
};
