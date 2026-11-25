import { css } from 'lit';
import { selectionBoxStyles } from '../shared/control-styles.js';

/**
 * Geometry the presentation cannot replace: one CSS grid whose header row and rows share the
 * column tracks through subgrid, a sticky header, fixed-height rows and the state layer under the
 * header. Paint lives in the presentation family.
 */
export const dataViewStyles = [
  selectionBoxStyles,
  css`
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

      --_tile-size: var(--tp-data-view-tile-size, calc(var(--tp-spacing) * 40));
      --_tile-gap: var(--tp-data-view-tile-gap, var(--tp-space-3));
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
      position: relative;
      block-size: var(--_row-height);
      cursor: default;
    }

    /* A dragged row lifts into the top layer, outside the grid, where subgrid has no tracks: it
       takes the grid's measured tracks instead, so its cells keep their columns. */
    .body [role='row'][data-dragging] {
      grid-template-columns: var(--_tracks, var(--_columns));
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

    /* A hidden header leaves the layout but keeps naming the columns. */
    .root[data-header='hidden'] {
      --_header-height: 0px;
    }

    .root[data-header='hidden'] .head {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
    }

    /* Selection boxes: drawn spans, so the row keeps the press and the check shows when set. */
    [part~='data-view-selection-box'] {
      display: inline-flex;
      flex: none;
      align-items: center;
    }

    .check {
      display: inline-flex;
      inline-size: 100%;
      block-size: 100%;
      visibility: hidden;
    }

    [part~='data-view-selection-box'][data-checked] .check,
    [part~='data-view-selection-box'][data-indeterminate] .check {
      visibility: visible;
    }

    .check tp-icon {
      inline-size: 100%;
      block-size: 100%;
    }

    [data-column='#selection'] {
      cursor: pointer;
    }

    /* Grid layout: rows of tiles, each at least the tile size, as many as fit the width. */

    .root[data-layout='grid'] .body {
      display: block;
      min-inline-size: 0;
      padding: var(--_tile-gap) var(--_tile-gap) 0;
    }

    .root[data-layout='grid'] .tile-row {
      display: grid;
      grid-template-columns: repeat(var(--_tile-columns, 1), minmax(0, 1fr));
      gap: var(--_tile-gap);
      block-size: auto;
      padding-block-end: var(--_tile-gap);
      box-sizing: border-box;
    }

    /* A press on a draggable row or tile starts a drag, never a text selection. */
    [data-draggable] {
      user-select: none;
    }

    [part~='data-view-tile'] {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: stretch;
      justify-content: flex-start;
      text-align: start;
      min-inline-size: 0;
      overflow: hidden;
      outline-offset: -2px;
      cursor: default;
    }

    :host([selection-mode='single']) [part~='data-view-tile'],
    :host([selection-mode='multiple']) [part~='data-view-tile'] {
      cursor: pointer;
    }

    .tile-title,
    .tile-subtitle {
      display: block;
      min-inline-size: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* The default tile's text keeps clear of the selection box. */
    .tile-box ~ .tile-title,
    .tile-box ~ .tile-subtitle {
      padding-inline-start: calc(var(--tp-icon-size-md) + var(--tp-space-2));
    }

    .tile-box {
      position: absolute;
      inset-block-start: var(--tp-space-2);
      inset-inline-start: var(--tp-space-2);
      z-index: 1;
    }

    .skeleton-tile {
      display: grid;
      block-size: calc(var(--tp-spacing) * 24);
    }

    .skeleton-tile tp-skeleton {
      inline-size: 100%;
      block-size: 100%;
    }

    .tile-probe,
    .gap-probe {
      position: absolute;
      inset-block-start: 0;
      block-size: 0;
      visibility: hidden;
      pointer-events: none;
    }

    .tile-probe {
      inline-size: calc(var(--_tile-size) + var(--_tile-gap));
    }

    .gap-probe {
      inline-size: var(--_tile-gap);
    }
  `,
];
