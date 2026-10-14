/**
 * Numeric presets for Text transform (Foundation §18.23 `ttf-input`, `ttf-numeric`,
 * `ttf-accessible`): number formatting through the shared cache, byte sizes and durations.
 */
import { formatDuration, type DurationTextStyle } from '../duration-format.js';
import { formatBytes } from '../format-bytes.js';
import { numberFormatter } from '../intl.js';

export type NumberPreset =
  'number' | 'integer' | 'decimal' | 'percent' | 'currency' | 'compact' | 'scientific' | 'unit';

/** Options of the duration preset: digital clock text by default, or spoken styles. */
export interface TextDurationOptions {
  style?: DurationTextStyle;
  /** Digital only: a reference length in seconds that keeps the field layout stable. */
  guide?: number;
}

const NUMBER_DEFAULTS: Record<NumberPreset, Intl.NumberFormatOptions> = {
  number: {},
  integer: { maximumFractionDigits: 0 },
  decimal: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
  percent: { style: 'percent' },
  currency: { style: 'currency' },
  compact: { notation: 'compact', compactDisplay: 'short' },
  scientific: { notation: 'scientific' },
  unit: { style: 'unit', unitDisplay: 'short' },
};

export function isNumberPreset(name: string): name is NumberPreset {
  return Object.hasOwn(NUMBER_DEFAULTS, name);
}

const DECIMAL_LITERAL = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/** A number read from Consumer input; `value` keeps decimal text exact. */
export interface NumericInput {
  readonly value: number | bigint | string;
  /** The input in decimal literal form, for a machine-readable value. */
  readonly machine: string;
  /** The input as a binary floating-point number, for arithmetic presets. */
  readonly number: number;
}

/** Reads a finite number, a bigint, or text in decimal literal form; anything else is null. */
export function parseNumericInput(input: unknown): NumericInput | null {
  if (typeof input === 'number')
    return Number.isFinite(input) ? { value: input, machine: String(input), number: input } : null;
  if (typeof input === 'bigint')
    return { value: input, machine: input.toString(), number: Number(input) };
  if (typeof input !== 'string') return null;
  const text = input.trim();
  return DECIMAL_LITERAL.test(text) ? { value: text, machine: text, number: Number(text) } : null;
}

export interface NumberSettings {
  readonly currency?: string | undefined;
  readonly unit?: string | undefined;
  readonly decimals?: number | undefined;
  /** Options of a Consumer preset built on this one; below the attribute shortcuts. */
  readonly presetFormat?: object | undefined;
  /** The Consumer's own options; above everything else. */
  readonly format?: object | undefined;
  readonly locale?: string | undefined;
}

export interface FormattedText {
  readonly text: string;
  readonly accessibleText: string;
}

type Report = (code: string, message: string) => void;

function validDecimals(decimals: number | undefined, report: Report): number | undefined {
  if (decimals === undefined) return undefined;
  if (Number.isInteger(decimals) && decimals >= 0 && decimals <= 20) return decimals;
  report(
    'invalid-decimals',
    `Text transform decimals must be an integer from 0 to 20, not ${decimals}.`,
  );
  return undefined;
}

