export type CalendarDateMatcher = ReadonlySet<string> | ((date: string) => boolean) | undefined;
export type CalendarCaptionLayout = 'label' | 'dropdown' | 'dropdown-months' | 'dropdown-years';
export interface CalendarDayState {
  date: string;
  month: string;
  label: string;
  selected: boolean;
  today: boolean;
  outside: boolean;
  disabled: boolean;
  unavailable: boolean;
  focused: boolean;
  rangeStart: boolean;
  rangeMiddle: boolean;
  rangeEnd: boolean;
  modifiers: Readonly<Record<string, boolean>>;
}
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
