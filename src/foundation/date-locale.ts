/** Cached locale date, relative-time, list and duration formatting shared by locale services. */
import { cachedIntl, numberFormatter, type LocaleInput } from './intl.js';

export const dateTimeFormatter = cachedIntl(
  (locale, options?: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, options),
);

export const relativeTimeFormatter = cachedIntl(
  (locale, options?: Intl.RelativeTimeFormatOptions) =>
    new Intl.RelativeTimeFormat(locale, options),
);

export const listFormatter = cachedIntl(
  (locale, options?: Intl.ListFormatOptions) => new Intl.ListFormat(locale, options),
);

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
const durationFormatters = cachedIntl(
  (locale, style: DurationStyle | undefined): DurationFormatter => {
    const unitDisplay = style ?? 'long';
    const native = (Intl as unknown as { DurationFormat?: DurationFormatConstructor })
      .DurationFormat;
    if (native) return new native(locale, { style: unitDisplay });
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
            numberFormatter(locale, {
              style: 'unit',
              unit,
              unitDisplay,
              maximumFractionDigits: 3,
            }).format(value),
          );
        if (!parts.length)
          return numberFormatter(locale, { style: 'unit', unit: 'second', unitDisplay }).format(0);
        return listFormatter(locale, { type: 'unit', style: unitDisplay }).format(parts);
      },
    };
  },
);
/** Locale duration text; falls back to localized unit lists when Intl.DurationFormat is absent. */
export function durationFormatter(
  locale?: LocaleInput,
  style: DurationStyle = 'long',
): DurationFormatter {
  return durationFormatters(locale, style);
}
