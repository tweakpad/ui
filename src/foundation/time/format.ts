import { dateTimeFormatter, durationFormatter, relativeTimeFormatter } from '../date-locale.js';
import { numberFormatter } from '../intl.js';
import { civilEpoch, type ResolvedTime, type TimeDuration } from './parse.js';

export type TimeMode = 'auto' | 'relative' | 'calendar' | 'absolute' | 'duration';
export type TimePreset =
  | 'time'
  | 'time-seconds'
  | 'date'
  | 'date-medium'
  | 'date-long'
  | 'datetime'
  | 'datetime-long'
  | 'full'
  | 'iso';
export type TimeUnit = 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
export type TimeStyle = 'long' | 'short' | 'narrow';
export type TimeTense = 'auto' | 'past' | 'future';
export type TimeRounding = 'floor' | 'round';
export type TimeHourCycle = 'h11' | 'h12' | 'h23' | 'h24';
export type TimePresentationKind = 'relative' | 'calendar' | 'absolute' | 'duration';

export interface TimeFormatContext {
  readonly value: ResolvedTime;
  /** The instant, or the wall-clock fields in host local time for zone-less values. */
  readonly date: Date | null;
  readonly reference: number;
  readonly locale: string | undefined;
  readonly timeZone: string | undefined;
}
export type TimeMessage = string | ((context: TimeMessageContext) => string);
export interface TimeMessageContext extends TimeFormatContext {
  readonly time: string;
  readonly weekday: string;
  readonly formattedDate: string;
  readonly week: number;
  readonly year: number;
}
export interface TimeMessages {
  today: TimeMessage;
  yesterday: TimeMessage;
  tomorrow: TimeMessage;
  lastWeekday: TimeMessage;
  nextWeekday: TimeMessage;
  week: TimeMessage;
}
export const defaultTimeMessages: TimeMessages = {
  today: 'Today at {time}',
  yesterday: 'Yesterday at {time}',
  tomorrow: 'Tomorrow at {time}',
  lastWeekday: 'Last {weekday} at {time}',
  nextWeekday: '{weekday} at {time}',
  week: 'Week {week}, {year}',
};

export interface TimeFormatOptions {
  locale?: string | undefined;
  timeZone?: string | undefined;
  hourCycle?: TimeHourCycle | undefined;
  mode?: TimeMode;
  /** Milliseconds below which `auto` presents relative text. */
  threshold?: number;
  preset?: TimePreset;
  pattern?: string | undefined;
  format?: Intl.DateTimeFormatOptions | undefined;
  formatter?: ((context: TimeFormatContext) => string) | undefined;
  relativeStyle?: TimeStyle;
  numeric?: 'auto' | 'always';
  tense?: TimeTense;
  precision?: TimeUnit;
  rounding?: TimeRounding;
  /** Milliseconds presented as the present moment. */
  nowThreshold?: number;
  messages?: Partial<TimeMessages> | undefined;
}

export interface TimeText {
  readonly text: string;
  /** Long-form text when the visible text is abbreviated; otherwise equal to text. */
  readonly accessibleText: string;
  readonly presentation: TimePresentationKind;
  /** Milliseconds until the text can next change; undefined when it cannot. */
  readonly nextChange: number | undefined;
  readonly diagnostics: readonly string[];
}

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const units: readonly TimeUnit[] = ['second', 'minute', 'hour', 'day', 'week', 'month', 'year'];
const unitLength: Record<TimeUnit, number> = {
  second,
  minute,
  hour,
  day,
  week: 7 * day,
  month: 30.436875 * day,
  year: 365.2425 * day,
};
/** Exclusive upper boundary for each unit. */
const unitBoundary: Record<TimeUnit, number> = {
  second: minute,
  minute: hour,
  hour: day,
  day: 7 * day,
  week: 30 * day,
  month: 365 * day,
  year: Number.POSITIVE_INFINITY,
};
const maximumDelay = hour;

const isZoneless = (value: ResolvedTime) => value.kind !== 'instant';
const positiveModulo = (value: number, divisor: number) => ((value % divisor) + divisor) % divisor;

