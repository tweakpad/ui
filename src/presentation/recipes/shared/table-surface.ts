import type { PresentationDeclarations } from '../../resolver.js';
import { divider } from './edges.js';

// The look of tabular data, shared by Table and Data view: the text of the table, the box and
// divider of every cell, the weight of column headers, and the row hover and selected fills.

/** The table's text and surface. */
export const tableText: PresentationDeclarations = {
  'font-size': 'var(--tp-text-sm)',
  color: 'var(--tp-foreground)',
  background: 'var(--tp-background)',
};

/** Every header and body cell: its inset, alignment and the divider below it. */
export const tableCellBox: PresentationDeclarations = {
  padding: 'var(--tp-space-2)',
  'box-sizing': 'border-box',
  'text-align': 'start',
  'border-block-end': divider.border,
};

/** A column header's weight. */
export const tableHeaderType: PresentationDeclarations = {
  'font-weight': 'var(--tp-font-medium)',
};

/** The default header height. */
export const tableHeaderBlockSize = 'var(--tp-space-10)';

/** A hovered row's fill; it reaches every cell, sticky cells included. */
export const tableRowHover = 'color-mix(in oklab, var(--tp-muted) 50%, var(--tp-background))';

/** A selected row's fill. */
export const tableSelectedFill = 'var(--tp-muted)';
