import { dateTimeFormatter } from './date-locale.js';

/** How a calendar selects dates: one date, several dates, or a start-to-end range. */
export type CalendarSelectionMode = 'single' | 'multiple' | 'range';

/**
 * A selected date range as ISO date strings; `to` is absent while only the start has been picked.
 */
export interface CalendarRange {
  from: string;
  to?: string;
}

/**
 * A calendar's selection: an ISO date string in single mode, a list in multiple mode, a range in
 * range mode, or `undefined` when nothing is selected.
 */
export type CalendarValue = string | string[] | CalendarRange | undefined;

/**
 * A date split into its fields in the adapter's calendar, as returned by `CalendarAdapter.parts()`.
 */
export interface CalendarDateParts {
  calendar: string;
  era?: string;
  year: number;
  month: number;
  day: number;
}

/**
 * Date arithmetic and field access for one calendar system, working on ISO date strings; calendar
 * components use it for every navigation and comparison.
 */
export interface CalendarAdapter {
  readonly calendar: string;
  normalize(date: string): string | null;
  parts(date: string): CalendarDateParts;
  compare(left: string, right: string): number;
  addDays(date: string, amount: number): string;
  addMonths(date: string, amount: number): string;
  addYears(date: string, amount: number): string;
  differenceInDays(later: string, earlier: string): number;
  startOfMonth(date: string): string;
  dayOfWeek(date: string): number;
  format(date: string, locale: string | undefined, style: 'day' | 'month' | 'accessible'): string;
  /**
   * The column label of a weekday: `short` (the default) is an abbreviation that fits a day cell,
   * `narrow` the locale's shortest form, usually one character, for cells too small for it.
   */
  weekdayLabel(dayOfWeek: number, locale: string | undefined, width?: 'short' | 'narrow'): string;
  /**
   * The label of a date's month without its year: `long` (March), `short` (Mar) or `narrow`
   * (M). Without it, labels fall back to `format(date, locale, 'month')`.
   */
  monthLabel?(date: string, locale: string | undefined, width: CalendarLabelWidth): string;
  weekNumber?(date: string, weekStartsOn: number, minimalDays: number): number;
}

/** Label forms, from the full name to the locale's shortest form. */
export type CalendarLabelWidth = 'long' | 'short' | 'narrow';

/**
 * Dates a policy applies to: a set of ISO dates or a predicate of one. Undefined matches no date.
 */
export type CalendarDateMatcher = ReadonlySet<string> | ((date: string) => boolean) | undefined;

/**
 * The order selection walks: the keys it accepts, their order, the number of steps between two
 * keys and the key a number of steps away. A calendar adapter is one, over days; a date-keyed grid
 * passes its own over its cells.
 */
export type CalendarSelectionOrder = Pick<
  CalendarAdapter,
  'normalize' | 'compare' | 'differenceInDays' | 'addDays'
>;

export interface CalendarSelectionRequest {
  mode: CalendarSelectionMode;
  current: CalendarValue;
  date: string;
  adapter: CalendarSelectionOrder;
  required: boolean;
  minimumSelectionCount: number;
  maximumSelectionCount: number;
  minimumNights: number;
  maximumNights: number;
  rangeExclusion: 'reject' | 'restart';
  isExcluded(date: string): boolean;
}

export interface CalendarSelectionResult {
  accepted: boolean;
  value: CalendarValue;
}

