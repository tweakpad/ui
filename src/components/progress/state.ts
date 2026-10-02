import { LocaleService } from '../../foundation/services.js';

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
  const invalidRange =
    !Number.isFinite(options.minimum) ||
    !Number.isFinite(options.maximum) ||
    !Number.isFinite(options.maximum - options.minimum) ||
    options.minimum >= options.maximum;
  if (invalidRange)
    options.diagnostic?.('range', 'Progress minimum must be finite and less than maximum.');
  const minimum = invalidRange ? 0 : options.minimum;
  const maximum = invalidRange ? 100 : options.maximum;
  const indeterminate = value === null || !Number.isFinite(value);
  const clampedValue = indeterminate
    ? null
    : invalidRange
      ? minimum
      : Math.max(minimum, Math.min(maximum, value));
  const percentage =
    clampedValue === null ? null : ((clampedValue - minimum) / (maximum - minimum)) * 100;
  const status: ProgressStatus = indeterminate
    ? 'indeterminate'
    : clampedValue === maximum
      ? 'complete'
      : 'progressing';
  let formattedValue = '';
  if (clampedValue !== null && percentage !== null) {
    try {
      formattedValue = new LocaleService(options.locale).number(
        options.format ? clampedValue : percentage / 100,
        options.format ?? { style: 'percent' },
      );
    } catch {
      options.diagnostic?.('format', 'Progress locale or number format is invalid; using percent.');
      formattedValue = new LocaleService().number(percentage / 100, { style: 'percent' });
    }
  }
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
