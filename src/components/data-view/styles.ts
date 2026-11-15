import { css } from 'lit';

/**
 * Geometry the presentation cannot replace: one CSS grid whose header row and rows share the
 * column tracks through subgrid, a sticky header, fixed-height rows and the state layer under the
 * header. Paint lives in the presentation family.
 */
export const dataViewStyles = css`
  :host {
    display: block;
    position: relative;
    min-inline-size: 0;
    max-inline-size: 100%;

    /* The columns scroll inside the view: their width never sizes the page or a parent track. */
    contain: inline-size;

    /* About ten rows and the header; authors set the height they need. */
    block-size: calc(var(--tp-spacing) * 110);
  }

  :host([hidden]) {
    display: none;
  }

  .root {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }

  /* The header stays out of the scroller, so the rows' scrollbar starts below it. */
  .grid {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    block-size: 100%;
  }

  .head {
    flex: none;
    overflow: hidden;
    scroll-padding-inline: var(--_pinned-start, 0) var(--_pinned-end, 0);

    /* A classic scrollbar takes width from the rows; the header gives up the same. */
    padding-inline-end: var(--_gutter, 0);
  }

  .viewport {
    flex: 1 1 0;
    min-block-size: 0;
    overflow: auto;

    /* No vertical rubber band: it drags the rows out from under the pinned cells and the header. */
    overscroll-behavior-y: none;

    /* A focused cell is revealed clear of the pinned columns. */
    scroll-padding-inline: var(--_pinned-start, 0) var(--_pinned-end, 0);
  }

  /* Pinned columns stay at their edge, over the columns that scroll under them. */
  [data-pinned] {
    position: sticky;
    z-index: 1;
  }

  /* Header and rows share the column tracks: both fill the width, and never shrink below the
     columns' minimums, so they scroll sideways together. */
  .header,
  .body {
    display: grid;
    grid-template-columns: var(--_columns);
    inline-size: 100%;
    min-inline-size: min-content;
    box-sizing: border-box;
  }

  .header {
    block-size: var(--_header-height);
  }

  .body [role='row'],
  .skeleton-row {
    display: grid;
    grid-column: 1 / -1;
    grid-template-columns: subgrid;
    block-size: var(--_row-height);
    cursor: default;
  }

  /* A virtual window: the browser's anchoring would jump a reused row. */
  .body {
    grid-auto-rows: max-content;
    align-content: start;
    overflow-anchor: none;
  }

  .space {
    grid-column: 1 / -1;
  }

  [role='columnheader'],
  [role='gridcell'],
  [role='rowheader'],
  .skeleton-cell {
    display: flex;
    align-items: center;
    gap: var(--tp-space-1);
    min-inline-size: 0;
    overflow: hidden;
    white-space: nowrap;
    outline-offset: -2px;
  }

  [data-align='center'] {
    justify-content: center;
  }

  [data-align='end'] {
    justify-content: flex-end;
  }

  [role='columnheader'][data-sortable] {
    cursor: pointer;
    user-select: none;
  }

  /* A right-aligned header keeps its arrow on the label's inline start. */
  [role='columnheader'][data-align='end'] {
    flex-direction: row-reverse;
    justify-content: flex-start;
  }

  /* Text in a span, built-in or from a renderer, clips with an ellipsis. */
  :is([role='columnheader'], [role='gridcell'], [role='rowheader']) > span:not([part]) {
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  [part~='data-view-sort-indicator'] {
    display: inline-flex;
    flex: none;
  }

  [part~='data-view-sort-indicator'] > tp-icon {
    inline-size: 1em;
    block-size: 1em;
  }

  /* A header action sits at the far end from the label, whatever box its element makes. */
  slot.action {
    display: flex;
    flex: none;
    align-items: center;
    margin-inline-start: auto;
  }

  [role='columnheader'][data-align='end'] slot.action {
    margin-inline: 0 auto;
  }

  :host([selection-mode='single']) .body [role='row'] {
    cursor: pointer;
  }

  /* Placeholder bars sit where a cell's text would. */
  .skeleton-cell {
    padding-inline: var(--tp-space-2);
  }

  .skeleton-cell[data-pinned] {
    background: var(--tp-background);
  }

  .skeleton-cell tp-skeleton {
    inline-size: 60%;
    block-size: 0.75em;
  }

  .state {
    position: absolute;
    inset-inline: 0;
    inset-block: var(--_header-height) 0;
    display: grid;
    place-content: center;
    padding: var(--tp-space-4);
  }

  .state slot {
    display: contents;
  }

  /* An indeterminate bar along the header's bottom edge, over its divider. */
  .busy {
    position: absolute;
    inset-inline: 0;
    inset-block-start: calc(var(--_header-height) - var(--tp-space-1));
    z-index: 2;
  }
`;
