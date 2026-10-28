import { markupExample } from './documentation-examples.js';

const editor = (marker: string, label: string, value: string, suffix = '', attributes = '') =>
  `<tp-input-group><span slot="prefix">${marker}</span><tp-input label="${label}" default-value="${value}" inputmode="numeric" ${attributes}></tp-input>${suffix ? `<span slot="suffix">${suffix}</span>` : ''}</tp-input-group>`;
const group = (label: string, content: string, attributes = '', style = '') =>
  `<tp-field-group label="${label}" ${attributes}${style ? ` style="${style}"` : ''}>${content}</tp-field-group>`;
const stack = (content: string) =>
  `<div style="display:grid;gap:var(--tp-space-5);max-inline-size:calc(var(--tp-spacing) * 100)">${content}</div>`;

export const fieldGroupExamples = [
  markupExample(
    'Coordinates and channels',
    stack(
      group('Position', editor('X', 'X', '24') + editor('Y', 'Y', '48') + editor('Z', 'Z', '0')) +
        group(
          'Color',
          editor('R', 'Red', '109') + editor('G', 'Green', '93') + editor('B', 'Blue', '252'),
        ),
    ),
    'Three editors share the width equally; the prefixes mark each dimension while every Input keeps a complete accessible label.',
  ),
  markupExample(
    'Tuple with a separate value',
    `<div style="display:flex;align-items:center;gap:var(--tp-space-2);max-inline-size:calc(var(--tp-spacing) * 100)">${group(
      'RGB',
      editor('R', 'Red', '109') + editor('G', 'Green', '93') + editor('B', 'Blue', '252'),
      '',
      'flex:1 1 0;min-inline-size:0',
    )}<tp-input-group style="flex:0 1 calc(var(--tp-spacing) * 24)"><tp-input label="Alpha" default-value="100" inputmode="numeric"></tp-input><span slot="suffix">%</span></tp-input-group></div>`,
    'A related value that is not part of the tuple, such as opacity, stays outside the group with the ordinary gap.',
  ),
  markupExample(
    'Vertical and separated',
    stack(
      group(
        'Margins',
        editor('T', 'Top', '8', 'px') + editor('B', 'Bottom', '8', 'px'),
        'orientation="vertical"',
        'max-inline-size:calc(var(--tp-spacing) * 40)',
      ) +
        group(
          'Range',
          editor('Min', 'Minimum', '0') +
            '<tp-separator></tp-separator>' +
            editor('Max', 'Maximum', '100'),
        ),
    ),
    'Vertical groups stretch editors to the widest one and join block edges; a Separator divides editors and takes the perpendicular axis.',
  ),
  markupExample(
    'Mixed members and states',
    stack(
      group(
        'Size',
        editor('W', 'Width', '1280', 'px') +
          editor('H', 'Height', '720', 'px') +
          '<tp-toggle aria-label="Lock aspect ratio" variant="outline">Lock</tp-toggle>',
      ) +
        group(
          'Timeout',
          editor('', 'Seconds', '30', 's', 'readonly') + editor('', 'Retries', '3', '', 'disabled'),
        ),
    ),
    'A Toggle joins beside the editors with its own pressed state; read-only and disabled editors keep their own treatment. Toggle the `joined` control on the Default story to see every editor keep its corners with the theme gap.',
  ),
];
