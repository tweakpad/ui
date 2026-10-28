import { css } from 'lit';

/** Structure only: layout, extents and hit targets. Appearance is the recipe. */
export const emojiPickerStyles = css`
  :host {
    display: inline-flex;
    flex-direction: column;
    vertical-align: top;
    max-inline-size: 100%;
    min-block-size: 0;
  }

  .root,
  .panel {
    display: flex;
    flex-direction: column;
    flex: 1 1 auto;
    min-block-size: 0;
    min-inline-size: 0;
  }

  .panel {
    inline-size: max-content;
    max-inline-size: 100%;
  }

  /* The bar never widens the picker: the grid sets the width and extra categories scroll. */
  .categories {
    box-sizing: border-box;
    flex: none;
    contain: inline-size;
    inline-size: 100%;
  }

  .list {
    display: flex;
    flex: 1 1 auto;
    min-block-size: 0;
  }

  .footer {
    display: flex;
    flex: none;
    align-items: center;
    min-inline-size: 0;
  }

  .preview {
    display: flex;
    flex: 1 1 0;
    align-items: center;
    min-inline-size: 0;
  }

  .preview-label {
    flex: 1 1 0;
    min-inline-size: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .skin-tone {
    flex: none;
    margin-inline-start: auto;
  }

  .glyph,
  .tone-sample,
  .tone-glyph,
  .category-glyph {
    font-family: var(--tp-font-emoji);
    line-height: 1;
  }

  .tone-sample,
  .trigger-glyph {
    font-size: var(--tp-text-base);
  }

  img.glyph,
  .category-image {
    display: block;
    inline-size: 1em;
    block-size: 1em;
    object-fit: contain;
  }

  .category-image {
    inline-size: var(--tp-icon-size-md);
    block-size: var(--tp-icon-size-md);
  }

  .status {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--tp-space-2);
  }
`;

/**
 * Structure of the list's shadow root: the Select fills the list's block size, emoji options are
 * square cells, and group labels stick to the top of the scroll container.
 */
export const emojiListStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    min-block-size: 0;
    min-inline-size: 0;
  }

  .select-root {
    flex: none;
  }

  /* The inline list scrolls by wheel, touch and keyboard; it has no scroll arrows. */
  .select-scroll {
    display: none;
  }

  .select-content[data-inline] {
    flex: 1 1 auto;
    min-block-size: 0;
    max-block-size: none;
  }

  /* The list area keeps its extent while the empty state replaces the options. */
  .select-body {
    min-block-size: var(--_tp-emoji-picker-list, auto);
  }

  .select-list {
    flex: 1 1 auto;
    block-size: var(--_tp-emoji-picker-list, auto);
    max-block-size: none;
    scrollbar-gutter: stable;
  }

  .select-list[data-empty] {
    flex: none;
    block-size: auto;
  }

  .select-collection {
    min-inline-size: calc(var(--_tp-emoji-picker-cell) * var(--_tp-emoji-picker-columns, 9));
  }

  .select-label {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    block-size: var(--_tp-emoji-picker-label);
    margin: 0;
  }

  /* A stuck label covers the list inset above it, so no row shows over the label. */
  :host([data-sticky]) .select-label {
    position: sticky;
    inset-block-start: calc(var(--_tp-popup-spacing, 0px) * -1);
    z-index: 1;
  }

  .select-row {
    margin: 0;
  }

  .select-row > .select-option {
    /* A revealed option clears the sticky label, which covers the list inset. */
    scroll-margin-block: var(--_tp-emoji-picker-label) var(--_tp-popup-spacing, 0);
    flex: none;
    justify-content: center;
    inline-size: var(--_tp-emoji-picker-cell);
    block-size: var(--_tp-emoji-picker-cell);
    min-block-size: 0;
    padding: 0;
  }

  .select-item-text {
    flex: none;
    justify-content: center;
  }

  .glyph {
    font-family: var(--tp-font-emoji);
    font-size: var(--_tp-emoji-picker-glyph);
    line-height: 1;
  }

  img.glyph {
    display: block;
    inline-size: var(--_tp-emoji-picker-glyph);
    block-size: var(--_tp-emoji-picker-glyph);
    object-fit: contain;
    pointer-events: none;
  }
`;
