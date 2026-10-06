import type { PresentationDictionary } from '../resolver.js';
import { fillHidden } from './shared/fill.js';

const rangeBacking = {
  content: "''",
  position: 'absolute',
  'inset-block': '0',
  'inline-size': '50%',
  'z-index': '-1',
  background: 'var(--tp-muted)',
};

/** Calendar roles augment the actual Button/NativeSelect owners. */
export const calendarAppearance: PresentationDictionary = {
  calendar: [
    {
      declarations: {
        padding: 'var(--tp-space-2)',
        // The containing surface (page, Card, Popover) owns the fill, as shadcn's
        // bg-transparent inside card/popover content; the calendar part can still set one.
        color: 'var(--tp-foreground)',
        'font-size': 'var(--tp-text-sm)',
        gap: 'var(--tp-space-3)',
      },
    },
    // A range endpoint's cell carries a half-width backing toward the range interior so
    // the primary endpoint button and the muted middle read as one continuous band.
    {
      selector: '& .day-cell[data-range-start]:not([data-range-end])::after',
      declarations: { ...rangeBacking, 'inset-inline-end': '0' },
    },
    {
      selector: '& .day-cell[data-range-end]:not([data-range-start])::after',
      declarations: { ...rangeBacking, 'inset-inline-start': '0' },
    },
    // Range middles round where a week row starts or ends.
    {
      selector:
        '& .week > .day-cell:nth-child(1 of .day-cell)[data-range-middle] .day::part(button)',
      declarations: {
        'border-start-start-radius': 'var(--tp-radius-md)',
        'border-end-start-radius': 'var(--tp-radius-md)',
      },
    },
    {
      selector:
        '& .week > .day-cell:nth-last-child(1 of .day-cell)[data-range-middle] .day::part(button)',
      declarations: {
        'border-start-end-radius': 'var(--tp-radius-md)',
        'border-end-end-radius': 'var(--tp-radius-md)',
      },
    },
  ],
  'calendar-months': [{ declarations: { gap: 'var(--tp-space-4)' } }],
  'calendar-month': [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'calendar-header': [],
  'calendar-previous': [],
  'calendar-next': [],
  'calendar-caption': [],
  'calendar-caption-label': [{ declarations: { 'font-weight': 'var(--tp-font-medium)' } }],
  'calendar-dropdowns': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  'calendar-month-dropdown': [
    {
      declarations: {
        'padding-inline-start': 'var(--tp-space-2)',
        'font-size': 'var(--tp-text-sm)',
        'box-shadow': 'none',
      },
    },
  ],
  'calendar-year-dropdown': [
    {
      declarations: {
        'padding-inline-start': 'var(--tp-space-2)',
        'font-size': 'var(--tp-text-sm)',
        'box-shadow': 'none',
      },
    },
  ],
  'calendar-month-grid': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'calendar-weekdays': [],
  'calendar-weekday': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-normal)',
      },
    },
  ],
  'calendar-weeks': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'calendar-week': [],
  'calendar-week-number': [
    { declarations: { color: 'var(--tp-muted-foreground)', 'font-size': 'var(--tp-text-xs)' } },
  ],
  'calendar-day': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-normal)',
        'border-radius': 'var(--tp-radius-md)',
        border: '0',
        // Selection moves between days at once. An inherited Button fade crosses the
        // fill and text colors, so the deselected digit blinks out mid-transition.
        transition: 'none',
      },
    },
    { selector: '&::before', declarations: { transition: 'none' } },
    // Hover never covers a day's own selected, today or range fill.
    fillHidden('&:is([data-today], [data-selected], [data-range-middle])'),
    { selector: '&[data-outside]', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: '&[data-today]:not([data-selected])',
      declarations: { background: 'var(--tp-muted)', color: 'var(--tp-foreground)' },
    },
    {
      selector: '&[data-selected]:not([data-range-middle])',
      declarations: { background: 'var(--tp-primary)', color: 'var(--tp-primary-foreground)' },
    },
    {
      selector: '&[data-range-middle]',
      declarations: {
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        'border-radius': '0',
      },
    },
    {
      selector: '&[data-range-middle][data-outside]',
      declarations: { color: 'var(--tp-muted-foreground)' },
    },
  ],
  'calendar-footer': [{ declarations: { 'font-size': 'var(--tp-text-sm)' } }],
};