export const gregorianCalendarAdapter: CalendarAdapter = {
  calendar: 'gregory',
  normalize(date) {
    const parts = parseIsoDate(date);
    return parts ? formatIsoDate(parts.year, parts.month, parts.day) : null;
  },
  parts(date) {
    const parts = requireIsoDate(date);
    return { calendar: 'gregory', ...parts };
  },
  compare(left, right) {
    return civilToDay(requireIsoDate(left)) - civilToDay(requireIsoDate(right));
  },
  addDays(date, amount) {
    return formatCivil(dayToCivil(civilToDay(requireIsoDate(date)) + amount));
  },
  addMonths(date, amount) {
    const parts = requireIsoDate(date);
    const monthIndex = parts.year * 12 + parts.month - 1 + amount;
    const year = floorDiv(monthIndex, 12);
    const month = modulo(monthIndex, 12) + 1;
    return formatIsoDate(year, month, Math.min(parts.day, daysInGregorianMonth(year, month)));
  },
  addYears(date, amount) {
    const parts = requireIsoDate(date);
    const year = parts.year + amount;
    return formatIsoDate(
      year,
      parts.month,
      Math.min(parts.day, daysInGregorianMonth(year, parts.month)),
    );
  },
  differenceInDays(later, earlier) {
    return civilToDay(requireIsoDate(later)) - civilToDay(requireIsoDate(earlier));
  },
  startOfMonth(date) {
    const parts = requireIsoDate(date);
    return formatIsoDate(parts.year, parts.month, 1);
  },
  dayOfWeek(date) {
    return modulo(civilToDay(requireIsoDate(date)) + 4, 7);
  },
  format(date, locale, style) {
    const parts = requireIsoDate(date);
    const instant = new Date(0);
    instant.setUTCFullYear(parts.year, parts.month - 1, parts.day);
    const options: Intl.DateTimeFormatOptions =
      style === 'day'
        ? { day: 'numeric', timeZone: 'UTC' }
        : style === 'month'
          ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
          : { dateStyle: 'full', timeZone: 'UTC' };
    return dateTimeFormatter(locale, { ...options, calendar: 'gregory' }).format(instant);
  },
  weekNumber(date, weekStartsOn, minimalDays) {
    const year = this.parts(date).year;
    const firstWeek = (year: number) => {
      const first = formatIsoDate(year, 1, minimalDays);
      return this.addDays(first, -modulo(this.dayOfWeek(first) - weekStartsOn, 7));
    };
    let start = firstWeek(year);
    if (this.compare(date, start) < 0) start = firstWeek(year - 1);
    else if (this.compare(date, firstWeek(year + 1)) >= 0) start = firstWeek(year + 1);
    return Math.floor(this.differenceInDays(date, start) / 7) + 1;
  },
  weekdayLabel(dayOfWeek, locale, width = 'short') {
    return gregorianWeekdayLabels(locale, width)[modulo(dayOfWeek, 7)]!;
  },
  monthLabel(date, locale, width) {
    const parts = requireIsoDate(date);
    const instant = new Date(0);
    instant.setUTCFullYear(parts.year, parts.month - 1, 1);
    return dateTimeFormatter(locale, {
      calendar: 'gregory',
      month: width,
      timeZone: 'UTC',
    }).format(instant);
  },
};

/** A date's month label in the requested form, through the adapter's own labels when it has them. */
export function calendarMonthLabel(
  adapter: CalendarAdapter,
  date: string,
  locale: string | undefined,
  width: CalendarLabelWidth,
): string {
  return adapter.monthLabel?.(date, locale, width) ?? adapter.format(date, locale, 'month');
}

interface LocaleWeekInfo {
  firstDay: number;
  minimalDays: number;
}

type LocaleWithWeekInfo = Intl.Locale & {
  weekInfo?: Partial<LocaleWeekInfo>;
  getWeekInfo?: () => Partial<LocaleWeekInfo>;
};

/** The locale's week rules: first day (0 = Sunday) and the minimal days of a year's first week. */
export function localeWeekInfo(locale: string | undefined): LocaleWeekInfo {
  try {
    const value = new Intl.Locale(locale || 'en-US') as LocaleWithWeekInfo;
    const info = value.getWeekInfo?.() ?? value.weekInfo;
    return { firstDay: (info?.firstDay ?? 0) % 7, minimalDays: info?.minimalDays ?? 1 };
  } catch {
    return { firstDay: 0, minimalDays: 1 };
  }
}

/** An explicit week start from 0 (Sunday) to 6, or the locale's when it is out of that range. */
export function resolveWeekStart(weekStartsOn: number, locale: string | undefined): number {
  return Number.isInteger(weekStartsOn) && weekStartsOn >= 0 && weekStartsOn <= 6
    ? weekStartsOn
    : localeWeekInfo(locale).firstDay;
}

/** Today's date in the local time zone, as an ISO date. */
export function todayCalendarDate(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** The first day of the week holding `date`. */
export function startOfWeek(date: string, weekStartsOn: number, adapter: CalendarAdapter): string {
  return adapter.addDays(date, -modulo(adapter.dayOfWeek(date) - weekStartsOn, 7));
}

/** Whether a date matcher covers `date`. */
export function matchesCalendarDate(matcher: CalendarDateMatcher, date: string): boolean {
  return typeof matcher === 'function' ? matcher(date) : Boolean(matcher?.has(date));
}

/**
 * The complete weeks covering `start` to `end` (inclusive), each its seven consecutive dates from
 * the week start; days of the first and last week outside the range are included.
 */
export function calendarWeeks(
  start: string,
  end: string,
  weekStartsOn: number,
  adapter: CalendarAdapter,
): string[][] {
  const first = startOfWeek(start, weekStartsOn, adapter);
  const count = Math.max(0, Math.floor(adapter.differenceInDays(end, first) / 7) + 1);
  return Array.from({ length: count }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => adapter.addDays(first, week * 7 + day)),
  );
}

