import { describe, expect, it } from 'vitest';
import {
  calendarGridDates,
  calendarSelectionProposal,
  gregorianCalendarAdapter,
  normalizeCalendarValue,
} from './calendar.js';

describe('calendar date and selection model', () => {
  it('advances Gregorian dates without a time-zone conversion', () => {
    expect(gregorianCalendarAdapter.addDays('2024-02-28', 1)).toBe('2024-02-29');
    expect(gregorianCalendarAdapter.addDays('2024-02-29', 1)).toBe('2024-03-01');
    expect(gregorianCalendarAdapter.addMonths('2024-01-31', 1)).toBe('2024-02-29');
    expect(gregorianCalendarAdapter.differenceInDays('2024-03-01', '2024-02-28')).toBe(2);
  });

  it('creates a six-week grid aligned to the declared week start', () => {
    const dates = calendarGridDates('2026-09-15', 1, gregorianCalendarAdapter);
    expect(dates).toHaveLength(42);
    expect(dates[0]).toBe('2026-08-31');
    expect(dates[41]).toBe('2026-10-11');
  });

  it('normalizes unique multiple values in chronological order', () => {
    expect(
      normalizeCalendarValue(
        'multiple',
        ['2026-09-20', '2026-09-10', '2026-09-20'],
        gregorianCalendarAdapter,
      ),
    ).toEqual(['2026-09-10', '2026-09-20']);
  });

  it('enforces multiple selection count limits', () => {
    const result = calendarSelectionProposal({
      mode: 'multiple',
      current: ['2026-09-10'],
      date: '2026-09-10',
      adapter: gregorianCalendarAdapter,
      required: false,
      minimumSelectionCount: 1,
      maximumSelectionCount: 3,
      minimumNights: 0,
      maximumNights: Number.POSITIVE_INFINITY,
      rangeExclusion: 'reject',
      isExcluded: () => false,
    });
    expect(result).toEqual({ accepted: false, value: ['2026-09-10'] });
  });

  it('rejects or restarts a range that crosses an excluded date', () => {
    const base = {
      mode: 'range' as const,
      current: { from: '2026-09-10' },
      date: '2026-09-14',
      adapter: gregorianCalendarAdapter,
      required: false,
      minimumSelectionCount: 0,
      maximumSelectionCount: Number.POSITIVE_INFINITY,
      minimumNights: 0,
      maximumNights: Number.POSITIVE_INFINITY,
      isExcluded: (date: string) => date === '2026-09-12',
    };
    expect(calendarSelectionProposal({ ...base, rangeExclusion: 'reject' })).toEqual({
      accepted: false,
      value: { from: '2026-09-10' },
    });
    expect(calendarSelectionProposal({ ...base, rangeExclusion: 'restart' })).toEqual({
      accepted: true,
      value: { from: '2026-09-14' },
    });
  });

  it('renders natural weeks unless fixed weeks are requested', () => {
    // February 2026 starts on Sunday and has exactly four weeks.
    expect(calendarGridDates('2026-02-01', 0, gregorianCalendarAdapter, false)).toHaveLength(28);
    expect(calendarGridDates('2026-02-01', 0, gregorianCalendarAdapter, true)).toHaveLength(42);
    // August 2026 starts on Saturday and spans six Sunday-first weeks.
    expect(calendarGridDates('2026-08-01', 0, gregorianCalendarAdapter, false)).toHaveLength(42);
    expect(calendarGridDates('2026-06-01', 1, gregorianCalendarAdapter, false)).toHaveLength(35);
  });

  it('numbers weeks with locale week-start and minimal-day rules', () => {
    const iso = (date: string) => gregorianCalendarAdapter.weekNumber!(date, 1, 4);
    expect(iso('2026-01-01')).toBe(1);
    expect(iso('2021-01-03')).toBe(53);
    expect(iso('2020-12-31')).toBe(53);
    expect(iso('2024-12-30')).toBe(1);
    const us = (date: string) => gregorianCalendarAdapter.weekNumber!(date, 0, 1);
    expect(us('2026-01-11')).toBe(3);
    expect(us('2025-12-28')).toBe(1);
  });

  it('uses narrow weekday labels when short labels do not abbreviate', () => {
    expect(gregorianCalendarAdapter.weekdayLabel(0, 'en-US')).toBe('Sun');
    expect(gregorianCalendarAdapter.weekdayLabel(1, 'fr')).toBe('lun.');
    const arabic = Array.from({ length: 7 }, (_, day) =>
      gregorianCalendarAdapter.weekdayLabel(day, 'ar-SA'),
    );
    expect(arabic.every((label) => [...label].length <= 2)).toBe(true);
  });
});
