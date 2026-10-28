import { markupExample, moduleExample } from './documentation-examples.js';
import { setupOverflowListExample } from './overflow-list-example.js';
import setupSource from './overflow-list-example.js?raw';

const skills = [
  'First aid',
  'Forklift',
  'Spanish',
  'Sound desk',
  'Rigging',
  'Catering',
  'Photography',
  'Signage',
  'Night shifts',
  'Radio',
];
const badges = (labels: readonly string[]) =>
  labels.map((label) => `  <tp-badge variant="outline">${label}</tp-badge>`).join('\n');

export const overflowListExamples = [
  markupExample(
    'Item limit',
    `<tp-overflow-list limit="4">
${badges(skills)}
</tp-overflow-list>`,
    '`limit` shows that many items and replaces the rest with a count. Omitted items stay in the document, out of the layout, the focus order and the accessibility tree; the count reads "6 more" to assistive technology.',
  ),
  markupExample(
    'Row limit',
    `<tp-resizable-panel-group style="block-size:9rem">
  <tp-resizable-panel default-size="28%" min-size="10%">
    <div style="padding:var(--tp-space-3)">
      <tp-overflow-list max-rows="2">
${badges(skills)}
      </tp-overflow-list>
    </div>
  </tp-resizable-panel>
  <tp-resizable-handle label="Resize the list" with-handle></tp-resizable-handle>
  <tp-resizable-panel min-size="20%"></tp-resizable-panel>
</tp-resizable-panel-group>`,
    'Drag the handle: `max-rows` keeps as many items as fit in two rows of the available width, with the count beside them. The list never grows taller than its fitted rows, so the content below it stays in place while it refits.',
  ),
  markupExample(
    'In a table',
    `<div style="max-inline-size:32rem"><tp-table label="Volunteers">
  <tp-table-header
    ><tp-table-row>
      <tp-table-head scope="col">Volunteer</tp-table-head>
      <tp-table-head scope="col">Skills</tp-table-head>
    </tp-table-row></tp-table-header
  >
  <tp-table-body
    ><tp-table-row>
      <tp-table-head scope="row">Noor Haddad</tp-table-head>
      <tp-table-cell
        ><tp-overflow-list max-rows="1">
${badges(skills)}
        </tp-overflow-list></tp-table-cell
      >
    </tp-table-row
    ><tp-table-row>
      <tp-table-head scope="row">Tomás Rivera</tp-table-head>
      <tp-table-cell
        ><tp-overflow-list max-rows="1">
${badges(skills.slice(3, 6))}
        </tp-overflow-list></tp-table-cell
      >
    </tp-table-row></tp-table-body
  >
</tp-table></div>`,
    'In a table, flex row or grid track, the list asks for the width of all its items on one row and can shrink down to the count, so the column sizes as if nothing were omitted.',
  ),
  markupExample(
    'Collapse from the start',
    `<tp-overflow-list limit="3" collapse-from="start">
  <tp-badge variant="secondary">Mon · Setup</tp-badge>
  <tp-badge variant="secondary">Tue · Workshops</tp-badge>
  <tp-badge variant="secondary">Wed · Market</tp-badge>
  <tp-badge variant="secondary">Thu · Concert</tp-badge>
  <tp-badge variant="secondary">Fri · Teardown</tp-badge>
</tp-overflow-list>`,
    '`collapse-from="start"` keeps the last items and places the count before them, for lists where the most recent entries matter most.',
  ),
  moduleExample({
    title: 'Custom count',
    id: 'overflow-list-custom',
    setup: setupOverflowListExample,
    source: setupSource,
    call: "setupOverflowListExample(document.getElementById('overflow-list-custom'));",
    markup: `<div style="max-inline-size:24rem"><tp-overflow-list max-rows="1">
${badges(skills)}
  <span slot="count">
    <tp-popover label="More skills">
      <tp-button slot="trigger" id="more-skills-button" variant="outline" size="xs"></tp-button>
      <ul id="more-skills" style="margin:0;padding-inline-start:var(--tp-space-4)"></ul>
    </tp-popover>
  </span>
</tp-overflow-list></div>`,
    description:
      'An element in the `count` slot replaces the default count while items are omitted. It gets no generated text: listen to `tp-overflow-change` and read `hiddenItems` to show the number and, here, the omitted labels in a Popover. The count element needs a box of its own, so a Popover is wrapped in a span.',
  }),
];