const weekdayLabelCache = new Map<string, readonly string[]>();

/**
 * Short weekday labels, or the locale's narrow labels when any short label is longer
 * than an abbreviation (for example Arabic, Hebrew and Thai full names), so a column
 * header fits a day cell; `narrow` always gives the narrow labels. One form is used for the
 * whole week.
 */
function gregorianWeekdayLabels(
  locale: string | undefined,
  width: 'short' | 'narrow',
): readonly string[] {
  const key = `${width}:${locale ?? ''}`;
  const cached = weekdayLabelCache.get(key);
  if (cached) return cached;
  const format = (weekday: 'short' | 'narrow') => {
    const formatter = dateTimeFormatter(locale, { weekday, timeZone: 'UTC' });
    return Array.from({ length: 7 }, (_, day) =>
      formatter.format(new Date(Date.UTC(2021, 7, 1 + day))),
    );
  };
  const short = width === 'narrow' ? [] : format('short');
  const labels =
    width === 'narrow' || short.some((label) => [...label.replace(/\.$/u, '')].length > 4)
      ? format('narrow')
      : short;
  weekdayLabelCache.set(key, labels);
  return labels;
}

export function normalizeCalendarValue(
  mode: CalendarSelectionMode,
  value: CalendarValue,
  adapter: CalendarSelectionOrder,
): CalendarValue {
  if (mode === 'single') {
    const candidate = typeof value === 'string' ? value : undefined;
    return candidate ? (adapter.normalize(candidate) ?? undefined) : undefined;
  }
  if (mode === 'multiple') {
    const candidates = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return [
      ...new Set(
        candidates
          .map((candidate) => adapter.normalize(candidate))
          .filter((candidate): candidate is string => candidate !== null),
      ),
    ].sort(adapter.compare);
  }
  if (!isCalendarRange(value)) return undefined;
  const from = adapter.normalize(value.from);
  const to = value.to ? adapter.normalize(value.to) : null;
  if (!from) return undefined;
  if (!to) return { from };
  return adapter.compare(from, to) <= 0 ? { from, to } : { from: to, to: from };
}

export function sameCalendarValue(
  mode: CalendarSelectionMode,
  left: CalendarValue,
  right: CalendarValue,
  adapter: CalendarSelectionOrder,
): boolean {
  const normalizedLeft = normalizeCalendarValue(mode, left, adapter);
  const normalizedRight = normalizeCalendarValue(mode, right, adapter);
  if (mode === 'single') return normalizedLeft === normalizedRight;
  if (mode === 'multiple') {
    const leftDates = normalizedLeft as string[];
    const rightDates = normalizedRight as string[];
    return (
      leftDates.length === rightDates.length &&
      leftDates.every((date, index) => date === rightDates[index])
    );
  }
  const leftRange = normalizedLeft as CalendarRange | undefined;
  const rightRange = normalizedRight as CalendarRange | undefined;
  return leftRange?.from === rightRange?.from && leftRange?.to === rightRange?.to;
}

export function calendarSelectionProposal(
  request: CalendarSelectionRequest,
): CalendarSelectionResult {
  const date = request.adapter.normalize(request.date);
  if (!date || request.isExcluded(date)) return { accepted: false, value: request.current };
  const current = normalizeCalendarValue(request.mode, request.current, request.adapter);

  if (request.mode === 'single') {
    return { accepted: current !== date, value: date };
  }

  if (request.mode === 'multiple') {
    const dates = [...((current as string[]) ?? [])];
    const index = dates.indexOf(date);
    if (index >= 0) {
      if (request.required && dates.length === 1) return { accepted: false, value: current };
      if (dates.length <= request.minimumSelectionCount) return { accepted: false, value: current };
      dates.splice(index, 1);
    } else {
      if (dates.length >= request.maximumSelectionCount) return { accepted: false, value: current };
      dates.push(date);
      dates.sort(request.adapter.compare);
    }
    return { accepted: true, value: dates };
  }

  const range = current as CalendarRange | undefined;
  if (!range || range.to) return { accepted: true, value: { from: date } };
  const order = request.adapter.compare(date, range.from);
  if (order < 0) return { accepted: true, value: { from: date } };

  const nights = request.adapter.differenceInDays(date, range.from);
  const validLength = nights >= request.minimumNights && nights <= request.maximumNights;
  const validDates = validLength && !rangeContainsExcluded(range.from, date, request);
  if (validDates) return { accepted: true, value: { from: range.from, to: date } };
  if (request.rangeExclusion === 'restart') return { accepted: true, value: { from: date } };
  return { accepted: false, value: current };
}

