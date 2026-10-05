/** Cached locale date, relative-time and duration formatting shared by locale services. */
type LocaleInput = string | readonly string[] | undefined;

const limit = 64;
function cached<T>(cache: Map<string, T>, key: string, create: () => T): T {
  let value = cache.get(key);
  if (!value) {
    value = create();
    if (cache.size >= limit) cache.delete(cache.keys().next().value!);
    cache.set(key, value);
  }
  return value;
}

const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>();
export function dateTimeFormatter(
  locale?: LocaleInput,
  options?: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  return cached(
    dateTimeFormatters,
    JSON.stringify([locale, options]),
    () => new Intl.DateTimeFormat(locale as string | string[] | undefined, options),
  );
}

const relativeTimeFormatters = new Map<string, Intl.RelativeTimeFormat>();
export function relativeTimeFormatter(
  locale?: LocaleInput,
  options?: Intl.RelativeTimeFormatOptions,
): Intl.RelativeTimeFormat {
  return cached(
    relativeTimeFormatters,
    JSON.stringify([locale, options]),
    () => new Intl.RelativeTimeFormat(locale as string | string[] | undefined, options),
  );
}

const listFormatters = new Map<string, Intl.ListFormat>();
export function listFormatter(
  locale?: LocaleInput,
  options?: Intl.ListFormatOptions,
): Intl.ListFormat {
  return cached(
    listFormatters,
    JSON.stringify([locale, options]),
    () => new Intl.ListFormat(locale as string | string[] | undefined, options),
  );
}

export type DurationStyle = 'long' | 'short' | 'narrow';
export interface DurationRecord {
  years?: number;
  months?: number;
  weeks?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
  milliseconds?: number;
}
interface DurationFormatter {
  format(duration: DurationRecord): string;
}
type DurationFormatConstructor = new (
  locale?: string | string[],
  options?: { style?: DurationStyle },
) => DurationFormatter;

const durationUnits = [
  ['years', 'year'],
  ['months', 'month'],
  ['weeks', 'week'],
  ['days', 'day'],
  ['hours', 'hour'],
  ['minutes', 'minute'],
  ['seconds', 'second'],
] as const;
const durationFormatters = new Map<string, DurationFormatter>();
/** Locale duration text; falls back to localized unit lists when Intl.DurationFormat is absent. */
export function durationFormatter(
  locale?: LocaleInput,
  style: DurationStyle = 'long',
): DurationFormatter {
  return cached(durationFormatters, JSON.stringify([locale, style]), () => {
    const native = (Intl as unknown as { DurationFormat?: DurationFormatConstructor })
      .DurationFormat;
    if (native) return new native(locale as string | string[] | undefined, { style });
    return {
      format(duration: DurationRecord): string {
        const seconds = (duration.seconds ?? 0) + (duration.milliseconds ?? 0) / 1000;
        const parts = durationUnits
          .map(
            ([field, unit]) =>
              [field === 'seconds' ? seconds : (duration[field] ?? 0), unit] as const,
          )
          .filter(([value]) => value !== 0)
          .map(([value, unit]) =>
            new Intl.NumberFormat(locale as string | string[] | undefined, {
              style: 'unit',
              unit,
              unitDisplay: style,
              maximumFractionDigits: 3,
            }).format(value),
          );
        if (!parts.length)
          return new Intl.NumberFormat(locale as string | string[] | undefined, {
            style: 'unit',
            unit: 'second',
            unitDisplay: style,
          }).format(0);
        return listFormatter(locale, { type: 'unit', style }).format(parts);
      },
    };
  });
}
