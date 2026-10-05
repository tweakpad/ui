import { describe, expect, it } from 'vitest';
import { gregorianCalendarAdapter as adapter } from '../../foundation/calendar.js';
import {
  calendarBuiltInDayMarkers,
  calendarCanDisplay,
  calendarNearestYearMonth,
  calendarYearMonths,
  calendarYearNavigable,
  containsInteractiveContent,
  partitionCalendarModifiers,
} from './policy.js';
import type { CalendarContentNode } from './policy.js';

describe('calendar day modifiers', () => {
  it('never lets a modifier replace date identity or built-in state', () => {
    expect(calendarBuiltInDayMarkers).toEqual(
      expect.arrayContaining([
        'date',
        'hidden',
        'selected',
        'today',
        'outside',
        'disabled',
        'unavailable',
        'focused',
        'range-start',
        'range-middle',
        'range-end',
        'roving',
      ]),
    );
    expect(
      partitionCalendarModifiers(['booked', 'date', 'selected', 'Holiday', 'half-day', '1st']),
    ).toEqual({
      accepted: ['booked', 'half-day'],
      ignored: ['date', 'selected', 'Holiday', '1st'],
    });
  });
});

describe('calendar navigation bounds and year choices', () => {
  const bounds =
    (start: string, end: string, visible = 1) =>
    (month: string) =>
      calendarCanDisplay(adapter, month, visible, start, end);

  it('bounds every visible month', () => {
    expect(calendarCanDisplay(adapter, '2026-03-15', 2, '2026-03-01', '2026-04-30')).toBe(true);
    expect(calendarCanDisplay(adapter, '2026-04-01', 2, '2026-03-01', '2026-04-30')).toBe(false);
    expect(calendarCanDisplay(adapter, '2026-02-01', 1, '2026-03-01', '')).toBe(false);
    expect(calendarCanDisplay(adapter, '1900-01-01', 3, '', '')).toBe(true);
  });

  it('lists the adapter months of a year', () => {
    const months = calendarYearMonths(adapter, '2026-06-01');
    expect(months).toHaveLength(12);
    expect(months[0]).toBe('2026-01-01');
    expect(months.at(-1)).toBe('2026-12-01');
  });

  it('offers a year only when one of its months can be displayed at the caption position', () => {
    const canDisplay = bounds('2024-11-01', '2026-02-28');
    expect(calendarYearNavigable(adapter, '2023-06-01', 0, canDisplay)).toBe(false);
    expect(calendarYearNavigable(adapter, '2024-06-01', 0, canDisplay)).toBe(true);
    expect(calendarYearNavigable(adapter, '2026-06-01', 0, canDisplay)).toBe(true);
    expect(calendarYearNavigable(adapter, '2027-06-01', 0, canDisplay)).toBe(false);
  });

  it('lands a year change on the nearest displayable month of that year', () => {
    const canDisplay = bounds('2024-11-01', '2026-02-28');
    expect(calendarNearestYearMonth(adapter, '2024-06-01', 0, canDisplay)).toBe('2024-11-01');
    expect(calendarNearestYearMonth(adapter, '2026-06-01', 0, canDisplay)).toBe('2026-02-01');
    expect(calendarNearestYearMonth(adapter, '2025-06-01', 0, canDisplay)).toBe('2025-06-01');
    expect(calendarNearestYearMonth(adapter, '2027-06-01', 0, canDisplay)).toBeUndefined();
  });

  it('accounts for the caption index of later visible months', () => {
    // Two visible months, bounded to Dec 2025 – Jan 2026: only Dec 2025 can be first.
    const canDisplay = bounds('2025-12-01', '2026-01-31', 2);
    expect(calendarYearNavigable(adapter, '2025-06-01', 0, canDisplay)).toBe(true);
    expect(calendarYearNavigable(adapter, '2026-06-01', 0, canDisplay)).toBe(false);
    expect(calendarYearNavigable(adapter, '2026-06-01', 1, canDisplay)).toBe(true);
    expect(calendarYearNavigable(adapter, '2025-06-01', 1, canDisplay)).toBe(false);
  });
});

describe('calendar custom day content', () => {
  const node = (
    matches: (selector: string[]) => boolean,
    children: CalendarContentNode[] = [],
    shadow?: CalendarContentNode[],
  ): CalendarContentNode => ({
    matches: (selector) => matches(selector.split(',')),
    children,
    shadowRoot: shadow ? { children: shadow } : null,
  });
  const tag = (name: string) => (selectors: string[]) => selectors.includes(name);
  const passive = () => false;

  it('accepts passive content', () => {
    expect(containsInteractiveContent(node(passive, [node(passive), node(passive)]))).toBe(false);
  });

  it('detects nested native controls, links and focusable elements', () => {
    expect(containsInteractiveContent(node(passive, [node(tag('button'))]))).toBe(true);
    expect(containsInteractiveContent(node(tag('a[href]')))).toBe(true);
    expect(containsInteractiveContent(node(tag('[tabindex]:not([tabindex="-1"])')))).toBe(true);
    expect(containsInteractiveContent(node(tag('[role="checkbox"]')))).toBe(true);
  });

  it('detects interactive content inside open shadow roots of composed elements', () => {
    expect(containsInteractiveContent(node(passive, [], [node(tag('button'))]))).toBe(true);
  });
});
