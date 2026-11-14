import type { StatusDotVariant } from '../status-dot/status-dot.js';

import type { CalendarDateMatcher } from '../../foundation/calendar.js';

export type { CalendarDateMatcher };
/** How today is marked: the muted fill, an underlined number, a dot under it, or nothing. */
export type CalendarTodayIndicator = 'fill' | 'underline' | 'dot' | 'none';
/** A small colored dot under a day's number. */
export interface CalendarDayMarker {
  /** Theme status color of the dot; without it or `color`, the dot takes the theme's foreground. */
  variant?: StatusDotVariant;
  /** Any CSS color, replacing the variant color; a token is recommended. */
  color?: string;
  /** What the dot means; read after the date in the day's accessible name. */
  label?: string;
}
/** The markers of each date, as a map or a function of the ISO date. */
export type CalendarDayMarkers =
  | ReadonlyMap<string, readonly CalendarDayMarker[]>
  | ((date: string) => readonly CalendarDayMarker[] | undefined)
  | undefined;
/**
 * How a Calendar's month caption reads: a plain label, or dropdowns for the month, the year or
 * both.
 */
export type CalendarCaptionLayout = 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
/** Month grids, or a strip of consecutive days under the month caption. */
export type CalendarVariant = 'grid' | 'strip';
/**
 * The date, label and selection, availability and marker state of one day, passed to `renderDay` to
 * draw its cell.
 */
export interface CalendarDayState {
  date: string;
  month: string;
  label: string;
  selected: boolean;
  today: boolean;
  outside: boolean;
  disabled: boolean;
  unavailable: boolean;
  /** Crossed out: a `crossedOutDates` or `unavailableDates` date. */
  crossedOut: boolean;
  focused: boolean;
  rangeStart: boolean;
  rangeMiddle: boolean;
  rangeEnd: boolean;
  modifiers: Readonly<Record<string, boolean>>;
  /** The dots under the number, today's dot first under `today-indicator="dot"`. */
  markers: readonly CalendarDayMarker[];
}
/**
 * Display functions for a Calendar's caption, dropdown entries, weekdays, day numbers and week
 * numbers; a missing one keeps the default text.
 */
export interface CalendarFormatters {
  caption?: (date: string) => string;
  monthDropdown?: (date: string) => string;
  yearDropdown?: (date: string) => string;
  weekday?: (dayOfWeek: number) => string;
  day?: (date: string) => string;
  weekNumber?: (week: number, date: string) => string;
}

/** Selection states that make a committed calendar value invalid for forms. */
export type CalendarValidityCode =
  'value-missing' | 'excluded-date' | 'selection-count' | 'range-excluded-date' | 'range-nights';

/**
 * User-facing text. Every entry is optional and falls back to English. Developer
 * diagnostics (`tp-diagnostic`) are not localized.
 */
export interface CalendarMessages {
  /** Previous-month control name; `month` is the target month's first day, `caption` its formatted name. */
  previous?: string | ((month: string, caption: string) => string);
  /** Next-month control name; `month` is the target month's first day, `caption` its formatted name. */
  next?: string | ((month: string, caption: string) => string);
  /**
   * Name of the strip control that shows earlier days, outside single selection; `start` is the
   * first day it would show.
   */
  previousDays?: string | ((start: string) => string);
  /**
   * Name of the strip control that shows later days, outside single selection; `start` is the
   * first day it would show.
   */
  nextDays?: string | ((start: string) => string);
  /** Name of the strip control that selects the previous day in single selection; `date` is that day. */
  previousDay?: string | ((date: string) => string);
  /** Name of the strip control that selects the next day in single selection; `date` is that day. */
  nextDay?: string | ((date: string) => string);
  /** Accessible name of the month selector. */
  monthDropdown?: string;
  /** Accessible name of the year selector. */
  yearDropdown?: string;
  /** Accessible name of the week-number column header. */
  weekNumberHeader?: string;
  /** Accessible name of a day button. Defaults to the adapter's accessible date. */
  day?: (day: CalendarDayState) => string;
  /** Validation message reported for a committed invalid selection. */
  validity?: (code: CalendarValidityCode) => string;
}
