import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  defaultDescriptionPattern,
  formatPattern,
  formatTime,
  refreshDelay,
  wallClock,
  type TimeFormatOptions,
} from './format.js';
import { parseDuration, resolveTime } from './parse.js';
import { TimeRefreshScheduler } from './scheduler.js';

const second = 1000;
const minute = 60 * second;
const hour = 60 * minute;
const day = 24 * hour;
const reference = Date.UTC(2026, 9, 5, 12, 0, 0);
const env: TimeFormatOptions = { locale: 'en-US', timeZone: 'UTC' };
const text = (input: Parameters<typeof resolveTime>[0], options: TimeFormatOptions = {}) =>
  formatTime(resolveTime(input)!, reference, { ...env, ...options }).text;

describe('time input resolution', () => {
  it('reads epoch seconds below 1e11 and milliseconds otherwise', () => {
    expect(resolveTime(1_791_230_000)?.instant).toBe(1_791_230_000_000);
    expect(resolveTime(1_791_230_000_000)?.instant).toBe(1_791_230_000_000);
    expect(resolveTime('1791230000')?.instant).toBe(1_791_230_000_000);
    expect(resolveTime('@0')?.instant).toBe(0);
    expect(resolveTime('12345')?.kind).toBe('year');
  });
  it('accepts instant objects, Temporal-like objects and rejects invalid dates', () => {
    expect(resolveTime(new Date(reference))?.machine).toBe('2026-10-05T12:00:00.000Z');
    expect(resolveTime({ epochMilliseconds: reference })?.instant).toBe(reference);
    expect(resolveTime(new Date(Number.NaN))).toBeNull();
    expect(resolveTime('   ')).toBeNull();
    expect(resolveTime(null)).toBeNull();
  });
  it('preserves the precision of every time-element microsyntax', () => {
    const cases: [string, string, string][] = [
      ['2026', 'year', '2026'],
      ['2026-10', 'month', '2026-10'],
      ['2026-10-05', 'date', '2026-10-05'],
      ['--02-29', 'yearless', '02-29'],
      ['2026-W40', 'week', '2026-W40'],
      ['14:30', 'time', '14:30'],
      ['14:30:05.1234', 'time', '14:30:05.123'],
      ['2026-10-05 14:30', 'local-datetime', '2026-10-05T14:30'],
      ['2026-10-05T14:30:00+05:30', 'instant', '2026-10-05T14:30:00+05:30'],
      ['2026-10-05T14:30Z', 'instant', '2026-10-05T14:30Z'],
    ];
    for (const [input, kind, machine] of cases) {
      const value = resolveTime(input);
      expect(value?.kind, input).toBe(kind);
      expect(value?.machine, input).toBe(machine);
      expect(value?.loose, input).toBe(false);
    }
    expect(resolveTime('2026-10-05T14:30:00+05:30')?.instant).toBe(Date.UTC(2026, 9, 5, 9, 0));
  });
  it('keeps date-only values on their calendar day instead of UTC midnight', () => {
    const value = resolveTime('2026-10-05')!;
    expect(value.wall).toBe(Date.UTC(2026, 9, 5));
    expect(value.instant).toBeUndefined();
    expect(
      text('2026-10-05', { mode: 'absolute', preset: 'date-long', timeZone: 'Pacific/Honolulu' }),
    ).toBe('October 5, 2026');
  });
  it('rejects invalid calendar fields', () => {
    for (const input of [
      '2026-02-30',
      '2026-13',
      '24:00',
      '2026-W54',
      '--02-30',
      '2026-10-05T10:00+24:00',
    ])
      expect(resolveTime(input, { strict: true }), input).toBeNull();
  });
  it('parses ISO and component durations and omits unrepresentable machine values', () => {
    expect(parseDuration('P1DT2H3M4.5S')).toMatchObject({
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4.5,
    });
    expect(parseDuration('3w 2d 4h 5m 6.5s')).toMatchObject({
      weeks: 3,
      days: 2,
      hours: 4,
      minutes: 5,
      seconds: 6.5,
    });
    expect(resolveTime('PT90M')?.machine).toBe('PT90M');
    expect(resolveTime('1w 1d')?.machine).toBe('P8D');
    expect(resolveTime('P1Y')?.machine).toBe('');
    expect(parseDuration('P')).toBeNull();
  });
  it('accepts internet message dates and marks best-effort host parsing loose', () => {
    expect(resolveTime('Mon, 05 Oct 2026 12:00:00 GMT')).toMatchObject({
      instant: reference,
      loose: false,
    });
    expect(resolveTime('October 5, 2026 12:00 UTC')?.loose).toBe(true);
    expect(resolveTime('October 5, 2026 12:00 UTC', { strict: true })).toBeNull();
    expect(resolveTime('not a date')).toBeNull();
  });
});

