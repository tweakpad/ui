import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupCalendarExample } from './calendar-example.js';
import setupSource from './calendar-example.js?raw';

/** Reference examples place Calendar in a Card; the Card owns the surface and outline. */
const inCard = (calendar: string) =>
  `<tp-card section-colors="off" style="inline-size:fit-content">
  ${calendar}
</tp-card>`;

const interactive = (title: string, id: string, markup: string, description: string) =>
  interactiveMarkupExample(
    title,
    `<div id="${id}">${markup}</div>`,
    setupCalendarExample,
    `${setupSource
      .replaceAll("'../icons/", "'@tweakpad/ui/icons/")
      .replaceAll(".js';", "';")}\nsetupCalendarExample(document.getElementById('${id}'));`,
    description,
  );

export const calendarExamples = [
  markupExample(
    'Basic',
    inCard('<tp-calendar label="Date" default-value="2026-06-12"></tp-calendar>'),
    'Single selection with outside days. Activating another date replaces the selection.',
  ),
  markupExample(
    'Range',
    inCard(`<tp-calendar
    label="Stay"
    selection-mode="range"
    visible-months="2"
    default-value="2026-01-12/2026-02-11"
  ></tp-calendar>`),
    'The first activation starts a range; the second completes it. Endpoints use the primary role and the interior a continuous muted band across both months.',
  ),
  markupExample(
    'Multiple',
    inCard(`<tp-calendar
    label="Delivery days"
    selection-mode="multiple"
    maximum-selection-count="5"
    default-value="2026-06-03 2026-06-10 2026-06-17"
  ></tp-calendar>`),
    'Each activation toggles one date. Count limits reject further additions or removals.',
  ),
  markupExample(
    'Month and year selector',
    inCard(
      '<tp-calendar label="Date" caption-layout="dropdown" default-value="2026-06-12"></tp-calendar>',
    ),
    'caption-layout="dropdown" replaces the caption with actual Native Select controls. Use dropdown-months or dropdown-years for one selector.',
  ),
  interactive(
    'Presets',
    'calendar-presets',
    `<tp-card size="sm" style="inline-size:fit-content;max-inline-size:20rem">
  <tp-calendar
    label="Date"
    data-controlled
    value="2026-02-12"
    displayed-month="2026-02-01"
    fixed-weeks
    style="--tp-calendar-cell-size:calc(var(--tp-spacing) * 12)"
  ></tp-calendar>
  <div slot="footer" style="display:flex;flex-wrap:wrap;gap:var(--tp-space-2)">
    <tp-button variant="outline" size="sm" data-preset-days="0" style="flex:1 0 auto">Today</tp-button>
    <tp-button variant="outline" size="sm" data-preset-days="1" style="flex:1 0 auto">Tomorrow</tp-button>
    <tp-button variant="outline" size="sm" data-preset-days="3" style="flex:1 0 auto">In 3 days</tp-button>
    <tp-button variant="outline" size="sm" data-preset-days="7" style="flex:1 0 auto">In a week</tp-button>
    <tp-button variant="outline" size="sm" data-preset-days="14" style="flex:1 0 auto">In 2 weeks</tp-button>
  </div>
</tp-card>`,
    'A controlled value and displayed month let footer Buttons select a date and reveal its month. fixed-weeks keeps the Card height stable.',
  ),
  interactive(
    'Date and time picker',
    'calendar-time',
    `<tp-card size="sm" style="inline-size:fit-content">
  <tp-calendar label="Date" default-value="2026-06-12"></tp-calendar>
  <div slot="footer" style="display:grid;gap:var(--tp-space-4);inline-size:100%">
    <tp-field label="Start time">
      <tp-input-group>
        <tp-input type="time" step="1" default-value="10:30:00"></tp-input>
        <tp-icon slot="inline-end" data-calendar-icon></tp-icon>
      </tp-input-group>
    </tp-field>
    <tp-field label="End time">
      <tp-input-group>
        <tp-input type="time" step="1" default-value="12:30:00"></tp-input>
        <tp-icon slot="inline-end" data-calendar-icon></tp-icon>
      </tp-input-group>
    </tp-field>
  </div>
</tp-card>`,
    'Times stay in Field-labelled Inputs. Calendar values are date-only; combine them with a time in application code.',
  ),
  interactive(
    'Booked dates',
    'calendar-booked',
    `<tp-card style="inline-size:fit-content">
  <tp-calendar
    label="Check-in"
    default-value="2026-01-06"
    data-booked="2026-01-12/2026-01-26"
  ></tp-calendar>
</tp-card>`,
    'disabledDates removes booked dates from focus and selection. dayModifiers publishes data-booked; renderDay strikes their numbers through and messages.day adds “booked” to their accessible names.',
  ),
  interactive(
    'Custom cell size',
    'calendar-custom-days',
    `<tp-card style="inline-size:fit-content">
  <tp-calendar
    label="Stay"
    selection-mode="range"
    caption-layout="dropdown"
    default-value="2026-12-08/2026-12-18"
    data-prices
    style="--tp-calendar-cell-size:calc(var(--tp-spacing) * 16)"
  ></tp-calendar>
</tp-card>`,
    '--tp-calendar-cell-size sizes every day and navigation cell. renderDay adds passive price text inside the existing day Button, which keeps its accessible date name.',
  ),
  markupExample(
    'Week numbers',
    inCard('<tp-calendar label="Date" show-week-number default-value="2026-01-12"></tp-calendar>'),
    'Week numbers follow the locale week rules. Custom adapters must implement weekNumber.',
  ),
  interactive(
    'Right to left',
    'calendar-rtl',
    `<div dir="rtl" lang="ar-SA">
  ${inCard('<tp-calendar label="التاريخ" locale="ar-SA" caption-layout="dropdown" data-arabic default-value="2026-06-12"></tp-calendar>')}
</div>`,
    'Arrow keys, navigation chevrons, range seams and row-edge rounding follow the writing direction. The locale formats dates; messages translate the control names and validity text. Neither changes the Gregorian adapter.',
  ),
  interactive(
    'Date picker',
    'calendar-date-picker',
    `<tp-field label="Due date" style="max-inline-size: 18rem">
  <tp-popover label="Choose a due date" placement="bottom start" data-date-picker>
    <tp-button slot="trigger" variant="outline"><tp-time mode="absolute" preset="date-long" tooltip="false">Pick a date</tp-time></tp-button>
    <tp-calendar label="Due date"></tp-calendar>
  </tp-popover>
</tp-field>`,
    'Popover owns the floating surface and focus return; Calendar supplies the selection and the application closes the Popover after accepting it. The trigger is an outline Button that fills the Field, leads with a calendar icon and mutes its placeholder, set through its icon property and button part contract. Its label is a Time: preset, pattern, format, locale and time-zone configure the date text exactly as on any Time, and the Time content is the placeholder shown until a date is chosen.',
  ),
];
