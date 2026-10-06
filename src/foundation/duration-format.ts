/**
 * Media clock and spoken duration text (Foundation `mp-duration`).
 *
 * Mirrors Video.js `formatTime`, `formatTimeAsPhrase` and `secondsToIsoDuration`
 * (`packages/utils/src/time/format.ts`): locale only formats digits and unit names; it never
 * selects translated phrases such as "remaining".
 */
import { durationFormatter, type DurationRecord, type DurationStyle } from './date-locale.js';
import { numberFormatter } from './number-locale.js';

type LocaleInput = string | string[] | undefined;

/** `digital` renders clock text such as `1:05:30`; the unit styles render spoken phrases. */
export type DurationTextStyle = 'digital' | DurationStyle;

export interface DurationTextOptions {
  /** Defaults to `digital`. `long` produces phrases such as "1 minute, 5 seconds". */
  style?: DurationTextStyle | undefined;
  /**
   * Digital only: a reference time (typically the media duration) that keeps the layout stable.
   * Hours appear when it is at least one hour; minutes pad when it is at least ten minutes.
   */
  guide?: number | undefined;
  /** Overrides the service locale for this call. */
  locale?: string | string[] | undefined;
}

/** Sign and unsigned body, so a presentation can place or style the sign separately. */
export interface DurationTextParts {
  /** `-` for negative finite input, otherwise empty. */
  sign: '' | '-';
  /** The absolute duration text. */
  text: string;
}

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clock(seconds: number): { hours: number; minutes: number; seconds: number } {
  const total = Math.floor(Math.abs(seconds));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function digitalText(seconds: number, guide: number | undefined, locale: LocaleInput): string {
  const parts = clock(seconds);
  const guideSeconds = finite(guide) ? Math.abs(guide) : 0;
  const showHours = parts.hours > 0 || guideSeconds >= 3600;
  const padMinutes = showHours || guideSeconds >= 600;
  const digits = numberFormatter(locale, { useGrouping: false });
  const padded = numberFormatter(locale, { useGrouping: false, minimumIntegerDigits: 2 });
  const body = `${(padMinutes ? padded : digits).format(parts.minutes)}:${padded.format(parts.seconds)}`;
  return showHours ? `${digits.format(parts.hours)}:${body}` : body;
}

function phraseText(seconds: number, style: DurationStyle, locale: LocaleInput): string {
  const parts = clock(seconds);
  const record: DurationRecord = {};
  if (parts.hours > 0) record.hours = parts.hours;
  if (parts.minutes > 0) record.minutes = parts.minutes;
  if (parts.seconds > 0) record.seconds = parts.seconds;
  // Platform DurationFormat omits zero units entirely; a zero duration still names its seconds.
  if (!parts.hours && !parts.minutes && !parts.seconds)
    return numberFormatter(locale, { style: 'unit', unit: 'second', unitDisplay: style }).format(0);
  return durationFormatter(locale, style).format(record);
}

/**
 * Formats a time in seconds and returns its sign separately.
 *
 * Digital: invalid input renders `0:00`; hours appear when the value or `guide` is at least one
 * hour and are not zero-padded; minutes pad when hours are shown or `guide` is at least ten minutes;
 * seconds always use two digits; digits come from `Intl.NumberFormat` for the locale.
 *
 * Unit styles: `Intl.DurationFormat` when available, otherwise unit-style `Intl.NumberFormat`
 * joined by `Intl.ListFormat`. Invalid input renders an empty body.
 */
export function formatDurationParts(
  seconds: number,
  options: DurationTextOptions = {},
  defaultLocale?: string | string[],
): DurationTextParts {
  const style = options.style ?? 'digital';
  const locale = options.locale ?? defaultLocale;
  if (!finite(seconds)) return { sign: '', text: style === 'digital' ? '0:00' : '' };
  const sign = seconds < 0 ? '-' : '';
  return {
    sign,
    text:
      style === 'digital'
        ? digitalText(seconds, options.guide, locale)
        : phraseText(seconds, style, locale),
  };
}

/**
 * Digital text includes a leading `-` for negative input (Video.js `formatTime`). Spoken styles
 * return the absolute phrase: wrap it with a messages-dictionary entry such as
 * "{duration} remaining" rather than relying on locale selection.
 */
export function formatDuration(
  seconds: number,
  options: DurationTextOptions = {},
  defaultLocale?: string | string[],
): string {
  const { sign, text } = formatDurationParts(seconds, options, defaultLocale);
  return (options.style ?? 'digital') === 'digital' ? `${sign}${text}` : text;
}

/** ISO 8601 duration for a `<time datetime>` value, e.g. `PT1M30S`; invalid input is `PT0S`. */
export function secondsToIsoDuration(seconds: number): string {
  if (!finite(seconds)) return 'PT0S';
  const { hours, minutes, seconds: rest } = clock(seconds);
  let text = 'PT';
  if (hours > 0) text += `${hours}H`;
  if (minutes > 0) text += `${minutes}M`;
  if (rest > 0 || text === 'PT') text += `${rest}S`;
  return text;
}
