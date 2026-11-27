import type { PresentationDictionary } from '../resolver.js';
import { dropInto } from './shared/drop-line.js';
import { insetFocusRing } from './shared/focus.js';
import { checkboxRules } from './shared/selection-control.js';
import {
  tableBorders,
  tableCellBox,
  tableCellLines,
  tableHeaderBlockSize,
  tableHeaderType,
  tableLastColumn,
  tableOutline,
  tableOverSurface,
  tablePinnedEndEdge,
  tablePinnedEndEdgeRtl,
  tablePinnedStartEdge,
  tablePinnedStartEdgeRtl,
  tableRowHeaderType,
  tableRowHover,
  tableSelectedFill,
  tableSortedIndicator,
  tableStripeFill,
  tableSurface,
  tableText,
} from './shared/table-surface.js';

// Component Library Data view presentation: the shared rule of tabular data (header, sort
// chevron and cell text; flat-aware lines by `borders`; stripe, hover and selected fills) on
// fixed-height rows. Public `--tp-data-view-*` hooks set on the host win over these defaults.

/** A layer over a whole row, above its pinned cells, for the row's rings. */
const rowOverlay = {
  content: "''",
  position: 'absolute',
  inset: '0',
  'z-index': '2',
  'pointer-events': 'none',
};

/** A row's fill, which its pinned cells paint over the surface so scrolled cells never show. */
const rowFill = '--_tp-data-view-row-fill';
/** Pinned cells, and their boundary while columns scroll under it. */
const pinned = (surface: string) => [
  { selector: '&[data-pinned]', declarations: { background: surface } },
  {
    selector: '[data-overflow~="start"] &[data-pin-edge="start"]',
    declarations: tablePinnedStartEdge,
  },
  { selector: '[data-overflow~="end"] &[data-pin-edge="end"]', declarations: tablePinnedEndEdge },
  {
    selector: '[data-overflow~="start"] &[data-pin-edge="start"]:dir(rtl)',
    declarations: tablePinnedStartEdgeRtl,
  },
  {
    selector: '[data-overflow~="end"] &[data-pin-edge="end"]:dir(rtl)',
    declarations: tablePinnedEndEdgeRtl,
  },
];

/**
 * A dragged row or tile lifts onto a floating surface with a shadow, in place of the top layer's
 * default frame; the drag feedback dims the copy it leaves in the list (the shared drag ghost).
 */
const dragFeedback = [
  {
    selector: '&[data-dragging]',
    declarations: {
      border: 'none',
      'border-radius': 'var(--tp-radius-md)',
      background: `linear-gradient(var(${rowFill}) 0 0), var(--tp-popover)`,
      'box-shadow': 'var(--tp-shadow-lg)',
      overflow: 'hidden',
    },
  },
];

const size = (row: string, header: string, text: string) => [
  {
    declarations: {
      '--_row-height': `var(--tp-data-view-row-height, ${row})`,
      '--_header-height': `var(--tp-data-view-header-height, ${header})`,
      'font-size': text,
    },
  },
];

export const dataViewAppearance: PresentationDictionary = {
  'data-view': [
    {
      declarations: {
        ...tableText,
        ...tableBorders('rows'),
        '--_row-height': 'var(--tp-data-view-row-height, var(--tp-space-10))',
        '--_header-height': `var(--tp-data-view-header-height, ${tableHeaderBlockSize})`,
      },
    },
  ],
  'data-view-size-sm': size('var(--tp-space-8)', 'var(--tp-space-8)', 'var(--tp-text-xs)'),
  'data-view-size-default': size('var(--tp-space-10)', tableHeaderBlockSize, 'var(--tp-text-sm)'),
  'data-view-size-lg': size('var(--tp-space-12)', 'var(--tp-space-12)', 'var(--tp-text-sm)'),
  'data-view-borders-rows': [{ declarations: tableBorders('rows') }],
  'data-view-borders-grid': [{ declarations: tableBorders('grid') }],
  'data-view-borders-none': [{ declarations: tableBorders('none') }],
  'data-view-variant-default': [],
  // The frame clips the header and the scroller to its rounded corners.
  'data-view-variant-outline': [{ declarations: { ...tableOutline, overflow: 'clip' } }],
  'data-view-viewport': [],
  'data-view-header': [],
  'data-view-column-header': [
    { declarations: { ...tableCellBox, ...tableCellLines, ...tableHeaderType } },
    { selector: '&:last-child', declarations: tableLastColumn },
    { selector: '&[data-sortable]:hover', declarations: { color: 'var(--tp-foreground)' } },
    ...pinned(tableSurface),
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-sort-indicator': [
    {
      declarations: {
        'min-inline-size': '1em',
        'block-size': '1em',
        'align-items': 'center',
        'justify-content': 'center',
        color: 'inherit',
      },
    },
    // The unsorted mark stays quieter than the header text; the sorted column's chevron alone
    // takes the foreground.
    { selector: '&:not([data-active])', declarations: { opacity: '0.6' } },
    { selector: '&[data-active]', declarations: tableSortedIndicator },
  ],
  'data-view-body': [],
  // Stripe, hover and selected in order of strength; the later rule wins where they meet.
  'data-view-row': [
    { declarations: { [rowFill]: 'transparent', background: `var(${rowFill})` } },
    { selector: '&[data-stripe]', declarations: { [rowFill]: tableStripeFill } },
    { selector: '&:hover', declarations: { [rowFill]: tableRowHover } },
    { selector: '&[data-selected]', declarations: { [rowFill]: tableSelectedFill } },
    // The focus ring and the drop-into ring of a whole row lie over its pinned cells.
    { selector: '&:focus-visible', declarations: { outline: 'none' } },
    { selector: '&:focus-visible::after', declarations: { ...rowOverlay, ...insetFocusRing } },
    { selector: '&[data-drop-target]::after', declarations: { ...rowOverlay, ...dropInto } },
    ...dragFeedback,
  ],
  'data-view-cell': [
    { declarations: { ...tableCellBox, ...tableCellLines } },
    { selector: '&:last-child', declarations: tableLastColumn },
    { selector: '&[data-row-header]', declarations: tableRowHeaderType },
    ...pinned(tableOverSurface(`var(${rowFill})`)),
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-state': [],
  'data-view-skeleton': [],
  'data-view-selection-box': [...checkboxRules],
  // Tiles take the rows' fills in the same order of strength, on a rounded surface.
  'data-view-tile': [
    {
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-md)',
        [rowFill]: 'transparent',
        background: `var(${rowFill})`,
      },
    },
    { selector: '&:hover', declarations: { [rowFill]: tableRowHover } },
    { selector: '&[data-selected]', declarations: { [rowFill]: tableSelectedFill } },
    { selector: '&[data-drop-target]', declarations: dropInto },
    { selector: '&:focus-visible', declarations: insetFocusRing },
    ...dragFeedback,
    { selector: '& .tile-title', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    {
      selector: '& .tile-subtitle',
      declarations: { color: 'var(--tp-muted-foreground)', 'font-size': 'var(--tp-text-xs)' },
    },
  ],
};
