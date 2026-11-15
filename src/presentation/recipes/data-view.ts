import type { PresentationDictionary } from '../resolver.js';
import { insetFocusRing } from './shared/focus.js';
import {
  tableCellBox,
  tableHeaderBlockSize,
  tableHeaderType,
  tableRowHover,
  tableSelectedFill,
  tableText,
} from './shared/table-surface.js';

// Component Library Data view presentation: the look of Table (its text, cell box, divider,
// header weight, row hover and selected fill) on fixed-height rows. Public `--tp-data-view-*`
// hooks set on the host win over these defaults.

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
        '--_row-height': 'var(--tp-data-view-row-height, var(--tp-space-10))',
        '--_header-height': `var(--tp-data-view-header-height, ${tableHeaderBlockSize})`,
      },
    },
  ],
  'data-view-size-sm': size('var(--tp-space-8)', 'var(--tp-space-8)', 'var(--tp-text-xs)'),
  'data-view-size-default': size('var(--tp-space-10)', tableHeaderBlockSize, 'var(--tp-text-sm)'),
  'data-view-size-lg': size('var(--tp-space-12)', 'var(--tp-space-12)', 'var(--tp-text-sm)'),
  'data-view-viewport': [],
  'data-view-header': [{ declarations: { background: 'var(--tp-background)' } }],
  'data-view-column-header': [
    { declarations: { ...tableCellBox, ...tableHeaderType } },
    { selector: '&[data-sortable]:hover', declarations: { color: 'var(--tp-foreground)' } },
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-sort-indicator': [
    {
      declarations: {
        'inline-size': '1em',
        'block-size': '1em',
        color: 'var(--tp-muted-foreground)',
      },
    },
    { selector: '&[data-active]', declarations: { color: 'var(--tp-foreground)' } },
  ],
  'data-view-body': [],
  'data-view-row': [
    { selector: '&:hover', declarations: { background: tableRowHover } },
    { selector: '&[data-selected]', declarations: { background: tableSelectedFill } },
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-cell': [
    { declarations: tableCellBox },
    { selector: '&[data-row-header]', declarations: tableHeaderType },
    { selector: '&:focus-visible', declarations: insetFocusRing },
  ],
  'data-view-state': [
    { declarations: { background: 'var(--tp-background)' } },
    // The loading Progress bar paints its own track.
    { selector: '&[data-status="loading"]', declarations: { background: 'transparent' } },
  ],
  'data-view-skeleton': [],
};
