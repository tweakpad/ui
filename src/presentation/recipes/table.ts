import { fillLayer, fillLayerHost } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { fillColor } from './shared/fill.js';
import {
  tableBorders,
  tableCellBox,
  tableCellFillLayer,
  tableCellLines,
  tableFooterFill,
  tableHeaderBlockSize,
  tableHeaderType,
  tableLastColumn,
  tableLastRow,
  tableOutline,
  tableOverSurface,
  tablePinnedEndEdge,
  tablePinnedEndEdgeRtl,
  tablePinnedStartEdge,
  tablePinnedStartEdgeRtl,
  tableRowHover,
  tableSelectedFill,
  tableStickyFooterEdge,
  tableStickyHeaderEdge,
  tableStripeFill,
  tableSurface,
  tableText,
} from './shared/table-surface.js';

/** Whether a row's cells show their fill layer; each row resets it for nested tables. */
const rowFill = '--_tp-table-row-fill';
/** The fills of a cell's row and section, which a pinned cell repeats over the surface. */
const rowPaint = '--_tp-table-row-paint';
const sectionPaint = '--_tp-table-section-paint';
const cells = [
  { declarations: { ...tableCellBox, 'vertical-align': 'middle', ...tableCellLines } },
  {
    selector: '&[data-sticky-column]',
    declarations: {
      background: `linear-gradient(var(${rowPaint}, transparent) 0 0), ${tableOverSurface(`var(${sectionPaint}, transparent)`)}`,
    },
  },
  // The innermost pinned cell while other columns scroll under its side: the pinned boundary.
  { selector: '&[data-sticky-edge="start"]', declarations: tablePinnedStartEdge },
  { selector: '&[data-sticky-edge="end"]', declarations: tablePinnedEndEdge },
  { selector: '&[data-sticky-edge="start"]:dir(rtl)', declarations: tablePinnedStartEdgeRtl },
  { selector: '&[data-sticky-edge="end"]:dir(rtl)', declarations: tablePinnedEndEdgeRtl },
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
  'table-variant-default': [],
  'table-variant-outline': [{ declarations: tableOutline }],
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
        [sectionPaint]: 'transparent',
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
  'table-header': [
    // A pinned header covers the rows that scroll under it.
    { selector: '&[data-sticky]', declarations: { background: tableSurface } },
    // While rows scroll under a sticky header, it casts the pinned shadow onto them.
    { selector: '&[data-sticky-edge="start"]', declarations: tableStickyHeaderEdge },
  ],
  'table-body': [],
  'table-footer': [
    {
      declarations: {
        [sectionPaint]: tableFooterFill,
        background: `var(${sectionPaint})`,
        'font-weight': 'var(--tp-font-medium)',
      },
    },
    { selector: '&[data-sticky]', declarations: { background: tableOverSurface(tableFooterFill) } },
    { selector: '&[data-sticky-edge="end"]', declarations: tableStickyFooterEdge },
  ],
  'table-row': [
    { declarations: { [rowPaint]: 'transparent', background: `var(${rowPaint})`, [rowFill]: '0' } },
    // Alternate body rows: one fill under all the row's cells, which a selected row replaces.
    { selector: '&[data-stripe]', declarations: { [rowPaint]: tableStripeFill } },
    { selector: '&:hover', declarations: { [rowFill]: '1' } },
    {
      selector:
        ':host([selection-presentation="row"]) &[data-selected], &[data-selection-presentation="row"][data-selected]',
      declarations: {
        [rowPaint]: tableSelectedFill,
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