describe('relative presentation', () => {
  it('selects one unit at the documented boundaries with floor rounding', () => {
    expect(text(reference - 5 * second)).toBe('now');
    expect(text(reference - 45 * second)).toBe('45 seconds ago');
    expect(text(reference - 90 * second)).toBe('1 minute ago');
    expect(text(reference - 59 * minute - 59 * second)).toBe('59 minutes ago');
    expect(text(reference - 2 * hour)).toBe('2 hours ago');
    expect(text(reference - 25 * hour)).toBe('yesterday');
    expect(text(reference - 25 * hour, { numeric: 'always' })).toBe('1 day ago');
    expect(text(reference + 3 * day)).toBe('in 3 days');
    expect(text(reference - 8 * day)).toBe('last week');
    expect(text(reference - 20 * day, { mode: 'relative' })).toBe('2 weeks ago');
    expect(text(reference - 40 * day, { mode: 'relative' })).toBe('last month');
    expect(text(reference - 400 * day, { mode: 'relative' })).toBe('last year');
  });
  it('promotes rounded counts that reach the next boundary', () => {
    expect(text(reference - 59 * minute - 40 * second, { rounding: 'round' })).toBe('1 hour ago');
    expect(text(reference - 90 * minute, { rounding: 'round' })).toBe('2 hours ago');
  });
  it('applies style, precision, tense and now threshold', () => {
    expect(text(reference - 3 * minute, { relativeStyle: 'narrow' })).toMatch(
      /^3\s?m(in\.?)? ago$/,
    );
    const narrow = formatTime(resolveTime(reference - 3 * minute)!, reference, {
      ...env,
      relativeStyle: 'narrow',
    });
    expect(narrow.accessibleText).toBe('3 minutes ago');
    expect(text(reference - 30 * second, { precision: 'minute' })).toBe('now');
    expect(text(reference + 2 * hour, { tense: 'past' })).toBe('now');
    expect(text(reference - 2 * hour, { tense: 'future' })).toBe('now');
    expect(text(reference - 20 * second, { nowThreshold: 30 * second })).toBe('now');
  });
  it('switches auto presentation to absolute at the threshold', () => {
    expect(text(reference - 31 * day)).toBe('Sep 4, 2026, 12:00 PM');
    expect(text(reference - 2 * day, { threshold: day })).toBe('Oct 3, 2026, 12:00 PM');
  });
  it('compares date-precision values by calendar day in the time zone', () => {
    expect(text('2026-10-04')).toBe('yesterday');
    expect(text('2026-10-05')).toBe('today');
    expect(text('2026-10-08')).toBe('in 3 days');
    // 23:30 on Oct 5 in Auckland is already Oct 6 there.
    expect(
      formatTime(resolveTime('2026-10-06')!, Date.UTC(2026, 9, 5, 23, 30), {
        locale: 'en-US',
        timeZone: 'Pacific/Auckland',
      }).text,
    ).toBe('today');
  });
  it('keeps coarse and time-only kinds absolute', () => {
    expect(text('14:30', { hourCycle: 'h23' })).toBe('14:30');
    expect(text('2026-10', { preset: 'date-long' })).toBe('October 2026');
    expect(text('2026')).toBe('2026');
    expect(text('--10-05')).toBe('Oct 5');
    expect(text('2026-W40')).toBe('Week 40, 2026');
  });
  it('computes the next change from the unit phase', () => {
    const past = formatTime(resolveTime(reference - 90 * second)!, reference, env);
    expect(past.nextChange).toBe(30 * second);
    const future = formatTime(resolveTime(reference + 90 * second)!, reference, env);
    expect(future.nextChange).toBe(30 * second + 1);
    const absolute = formatTime(resolveTime(reference)!, reference, { ...env, mode: 'absolute' });
    expect(absolute.nextChange).toBeUndefined();
    expect(refreshDelay(10 * day)).toBe(hour);
    expect(refreshDelay(1)).toBe(250);
  });
});

describe('calendar presentation', () => {
  const calendar = (input: number | string, options: TimeFormatOptions = {}) =>
    text(input, { mode: 'calendar', hourCycle: 'h23', ...options });
  it('uses replaceable messages within six days', () => {
    expect(calendar(Date.UTC(2026, 9, 5, 9, 15))).toBe('Today at 09:15');
    expect(calendar(Date.UTC(2026, 9, 4, 18, 0))).toBe('Yesterday at 18:00');
    expect(calendar(Date.UTC(2026, 9, 6, 8, 0))).toBe('Tomorrow at 08:00');
    expect(calendar(Date.UTC(2026, 9, 1, 8, 0))).toBe('Last Thursday at 08:00');
    expect(calendar(Date.UTC(2026, 9, 9, 8, 0))).toBe('Friday at 08:00');
    expect(calendar(Date.UTC(2026, 8, 1, 8, 0))).toBe('Sep 1, 2026, 08:00');
    expect(calendar(Date.UTC(2026, 9, 5, 9, 15), { messages: { today: 'Hoy, {time}' } })).toBe(
      'Hoy, 09:15',
    );
    expect(
      calendar(Date.UTC(2026, 9, 5, 9, 15), { messages: { today: (c) => `T ${c.time}` } }),
    ).toBe('T 09:15');
  });
  it('schedules the next refresh at local midnight', () => {
    const value = formatTime(resolveTime(reference)!, reference, { ...env, mode: 'calendar' });
    expect(value.nextChange).toBe(12 * hour);
  });
});

