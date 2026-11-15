import { fillLayer, fillLayerHost } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { fillColor } from './shared/fill.js';
import { divider } from './shared/edges.js';
import {
  tableCellBox,
  tableHeaderBlockSize,
  tableHeaderType,
  tableRowHover,
  tableSelectedFill,
  tableText,
} from './shared/table-surface.js';

/** Whether a row's cells show their fill layer; each row resets it for nested tables. */
const rowFill = '--_tp-table-row-fill';
// Table cells also align vertically; the shared box keeps its divider last.
const { 'border-block-end': cellDivider, ...cellBox } = tableCellBox;
const cells = [
  {
    declarations: {
      ...cellBox,
      'vertical-align': 'middle',
      'border-block-end': cellDivider!,
    },
  },
  { selector: '&[data-sticky-column]', declarations: { background: 'inherit' } },
  // The last row of a body or footer section has no bottom border.
  { selector: '&[data-last-row]', declarations: { 'border-block-end-width': '0' } },
  fillColor(tableRowHover),
];
/** Native Table regions; all insets and type use the common theme. */
export const tableAppearance: PresentationDictionary = {
  table: [],
  'table-table': [
    {
      declarations: {
        'inline-size': '100%',
        'border-collapse': 'collapse',
        'caption-side': 'bottom',
        ...tableText,
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
        // The cells inherit the Table's `nowrap`; a caption is prose.
        'white-space': 'normal',
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
        'border-block-start': divider.border,
      },
    },
  ],
  'table-row': [
    { declarations: { background: 'inherit', [rowFill]: '0' } },
    { selector: '&:hover', declarations: { [rowFill]: '1' } },
    {
      selector:
        ':host([selection-presentation="row"]) &[data-selected], &[data-selection-presentation="row"][data-selected]',
      declarations: { background: tableSelectedFill, [rowFill]: '0' },
    },
  ],
  'table-column-header': [
    ...cells,
    {
      declarations: {
        'block-size': tableHeaderBlockSize,
        ...tableHeaderType,
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
