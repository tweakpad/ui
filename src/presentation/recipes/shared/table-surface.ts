import type { PresentationDeclarations } from '../../resolver.js';
import { surfaceEdge } from './edges.js';

// The one rule of tabular data, shared by Table and Data view, so every table follows it without
// per-component styling:
// - Text: column headers take the muted foreground and cells the foreground; the sorted column
//   shows its chevron in the foreground.
// - Lines: every cell line is the surface edge, which the flat appearance clears, so flat tables
//   lose their borders by themselves. `borders` chooses row lines (the default), a grid of row and
//   column lines, or none, through two private line widths the cells read.
// - Fills: alternating rows, a hovered row and a selected row each take their own fill, in that
//   order of strength, so stripes never read as hover or selection.

/** The table's text and surface. */
export const tableText: PresentationDeclarations = {
  'font-size': 'var(--tp-text-sm)',
  color: 'var(--tp-foreground)',
  background: 'var(--tp-background)',
};

/**
 * The line width under a cell and at its inline end. `tableBorders` sets them on the table's root
 * (a line a mode leaves out has no width, so no corner of it shows), and the last row and column
 * clear their own.
 */
const rowLineWidth = '--_tp-table-row-line-width';
const columnLineWidth = '--_tp-table-column-line-width';
const rowWidth = `var(${rowLineWidth}, var(--tp-border-width))`;
const columnWidth = `var(${columnLineWidth}, 0px)`;

/** Every header and body cell: its inset and alignment. */
export const tableCellBox: PresentationDeclarations = {
  padding: 'var(--tp-space-2)',
  'box-sizing': 'border-box',
  'text-align': 'start',
};

/** The lines of a cell: below it for rows, at its inline end for columns. */
export const tableCellLines: PresentationDeclarations = {
  'border-block-end': surfaceEdge.border,
  'border-block-end-width': rowWidth,
  'border-inline-end': surfaceEdge.border,
  'border-inline-end-width': columnWidth,
};

/** The last column draws no column line. */
export const tableLastColumn: PresentationDeclarations = { [columnLineWidth]: '0px' };

/** The last row of a section draws no row line. */
export const tableLastRow: PresentationDeclarations = { [rowLineWidth]: '0px' };

/**
 * A fill layer over a cell (its `::before`) reaches under the cell's lines and draws them again,
 * so a line the flat appearance clears shows the fill instead of a seam, and a drawn line stays.
 */
export const tableCellFillLayer: PresentationDeclarations = {
  'inset-block-end': `calc(-1 * ${rowWidth})`,
  'inset-inline-end': `calc(-1 * ${columnWidth})`,
  ...tableCellLines,
};

/**
 * The boundary of pinned columns while other columns scroll under them: the start edge draws its
 * column line, the end edge a line at its inline start, in every `borders` mode, and both cast the
 * theme's shadow over the scrolled columns. The shadow is clipped to the side it falls on, so it
 * never darkens the rows above and below or the pinned cells themselves.
 */
// The theme's shadows are a light-scheme black that a dark surface swallows: the shade is the
// surface itself, darkened, and stronger in the dark scheme, so it reads on either.
const shade = (alpha: number) => `oklch(from var(--tp-background) calc(l * 0.2) c h / ${alpha})`;
const pinnedShade = `light-dark(${shade(0.22)}, ${shade(0.9)})`;
const pinnedShadow = `0 0 var(--tp-space-5) ${pinnedShade}`;
const reach = 'calc(var(--tp-space-6) * -1)';
const towardRight = `inset(0 ${reach} 0 0)`;
const towardLeft = `inset(0 0 0 ${reach})`;
export const tablePinnedStartEdge: PresentationDeclarations = {
  [columnLineWidth]: 'var(--tp-border-width)',
  'box-shadow': pinnedShadow,
  'clip-path': towardRight,
};
export const tablePinnedEndEdge: PresentationDeclarations = {
  'border-inline-start': surfaceEdge.border,
  'box-shadow': pinnedShadow,
  'clip-path': towardLeft,
};
/** Right to left, the shadows fall the other way. */
export const tablePinnedStartEdgeRtl: PresentationDeclarations = { 'clip-path': towardLeft };
export const tablePinnedEndEdgeRtl: PresentationDeclarations = { 'clip-path': towardRight };

/** How a table draws its lines. */
export type TableBorders = 'rows' | 'grid' | 'none';

/** The root declarations of a `borders` value. */
export function tableBorders(mode: TableBorders): PresentationDeclarations {
  return {
    [rowLineWidth]: mode === 'none' ? '0px' : 'var(--tp-border-width)',
    [columnLineWidth]: mode === 'grid' ? 'var(--tp-border-width)' : '0px',
  };
}

/** A column header's text: medium weight in the muted foreground. */
export const tableHeaderType: PresentationDeclarations = {
  'font-weight': 'var(--tp-font-medium)',
  color: 'var(--tp-muted-foreground)',
};

/** The sorted column's chevron: the foreground, apart from the muted header text. */
export const tableSortedIndicator: PresentationDeclarations = { color: 'var(--tp-foreground)' };

/** A cell that names its row: the header weight, in the cells' foreground. */
export const tableRowHeaderType: PresentationDeclarations = {
  'font-weight': 'var(--tp-font-medium)',
};

/** The default header height. */
export const tableHeaderBlockSize = 'var(--tp-space-10)';

/** An alternating row's fill: the lightest step. */
export const tableStripeFill = 'color-mix(in oklab, var(--tp-muted) 45%, var(--tp-background))';

/** A hovered row's fill: stronger than a stripe; it reaches every cell, sticky cells included. */
export const tableRowHover = 'var(--tp-muted)';

/** A selected row's fill: the primary tint, apart from stripes and hover. */
export const tableSelectedFill = 'var(--tp-primary-subtle)';
