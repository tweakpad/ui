import { css, unsafeCSS } from 'lit';
import { textMechanicsCss } from '../../foundation/text-editor/content/mechanics.js';

/** The internal attribute of the preview root shown before the editor is ready. */
export const TEXT_EDITOR_PREVIEW_ATTRIBUTE = 'data-tp-preview';

/**
 * Structure only: the skeleton, the layers, pointer input, the placeholder box, the status
 * placement and the preview's text mechanics. Paint, sizes and insets belong to the family.
 */
export const textEditorStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  [part~='text-editor'] {
    position: relative;
    display: grid;
    box-sizing: border-box;
    block-size: 100%;
    min-inline-size: 0;
    grid-template-rows: auto minmax(0, 1fr);
    grid-template-areas: 'toolbar' 'viewport';

    /* No scroll container, so a sticky toolbar still sticks. */
    overflow: clip;
  }

  [part~='text-editor-toolbar'] {
    grid-area: toolbar;
    min-inline-size: 0;
  }

  /* A tool that reports itself invisible keeps its place unseen (and inert), a group whose tools
     all do with its separator, so that hiding it moves no other control. */
  [part~='text-editor-toolbar'] [data-tool-hidden],
  [part~='text-editor-toolbar'] .toolbar-group[data-hidden] > tp-separator {
    visibility: hidden;
  }

  [part~='text-editor-viewport'] {
    grid-area: viewport;
    min-block-size: 0;
    min-inline-size: 0;
    overflow: auto;
    scrollbar-gutter: stable;
  }

  /* The overlay's raised marks (table grips and handle) stack inside the surface, so the sticky
     toolbar paints over them when the page scrolls the content under it. */
  .surface {
    position: relative;
    isolation: isolate;
  }

  /* No selection (a cleared one) or a block selection, which the overlay paints: the caret that the
     engine or the browser keeps in the focused root is not painted. */
  .surface[data-unplaced] [part~='text-editor-content'] > * {
    caret-color: transparent;
  }

  .underlay,
  [part~='text-editor-overlay'] {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    inline-size: 0;
    block-size: 0;
    overflow: visible;
    pointer-events: none;
  }

  [part~='text-editor-content'] {
    position: relative;
  }

  /* Blocks (M8): overlay marks placed by transform from the layer origin; never in the flow. */
  [part~='text-editor-gutter'],
  [part~='text-editor-block-selection'],
  [part~='text-editor-drop-indicator'] {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
  }

  [part~='text-editor-gutter'] {
    pointer-events: auto;
  }

  [part~='text-editor-block-selection'][hidden],
  [part~='text-editor-drop-indicator'][hidden] {
    display: none !important;
  }

  /* Hidden, the gutter keeps its box: its placement reads its own size before it shows. */
  [part~='text-editor-gutter'][hidden] {
    visibility: hidden !important;
  }

  /* The feedback sizes the preview to the gripped block; it grows to every copy of a group, and its
     backdrop lies under the copies, a little beyond them, without moving them. */
  .block-drag-preview {
    margin: 0;
    border: 0;
    padding: 0;
    overflow: visible;
    background: transparent;

    /* The copies take the content's text colour, not the popover's system one. */
    color: inherit;
    block-size: auto !important;
  }

  .block-drag-preview:not(:popover-open) {
    display: none;
  }

  .block-drag-preview::before {
    content: '';
    position: absolute;
    inset: calc(-1 * var(--tp-space-1)) calc(-1 * var(--tp-space-2));
    inset-inline-start: calc(-1 * (var(--tp-space-2) + var(--_tp-text-editor-preview-inset, 0px)));
    z-index: -1;
    pointer-events: none;
  }

  .block-drag-count {
    position: absolute;
    inset-block-start: 0;
    inset-inline-end: 0;
  }

  :host([data-disabled]) [part~='text-editor-content'] {
    pointer-events: none;
  }

  /* Floating surfaces (M7): the selection toolbar is a manual popover the positioning owner
     places; the suggestion list's host takes no space, its popup lives in the top layer. */
  [part~='text-editor-selection-toolbar'] {
    position: fixed;
    inset: auto;
    margin: 0;
    box-sizing: border-box;
    overflow: visible;
    color: inherit;
  }

  [part~='text-editor-selection-toolbar']:not(:popover-open) {
    display: none;
  }

  [part~='text-editor-suggestions'] {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    display: block;
    inline-size: 0;
    block-size: 0;
    overflow: clip;
  }

  [part~='text-editor-placeholder'] {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    margin: 0;
    border: 0;
    padding-block: 0;
    padding-inline-end: 0;
    white-space: normal;
    overflow-wrap: break-word;
    pointer-events: none;
    user-select: none;
  }

  [part~='text-editor-placeholder'][hidden] {
    display: none !important;
  }

  /* The upload card of a pending image: placed over the block's box; its File upload fills it. */
  [part~='text-editor-image-upload'] {
    position: absolute;
    top: 0;
    left: 0;
    box-sizing: border-box;
    display: grid;
    pointer-events: auto;
  }

  [part~='text-editor-image-upload'][hidden] {
    display: none !important;
  }

  [part~='text-editor-image-upload'] > tp-file-upload {
    min-inline-size: 0;
    min-block-size: 0;
  }

  [part~='text-editor-status'] {
    grid-area: viewport;
    position: absolute;
    inset-block-start: var(--tp-space-2);
    inset-inline-end: var(--tp-space-2);
    display: flex;
    align-items: center;
    max-inline-size: calc(100% - 2 * var(--tp-space-2));
  }

  ${unsafeCSS(textMechanicsCss(`[part~='text-editor-content'] > [${TEXT_EDITOR_PREVIEW_ATTRIBUTE}]`))}
`;
