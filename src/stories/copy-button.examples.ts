import { markupExample } from './documentation-examples.js';

const stack = (content: string) =>
  `<div style="display:grid;gap:var(--tp-space-5);max-inline-size:calc(var(--tp-spacing) * 100)">${content}</div>`;
const row = (content: string) =>
  `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:var(--tp-space-3)">${content}</div>`;

export const copyButtonExamples = [
  markupExample(
    'Labelled and sized',
    stack(
      row(
        ['xs', 'sm', 'default', 'lg']
          .map(
            (size) =>
              `<tp-copy-button size="${size}" value="tp-copy-button ${size}" label="Copy ${size}"></tp-copy-button>`,
          )
          .join('') +
          `<tp-copy-button variant="outline" show-label value="https://tweakpad.dev" label="Copy link" copied-label="Link copied"></tp-copy-button>`,
      ),
    ),
    'Icon-only buttons map their size to the Button icon sizes; `show-label` renders the label and the copied message as text beside the icon.',
  ),
  markupExample(
    'Beside a value',
    stack(
      `<tp-input-group><tp-input label="API key" readonly default-value="sk_live_4f2c9e1b7a"></tp-input><tp-copy-button slot="action" value="sk_live_4f2c9e1b7a" label="Copy API key"></tp-copy-button></tp-input-group>` +
        `<tp-field-group label="Position"><tp-input-group><span slot="prefix">X</span><tp-input label="X" default-value="24"></tp-input></tp-input-group><tp-input-group><span slot="prefix">Y</span><tp-input label="Y" default-value="48"></tp-input></tp-input-group><tp-copy-button value="24, 48" label="Copy position"></tp-copy-button></tp-field-group>`,
    ),
    'An Input group action or a Field group member: the composed Button is the seam boundary and keeps the editors untouched.',
  ),
  markupExample(
    'In a Code block',
    `<tp-code-block language="ts" label="install.ts">import { TpCopyButton } from '@tweakpad/ui';</tp-code-block>`,
    'Code block composes the same control for its copy action; its `copy`, `copied` and `copyFailed` messages become the button labels.',
  ),
];
