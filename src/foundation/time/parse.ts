/** Best-effort time input resolution that preserves the precision of the supplied value. */
export type TimeKind =
  | 'instant'
  | 'local-datetime'
  | 'date'
  | 'month'
  | 'year'
  | 'yearless'
  | 'week'
  | 'time'
  | 'duration';

export interface TimeDuration {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface ResolvedTime {
  readonly kind: TimeKind;
  /** Epoch milliseconds; present for `instant`. */
  readonly instant?: number;
  /** Wall-clock fields encoded as UTC epoch milliseconds; present for zone-less kinds. */
  readonly wall?: number;
  /** ISO week number; present for `week`. */
  readonly week?: number;
  readonly duration?: TimeDuration;
  /** Valid time-element datetime value, or an empty string when none can express it. */
  readonly machine: string;
  /** True when only the host best-effort parser accepted the input. */
  readonly loose: boolean;
}

/** An instant object, epoch number, text, or a Temporal-like object. */
export type TimeInput =
  | Date
  | number
  | string
  | { readonly epochMilliseconds: number }
  | { toString(): string }
  | null
  | undefined;

export interface TimeResolveOptions {
  /** Reject values only the host best-effort parser accepts. */
  strict?: boolean;
}

const maximumEpoch = 8.64e15;
const pad = (value: number, length = 2) => String(value).padStart(length, '0');

/** UTC epoch for civil fields without the two-digit-year mapping of Date.UTC. */
export function civilEpoch(
  year: number,
  month = 1,
  day = 1,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
): number {
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, millisecond);
  return date.getTime();
}

const daysInMonth = (year: number, month: number) =>
  new Date(civilEpoch(year, month + 1, 0)).getUTCDate();
const validDate = (year: number, month: number, day: number) =>
  year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
const validTime = (hour: number, minute: number, second: number) =>
  hour <= 23 && minute <= 59 && second <= 59;

/** ISO weeks in a year: 53 when January 1 is a Thursday, or a Wednesday in a leap year. */
export function isoWeeksInYear(year: number): number {
  const jan1 = new Date(civilEpoch(year, 1, 1)).getUTCDay();
  const leap = daysInMonth(year, 2) === 29;
  return jan1 === 4 || (leap && jan1 === 3) ? 53 : 52;
}
/** Monday of an ISO week as a wall-clock epoch. */
export function isoWeekStart(year: number, week: number): number {
  const jan4 = civilEpoch(year, 1, 4);
  const day = new Date(jan4).getUTCDay() || 7;
  return jan4 - (day - 1) * 86_400_000 + (week - 1) * 604_800_000;
}

function instant(milliseconds: number, loose = false): ResolvedTime | null {
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > maximumEpoch) return null;
  const iso = new Date(milliseconds).toISOString();
  return {
    kind: 'instant',
    instant: milliseconds,
    // HTML global date-times require a positive year without a sign.
    machine: /^\d{4}-/.test(iso) && !iso.startsWith('0000') ? iso : '',
    loose,
  };
}

/** Epoch seconds below 1e11 (until year 5138), otherwise milliseconds. */
function epoch(value: number): ResolvedTime | null {
  if (!Number.isFinite(value)) return null;
  return instant(Math.abs(value) < 1e11 ? value * 1000 : value);
}

const time = String.raw`(\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?`;
const date = String.raw`(\d{4,})-(\d{2})-(\d{2})`;
const offset = String.raw`(Z|[+-]\d{2}(?::?\d{2})?)`;
const patterns = {
  year: /^(\d{4,8})$/,
  month: /^(\d{4,})-(\d{2})$/,
  date: new RegExp(`^${date}$`),
  yearless: /^(?:--)?(\d{2})-(\d{2})$/,
  week: /^(\d{4,})-W(\d{2})$/i,
  time: new RegExp(`^${time}$`),
  dateTime: new RegExp(`^${date}[T ]${time}${offset}?$`, 'i'),
};

function fraction(text: string | undefined): number {
  return text ? Math.floor(Number(`0.${text}`) * 1000) : 0;
}

