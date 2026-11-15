import { css } from 'lit';

/** Geometry the presentation cannot replace: the toolbar row, the panels and the status line. */
export const fileExplorerStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
    block-size: calc(var(--tp-spacing) * 120);
    contain: inline-size;
  }

  :host([hidden]) {
    display: none;
  }

  .root {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    block-size: 100%;
    min-block-size: 0;
  }

  .toolbar {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
  }

  .path {
    flex: 1 1 12rem;
    min-inline-size: 0;
  }

  .search {
    flex: 0 1 16rem;
    min-inline-size: 10rem;
  }

  .panels {
    flex: 1 1 0;
    min-block-size: 0;
  }

  /* Each panel's content fills it: the tree, the view and the details scroll inside. */
  .pane,
  .details {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    block-size: 100%;
    min-block-size: 0;
  }

  .tree {
    flex: 1 1 0;
    min-block-size: 0;
  }

  .view {
    flex: 1 1 0;
    block-size: auto;
    min-block-size: 0;
  }

  .view[data-view='icons'] {
    --tp-data-view-tile-size: var(--tp-file-explorer-tile-size, calc(var(--tp-spacing) * 28));
  }

  .view[data-view='gallery'] {
    --tp-data-view-tile-size: var(
      --tp-file-explorer-gallery-tile-size,
      calc(var(--tp-spacing) * 48)
    );
  }

  .details {
    overflow: auto;
  }

  .preview {
    display: grid;
    flex: none;
    place-items: center;
    overflow: hidden;
  }

  .status {
    display: flex;
    flex: none;
    flex-wrap: wrap;
    align-items: center;
  }

  .status-message {
    margin-inline-start: auto;
  }

  .columns {
    flex: 1 1 0;
    min-block-size: 0;
  }

  .column-track {
    display: flex;
    block-size: 100%;
  }

  .column {
    flex: none;
    inline-size: var(--tp-file-explorer-column-size, calc(var(--tp-spacing) * 60));
    block-size: 100%;
  }
`;
