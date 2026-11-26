import { dateTimeFormatter } from './date-locale.js';
import { numberFormatter } from './intl.js';

/**
 * Axes, ticks, labels and attribute options shared by the library's charts: Chart's built-in
 * marks and the Plot widget read the same axis options and draw the same ticks.
 */

/** An increasing `[minimum, maximum]` range of an axis. */
export type AxisDomain = readonly [minimum: number, maximum: number];

/** Options of an x or y axis: its scale type, side, ticks, labels and title. */
export interface AxisOptions {
  type?: 'number' | 'time';
  position?: 'start' | 'end';
  line?: boolean;
  ticks?: boolean;
  labels?: boolean;
  tickCount?: number;
  values?: readonly number[];
  format?: (value: number) => string;
  title?: string;
}

/** The locale and time zone an axis formats its labels in. */
export interface AxisEnvironment {
  locale?: string;
  timeZone?: string;
}

/** Nice bounded numeric tick positions. Formatting never affects their scale. */
export function axisTicks(domain: AxisDomain, axis: AxisOptions): number[] {
  if (axis.values)
    return axis.values
      .filter((v) => Number.isFinite(v) && v >= domain[0] && v <= domain[1])
      .slice(0, 128);
  const count = Math.max(2, Math.min(64, Math.floor(axis.tickCount ?? 5))),
    raw = (domain[1] - domain[0]) / (count - 1),
    power = 10 ** Math.floor(Math.log10(raw));
  if (axis.type === 'time' && raw >= 28 * 86400000) {
    const months = Math.max(1, Math.ceil(raw / (30 * 86400000))),
      start = new Date(domain[0]);
    const index = start.getUTCFullYear() * 12 + start.getUTCMonth(),
      aligned = Math.ceil(index / months) * months;
    start.setUTCFullYear(Math.floor(aligned / 12), ((aligned % 12) + 12) % 12, 1);
    start.setUTCHours(0, 0, 0, 0);
    if (start.getTime() < domain[0]) start.setUTCMonth(start.getUTCMonth() + months);
    const result: number[] = [];
    while (result.length < 128 && start.getTime() <= domain[1]) {
      result.push(start.getTime());
      start.setUTCMonth(start.getUTCMonth() + months);
    }
    return result;
  }
  const base = raw / power,
    numericStep = (base <= 1 ? 1 : base <= 2 ? 2 : base <= 5 ? 5 : 10) * power;
  const timeSteps = [
    1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 15000, 30000, 60000, 120000,
    300000, 600000, 900000, 1800000, 3600000, 7200000, 10800000, 21600000, 43200000, 86400000,
    172800000, 604800000, 1209600000,
  ];
  const step =
    axis.type === 'time' ? (timeSteps.find((value) => value >= raw) ?? numericStep) : numericStep;
  const values: number[] = [];
  for (let i = Math.ceil(domain[0] / step), n = 0; n < 128; n++, i++) {
    const value = i * step;
    if (value > domain[1] + step * 1e-9) break;
    values.push(value === 0 ? 0 : value);
  }
  return values;
}

/**
 * A domain widened to whole ticks, so the first and last tick sit on its edges: the range an
 * automatic axis shows for data between `minimum` and `maximum`.
 */
export function niceDomain(minimum: number, maximum: number, axis: AxisOptions): AxisDomain {
  if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return [0, 1];
  if (minimum === maximum) {
    const pad = Math.abs(minimum) || 1;
    return niceDomain(minimum - (minimum > 0 ? 0 : pad), maximum + (maximum < 0 ? 0 : pad), axis);
  }
  // The spacing of nice ticks, never the explicit `values`.
  const spacing: AxisOptions = { ...axis };
  delete (spacing as { values?: unknown }).values;
  const ticks = axisTicks([minimum, maximum], spacing);
  const step = ticks.length > 1 ? ticks[1]! - ticks[0]! : maximum - minimum;
  return [Math.floor(minimum / step + 1e-9) * step, Math.ceil(maximum / step - 1e-9) * step];
}

/** A tick label: the axis's own format, or a date and time or a number in the locale. */
export function axisLabel(
  axis: AxisOptions,
  value: number,
  span: number,
  environment: AxisEnvironment = {},
): string {
  if (axis.format) return axis.format(value);
  const locale = environment.locale || undefined;
  return axis.type === 'time'
    ? dateTimeFormatter(locale, {
        ...(span >= 86400000
          ? {
              year: span >= 31536000000 ? ('numeric' as const) : undefined,
              month: 'short' as const,
              day: 'numeric' as const,
            }
          : {
              hour: '2-digit' as const,
              minute: '2-digit' as const,
              ...(span < 60000 ? { second: '2-digit' as const } : {}),
              ...(span < 1000 ? { fractionalSecondDigits: 3 as const } : {}),
            }),
        ...(environment.timeZone ? { timeZone: environment.timeZone } : {}),
      }).format(value)
    : numberFormatter(locale, { maximumFractionDigits: 5 }).format(value);
}

/** An inspected position in full: date and time on time axes, the tick label otherwise. */
export function axisDetail(
  axis: AxisOptions,
  value: number,
  environment: AxisEnvironment = {},
): string {
  return axis.type === 'time' && !axis.format
    ? dateTimeFormatter(environment.locale || undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
        ...(environment.timeZone ? { timeZone: environment.timeZone } : {}),
      }).format(value)
    : axisLabel(axis, value, 0, environment);
}

/** A domain in its attribute: `auto`, or its minimum and maximum separated by white space. */
export const domainConverter = {
  fromAttribute: (text: string | null): 'auto' | AxisDomain => {
    if (!text || text === 'auto') return 'auto';
    const v = text.trim().split(/\s+/u).map(Number);
    return v.length === 2 ? [v[0]!, v[1]!] : [NaN, NaN];
  },
  toAttribute: (v: 'auto' | AxisDomain) => (v === 'auto' ? 'auto' : v.join(' ')),
};

/**
 * An object option in its attribute: JSON, or the option's default when the attribute is absent.
 * Text that is not JSON passes through unchanged, so validation reports it.
 */
export function jsonOption<T>(fallback: T) {
  return {
    fromAttribute: (text: string | null): T | string => {
      if (text === null) return fallback;
      try {
        return JSON.parse(text) as T;
      } catch {
        return text;
      }
    },
    toAttribute: (value: T) => JSON.stringify(value),
  };
}

/** An axis or legend in its attribute: absent or `false` hides it, empty shows its defaults. */
export const jsonAxisOption = {
  fromAttribute: (text: string | null): unknown => {
    if (text === null || text.trim() === 'false') return false;
    if (text.trim() === '' || text.trim() === 'true') return {};
    return jsonOption(false).fromAttribute(text);
  },
  toAttribute: (value: unknown) => (value === false ? null : JSON.stringify(value)),
};
