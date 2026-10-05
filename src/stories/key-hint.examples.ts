import { interactiveMarkupExample, markupExample } from './documentation-examples.js';
import { setupKeyHintExample } from './key-hint-example.js';
import setupSource from './key-hint-example.js?raw';
const shortcut = (key: string, attributes = '') =>
  `<tp-key-hint-group separator="none" ${attributes}><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>${key}</tp-key-hint></tp-key-hint-group>`;
export const keyHintExamples = [
  markupExample(
    'Group',
    `<p>Use ${shortcut('B')} to open the command menu.</p>`,
    'Group owns the spacing between individual keys. The hint only describes a shortcut; the application implements it.',
  ),
  markupExample(
    'Button',
    '<tp-button variant="outline">Accept<tp-key-hint slot="icon-end" key="enter"></tp-key-hint></tp-button>',
    'The Button owns focus and activation. Key Hint remains informative.',
  ),
  markupExample(
    'Tooltip',
    `<tp-button-group label="Document actions"><tp-tooltip><tp-button slot="trigger" variant="outline">Save</tp-button>Save changes ${shortcut('S')}</tp-tooltip><tp-tooltip><tp-button slot="trigger" variant="outline">Print</tp-button>Print document ${shortcut('P')}</tp-tooltip></tp-button-group>`,
    'Nested keys automatically use the tooltip palette.',
  ),
  interactiveMarkupExample(
    'Input Group',
    `<div id="key-hint-input"><tp-input-group><tp-icon slot="prefix" data-key-icon="search"></tp-icon><tp-input label="Search" placeholder="Search..."></tp-input>${shortcut('K', 'slot="suffix"')}</tp-input-group></div>`,
    setupKeyHintExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupKeyHintExample(document.getElementById('key-hint-input'));`,
    'Input Group owns the addon layout; Key Hint Group owns shortcut spacing.',
  ),
  markupExample(
    'Right to left',
    `<div dir="rtl"><p>استخدم ${shortcut('K')} لفتح قائمة الأوامر.</p><tp-button variant="outline">قبول<tp-key-hint slot="icon-end" key="enter" label="إدخال"></tp-key-hint></tp-button></div>`,
    'Logical spacing follows direction. Set dir="ltr" on a Group when a shortcut must retain left-to-right notation.',
  ),
  markupExample(
    'Sequences and platform notation',
    '<tp-key-hint-group separator="then" label="Comment selection"><tp-key-hint-group><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>K</tp-key-hint></tp-key-hint-group><tp-key-hint-group><tp-key-hint key="mod"></tp-key-hint><tp-key-hint>C</tp-key-hint></tp-key-hint-group></tp-key-hint-group>',
    'Nested groups express chords followed by another chord. Platform and localized keyLabels flow from the parent; a child can override them.',
  ),
  interactiveMarkupExample(
    'Icon keys',
    '<div id="key-hint-icons"><tp-key-hint-group separator="none"><tp-key-hint label="Right arrow"><tp-icon data-key-icon="right"></tp-icon></tp-key-hint><tp-key-hint label="Down arrow"><tp-icon data-key-icon="down"></tp-icon></tp-key-hint><tp-key-hint label="More"><tp-icon data-key-icon="more"></tp-icon></tp-key-hint></tp-key-hint-group></div>',
    setupKeyHintExample,
    `${setupSource.replaceAll("'../icons/", "'@tweakpad/ui/icons/").replaceAll(".js';", "';")}\nsetupKeyHintExample(document.getElementById('key-hint-icons'));`,
    'Real Icon components inherit the 12px key icon size. Supply a meaningful label for icon-only keys. An explicit Icon size remains supported.',
  ),
];
