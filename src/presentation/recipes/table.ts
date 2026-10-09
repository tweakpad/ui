import { fillLayer, fillLayerHost } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { fillColor } from './shared/fill.js';

/** Whether a row's cells show their fill layer; each row resets it for nested tables. */
const rowFill = '--_tp-table-row-fill';
// Row hover reaches every cell, including sticky cells that paint the row's fill themselves.
const rowHover = 'color-mix(in oklab, var(--tp-muted) 50%, var(--tp-background))';
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
  // Nova cn-table-body/cn-table-footer: the last row of a section has no bottom border.
  { selector: '&[data-last-row]', declarations: { 'border-block-end-width': '0' } },
  fillColor(rowHover),
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
    { declarations: { background: 'inherit', [rowFill]: '0' } },
    { selector: '&:hover', declarations: { [rowFill]: '1' } },
    {
      selector:
        ':host([selection-presentation="row"]) &[data-selected], &[data-selection-presentation="row"][data-selected]',
      declarations: { background: 'var(--tp-muted)', [rowFill]: '0' },
    },
  ],
  'table-column-header': [
    ...cells,
    {
      declarations: {
        // Nova cn-table-head: h-10.
        'block-size': 'var(--tp-space-10)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'table-cell': cells,
};

/** Every cell carries the fill layer; its row decides when it shows. */
const cellLayer = [
  { declarations: fillLayerHost },
  { selector: '&::before', declarations: { ...fillLayer(), opacity: `var(${rowFill}, 0)` } },
];
export const tableStructure: PresentationDictionary = {
  'table-column-header': cellLayer,
  'table-cell': cellLayer,
};
