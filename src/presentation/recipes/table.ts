import type { PresentationDictionary } from '../resolver.js';
const cells = [
  {
    declarations: {
      padding: 'var(--tp-space-2)',
      'box-sizing': 'border-box',
      'text-align': 'start',
      'vertical-align': 'middle',
      'white-space': 'nowrap',
      'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    },
  },
  { selector: '&[data-sticky-column]', declarations: { background: 'inherit' } },
];
/** Native Table regions from base/Nova; all insets and type use the common theme. */
export const tableAppearance: PresentationDictionary = {
  table: [],
  'table-table': [
    {
      declarations: {
        'inline-size': '100%',
        'border-collapse': 'collapse',
        'caption-side': 'bottom',
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-foreground)',
        background: 'var(--tp-background)',
      },
    },
    {
      selector: '&[data-sticky-regions="true"]',
      declarations: { 'border-collapse': 'separate', 'border-spacing': '0' },
    },
  ],
  'table-caption': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        padding: 'var(--tp-space-4)',
      },
    },
  ],
  'table-header': [{ declarations: { background: 'inherit' } }],
  'table-body': [{ declarations: { background: 'inherit' } }],
  'table-footer': [
    {
      declarations: {
        background: 'color-mix(in oklab, var(--tp-muted) 50%, var(--tp-background))',
        'font-weight': 'var(--tp-font-medium)',
        'border-block-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'table-row': [
    {
      declarations: {
        background: 'inherit',
        transition:
          'background-color calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    {
      selector: '&:hover',
      declarations: {
        background: 'color-mix(in oklab, var(--tp-muted) 50%, var(--tp-background))',
      },
    },
    {
      selector:
        ':host([selection-presentation="row"]) &:is([data-selected]:not([data-selected="false"]),[data-state="selected"]), &[data-selection-presentation="row"][data-selected]',
      declarations: { background: 'var(--tp-muted)' },
    },
  ],
  'table-column-header': [
    ...cells,
    {
      declarations: {
        'block-size': 'calc(var(--tp-spacing) * 10)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'table-cell': cells,
};
