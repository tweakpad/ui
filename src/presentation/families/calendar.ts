import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { calendarAppearance } from '../recipes/calendar.js';

const definition: ComponentDefinition = {
  name: 'Calendar',
  tagName: 'tp-calendar',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'calendar',
      description: 'The root group around the months and the footer.',
    },
    {
      // No Foundation part: synthesized Navigation/Caption arrangement.
      name: 'calendar-header',
      description: 'The navigation and caption of a month.',
    },
    {
      name: 'calendar-previous',
      description: 'The native button inside the previous-month Button.',
    },
    {
      name: 'calendar-next',
      description: 'The native button inside the next-month Button.',
    },
    {
      // Compatibility public name for Foundation Calendar.Grid.
      name: 'calendar-month-grid',
      description: "The grid of a month's days.",
    },
    {
      // Compatibility public name for Foundation Calendar.DayButton.
      name: 'calendar-day',
      description: 'The native button inside each day Button.',
    },
    {
      name: 'calendar-months',
      description: 'All displayed months.',
    },
    {
      name: 'calendar-month',
      description: 'One month: its header and grid.',
    },
    {
      name: 'calendar-caption',
      description: 'The month caption.',
    },
    {
      name: 'calendar-caption-label',
      description: 'The caption text when it is not a dropdown.',
    },
    {
      name: 'calendar-dropdowns',
      description: 'The month and year dropdowns of the caption.',
    },
    {
      name: 'calendar-month-dropdown',
      description: 'The native select of the month dropdown.',
    },
    {
      name: 'calendar-year-dropdown',
      description: 'The native select of the year dropdown.',
    },
    {
      name: 'calendar-weekdays',
      description: 'The row of weekday names.',
    },
    {
      name: 'calendar-weekday',
      description: 'One weekday name.',
    },
    {
      name: 'calendar-weeks',
      description: 'The rows of weeks.',
    },
    {
      name: 'calendar-week',
      description: 'One week row.',
    },
    {
      name: 'calendar-week-number',
      description: 'The week number at the start of a week row.',
    },
    {
      name: 'calendar-footer',
      description: 'The container of the footer slot.',
    },
  ],
};

export const calendarPresentation = definePresentation({
  definition,
  bindings: {
    'tp-calendar': {
      '[part~="calendar"]': 'calendar',
      '[part~="calendar-header"]': 'calendar-header',
      '[part~="calendar-months"]': 'calendar-months',
      '[part~="calendar-month"]': 'calendar-month',
      '[part~="calendar-caption"]': 'calendar-caption',
      '[part~="calendar-caption-label"]': 'calendar-caption-label',
      '[part~="calendar-dropdowns"]': 'calendar-dropdowns',
      '[part~="calendar-weekdays"]': 'calendar-weekdays',
      '[part~="calendar-weekday"]': 'calendar-weekday',
      '[part~="calendar-weeks"]': 'calendar-weeks',
      '[part~="calendar-week"]': 'calendar-week',
      '[part~="calendar-week-number"]': 'calendar-week-number',
      '[part~="calendar-footer"]': 'calendar-footer',
      '[part~="calendar-month-grid"]': 'calendar-month-grid',
    },
  },
  sources: [calendarAppearance],
});
