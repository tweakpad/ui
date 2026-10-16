import { css } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { fillLayerStyles } from '../../presentation/motion.js';

/** Structure only: arrangement, geometry and hit targets. Appearance lives in the recipe. */
export const fileUploadStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .root {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  ${fillLayerStyles('.dropzone')}

  .dropzone {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-inline-size: 0;
    text-align: center;
    text-wrap: balance;
    overflow-wrap: anywhere;
  }

  .media,
  .hint {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .media {
    flex-shrink: 0;
  }

  .hint {
    flex-wrap: wrap;
  }

  .title,
  .description {
    max-inline-size: 100%;
  }

  .trigger {
    flex: none;
  }

  .summary {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    min-inline-size: 0;
  }

  .items {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .items[data-item-size='xs'] {
    flex-flow: row wrap;
  }

  .items[data-layout='grid'] {
    display: grid;
    grid-template-columns: repeat(
      auto-fill,
      minmax(min(100%, var(--tp-file-upload-tile-size, calc(var(--tp-space-12) * 3))), 1fr)
    );
    grid-auto-rows: 1fr;
  }

  .item {
    display: flex;
    min-inline-size: 0;
  }

  .items[data-item-size='xs'] .item {
    max-inline-size: 100%;
  }

  .item > tp-attachment {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .items[data-item-size='xs'] .item > tp-attachment {
    flex: 0 1 auto;
  }

  .items[data-layout='grid'] .item > tp-attachment::part(attachment-root) {
    inline-size: 100%;
    block-size: 100%;
  }

  .preview {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  .tile {
    display: flex;
  }

  .tile > .dropzone {
    flex: 1;
    min-block-size: calc(var(--tp-space-12) * 2);
  }

  /* Pinned in the row's bottom padding so uploading never changes the row height. */
  .progress {
    position: absolute;
    inset-inline: var(--tp-file-upload-progress-inset, var(--tp-space-2-5));
    inset-block-end: var(--tp-space-1);
    display: block;
  }

  ${hiddenStyles}
`;
