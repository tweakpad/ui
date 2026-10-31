import { markupExample, moduleExample } from './documentation-examples.js';
import { setupKbdExample } from './kbd-example.js';
import setupSource from './kbd-example.js?raw';
const shortcut = (key: string, attributes = '') =>
  `<tp-kbd-group separator="none" ${attributes}><tp-kbd value="mod"></tp-kbd><tp-kbd>${key}</tp-kbd></tp-kbd-group>`;
export const kbdExamples = [
  markupExample(
    'Group',
    `<p>Use ${shortcut('B')} to open the command menu.</p>`,
    'Group owns the spacing between individual keys. The hint only describes a shortcut; the application implements it.',
  ),
  markupExample(
    'Button',
    '<tp-button variant="outline">Accept<tp-kbd slot="icon-end" value="enter"></tp-kbd></tp-button>',
    'The Button owns focus and activation. Kbd remains informative.',
  ),
  markupExample(
    'Tooltip',
    `<tp-button-group label="Document actions"><tp-tooltip><tp-button slot="trigger" variant="outline">Save</tp-button>Save changes ${shortcut('S')}</tp-tooltip><tp-tooltip><tp-button slot="trigger" variant="outline">Print</tp-button>Print document ${shortcut('P')}</tp-tooltip></tp-button-group>`,
    'Nested keys automatically use the tooltip palette.',
  ),
  moduleExample({
    title: 'Input Group',
    id: 'kbd-input',
    markup: `<tp-input-group><tp-icon slot="prefix" data-key-icon="search"></tp-icon><tp-input label="Search" placeholder="Search..."></tp-input>${shortcut('K', 'slot="suffix"')}</tp-input-group>`,
    setup: setupKbdExample,
    source: setupSource,
    call: "setupKbdExample(document.getElementById('kbd-input'));",
    description: 'Input Group owns the addon layout; Kbd group owns shortcut spacing.',
  }),
  markupExample(
    'Right to left',
    `<div dir="rtl"><p>استخدم ${shortcut('K')} لفتح قائمة الأوامر.</p><tp-button variant="outline">قبول<tp-kbd slot="icon-end" value="enter" label="إدخال"></tp-kbd></tp-button></div>`,
    'Logical spacing follows direction. Set dir="ltr" on a Group when a shortcut must retain left-to-right notation.',
  ),
  markupExample(
    'Sequences and platform notation',
    '<tp-kbd-group separator="then" label="Comment selection"><tp-kbd-group><tp-kbd value="mod"></tp-kbd><tp-kbd>K</tp-kbd></tp-kbd-group><tp-kbd-group><tp-kbd value="mod"></tp-kbd><tp-kbd>C</tp-kbd></tp-kbd-group></tp-kbd-group>',
    'Nested groups express chords followed by another chord. Platform and localized keyLabels flow from the parent; a child can override them.',
  ),
  moduleExample({
    title: 'Icon keys',
    id: 'kbd-icons',
    markup:
      '<tp-kbd-group separator="none"><tp-kbd label="Right arrow"><tp-icon data-key-icon="right"></tp-icon></tp-kbd><tp-kbd label="Down arrow"><tp-icon data-key-icon="down"></tp-icon></tp-kbd><tp-kbd label="More"><tp-icon data-key-icon="more"></tp-icon></tp-kbd></tp-kbd-group>',
    setup: setupKbdExample,
    source: setupSource,
    call: "setupKbdExample(document.getElementById('kbd-icons'));",
    description:
      'Real Icon components inherit the 12px key icon size. Supply a meaningful label for icon-only keys. An explicit Icon size remains supported.',
  }),
];