function fractionDigits(decimals: number | undefined): Intl.NumberFormatOptions {
  return decimals === undefined
    ? {}
    : { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
}

function create(locale: string | undefined, options: Intl.NumberFormatOptions) {
  try {
    return numberFormatter(locale, options);
  } catch {
    return null;
  }
}

/** The same options with abbreviated displays spelled out, or null when nothing is abbreviated. */
function longOptions(options: Intl.NumberFormatOptions): Intl.NumberFormatOptions | null {
  if (options.notation === 'compact' && options.compactDisplay !== 'long')
    return { ...options, compactDisplay: 'long' };
  if (options.style === 'unit' && options.unitDisplay !== 'long')
    return { ...options, unitDisplay: 'long' };
  return null;
}

function format(formatter: Intl.NumberFormat, value: NumericInput['value']): string {
  // Decimal text formats exactly where the host accepts it, instead of through a float.
  return (formatter.format as (value: number | bigint | string) => string)(value);
}

/**
 * Formats a number preset. Options resolve as preset defaults, then the Consumer preset's
 * options, then `currency`, `unit` and `decimals`, then `format`. A missing or rejected currency
 * or unit presents the number preset; rejected `format` options fall back to the preset defaults.
 */
export function formatNumberPreset(
  preset: NumberPreset,
  input: NumericInput,
  settings: NumberSettings,
  report: Report,
): FormattedText {
  const decimals = validDecimals(settings.decimals, report);
  const base = {
    ...NUMBER_DEFAULTS[preset],
    ...(settings.presetFormat as Intl.NumberFormatOptions),
  };
  const own = settings.format as Intl.NumberFormatOptions | undefined;
  const style = own?.style ?? base.style;
  const shortcuts: Intl.NumberFormatOptions = fractionDigits(decimals);
  if (style === 'currency' && settings.currency) shortcuts.currency = settings.currency;
  if (style === 'unit' && settings.unit) shortcuts.unit = settings.unit;
  const merged = { ...base, ...shortcuts, ...own };
  const fallback = { ...NUMBER_DEFAULTS.number, ...fractionDigits(decimals) };
  let options: Intl.NumberFormatOptions = merged;
  let formatter: Intl.NumberFormat | null = null;
  if (merged.style === 'currency' && !merged.currency) {
    report(
      'missing-currency',
      'Text transform currency preset needs a currency code; presenting a number.',
    );
    options = fallback;
  } else if (merged.style === 'unit' && !merged.unit) {
    report(
      'missing-unit',
      'Text transform unit preset needs a unit identifier; presenting a number.',
    );
    options = fallback;
  } else {
    formatter = create(settings.locale, merged);
    if (!formatter && own) {
      report(
        'invalid-format',
        'Text transform format options were rejected; using the preset defaults.',
      );
      options = { ...base, ...shortcuts };
      formatter = create(settings.locale, options);
    }
    if (!formatter) {
      const [code, what] =
        options.style === 'currency'
          ? ['invalid-currency', `currency code "${String(options.currency)}"`]
          : options.style === 'unit'
            ? ['invalid-unit', `unit identifier "${String(options.unit)}"`]
            : ['invalid-format', 'number options'];
      report(code, `Text transform ${what} was rejected; presenting a number.`);
      options = fallback;
    }
  }
  formatter ??= create(settings.locale, options) ?? numberFormatter(undefined, fallback);
  const text = format(formatter, input.value);
  const long = longOptions(options);
  const longFormatter = long && create(settings.locale, long);
  return { text, accessibleText: longFormatter ? format(longFormatter, input.value) : text };
}

/** Byte sizes in binary units, with the unit spelled out in the accessible text. */
export function formatBytesPreset(bytes: number, locale: string | undefined): FormattedText {
  return { text: formatBytes(bytes, locale), accessibleText: formatBytes(bytes, locale, 'long') };
}

const DURATION_STYLES = new Set<DurationTextStyle>(['digital', 'long', 'short', 'narrow']);

/** Seconds as digital or spoken duration text, with the long form as accessible text. */
export function formatDurationPreset(
  seconds: number,
  settings: NumberSettings,
  report: Report,
): FormattedText {
  const options = {
    ...(settings.presetFormat as TextDurationOptions),
    ...(settings.format as TextDurationOptions),
  };
  let style = options.style ?? 'digital';
  if (!DURATION_STYLES.has(style)) {
    report(
      'invalid-format',
      `Text transform duration style "${String(style)}" is not digital, long, short or narrow.`,
    );
    style = 'digital';
  }
  const text = formatDuration(seconds, { style, guide: options.guide }, settings.locale);
  return {
    text,
    accessibleText:
      style === 'long' ? text : formatDuration(seconds, { style: 'long' }, settings.locale),
  };
}
