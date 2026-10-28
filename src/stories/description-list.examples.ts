import { markupExample, moduleExample } from './documentation-examples.js';
import { setupDescriptionListExample } from './description-list-example.js';
import setupSource from './description-list-example.js?raw';

export const descriptionListExamples = [
  markupExample(
    'Record details',
    `<tp-card style="max-inline-size:26rem">
  <h3 slot="header">Plot B-14</h3>
  <p slot="description">East terrace, renewed every spring.</p>
  <tp-description-list limit="4">
    <tp-description-list-item label="Gardener">Mara Lindqvist</tp-description-list-item>
    <tp-description-list-item label="Status">
      <tp-badge variant="success">Active</tp-badge>
    </tp-description-list-item>
    <tp-description-list-item label="Renewal">
      <tp-time datetime="2027-04-01" mode="absolute"></tp-time>
    </tp-description-list-item>
    <tp-description-list-item label="Gate code">
      <span style="display:inline-flex;align-items:center;gap:var(--tp-space-1)">
        4471 <tp-copy-button value="4471" label="Copy gate code" size="xs"></tp-copy-button>
      </span>
    </tp-description-list-item>
    <tp-description-list-item label="Size">3 × 4 m</tp-description-list-item>
    <tp-description-list-item label="Water access">Shared tap, row C</tp-description-list-item>
    <tp-description-list-item label="Soil test">pH 6.8, tested in March</tp-description-list-item>
    <tp-description-list-item label="Notes" layout="stacked">
      Shares the hose with B-15; prefers morning watering and keeps the compost lid closed.
    </tp-description-list-item>
  </tp-description-list>
</tp-card>`,
    'Values can be any content: a Badge for a status, a Time for a date, a Copy button beside a code. With `limit="4"`, the remaining details wait behind Show more, and the Notes item uses `layout="stacked"` to run its long value under its label.',
  ),
  markupExample(
    'Summary row',
    `<tp-description-list orientation="horizontal" layout="stacked">
  <tp-description-list-item label="Status">Active</tp-description-list-item>
  <tp-description-list-item label="Type">Premium</tp-description-list-item>
  <tp-description-list-item label="Owner">Mara</tp-description-list-item>
  <tp-description-list-item label="Created">
    <tp-time datetime="2026-01-15" mode="absolute"></tp-time>
  </tp-description-list-item>
</tp-description-list>`,
    'With `orientation="horizontal"`, the pairs sit side by side and wrap when space runs out; `layout="stacked"` places each label above its value.',
  ),
  markupExample(
    'Centered labels',
    `<tp-description-list align="center" limit="3" style="max-inline-size:24rem">
  <tp-description-list-item label="Status">Active</tp-description-list-item>
  <tp-description-list-item label="Type">Premium</tp-description-list-item>
  <tp-description-list-item label="Owner">Mara Lindqvist</tp-description-list-item>
  <tp-description-list-item label="Created">Jan 15, 2026</tp-description-list-item>
  <tp-description-list-item label="Renewal">Apr 1, 2027</tp-description-list-item>
</tp-description-list>`,
    '`align="center"` aligns the labels to the end of their column, so each meets its value in the middle; Show more starts with the values.',
  ),
  markupExample(
    'Stacked labels',
    `<tp-description-list layout="stacked" limit="2" style="max-inline-size:16rem">
  <tp-description-list-item label="Seed order">Runner beans, chard, calendula</tp-description-list-item>
  <tp-description-list-item label="Compost">Two bags, collected on Saturdays</tp-description-list-item>
  <tp-description-list-item label="Tool shed">Open 7 am to 6 pm; keys back at the gate box</tp-description-list-item>
</tp-description-list>`,
    'In narrow panels, `layout="stacked"` places each label above its value.',
  ),
  moduleExample({
    title: 'Counted button text',
    id: 'description-list-messages',
    setup: setupDescriptionListExample,
    source: setupSource,
    call: "setupDescriptionListExample(document.getElementById('description-list-messages'));",
    markup: `<tp-description-list limit="2" style="max-inline-size:24rem">
  <tp-description-list-item label="Tomatoes">Six plants, staked</tp-description-list-item>
  <tp-description-list-item label="Lettuce">Two rows, sown weekly</tp-description-list-item>
  <tp-description-list-item label="Basil">Under the cloche</tp-description-list-item>
  <tp-description-list-item label="Squash">One vine along the fence</tp-description-list-item>
  <tp-description-list-item label="Marigolds">Edging the path</tp-description-list-item>
</tp-description-list>`,
    description:
      '`messages` sets the button text. A function receives the number of hidden items and the total, so the button can say how many items it reveals.',
  }),
];
