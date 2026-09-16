export type CalendarSelectionMode = 'single' | 'multiple' | 'range';

export interface CalendarRange {
  from: string;
  to?: string;
}

export type CalendarValue = string | string[] | CalendarRange | undefined;

export interface CalendarDateParts {
  calendar: string;
  era?: string;
  year: number;
  month: number;
  day: number;
}

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
  weekdayLabel(dayOfWeek: number, locale: string | undefined): string;
}

export interface CalendarSelectionRequest {
  mode: CalendarSelectionMode;
  current: CalendarValue;
  date: string;
  adapter: CalendarAdapter;
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
    const instant = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
    const options: Intl.DateTimeFormatOptions =
      style === 'day'
        ? { day: 'numeric', timeZone: 'UTC' }
        : style === 'month'
          ? { month: 'long', year: 'numeric', timeZone: 'UTC' }
          : { dateStyle: 'full', timeZone: 'UTC' };
    return new Intl.DateTimeFormat(locale, options).format(instant);
  },
  weekdayLabel(dayOfWeek, locale) {
    const instant = new Date(Date.UTC(2021, 7, 1 + dayOfWeek));
    return new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone: 'UTC' }).format(instant);
  },
};

export function normalizeCalendarValue(
  mode: CalendarSelectionMode,
  value: CalendarValue,
  adapter: CalendarAdapter,
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
  adapter: CalendarAdapter,
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
): string[] {
  const start = adapter.startOfMonth(month);
  const offset = modulo(adapter.dayOfWeek(start) - weekStartsOn, 7);
  const first = adapter.addDays(start, -offset);
  return Array.from({ length: 42 }, (_, index) => adapter.addDays(first, index));
}

export function calendarValueDates(
  mode: CalendarSelectionMode,
  value: CalendarValue,
  adapter: CalendarAdapter,
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
