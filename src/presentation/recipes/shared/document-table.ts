import type { PresentationRule } from '../../resolver.js';
import { at } from './document-content.js';
import { selectionFill } from './selection.js';

/** The inline and block padding of a document table cell: Table's cell padding. */
export const documentCellPadding = 'var(--tp-space-2)';

/** The consumer's selectors of a native table that a content scope renders (`uwg-te-table-req-document`). */
export interface DocumentTableSelectors {
  /** The inline overflow container around the table. */
  readonly wrapper: string;
  /** The table. */
  readonly table: string;
  /** A table whose content declares its column widths. */
  readonly sizedTable: string;
  /** Every cell, header cells included. */
  readonly cell: string;
  /** A header cell. */
  readonly headerCell: string;
  /** A cell of a selected cell range. */
  readonly selectedCell: string;
}

/**
 * The document table presentation (`uwg-te-table-req-document`), separate from Table's data-table
 * look: grid borders in the border role, wrapping cells aligned to the block start with Table's
 * cell padding, a muted header fill with Table's header weight, automatic columns unless widths are
 * declared (then a fixed layout honors them), a wrapper that scrolls a wide table, and a cell-range
 * tint from the shared selection fill (`uwg-te-sel-req-overlay`). It adds no interactive behavior
 * (`audit-table-no-grid`).
 */
export function documentTableRules(selectors: DocumentTableSelectors): readonly PresentationRule[] {
  return [
    at(selectors.wrapper, { 'overflow-x': 'auto' }),
    at(selectors.table, { 'inline-size': '100%', 'border-collapse': 'collapse' }),
    at(selectors.sizedTable, { 'table-layout': 'fixed', 'inline-size': 'fit-content' }),
    at(selectors.cell, {
      padding: documentCellPadding,
      'box-sizing': 'border-box',
      'text-align': 'start',
      'vertical-align': 'top',
      border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
    }),
    // The longhand, so a cell's own background replaces the header fill and the tint stays above.
    at(selectors.headerCell, {
      'background-color': 'var(--tp-muted)',
      'font-weight': 'var(--tp-font-medium)',
    }),
    // Paint only, layered over the cell's own fill (`uwg-te-req-pres-4`).
    at(selectors.selectedCell, {
      'background-image': `linear-gradient(${selectionFill}, ${selectionFill})`,
    }),
  ];
}
