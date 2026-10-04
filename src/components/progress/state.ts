import { numericRange, formatNumericRange } from '../../foundation/numeric-range.js';

export type ProgressStatus = 'indeterminate' | 'progressing' | 'complete';
export type AccessibleProgressText = (formattedValue: string, rawValue: number | null) => string;
export interface ProgressState extends Readonly<Record<string, unknown>> {
  readonly value: number | null;
  readonly rawMinimum: number;
  readonly rawMaximum: number;
  readonly clampedValue: number | null;
  readonly minimum: number;
  readonly maximum: number;
  readonly percentage: number | null;
  readonly formattedValue: string;
  readonly accessibleValueText: string;
  readonly status: ProgressStatus;
  readonly indeterminate: boolean;
  readonly progressing: boolean;
  readonly complete: boolean;
  readonly invalidRange: boolean;
}
export interface ProgressStateOptions {
  value: number | null;
  minimum: number;
  maximum: number;
  locale?: string | string[] | undefined;
  format?: Intl.NumberFormatOptions | undefined;
  valueText?: string | undefined;
  getAccessibleValueText?: AccessibleProgressText | undefined;
  diagnostic?: (code: string, message: string) => void;
}

/** A single immutable semantic/format/geometry publication for all progress parts. */
export function progressState(options: ProgressStateOptions): ProgressState {
  const { value } = options;
  const range = numericRange(value ?? Number.NaN, options);
  const { minimum, maximum, invalidRange } = range;
  const indeterminate = value === null || !Number.isFinite(value);
  const clampedValue = indeterminate ? null : range.clampedValue;
  const percentage = indeterminate ? null : range.percentage;
  const status: ProgressStatus = indeterminate
    ? 'indeterminate'
    : clampedValue === maximum
      ? 'complete'
      : 'progressing';
  const formattedValue = indeterminate ? '' : formatNumericRange(range, options);
  const accessibleValueText =
    options.valueText ??
    options.getAccessibleValueText?.(formattedValue, value) ??
    (indeterminate ? 'indeterminate progress' : formattedValue);
  return Object.freeze({
    value,
    rawMinimum: options.minimum,
    rawMaximum: options.maximum,
    clampedValue,
    minimum,
    maximum,
    percentage,
    formattedValue,
    accessibleValueText,
    status,
    indeterminate,
    progressing: status === 'progressing',
    complete: status === 'complete',
    invalidRange,
  });
}