describe('absolute presentation', () => {
  it('resolves formatter, pattern, format and preset precedence', () => {
    const base = { mode: 'absolute' as const, preset: 'date' as const };
    expect(text(reference, base)).toBe('10/5/26');
    expect(text(reference, { ...base, format: { month: 'long' } })).toBe('October');
    expect(text(reference, { ...base, format: { month: 'long' }, pattern: 'yyyy' })).toBe('2026');
    expect(text(reference, { ...base, pattern: 'yyyy', formatter: () => 'custom' })).toBe('custom');
    expect(text(reference, { mode: 'absolute', preset: 'iso' })).toBe('2026-10-05T12:00:00.000Z');
  });
  it('formats localized pattern fields and quoted literals', () => {
    const value = resolveTime(Date.UTC(2026, 9, 5, 14, 7, 9, 45))!;
    expect(formatPattern(value, "EEEE, d MMMM yyyy 'at' HH:mm:ss.SSS", env)).toBe(
      'Monday, 5 October 2026 at 14:07:09.045',
    );
    expect(formatPattern(value, "h:mm a 'o''clock' ''", env)).toBe("2:07 PM o'clock '");
    expect(formatPattern(value, 'dd/MM/yy HH:mm', { locale: 'ar-EG', timeZone: 'UTC' })).toBe(
      '٠٥/١٠/٢٦ ١٤:٠٧',
    );
    expect(formatPattern(value, 'HH:mm xxx', { locale: 'en-US', timeZone: 'Asia/Kolkata' })).toBe(
      '19:37 +05:30',
    );
  });
  it('diagnoses week-year, day-of-year and unsupported symbols as literal text', () => {
    const diagnostics: string[] = [];
    const value = resolveTime(reference)!;
    expect(formatPattern(value, 'YYYY-DD q', env, diagnostics)).toBe('YYYY-DD q');
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0]).toContain('use y');
  });
  it('reduces the default description pattern to the value precision', () => {
    expect(defaultDescriptionPattern(resolveTime(reference)!)).toBe('dd/MM/yy HH:mm');
    expect(defaultDescriptionPattern(resolveTime('2026-10-05')!)).toBe('dd/MM/yy');
    expect(defaultDescriptionPattern(resolveTime('14:00')!)).toBe('HH:mm');
    expect(defaultDescriptionPattern(resolveTime('PT1H')!)).toBeUndefined();
  });
  it('converts instants to wall-clock fields in a time zone', () => {
    expect(wallClock(reference, 'Asia/Tokyo')).toBe(Date.UTC(2026, 9, 5, 21, 0));
  });
});

describe('duration presentation', () => {
  it('formats duration values and elapsed distance with the style', () => {
    expect(text('PT1H30M')).toMatch(/1 hour,? 30 minutes/);
    expect(text(reference - 2 * hour - 5 * minute - 10 * second, { mode: 'duration' })).toMatch(
      /2 hours,? 5 minutes/,
    );
  });
});

describe('shared refresh scheduler', () => {
  afterEach(() => vi.useRealTimers());
  function fakeWindow() {
    const listeners = new Map<string, Set<() => void>>();
    const target = {
      addEventListener: (type: string, listener: () => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(listener);
      },
      removeEventListener: (type: string, listener: () => void) =>
        listeners.get(type)?.delete(listener),
      dispatch: (type: string) => listeners.get(type)?.forEach((listener) => listener()),
    };
    const document = { ...target, visibilityState: 'visible', documentElement: {} };
    const owner = {
      ...target,
      document,
      setTimeout: (callback: () => void, delay: number) => setTimeout(callback, delay),
      clearTimeout: (id: number) => clearTimeout(id),
    };
    return { owner: owner as unknown as Window, document, listeners };
  }
  it('uses one timer, refreshes due targets and pauses while hidden', () => {
    vi.useFakeTimers();
    const { owner, document, listeners } = fakeWindow();
    const scheduler = new TimeRefreshScheduler(owner);
    const calls: string[] = [];
    const a = { refreshTime: () => calls.push('a') };
    const b = { refreshTime: () => calls.push('b') };
    const releaseA = scheduler.register(a);
    scheduler.register(b);
    scheduler.schedule(a, 1000);
    scheduler.schedule(b, 5000);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(1000);
    expect(calls).toEqual(['a']);
    document.visibilityState = 'hidden';
    document.dispatch('visibilitychange');
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(10_000);
    expect(calls).toEqual(['a']);
    document.visibilityState = 'visible';
    document.dispatch('visibilitychange');
    expect(calls).toEqual(['a', 'a', 'b']);
    releaseA();
    releaseA();
    scheduler.schedule(b, 1000);
    vi.advanceTimersByTime(1000);
    expect(calls).toEqual(['a', 'a', 'b', 'b']);
    expect(listeners.get('languagechange')?.size).toBe(1);
  });
});
