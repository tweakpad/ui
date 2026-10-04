import { LocaleService } from '../services.js';

export interface NumberFieldNumericOptions {
  minimum?: number;
  maximum?: number;
  step?: number | 'any';
  smallStep?: number;
  largeStep?: number;
  snapOnStep?: boolean;
  allowOutOfRange?: boolean;
  format?: Intl.NumberFormatOptions;
}

export function validateNumberFieldOptions(options: NumberFieldNumericOptions): void {
  for (const key of ['minimum', 'maximum'] as const)
    if (options[key] !== undefined && !Number.isFinite(options[key]))
      throw new RangeError(`NumberField ${key} must be finite.`);
  if (
    options.minimum !== undefined &&
    options.maximum !== undefined &&
    options.minimum > options.maximum
  )
    throw new RangeError('NumberField minimum cannot exceed maximum.');
  for (const [name, value] of [
    ['step', options.step],
    ['smallStep', options.smallStep],
    ['largeStep', options.largeStep],
  ] as const)
    if (value !== undefined && value !== 'any' && (!Number.isFinite(value) || value <= 0))
      throw new RangeError(`NumberField ${name} must be positive and finite.`);
}

export function numberStepAmount(
  options: NumberFieldNumericOptions,
  modifiers?: { altKey?: boolean; shiftKey?: boolean },
): number {
  return modifiers?.altKey
    ? (options.smallStep ?? 0.1)
    : modifiers?.shiftKey
      ? (options.largeStep ?? 10)
      : options.step === 'any'
        ? 1
        : (options.step ?? 1);
}

export function explicitNumberRounding(format?: Intl.NumberFormatOptions): boolean {
  return (
    !!format &&
    [
      'maximumFractionDigits',
      'minimumFractionDigits',
      'maximumSignificantDigits',
      'minimumSignificantDigits',
      'roundingIncrement',
      'roundingMode',
      'roundingPriority',
    ].some((key) => (format as Record<string, unknown>)[key] !== undefined)
  );
}

/** Preserve supplied precision; clean arithmetic noise only within one ULP and the absolute cap. */
export function roundNumberFieldValue(value: number, format?: Intl.NumberFormatOptions): number {
  if (!Number.isFinite(value)) return value;
  if (!explicitNumberRounding(format)) {
    const rounded = Number(value.toPrecision(15));
    return Math.abs(rounded - value) <=
      Math.min(Number.EPSILON * Math.max(1, Math.abs(value)), 1e-10)
      ? rounded
      : value;
  }
  const locale = new LocaleService('en-US');
  const plain: Intl.NumberFormatOptions = {
    ...format,
    signDisplay: 'auto',
    currencySign: 'standard',
    useGrouping: false,
    ...(format?.notation === 'compact' ? { notation: 'standard' } : {}),
  };
  const text = locale.number(value, plain);
  const parsed = locale.parseNumber(text, plain, true);
  return parsed.kind === 'number' && locale.number(parsed.value, plain) === text
    ? parsed.value
    : value;
}

export function normalizeNumberFieldValue(
  value: number | null,
  options: NumberFieldNumericOptions,
  stepping?: { amount: number; direction: 1 | -1; small?: boolean },
): number | null {
  if (value === null) return null;
  if (!Number.isFinite(value)) throw new RangeError('NumberField value must be finite or null.');
  const min = options.minimum ?? Number.MIN_SAFE_INTEGER;
  const max = options.maximum ?? Number.MAX_SAFE_INTEGER;
  let next = value;
  if (stepping && options.snapOnStep) {
    const base = options.minimum ?? 0;
    const size = stepping.amount;
    const units = (next - base + size * 1e-10 * stepping.direction) / size;
    next =
      base +
      (stepping.small
        ? Math.round(units)
        : stepping.direction > 0
          ? Math.floor(units)
          : Math.ceil(units)) *
        size;
  }
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  const shouldClamp = !!stepping || !options.allowOutOfRange;
  if (shouldClamp) next = clamp(next);
  if (stepping || explicitNumberRounding(options.format))
    next = roundNumberFieldValue(next, options.format);
  return shouldClamp ? clamp(next) : next;
}

export function numberFieldValidity(
  value: number | null,
  options: NumberFieldNumericOptions & {
    required?: boolean;
    badInput?: boolean;
    disabled?: boolean;
    readOnly?: boolean;
  },
): ValidityStateFlags {
  if (options.disabled || options.readOnly) return {};
  const flags: ValidityStateFlags = {};
  if (options.required && value === null) flags.valueMissing = true;
  if (options.badInput) flags.badInput = true;
  if (value === null) return flags;
  if (options.minimum !== undefined && value < options.minimum) flags.rangeUnderflow = true;
  if (options.maximum !== undefined && value > options.maximum) flags.rangeOverflow = true;
  if (options.step !== 'any') {
    const step = options.step ?? 1;
    const units = (value - (options.minimum ?? 0)) / step;
    if (Math.abs(units - Math.round(units)) > Math.max(1, Math.abs(units)) * Number.EPSILON * 8)
      flags.stepMismatch = true;
  }
  return flags;
}
