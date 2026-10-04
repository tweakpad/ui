import { LocaleService } from './services.js';

export interface NumericRangeOptions {
  minimum: number;
  maximum: number;
  locale?: string | string[] | undefined;
  format?: Intl.NumberFormatOptions | undefined;
  diagnostic?: ((code: string, message: string) => void) | undefined;
}

/** Shared scalar range policy. Each consumer decides whether a missing value is allowed. */
export function numericRange(value: number, options: NumericRangeOptions) {
  const invalidRange =
    !Number.isFinite(options.minimum) ||
    !Number.isFinite(options.maximum) ||
    !Number.isFinite(options.maximum - options.minimum) ||
    options.minimum >= options.maximum;
  if (invalidRange) options.diagnostic?.('range', 'Minimum must be finite and less than maximum.');
  const minimum = invalidRange ? 0 : options.minimum;
  const maximum = invalidRange ? 100 : options.maximum;
  const clampedValue =
    invalidRange || Number.isNaN(value) ? minimum : Math.max(minimum, Math.min(maximum, value));
  const normalizedPercentage = (clampedValue - minimum) / (maximum - minimum);
  return Object.freeze({
    minimum,
    maximum,
    clampedValue,
    normalizedPercentage,
    percentage: normalizedPercentage * 100,
    invalidRange,
  });
}

/** The display and accessibility bindings consume this same formatted publication. */
export function formatNumericRange(
  range: ReturnType<typeof numericRange>,
  options: NumericRangeOptions,
): string {
  try {
    return new LocaleService(options.locale).number(
      options.format ? range.clampedValue : range.normalizedPercentage,
      options.format ?? { style: 'percent' },
    );
  } catch {
    options.diagnostic?.('format', 'Locale or number format is invalid; using percent.');
    return new LocaleService().number(range.normalizedPercentage, { style: 'percent' });
  }
}
