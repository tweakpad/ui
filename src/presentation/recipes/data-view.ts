import type { PresentationDictionary } from '../resolver.js';
import { insetFocusRing } from './shared/focus.js';
import {
  tableBorders,
  tableCellBox,
  tableCellLines,
  tableHeaderBlockSize,
  tableHeaderType,
  tableLastColumn,
  tablePinnedEndEdge,
  tablePinnedStartEdge,
  tableRowHeaderType,
  tableRowHover,
  tableSelectedFill,
  tableSortedIndicator,
  tableStripeFill,
  tableText,
} from './shared/table-surface.js';

// Component Library Data view presentation: the shared rule of tabular data (header, sort
// chevron and cell text; flat-aware lines by `borders`; stripe, hover and selected fills) on
// fixed-height rows. Public `--tp-data-view-*` hooks set on the host win over these defaults.

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
  'data-view-viewport': [],
  'data-view-header': [{ declarations: { background: 'var(--tp-background)' } }],
  'data-view-column-header': [
    { declarations: { ...tableCellBox, ...tableCellLines, ...tableHeaderType } },
    { selector: '&:last-child', declarations: tableLastColumn },
    { selector: '&[data-sortable]:hover', declarations: { color: 'var(--tp-foreground)' } },
    ...pinned('var(--tp-background)'),
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
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-cell': [
    { declarations: { ...tableCellBox, ...tableCellLines } },
    { selector: '&:last-child', declarations: tableLastColumn },
    { selector: '&[data-row-header]', declarations: tableRowHeaderType },
    ...pinned(`linear-gradient(var(${rowFill}) 0 0), var(--tp-background)`),
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-state': [
    { declarations: { background: 'var(--tp-background)' } },
    // The loading Progress bar paints its own track.
    { selector: '&[data-status="loading"]', declarations: { background: 'transparent' } },
  ],
  'data-view-skeleton': [],
};