/** Wall-clock fields of an instant in a time zone, encoded as UTC epoch milliseconds. */
export function wallClock(instant: number, timeZone?: string): number {
  const parts = dateTimeFormatter('en-US-u-nu-latn-ca-gregory', {
    timeZone,
    hourCycle: 'h23',
    era: 'short',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);
  const field = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const era = parts.find((part) => part.type === 'era')?.value;
  const year = era === 'BC' ? 1 - field('year') : field('year');
  return civilEpoch(
    year,
    field('month'),
    field('day'),
    field('hour'),
    field('minute'),
    field('second'),
    positiveModulo(instant, second),
  );
}

function wallOf(value: ResolvedTime, timeZone: string | undefined): number {
  return value.kind === 'instant' ? wallClock(value.instant!, timeZone) : value.wall!;
}

/** Locale Intl formatting at the value precision; zone-less values format their own fields. */
function intl(
  value: ResolvedTime,
  options: Intl.DateTimeFormatOptions,
  environment: TimeFormatOptions,
): string {
  const resolved: Intl.DateTimeFormatOptions = { ...options };
  if (
    environment.hourCycle &&
    resolved.hour12 === undefined &&
    resolved.hourCycle === undefined &&
    (resolved.hour !== undefined || resolved.timeStyle !== undefined)
  )
    resolved.hourCycle = environment.hourCycle;
  if (isZoneless(value)) {
    delete resolved.timeZoneName;
    return dateTimeFormatter(environment.locale, { ...resolved, timeZone: 'UTC' }).format(
      value.wall!,
    );
  }
  return dateTimeFormatter(environment.locale, {
    ...resolved,
    timeZone: environment.timeZone,
  }).format(value.instant!);
}

const presetOptions: Record<Exclude<TimePreset, 'iso'>, Intl.DateTimeFormatOptions> = {
  time: { hour: 'numeric', minute: '2-digit' },
  'time-seconds': { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  date: { dateStyle: 'short' },
  'date-medium': { dateStyle: 'medium' },
  'date-long': { dateStyle: 'long' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
  'datetime-long': { dateStyle: 'long', timeStyle: 'short' },
  full: { dateStyle: 'full', timeStyle: 'short' },
};

/** Preset options without fields finer, or coarser, than the value precision. */
export function presetFor(
  preset: Exclude<TimePreset, 'iso'>,
  value: ResolvedTime,
): Intl.DateTimeFormatOptions {
  const options = presetOptions[preset];
  const timeOnly = preset === 'time' || preset === 'time-seconds';
  const dateStyle = options.dateStyle ?? 'medium';
  const month = dateStyle === 'short' ? 'numeric' : dateStyle === 'medium' ? 'short' : 'long';
  switch (value.kind) {
    case 'date':
      return timeOnly ? { dateStyle: 'medium' } : { dateStyle };
    case 'time':
      return timeOnly ? options : { timeStyle: 'short' };
    case 'month':
      return { year: 'numeric', month: dateStyle === 'short' ? '2-digit' : month };
    case 'year':
      return { year: 'numeric' };
    case 'yearless':
      return { month, day: 'numeric' };
    default:
      return options;
  }
}

const messageText = (message: TimeMessage, context: TimeMessageContext) =>
  typeof message === 'function'
    ? message(context)
    : message.replace(/\{(time|weekday|date|week|year)\}/g, (_, key: string) =>
        key === 'time'
          ? context.time
          : key === 'weekday'
            ? context.weekday
            : key === 'date'
              ? context.formattedDate
              : String(key === 'week' ? context.week : context.year),
      );

function contextFor(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
): TimeFormatContext {
  let date: Date | null = null;
  if (value.kind === 'instant') date = new Date(value.instant!);
  else if (value.wall !== undefined) {
    const wall = new Date(value.wall);
    date = new Date(
      wall.getUTCFullYear(),
      wall.getUTCMonth(),
      wall.getUTCDate(),
      wall.getUTCHours(),
      wall.getUTCMinutes(),
      wall.getUTCSeconds(),
      wall.getUTCMilliseconds(),
    );
    date.setFullYear(wall.getUTCFullYear());
  }
  return { value, date, reference, locale: environment.locale, timeZone: environment.timeZone };
}

function messageContext(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
): TimeMessageContext {
  const wall = new Date(wallOf(value, environment.timeZone));
  return {
    ...contextFor(value, reference, environment),
    time: value.kind === 'date' ? '' : intl(value, presetOptions.time, environment),
    weekday: intl(value, { weekday: 'long' }, environment),
    formattedDate: intl(value, { dateStyle: 'medium' }, environment),
    week: value.week ?? 0,
    year: wall.getUTCFullYear(),
  };
}

/** Absolute text by precedence: formatter, pattern, format options, then preset. */
export function formatAbsolute(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
  diagnostics: string[] = [],
): string {
  if (value.kind === 'duration') return formatDurationValue(value.duration!, environment);
  if (environment.formatter)
    return environment.formatter(contextFor(value, reference, environment));
  if (environment.pattern)
    return formatPattern(value, environment.pattern, environment, diagnostics);
  if (environment.format) return intl(value, environment.format, environment);
  if (value.kind === 'week')
    return messageText(
      { ...defaultTimeMessages, ...environment.messages }.week,
      messageContext(value, reference, environment),
    );
  const preset = environment.preset ?? 'datetime';
  if (preset === 'iso') return value.machine;
  return intl(value, presetFor(preset, value), environment);
}

const numberText = (value: number, digits: number, locale: string | undefined) =>
  numberFormatter(locale, {
    minimumIntegerDigits: Math.min(Math.max(digits, 1), 21),
    useGrouping: false,
  }).format(value);

function partOf(
  value: ResolvedTime,
  options: Intl.DateTimeFormatOptions,
  type: Intl.DateTimeFormatPartTypes,
  environment: TimeFormatOptions,
): string {
  const zoneless = isZoneless(value);
  return (
    dateTimeFormatter(environment.locale, {
      ...options,
      timeZone: zoneless ? 'UTC' : environment.timeZone,
    })
      .formatToParts(zoneless ? value.wall! : value.instant!)
      .find((part) => part.type === type)?.value ?? ''
  );
}

const unsupportedPatternLetters: Record<string, string> = {
  Y: 'week-numbering year (Y); use y for the calendar year',
  D: 'day of year (D); use d for the day of month',
};

/**
 * Unicode date-field pattern formatting. Quoted text is literal and '' is an apostrophe.
 * Unsupported symbols render literally and report a diagnostic.
 */
export function formatPattern(
  value: ResolvedTime,
  pattern: string,
  environment: TimeFormatOptions,
  diagnostics: string[] = [],
): string {
  const wall = new Date(wallOf(value, environment.timeZone));
  const locale = environment.locale;
  const field = {
    year: wall.getUTCFullYear(),
    month: wall.getUTCMonth() + 1,
    day: wall.getUTCDate(),
    hour: wall.getUTCHours(),
    minute: wall.getUTCMinutes(),
    second: wall.getUTCSeconds(),
    millisecond: wall.getUTCMilliseconds(),
  };
  const zoneOffset =
    value.kind === 'instant'
      ? Math.round((wallOf(value, environment.timeZone) - value.instant!) / minute)
      : null;
  const offsetText = (length: number, zulu: boolean) => {
    if (zoneOffset === null) return '';
    if (zulu && zoneOffset === 0) return 'Z';
    const sign = zoneOffset < 0 ? '-' : '+';
    const hours = String(Math.floor(Math.abs(zoneOffset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(zoneOffset) % 60).padStart(2, '0');
    return length === 1
      ? `${sign}${hours}${minutes === '00' ? '' : minutes}`
      : `${sign}${hours}${length === 2 ? '' : ':'}${minutes}`;
  };
  let output = '';
  for (const [token] of pattern.matchAll(/''|'(?:''|[^'])*(?:'|$)|([A-Za-z])\1*|[^A-Za-z']+/g)) {
    if (token === "''") {
      output += "'";
      continue;
    }
    if (token.startsWith("'")) {
      output += token
        .slice(1, token.endsWith("'") && token.length > 1 ? -1 : undefined)
        .replaceAll("''", "'");
      continue;
    }
    const letter = token[0]!;
    const length = token.length;
    if (!/[A-Za-z]/.test(letter)) {
      output += token;
      continue;
    }
    switch (letter) {
      case 'y':
        output +=
          length === 2
            ? numberText(positiveModulo(field.year, 100), 2, locale)
            : numberText(field.year, length, locale);
        break;
      case 'M':
      case 'L':
        output +=
          length <= 2
            ? numberText(field.month, length, locale)
            : partOf(
                value,
                { month: length === 3 ? 'short' : length === 4 ? 'long' : 'narrow' },
                'month',
                environment,
              );
        break;
      case 'd':
        output += numberText(field.day, length, locale);
        break;
      case 'E':
        output += partOf(
          value,
          { weekday: length <= 3 ? 'short' : length === 4 ? 'long' : 'narrow' },
          'weekday',
          environment,
        );
        break;
      case 'a':
        output += partOf(value, { hour: 'numeric', hourCycle: 'h12' }, 'dayPeriod', environment);
        break;
      case 'h':
        output += numberText(field.hour % 12 || 12, length, locale);
        break;
      case 'H':
        output += numberText(field.hour, length, locale);
        break;
      case 'K':
        output += numberText(field.hour % 12, length, locale);
        break;
      case 'k':
        output += numberText(field.hour || 24, length, locale);
        break;
      case 'm':
        output += numberText(field.minute, length, locale);
        break;
      case 's':
        output += numberText(field.second, length, locale);
        break;
      case 'S':
        output += numberText(
          Math.floor((field.millisecond / 1000) * 10 ** Math.min(length, 3)) *
            10 ** Math.max(0, length - 3),
          length,
          locale,
        );
        break;
      case 'z':
        output +=
          value.kind === 'instant'
            ? partOf(
                value,
                { timeZoneName: length === 4 ? 'long' : 'short' },
                'timeZoneName',
                environment,
              )
            : '';
        break;
      case 'X':
        output += offsetText(Math.min(length, 3), true);
        break;
      case 'x':
        output += offsetText(Math.min(length, 3), false);
        break;
      default:
        diagnostics.push(
          `Unsupported pattern symbol "${token}": ${unsupportedPatternLetters[letter] ?? 'quote literal text with single quotes'}.`,
        );
        output += token;
    }
  }
  return output;
}

export function formatDurationValue(
  duration: TimeDuration,
  environment: TimeFormatOptions,
  style?: TimeStyle,
): string {
  const seconds = Math.floor(duration.seconds);
  return durationFormatter(environment.locale, style ?? environment.relativeStyle ?? 'long').format(
    {
      years: duration.years,
      months: duration.months,
      weeks: duration.weeks,
      days: duration.days,
      hours: duration.hours,
      minutes: duration.minutes,
      seconds,
      milliseconds: Math.round((duration.seconds - seconds) * 1000),
    },
  );
}

interface RelativeParts {
  value: number;
  unit: TimeUnit;
  /** Zero means the present-moment form. */
  now: boolean;
}

function relativeParts(delta: number, environment: TimeFormatOptions): RelativeParts {
  const distance = Math.abs(delta);
  const tense = environment.tense ?? 'auto';
  const nowParts = { value: 0, unit: 'second' as TimeUnit, now: true };
  if ((tense === 'past' && delta > 0) || (tense === 'future' && delta < 0)) return nowParts;
  if (distance < (environment.nowThreshold ?? 10 * second)) return nowParts;
  let index = Math.max(
    units.findIndex((unit) => distance < unitBoundary[unit]),
    units.indexOf(environment.precision ?? 'second'),
  );
  const round = environment.rounding === 'round' ? Math.round : Math.floor;
  let count = round(distance / unitLength[units[index]!]);
  // A rounded count that reaches the boundary promotes to the next unit.
  while (
    index < units.length - 1 &&
    count * unitLength[units[index]!] >= unitBoundary[units[index]!]
  ) {
    index += 1;
    count = round(distance / unitLength[units[index]!]);
  }
  if (count === 0) return nowParts;
  return { value: delta < 0 ? -count : count, unit: units[index]!, now: false };
}

function relativeText(
  parts: RelativeParts,
  environment: TimeFormatOptions,
  style: TimeStyle,
): string {
  if (parts.now)
    return relativeTimeFormatter(environment.locale, { numeric: 'auto', style }).format(
      0,
      'second',
    );
  return relativeTimeFormatter(environment.locale, {
    numeric: environment.numeric ?? 'auto',
    style,
  }).format(parts.value, parts.unit);
}

/** Delay until a relative count or unit can change, rounded to the rounding policy. */
function relativeDelay(
  delta: number,
  parts: RelativeParts,
  environment: TimeFormatOptions,
): number {
  const distance = Math.abs(delta);
  const past = delta <= 0;
  const length = parts.now ? second : unitLength[parts.unit];
  const offset = environment.rounding === 'round' ? length / 2 : 0;
  const phase = positiveModulo(distance + offset, length);
  let delay = past ? length - phase : phase + 1;
  const breakpoints = [
    environment.nowThreshold ?? 10 * second,
    environment.mode === 'auto' ? (environment.threshold ?? 30 * day) : Number.POSITIVE_INFINITY,
    ...units.map((unit) => unitBoundary[unit]),
  ];
  for (const breakpoint of breakpoints) {
    if (!Number.isFinite(breakpoint)) continue;
    const until = past ? breakpoint - distance : distance - breakpoint + 1;
    if (until > 0) delay = Math.min(delay, until);
  }
  return delay;
}

const dayNumber = (wall: number) => Math.floor(wall / day);

function untilMidnight(reference: number, environment: TimeFormatOptions): number {
  return day - positiveModulo(wallClock(reference, environment.timeZone), day);
}

function calendarMonths(from: number, to: number): number {
  const a = new Date(from);
  const b = new Date(to);
  return (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + b.getUTCMonth() - a.getUTCMonth();
}

/** Relative text for date-precision values: calendar-day comparison in the time zone. */
function relativeDate(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
  style: TimeStyle,
): string {
  const today = dayNumber(wallClock(reference, environment.timeZone));
  const days = dayNumber(value.wall!) - today;
  const distance = Math.abs(days);
  const truncate = environment.rounding === 'round' ? Math.round : Math.trunc;
  const precision = units.indexOf(environment.precision ?? 'second');
  let count = days;
  let unit: TimeUnit = 'day';
  if (distance >= 365 || precision >= units.indexOf('year')) {
    count = truncate(calendarMonths(today * day, value.wall!) / 12);
    unit = 'year';
  } else if (distance >= 30 || precision >= units.indexOf('month')) {
    count = calendarMonths(today * day, value.wall!);
    unit = 'month';
  } else if (distance >= 7 || precision >= units.indexOf('week')) {
    count = truncate(days / 7);
    unit = 'week';
  }
  const tense = environment.tense ?? 'auto';
  if ((tense === 'past' && count > 0) || (tense === 'future' && count < 0)) count = 0;
  return relativeTimeFormatter(environment.locale, {
    numeric: count === 0 ? 'auto' : (environment.numeric ?? 'auto'),
    style,
  }).format(count, unit);
}

function calendarText(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
  diagnostics: string[],
): string | null {
  const days =
    dayNumber(wallOf(value, environment.timeZone)) -
    dayNumber(wallClock(reference, environment.timeZone));
  if (Math.abs(days) > 6) return null;
  const context = messageContext(value, reference, environment);
  if (value.kind === 'date') {
    if (Math.abs(days) <= 1)
      return relativeTimeFormatter(environment.locale, { numeric: 'auto', style: 'long' }).format(
        days,
        'day',
      );
    return context.weekday;
  }
  const messages = { ...defaultTimeMessages, ...environment.messages };
  const message =
    days === 0
      ? messages.today
      : days === -1
        ? messages.yesterday
        : days === 1
          ? messages.tomorrow
          : days < 0
            ? messages.lastWeekday
            : messages.nextWeekday;
  try {
    return messageText(message, context);
  } catch (error) {
    diagnostics.push(`Time message failed: ${String(error)}`);
    return null;
  }
}

function elapsedDuration(
  distance: number,
  environment: TimeFormatOptions,
): { duration: TimeDuration; smallest: number } {
  const precision = units.indexOf(environment.precision ?? 'second');
  const fields: [keyof TimeDuration, TimeUnit][] = [
    ['days', 'day'],
    ['hours', 'hour'],
    ['minutes', 'minute'],
    ['seconds', 'second'],
  ];
  const duration: TimeDuration = {
    years: 0,
    months: 0,
    weeks: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  };
  // Units at or above the precision, largest first.
  const allowed = fields.filter(([, unit]) => units.indexOf(unit) >= precision);
  if (!allowed.length) allowed.push(fields[0]!);
  let remaining = distance;
  const values = allowed.map(([key, unit]) => {
    const count = Math.floor(remaining / unitLength[unit]);
    remaining -= count * unitLength[unit];
    return { key, unit, count };
  });
  // Show the largest nonzero unit and the next allowed unit.
  const first = Math.max(
    0,
    values.findIndex((entry) => entry.count > 0),
  );
  const shown = values.slice(first, first + 2);
  for (const entry of shown) duration[entry.key] = entry.count;
  return { duration, smallest: unitLength[shown[shown.length - 1]!.unit] };
}

/** Present one resolved value against a reference instant. */
export function formatTime(
  value: ResolvedTime,
  reference: number,
  environment: TimeFormatOptions,
): TimeText {
  const diagnostics: string[] = [];
  const style = environment.relativeStyle ?? 'long';
  const mode = environment.mode ?? 'auto';
  const absolute = (): TimeText => {
    const text = formatAbsolute(value, reference, environment, diagnostics);
    return {
      text,
      accessibleText: text,
      presentation: 'absolute',
      nextChange: undefined,
      diagnostics,
    };
  };
  if (value.kind === 'duration') {
    const text = formatDurationValue(value.duration!, environment);
    const accessibleText =
      style === 'long' ? text : formatDurationValue(value.duration!, environment, 'long');
    return { text, accessibleText, presentation: 'duration', nextChange: undefined, diagnostics };
  }
  if (mode === 'absolute' || !['instant', 'local-datetime', 'date'].includes(value.kind))
    return absolute();
  const target =
    value.kind === 'date' ? value.wall! : value.kind === 'instant' ? value.instant! : value.wall!;
  const now = value.kind === 'instant' ? reference : wallClock(reference, environment.timeZone);
  const delta = target - now;
  if (mode === 'duration') {
    const { duration, smallest } = elapsedDuration(Math.abs(delta), environment);
    const text = formatDurationValue(duration, environment);
    const accessibleText =
      style === 'long' ? text : formatDurationValue(duration, environment, 'long');
    const phase = positiveModulo(Math.abs(delta), smallest);
    return {
      text,
      accessibleText,
      presentation: 'duration',
      nextChange: delta <= 0 ? smallest - phase : phase + 1,
      diagnostics,
    };
  }
  if (value.kind === 'date') {
    const days = Math.abs(dayNumber(value.wall!) - dayNumber(now));
    if (mode === 'auto' && days * day >= (environment.threshold ?? 30 * day)) return absolute();
    const midnight = untilMidnight(reference, environment);
    if (mode === 'calendar') {
      const text = calendarText(value, reference, environment, diagnostics);
      if (text === null) return { ...absolute(), nextChange: midnight };
      return {
        text,
        accessibleText: text,
        presentation: 'calendar',
        nextChange: midnight,
        diagnostics,
      };
    }
    const text = relativeDate(value, reference, environment, style);
    const accessibleText =
      style === 'long' ? text : relativeDate(value, reference, environment, 'long');
    return { text, accessibleText, presentation: 'relative', nextChange: midnight, diagnostics };
  }
  if (mode === 'calendar') {
    const text = calendarText(value, reference, environment, diagnostics);
    const midnight = untilMidnight(reference, environment);
    if (text === null) return { ...absolute(), nextChange: midnight };
    return {
      text,
      accessibleText: text,
      presentation: 'calendar',
      nextChange: midnight,
      diagnostics,
    };
  }
  if (mode === 'auto' && Math.abs(delta) >= (environment.threshold ?? 30 * day)) {
    // A future value crosses back under the threshold as time advances.
    return delta > 0
      ? { ...absolute(), nextChange: delta - (environment.threshold ?? 30 * day) + 1 }
      : absolute();
  }
  const parts = relativeParts(delta, environment);
  const text = relativeText(parts, environment, style);
  const accessibleText = style === 'long' ? text : relativeText(parts, environment, 'long');
  return {
    text,
    accessibleText,
    presentation: 'relative',
    nextChange: relativeDelay(delta, parts, { ...environment, mode }),
    diagnostics,
  };
}

/** Clamp a proposed refresh delay to the shared scheduler's safe range. */
export function refreshDelay(nextChange: number | undefined): number | undefined {
  if (nextChange === undefined || !Number.isFinite(nextChange)) return undefined;
  return Math.min(Math.max(Math.ceil(nextChange) + 20, 250), maximumDelay);
}

/** Default description pattern reduced to the value precision. */
export function defaultDescriptionPattern(value: ResolvedTime): string | undefined {
  switch (value.kind) {
    case 'instant':
    case 'local-datetime':
      return 'dd/MM/yy HH:mm';
    case 'date':
      return 'dd/MM/yy';
    case 'month':
      return 'MM/yy';
    case 'year':
      return 'yyyy';
    case 'yearless':
      return 'dd/MM';
    case 'time':
      return 'HH:mm';
    default:
      return undefined;
  }
}
