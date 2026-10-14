import { markupExample, moduleExample } from './documentation-examples.js';
import { setupTextTransformExample } from './text-transform-example.js';
import setupSource from './text-transform-example.js?raw';

const stack = (content: string) =>
  `<div style="display:grid;gap:var(--tp-space-2)">${content}</div>`;

export const textTransformExamples = [
  markupExample(
    'Case and identifiers',
    stack(`<span><tp-text-transform preset="capitalize">northern lights ferry tour</tp-text-transform></span>
<span><tp-text-transform preset="sentence">boarding closes ten minutes before departure</tp-text-transform></span>
<span><tp-text-transform preset="uppercase">gate b</tp-text-transform></span>
<span><tp-text-transform preset="humanize">returnTripDiscount</tp-text-transform> · <tp-text-transform preset="kebab">Return Trip Discount</tp-text-transform> · <tp-text-transform preset="constant">returnTripDiscount</tp-text-transform></span>`),
    'Case presets follow the locale of the closest `lang`. Identifier presets split names at separators, case changes and acronyms, so a property key can become a readable label.',
  ),
  markupExample(
    'Numbers, currency and units',
    `<tp-table label="Ferry routes">
  <tp-table-header
    ><tp-table-row>
      <tp-table-head scope="col">Route</tp-table-head>
      <tp-table-head scope="col">Fare</tp-table-head>
      <tp-table-head scope="col">Occupancy</tp-table-head>
      <tp-table-head scope="col">Distance</tp-table-head>
      <tp-table-head scope="col">Passengers this year</tp-table-head>
    </tp-table-row></tp-table-header
  >
  <tp-table-body
    ><tp-table-row>
      <tp-table-head scope="row">Harbor – Lighthouse Isle</tp-table-head>
      <tp-table-cell><tp-text-transform preset="currency" currency="EUR" value="18.5"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="percent" value="0.82"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="unit" unit="kilometer" value="24.6"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="compact" value="148300"></tp-text-transform></tp-table-cell>
    </tp-table-row
    ><tp-table-row>
      <tp-table-head scope="row">Harbor – North Bay</tp-table-head>
      <tp-table-cell><tp-text-transform preset="currency" currency="EUR" value="9"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="percent" decimals="1" value="0.476"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="unit" unit="kilometer" value="7.2"></tp-text-transform></tp-table-cell>
      <tp-table-cell><tp-text-transform preset="compact" value="61900"></tp-text-transform></tp-table-cell>
    </tp-table-row></tp-table-body
  >
</tp-table>`,
    'Numeric presets format with the locale and use tabular figures. `percent` reads a ratio, `decimals` fixes the fraction digits, and compact numbers and units keep their spelled-out form for assistive technology. Each value is a `data` element carrying the raw number.',
  ),
  markupExample(
    'Locales',
    stack(`<span lang="en-US"><tp-text-transform preset="currency" currency="EUR" value="1234.5"></tp-text-transform> · <tp-text-transform preset="bytes" value="5242880"></tp-text-transform> · <tp-text-transform preset="duration" value="5025"></tp-text-transform></span>
<span lang="de-DE"><tp-text-transform preset="currency" currency="EUR" value="1234.5"></tp-text-transform> · <tp-text-transform preset="bytes" value="5242880"></tp-text-transform> · <tp-text-transform preset="duration" value="5025"></tp-text-transform></span>
<span lang="ar-EG" dir="rtl"><tp-text-transform preset="currency" currency="EUR" value="1234.5"></tp-text-transform> · <tp-text-transform preset="bytes" value="5242880"></tp-text-transform> · <tp-text-transform preset="duration" value="5025"></tp-text-transform></span>`),
    'Without a `locale`, the closest `lang` decides separators, digits and currency placement, and a change to it updates the text in place. `bytes` uses binary units and `duration` reads seconds.',
  ),
  markupExample(
    'Truncation',
    `<tp-resizable-panel-group style="block-size:12rem">
  <tp-resizable-panel default-size="30%" min-size="15%">
    <div style="display:grid;gap:var(--tp-space-2);padding:var(--tp-space-3)">
      <tp-text-transform truncate="end">Overnight crossing to Lighthouse Isle with a cabin and breakfast on board</tp-text-transform>
      <tp-text-transform truncate="end" truncate-by="words">Overnight crossing to Lighthouse Isle with a cabin and breakfast on board</tp-text-transform>
      <tp-text-transform truncate="middle">harbor-webcam-2026-10-14-dawn-panorama.jpg</tp-text-transform>
      <tp-text-transform truncate="start">/fleet/vessels/northern-star/maintenance/hull-inspection.pdf</tp-text-transform>
    </div>
  </tp-resizable-panel>
  <tp-resizable-handle label="Resize the list" with-handle></tp-resizable-handle>
  <tp-resizable-panel min-size="20%"></tp-resizable-panel>
</tp-resizable-panel-group>`,
    'Drag the handle: each value keeps as much as fits on one line. `truncate` places the omission at the end, the middle or the start; `truncate-by="words"` removes whole words. Shortened values can be focused and show the full text in a tooltip, and assistive technology always reads the full text.',
  ),
  markupExample(
    'Length limits',
    stack(`<span><tp-text-transform max-length="24">Overnight crossing to Lighthouse Isle with a cabin</tp-text-transform></span>
<span><tp-text-transform max-length="5" truncate-by="words">Overnight crossing to Lighthouse Isle with a cabin</tp-text-transform></span>
<span><tp-text-transform max-length="20" truncate="middle">harbor-webcam-2026-10-14-dawn-panorama.jpg</tp-text-transform></span>`),
    '`max-length` caps the characters or words kept, at the end unless `truncate` places the omission elsewhere. Without `truncate`, the text still wraps normally.',
  ),
  moduleExample({
    title: 'Custom presets and formatters',
    id: 'text-transform-custom',
    setup: setupTextTransformExample,
    source: setupSource.replaceAll("'../foundation/text-transform/presets.js'", "'@tweakpad/ui'"),
    call: "setupTextTransformExample(document.getElementById('text-transform-custom'));",
    markup:
      stack(`<span>Return fare <tp-text-transform preset="fare" value="36"></tp-text-transform></span>
<span>Moored at <tp-text-transform preset="berth" value="7"></tp-text-transform></span>
<span><tp-text-transform id="seats-left" value="0.18"></tp-text-transform></span>`),
    description:
      '`defineTextPreset` names a preset for the whole page, either a built-in preset with options or a formatter; elements that already use the name update when it is defined. A `formatter` on one element replaces its preset and can apply any preset through its context.',
  }),
  markupExample(
    'Fallback',
    '<p>Platform <tp-text-transform preset="number">to be announced</tp-text-transform></p>',
    'Content that a numeric preset cannot read stays as written and the element exposes `data-invalid`.',
  ),
];
