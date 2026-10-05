import type { CalendarAdapter } from '../../foundation/calendar.js';

/**
 * Built-in `data-*` names published on day cells, day Button hosts and native day
 * buttons. `dayModifiers` never replace them (`date` identity included).
 */
export const calendarBuiltInDayMarkers: readonly string[] = Object.freeze([
  'date',
  'hidden',
  'selected',
  'today',
  'outside',
  'disabled',
  'unavailable',
  'focused',
  'focus-visible',
  'range-start',
  'range-middle',
  'range-end',
  'roving',
  'calendar-part',
]);

const modifierNamePattern = /^[a-z][a-z0-9-]*$/u;

/** Split `dayModifiers` names into published markers and ignored (invalid or built-in) names. */
export function partitionCalendarModifiers(names: readonly string[]): {
  accepted: string[];
  ignored: string[];
} {
  const accepted: string[] = [];
  const ignored: string[] = [];
  for (const name of names)
    (modifierNamePattern.test(name) && !calendarBuiltInDayMarkers.includes(name)
      ? accepted
      : ignored
    ).push(name);
  return { accepted, ignored };
}

/** Whether `visibleMonths` consecutive months from `start` fit inside the navigation bounds. */
export function calendarCanDisplay(
  adapter: CalendarAdapter,
  start: string,
  visibleMonths: number,
  navigationStart: string,
  navigationEnd: string,
): boolean {
  const first = adapter.startOfMonth(start);
  const last = adapter.addMonths(first, visibleMonths - 1);
  if (navigationStart && adapter.compare(first, adapter.startOfMonth(navigationStart)) < 0)
    return false;
  if (navigationEnd && adapter.compare(last, adapter.startOfMonth(navigationEnd)) > 0) return false;
  return true;
}

/** Every adapter month that shares `month`'s year, in order. */
export function calendarYearMonths(adapter: CalendarAdapter, month: string): string[] {
  const year = adapter.parts(month).year;
  let first = month;
  for (let i = 0; i < 24; i++) {
    const previous = adapter.addMonths(first, -1);
    if (adapter.parts(previous).year !== year) break;
    first = previous;
  }
  const dates: string[] = [];
  for (let i = 0; i < 24; i++) {
    const date = adapter.addMonths(first, i);
    if (adapter.parts(date).year !== year) break;
    dates.push(date);
  }
  return dates;
}

/**
 * Whether any month of `yearDate`'s year can be shown at caption position
 * `monthIndex` (the month a caption at that index displays) within bounds.
 */
export function calendarYearNavigable(
  adapter: CalendarAdapter,
  yearDate: string,
  monthIndex: number,
  canDisplay: (start: string) => boolean,
): boolean {
  return calendarYearMonths(adapter, yearDate).some((month) =>
    canDisplay(adapter.addMonths(month, -monthIndex)),
  );
}

/**
 * The month of `date`'s year nearest to `date` that can be shown at caption
 * position `monthIndex`; `date` itself when it can. Undefined when no month of
 * that year is displayable.
 */
export function calendarNearestYearMonth(
  adapter: CalendarAdapter,
  date: string,
  monthIndex: number,
  canDisplay: (start: string) => boolean,
): string | undefined {
  const months = calendarYearMonths(adapter, date);
  const origin = months.findIndex((month) => adapter.compare(month, date) === 0);
  const center = origin < 0 ? 0 : origin;
  for (let distance = 0; distance < months.length; distance++) {
    for (const index of distance ? [center - distance, center + distance] : [center]) {
      const month = months[index];
      if (month && canDisplay(adapter.addMonths(month, -monthIndex))) return month;
    }
  }
  return undefined;
}

/**
 * Structural interactive content: native controls, links, editable or
 * tab-focusable elements and interactive ARIA widget roles.
 */
export const calendarInteractiveSelector = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'details',
  'summary',
  'iframe',
  'embed',
  'object',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
  ...[
    'button',
    'link',
    'checkbox',
    'radio',
    'switch',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'tab',
    'textbox',
    'searchbox',
    'slider',
    'spinbutton',
    'combobox',
  ].map((role) => `[role="${role}"]`),
].join(',');

/** Minimal element shape walked by {@link containsInteractiveContent}. */
export interface CalendarContentNode {
  matches(selector: string): boolean;
  readonly children: ArrayLike<CalendarContentNode>;
  readonly shadowRoot?: { readonly children: ArrayLike<CalendarContentNode> } | null;
}

/** Whether a custom day-content element is, or contains (through open shadow roots), interactive content. */
export function containsInteractiveContent(element: CalendarContentNode): boolean {
  if (element.matches(calendarInteractiveSelector)) return true;
  const nested = [
    ...Array.from(element.children),
    ...Array.from(element.shadowRoot?.children ?? []),
  ];
  return nested.some(containsInteractiveContent);
}