function microsyntax(text: string): ResolvedTime | null {
  let match = patterns.dateTime.exec(text);
  if (match) {
    const [, y, mo, d, h, mi, s, f, zone] = match;
    const [year, month, day, hour, minute] = [y, mo, d, h, mi].map(Number) as [
      number,
      number,
      number,
      number,
      number,
    ];
    const second = Number(s ?? 0);
    if (!validDate(year, month, day) || !validTime(hour, minute, second)) return null;
    const wall = civilEpoch(year, month, day, hour, minute, second, fraction(f));
    const machineTime = `${pad(hour)}:${pad(minute)}${s ? `:${s}${f ? `.${f.slice(0, 3)}` : ''}` : ''}`;
    const machineDate = `${y}-${mo}-${d}`;
    if (!zone)
      return {
        kind: 'local-datetime',
        wall,
        machine: `${machineDate}T${machineTime}`,
        loose: false,
      };
    let offsetMinutes = 0;
    if (zone.toUpperCase() !== 'Z') {
      const digits = zone.slice(1).replace(':', '');
      const hours = Number(digits.slice(0, 2));
      const minutes = Number(digits.slice(2) || 0);
      if (hours > 23 || minutes > 59) return null;
      offsetMinutes = (zone.startsWith('-') ? -1 : 1) * (hours * 60 + minutes);
    }
    const resolved = instant(wall - offsetMinutes * 60_000);
    if (!resolved) return null;
    const machineZone =
      zone.toUpperCase() === 'Z'
        ? 'Z'
        : `${zone[0]}${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
    return { ...resolved, machine: `${machineDate}T${machineTime}${machineZone}` };
  }
  if ((match = patterns.date.exec(text))) {
    const [year, month, day] = match.slice(1).map(Number) as [number, number, number];
    if (!validDate(year, month, day)) return null;
    return { kind: 'date', wall: civilEpoch(year, month, day), machine: text, loose: false };
  }
  if ((match = patterns.time.exec(text))) {
    const [, h, mi, s, f] = match;
    const [hour, minute, second] = [h, mi, s ?? '0'].map(Number) as [number, number, number];
    if (!validTime(hour, minute, second)) return null;
    return {
      kind: 'time',
      wall: civilEpoch(1970, 1, 1, hour, minute, second, fraction(f)),
      machine: `${h}:${mi}${s ? `:${s}${f ? `.${f.slice(0, 3)}` : ''}` : ''}`,
      loose: false,
    };
  }
  if ((match = patterns.month.exec(text))) {
    const [year, month] = match.slice(1).map(Number) as [number, number];
    if (!validDate(year, month, 1)) return null;
    return { kind: 'month', wall: civilEpoch(year, month), machine: text, loose: false };
  }
  if ((match = patterns.week.exec(text))) {
    const [year, week] = match.slice(1).map(Number) as [number, number];
    if (year < 1 || week < 1 || week > isoWeeksInYear(year)) return null;
    return {
      kind: 'week',
      wall: isoWeekStart(year, week),
      week,
      machine: `${match[1]}-W${match[2]}`,
      loose: false,
    };
  }
  if ((match = patterns.yearless.exec(text))) {
    const [month, day] = match.slice(1).map(Number) as [number, number];
    // Leap year so 02-29 remains a valid yearless date.
    if (!validDate(2000, month, day)) return null;
    return {
      kind: 'yearless',
      wall: civilEpoch(2000, month, day),
      machine: `${match[1]}-${match[2]}`,
      loose: false,
    };
  }
  if ((match = patterns.year.exec(text))) {
    const year = Number(match[1]);
    if (year < 1) return null;
    return { kind: 'year', wall: civilEpoch(year), machine: text, loose: false };
  }
  return null;
}

const isoDuration =
  /^P(?!$)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:[.,]\d+)?)S)?)?$/i;
const componentDuration = /^(?:\s*\d+(?:\.\d+)?\s*[wdhms]\s*)+$/i;

/** HTML/ISO 8601 duration text, or null. */
export function parseDuration(text: string): TimeDuration | null {
  const trimmed = text.trim();
  const iso = isoDuration.exec(trimmed);
  if (iso) {
    const [years, months, weeks, days, hours, minutes] = iso
      .slice(1, 7)
      .map((v) => Number(v ?? 0)) as [number, number, number, number, number, number];
    return {
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds: Number((iso[7] ?? '0').replace(',', '.')),
    };
  }
  if (!trimmed || !componentDuration.test(trimmed)) return null;
  const duration: TimeDuration = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  const field = { w: 'weeks', d: 'days', h: 'hours', m: 'minutes', s: 'seconds' } as const;
  for (const [, value, unit] of trimmed.matchAll(/(\d+(?:\.\d+)?)\s*([wdhms])/gi))
    duration[field[unit!.toLowerCase() as keyof typeof field]] += Number(value);
  return duration;
}

/** Milliseconds for a duration without calendar-dependent year or month components. */
export function durationMilliseconds(duration: TimeDuration): number {
  return (
    duration.weeks * 604_800_000 +
    duration.days * 86_400_000 +
    duration.hours * 3_600_000 +
    duration.minutes * 60_000 +
    duration.seconds * 1000
  );
}

function durationMachine(duration: TimeDuration): string {
  if (duration.years || duration.months) return '';
  const days = duration.weeks * 7 + duration.days;
  const clock = `${duration.hours ? `${duration.hours}H` : ''}${duration.minutes ? `${duration.minutes}M` : ''}${duration.seconds ? `${+duration.seconds.toFixed(3)}S` : ''}`;
  return !days && !clock ? 'PT0S' : `P${days ? `${days}D` : ''}${clock ? `T${clock}` : ''}`;
}

const internetMessageDate =
  /^(?:[a-z]{3},\s*)?\d{1,2}\s+[a-z]{3}\s+\d{2,4}\s+\d{2}:\d{2}(?::\d{2})?(?:\s*(?:[+-]\d{4}|[a-z]{1,5}))?$/i;

/** Resolve one value in the order required by the Time behavior contract. */
export function resolveTime(
  input: TimeInput,
  options: TimeResolveOptions = {},
): ResolvedTime | null {
  if (input === null || input === undefined) return null;
  if (Object.prototype.toString.call(input) === '[object Date]')
    return instant((input as Date).getTime());
  if (typeof input === 'number') return epoch(input);
  if (typeof input === 'object') {
    const milliseconds = (input as { epochMilliseconds?: unknown }).epochMilliseconds;
    if (typeof milliseconds === 'number') return instant(milliseconds);
  }
  const text = String(input).trim();
  if (!text) return null;
  const epochText = /^(@)?(-?\d+)$/.exec(text);
  if (epochText && (epochText[1] || /^-?\d{9,13}$/.test(epochText[2]!)))
    return epoch(Number(epochText[2]));
  const value = microsyntax(text);
  if (value) return value;
  const duration = parseDuration(text);
  if (duration)
    return { kind: 'duration', duration, machine: durationMachine(duration), loose: false };
  if (internetMessageDate.test(text)) {
    const parsed = instant(Date.parse(text));
    if (parsed) return parsed;
  }
  if (options.strict) return null;
  return instant(Date.parse(text), true);
}
