import { fillLayer, fillLayerHost } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { fillColor } from './shared/fill.js';
import {
  tableBorders,
  tableCellBox,
  tableCellFillLayer,
  tableCellLines,
  tableHeaderBlockSize,
  tableHeaderType,
  tableLastColumn,
  tableLastRow,
  tableRowHover,
  tableSelectedFill,
  tableStripeFill,
  tableText,
} from './shared/table-surface.js';

/** Whether a row's cells show their fill layer; each row resets it for nested tables. */
const rowFill = '--_tp-table-row-fill';
const cells = [
  { declarations: { ...tableCellBox, 'vertical-align': 'middle', ...tableCellLines } },
  { selector: '&[data-sticky-column]', declarations: { background: 'inherit' } },
  { selector: '&[data-last-column]', declarations: tableLastColumn },
  // The last row of a body or footer section has no bottom border.
  { selector: '&[data-last-row]', declarations: tableLastRow },
  fillColor(tableRowHover),
];
/** Native Table regions; all insets and type use the common theme. */
export const tableAppearance: PresentationDictionary = {
  table: [{ declarations: tableBorders('rows') }],
  'table-borders-rows': [{ declarations: tableBorders('rows') }],
  'table-borders-grid': [{ declarations: tableBorders('grid') }],
  'table-borders-none': [{ declarations: tableBorders('none') }],
  'table-table': [
    {
      declarations: {
        'inline-size': '100%',
        // Cells draw only their end lines, so separate borders never double. Each cell owns its
        // lines, and a cleared line shows the row's fill rather than the table behind it.
        'border-collapse': 'separate',
        'border-spacing': '0',
        'caption-side': 'bottom',
        ...tableText,
      },
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
      },
    },
  ],
  'table-row': [
    { declarations: { background: 'inherit', [rowFill]: '0' } },
    // Alternate body rows: one fill under all the row's cells, which a selected row replaces.
    { selector: '&[data-stripe]', declarations: { background: tableStripeFill } },
    { selector: '&:hover', declarations: { [rowFill]: '1' } },
    {
      selector:
        ':host([selection-presentation="row"]) &[data-selected], &[data-selection-presentation="row"][data-selected]',
      declarations: {
        background: tableSelectedFill,
        [rowFill]: '0',
      },
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
  {
    selector: '&::before',
    declarations: { ...fillLayer(), ...tableCellFillLayer, opacity: `var(${rowFill}, 0)` },
  },
];
export const tableStructure: PresentationDictionary = {
  'table-column-header': cellLayer,
  'table-cell': cellLayer,
};
