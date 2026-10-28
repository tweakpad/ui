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
    },
    {
      // No Foundation part: synthesized Navigation/Caption arrangement.
      name: 'calendar-header',
    },
    {
      name: 'calendar-previous',
    },
    {
      name: 'calendar-next',
    },
    {
      // Compatibility public name for Foundation Calendar.Grid.
      name: 'calendar-month-grid',
    },
    {
      // Compatibility public name for Foundation Calendar.DayButton.
      name: 'calendar-day',
    },
    {
      name: 'calendar-months',
    },
    {
      name: 'calendar-month',
    },
    {
      name: 'calendar-caption',
    },
    {
      name: 'calendar-caption-label',
    },
    {
      name: 'calendar-dropdowns',
    },
    {
      name: 'calendar-month-dropdown',
    },
    {
      name: 'calendar-year-dropdown',
    },
    {
      name: 'calendar-weekdays',
    },
    {
      name: 'calendar-weekday',
    },
    {
      name: 'calendar-weeks',
    },
    {
      name: 'calendar-week',
    },
    {
      name: 'calendar-week-number',
    },
    {
      name: 'calendar-footer',
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
