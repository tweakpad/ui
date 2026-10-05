import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupTimeExample } from './time-example.js';
import setupSource from './time-example.js?raw';

const script = (id: string) =>
  `${setupSource.replaceAll("'../", "'@tweakpad/ui/").replaceAll(".js';", "';")}\nsetupTimeExample(document.getElementById('${id}'));`;
const live = (title: string, id: string, markup: string, description: string) =>
  interactiveMarkupExample(
    title,
    `<div id="${id}">${markup}</div>`,
    setupTimeExample,
    script(id),
    description,
  );

export const timeExamples = [
  live(
    'Relative',
    'time-relative',
    '<p>Saved <tp-time data-offset="-5"></tp-time>, edited <tp-time data-offset="-180"></tp-time>, published <tp-time data-offset="-93600"></tp-time>, expires <tp-time data-offset="266400"></tp-time>.</p><p><tp-time data-offset="-180" relative-style="narrow"></tp-time> · <tp-time data-offset="-7200" relative-style="short" numeric="always"></tp-time></p>',
    'Auto mode is relative within 30 days and refreshes when the text can next change. Narrow and short styles keep the long form for assistive technology. Focus a value to read its full date and time.',
  ),
  markupExample(
    'Presets and patterns',
    '<p><tp-time mode="absolute" preset="time" datetime="2026-10-05T14:30:00Z" time-zone="UTC"></tp-time> · <tp-time mode="absolute" preset="date-long" datetime="2026-10-05T14:30:00Z" time-zone="UTC"></tp-time> · <tp-time mode="absolute" preset="full" datetime="2026-10-05T14:30:00Z" time-zone="UTC"></tp-time></p><p><tp-time mode="absolute" pattern="EEE d MMM yyyy \'at\' HH:mm" datetime="2026-10-05T14:30:00Z" time-zone="UTC"></tp-time> · <tp-time mode="absolute" preset="iso" datetime="2026-10-05T14:30:00Z"></tp-time></p>',
    'Presets follow the locale. Patterns use Unicode date-field symbols; quote literal words.',
  ),
  live(
    'Calendar phrases',
    'time-calendar',
    '<p><tp-time mode="calendar" data-offset="-3600"></tp-time> · <tp-time mode="calendar" data-offset="-90000"></tp-time> · <tp-time mode="calendar" data-offset="-259200"></tp-time></p><p lang="es"><tp-time mode="calendar" data-offset="-3600" data-messages></tp-time></p>',
    'Calendar mode compares calendar days in the time zone. Replace its phrases through the messages property.',
  ),
  live(
    'Due dates',
    'time-dates',
    '<tp-list-item description="Sam Rivera">Design review<span slot="footer">Due <tp-time data-days="0"></tp-time></span></tp-list-item><tp-list-item description="Taylor Kim">Release notes<span slot="footer">Due <tp-time data-days="3"></tp-time></span></tp-list-item><tp-list-item description="Ada Lovelace">Retrospective<span slot="footer">Due <tp-time data-days="-1"></tp-time></span></tp-list-item>',
    'Date-only values stay on their calendar day in every time zone and compare by days.',
  ),
  live(
    'Message timestamp',
    'time-message',
    '<tp-message author="Ada" data-offset="-120">The build is green again.</tp-message>',
    'Message renders its timestamp through Time.',
  ),
  markupExample(
    'Durations and other precisions',
    '<p><tp-time datetime="PT1H30M"></tp-time> · <tp-time datetime="2026-10"></tp-time> · <tp-time datetime="--12-25"></tp-time> · <tp-time datetime="2026-W40"></tp-time> · <tp-time datetime="09:15" hour-cycle="h23"></tp-time></p>',
    'Durations, months, yearless dates, weeks and times keep their own precision.',
  ),
  markupExample(
    'Description',
    '<p><tp-time datetime="2026-10-05T14:30:00Z" mode="absolute" preset="date-long" tooltip-pattern="EEEE HH:mm:ss xxx"></tp-time> · <tp-time datetime="2026-10-05T14:30:00Z" tooltip="false"></tp-time></p>',
    'The description defaults to dd/MM/yy HH:mm. tooltip="false" removes it and the tab stop.',
  ),
  markupExample(
    'Fallback',
    '<p>Last sync: <tp-time datetime="sometime yesterday">sometime yesterday</tp-time></p>',
    'Unresolvable input keeps the authored content and exposes data-invalid.',
  ),
];
