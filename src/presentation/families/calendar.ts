import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { calendarAppearance } from '../recipes/calendar.js';

const definition: ComponentDefinition = {
  name: 'Calendar',
  tagName: 'tp-calendar',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-calendar',
  axes: [],
  parts: [
    {
      name: 'calendar',
      publicName: 'Root',
      presentationKeys: ['calendar'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      // No Foundation part: synthesized Navigation/Caption arrangement.
      name: 'calendar-header',
      publicName: 'Header',
      presentationKeys: ['calendar-header'],
      cardinality: 'one per displayed Month, as a synthesized Navigation/Caption arrangement',
    },
    {
      name: 'calendar-previous',
      publicName: 'Previous',
      presentationKeys: ['calendar-previous'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'calendar-next',
      publicName: 'Next',
      presentationKeys: ['calendar-next'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      // Compatibility public name for Foundation Calendar.Grid.
      name: 'calendar-month-grid',
      publicName: 'Month grid',
      presentationKeys: ['calendar-month-grid'],
      cardinality: 'one Grid per displayed Month',
    },
    {
      // Compatibility public name for Foundation Calendar.DayButton.
      name: 'calendar-day',
      publicName: 'Day',
      presentationKeys: ['calendar-day'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'calendar-months',
      publicName: 'Months',
      presentationKeys: ['calendar-months'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'calendar-month',
      publicName: 'Month',
      presentationKeys: ['calendar-month'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-caption',
      publicName: 'Caption',
      presentationKeys: ['calendar-caption'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-caption-label',
      publicName: 'CaptionLabel',
      presentationKeys: ['calendar-caption-label'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-dropdowns',
      publicName: 'Dropdowns',
      presentationKeys: ['calendar-dropdowns'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-month-dropdown',
      publicName: 'MonthDropdown',
      presentationKeys: ['calendar-month-dropdown'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-year-dropdown',
      publicName: 'YearDropdown',
      presentationKeys: ['calendar-year-dropdown'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-weekdays',
      publicName: 'Weekdays',
      presentationKeys: ['calendar-weekdays'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-weekday',
      publicName: 'Weekday',
      presentationKeys: ['calendar-weekday'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-weeks',
      publicName: 'Weeks',
      presentationKeys: ['calendar-weeks'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-week',
      publicName: 'Week',
      presentationKeys: ['calendar-week'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-week-number',
      publicName: 'WeekNumber',
      presentationKeys: ['calendar-week-number'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
    },
    {
      name: 'calendar-footer',
      publicName: 'Footer',
      presentationKeys: ['calendar-footer'],
      cardinality:
        'zero or more descendants of Root as required by displayed months and configured options',
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