export function calendarGridDates(
  month: string,
  weekStartsOn: number,
  adapter: CalendarAdapter,
  fixedWeeks = true,
): string[] {
  const start = adapter.startOfMonth(month);
  const last = adapter.addDays(adapter.addMonths(start, 1), -1);
  const weeks = calendarWeeks(start, last, weekStartsOn, adapter);
  if (fixedWeeks)
    while (weeks.length < 6)
      weeks.push(
        Array.from({ length: 7 }, (_, day) => adapter.addDays(weeks.at(-1)![6]!, day + 1)),
      );
  return weeks.flat();
}

export function calendarValueDates(
  mode: CalendarSelectionMode,
  value: CalendarValue,
  adapter: CalendarSelectionOrder,
): string[] {
  const normalized = normalizeCalendarValue(mode, value, adapter);
  if (typeof normalized === 'string') return [normalized];
  if (Array.isArray(normalized)) return normalized;
  if (!normalized) return [];
  return normalized.to ? [normalized.from, normalized.to] : [normalized.from];
}

export function isCalendarRange(value: CalendarValue): value is CalendarRange {
  return Boolean(value && !Array.isArray(value) && typeof value === 'object' && value.from);
}

function rangeContainsExcluded(
  from: string,
  to: string,
  request: CalendarSelectionRequest,
): boolean {
  const nights = request.adapter.differenceInDays(to, from);
  for (let offset = 1; offset < nights; offset += 1) {
    if (request.isExcluded(request.adapter.addDays(from, offset))) return true;
  }
  return false;
}

function parseIsoDate(date: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(date);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > daysInGregorianMonth(year, month)) return null;
  return { year, month, day };
}

function requireIsoDate(date: string): { year: number; month: number; day: number } {
  const parts = parseIsoDate(date);
  if (!parts) throw new RangeError(`Invalid Gregorian calendar date: ${date}`);
  return parts;
}

function daysInGregorianMonth(year: number, month: number): number {
  if (month === 2) return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function civilToDay(parts: { year: number; month: number; day: number }): number {
  const adjustedYear = parts.year - (parts.month <= 2 ? 1 : 0);
  const era = floorDiv(adjustedYear, 400);
  const yearOfEra = adjustedYear - era * 400;
  const adjustedMonth = parts.month + (parts.month > 2 ? -3 : 9);
  const dayOfYear = Math.floor((153 * adjustedMonth + 2) / 5) + parts.day - 1;
  const dayOfEra =
    yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146_097 + dayOfEra - 719_468;
}

function dayToCivil(day: number): { year: number; month: number; day: number } {
  const adjusted = day + 719_468;
  const era = floorDiv(adjusted, 146_097);
  const dayOfEra = adjusted - era * 146_097;
  const yearOfEra = Math.floor(
    (dayOfEra -
      Math.floor(dayOfEra / 1460) +
      Math.floor(dayOfEra / 36_524) -
      Math.floor(dayOfEra / 146_096)) /
      365,
  );
  let year = yearOfEra + era * 400;
  const dayOfYear =
    dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const monthPiece = Math.floor((5 * dayOfYear + 2) / 153);
  const resultDay = dayOfYear - Math.floor((153 * monthPiece + 2) / 5) + 1;
  const month = monthPiece + (monthPiece < 10 ? 3 : -9);
  year += month <= 2 ? 1 : 0;
  return { year, month, day: resultDay };
}

function formatCivil(parts: { year: number; month: number; day: number }): string {
  return formatIsoDate(parts.year, parts.month, parts.day);
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function floorDiv(value: number, divisor: number): number {
  return Math.floor(value / divisor);
}

function modulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}
