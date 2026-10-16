import { css } from 'lit';
import { rangeHandleStyles } from '../../components/shared/control-styles.js';

/** Structure only: layout, geometry, hit targets and hidden inputs. Appearance is the recipe. */
export const easingEditorStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  /* Nested controls and surfaces dim themselves exactly once. */
  :host([data-disabled]) {
    cursor: auto;
    opacity: 1;
  }

  /* The graph side bounds the editor, with the presets column beside it when it is shown there. */
  .root {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
    max-inline-size: var(--_tp-easing-editor-graph, calc(var(--tp-spacing) * 96));
  }

  .root:has(> .body[data-presets-beside]) {
    max-inline-size: calc(
      var(--_tp-easing-editor-presets, calc(var(--tp-spacing) * 44)) +
        var(--_tp-easing-editor-space, var(--tp-space-3)) +
        var(--_tp-easing-editor-graph, calc(var(--tp-spacing) * 96))
    );
  }

  /* Compact (a dialog, a popover): fill the container up to a dialog's width; the graph follows. */
  .root[data-layout='compact'] {
    max-inline-size: calc(var(--tp-spacing) * 128);
  }

  .label {
    display: block;
  }

  .header {
    display: flex;
    align-items: center;
    gap: var(--tp-space-2);
    min-inline-size: 0;
  }

  /* The Tabs hold the inline start; play, preview mode and presets sit together at the end. */
  .header > tp-tabs {
    flex: none;
    min-inline-size: 0;
    margin-inline-end: auto;
  }

  .header > tp-button,
  .header > tp-toggle {
    flex: none;
  }

  /* Extended: the presets column beside the graph column; compact: one column. */
  .body {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--_tp-easing-editor-space, var(--tp-space-3));
    min-inline-size: 0;
  }

  .body[data-presets-beside] {
    grid-template-columns: var(--_tp-easing-editor-presets, calc(var(--tp-spacing) * 44)) minmax(
        0,
        1fr
      );
  }

  .column {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--_tp-easing-editor-space, var(--tp-space-3));
    align-content: start;
    min-inline-size: 0;
  }

  /* The presets scroll inside their column (beside) or inside the overlay (compact). */
  .presets-panel {
    display: block;
    min-inline-size: 0;
    block-size: calc(var(--tp-spacing) * 40);
  }

  /*
   * Beside the graph the presets column takes the row height of the graph column without
   * adding its own: zero block size plus a 100% minimum stretches it to the row, and the panel
   * fills that box absolutely (a percentage height would resolve against the zero size), so the
   * list scrolls inside.
   */
  .presets-column {
    position: relative;
    block-size: 0;
    min-block-size: 100%;
  }

  .presets-column > .presets-panel {
    position: absolute;
    inset: 0;
    block-size: auto;
  }

  /* Hosts narrower than the smallest beside layout stack a short presets strip above the graph. */
  @container (max-width: 26rem) {
    .body[data-presets-beside] {
      grid-template-columns: minmax(0, 1fr);
    }

    .presets-column {
      block-size: auto;
      min-block-size: 0;
    }

    .presets-column > .presets-panel {
      position: static;
      block-size: calc(var(--tp-spacing) * 40);
    }
  }

  .presets-panel > tp-scroll-area {
    display: block;
    block-size: 100%;
  }

  .presets-list {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--tp-space-3);
    min-inline-size: 0;
  }

  .preset-group {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--tp-space-1-5);
    min-inline-size: 0;
  }

  .heading {
    font-size: var(--tp-text-xs);
    color: var(--tp-muted-foreground);
  }

  /* The grid spans its column; the thumbnail and the name stack inside each preset Toggle. */
  tp-toggle-group.presets {
    inline-size: 100%;
  }

  tp-toggle.preset {
    display: inline-flex;
    min-inline-size: 0;
  }

  .thumb {
    display: block;
    inline-size: var(--_tp-easing-editor-thumb, calc(var(--tp-spacing) * 8));
    block-size: var(--_tp-easing-editor-thumb, calc(var(--tp-spacing) * 8));
    pointer-events: none;
  }

  /* Toggles keep their labels on one line; preset names wrap between words inside the tile. */
  .preset-name {
    display: block;
    max-inline-size: 100%;
    text-align: center;
    white-space: normal;
    text-wrap: balance;
    overflow-wrap: anywhere;
    pointer-events: none;
  }

  /* The graph box is square; the badge and the compact presets overlay float over it. */
  .graph-box {
    position: relative;
    aspect-ratio: 1 / 1;
    min-inline-size: 0;
  }

  .graph-box > tp-easing-editor-graph {
    position: absolute;
    inset: 0;
    display: block;
  }

  .graph-box > .badge {
    position: absolute;
    inset-inline-end: var(--tp-space-2);
    inset-block-end: var(--tp-space-2);
    pointer-events: none;
  }

  .graph-box > .presets-panel[data-overlay] {
    position: absolute;
    inset: 0;
    block-size: auto;
    z-index: 1;
  }

  .controls,
  .duration,
  .footer-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  .parameter {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    min-inline-size: 0;
  }

  .parameter > .field {
    inline-size: calc(var(--tp-spacing) * 20);
  }

  .selectors {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--tp-space-2);
    min-inline-size: 0;
  }

  .selectors > tp-button {
    flex: none;
  }

  /* The adapter Select (several adapters) sits before the output group. */
  .footer-row {
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
  }

  .footer-row[data-adapters] {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .footer-row > tp-input-group {
    min-inline-size: 0;
  }

  .output-group > tp-easing-editor-expression {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  tp-slider {
    inline-size: 100%;
    min-inline-size: 0;
  }

  .field tp-input {
    inline-size: 100%;
  }

  tp-easing-editor-frames {
    display: block;
    block-size: var(--_tp-easing-editor-frames, var(--tp-space-3));
  }

  .footer:not(:has(*)) {
    display: none;
  }

  .settle {
    font-size: var(--tp-text-xs);
    color: var(--tp-muted-foreground);
  }
`;

/** Shared structure of the render surfaces (graph, frames). */
export const easingSurfaceStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .surface {
    position: relative;
    block-size: 100%;
    min-inline-size: 0;
    touch-action: none;
    user-select: none;
  }

  .surface[data-disabled] {
    cursor: not-allowed;
  }

  /*
   * The graph's plot frame sits inset by the editor's spacing step inside the graph box, so the
   * curve's ends and the corner handles clear the rounded clip; the frame and the plots share it.
   * The frames bar has no inset. An SVG does not stretch between opposite insets, so the plots
   * take explicit sizes.
   */
  .graph {
    --_tp-easing-editor-plot-inset: var(--_tp-easing-editor-space, var(--tp-space-3));
  }

  .plot,
  .frame {
    display: block;
    position: absolute;
    inset: var(--_tp-easing-editor-plot-inset, 0);
    inline-size: calc(100% - 2 * var(--_tp-easing-editor-plot-inset, 0px));
    block-size: calc(100% - 2 * var(--_tp-easing-editor-plot-inset, 0px));
    overflow: visible;
  }

  .frame {
    pointer-events: none;
  }

  /* The grid dots and the curve clip to the graph box and its rounded corners; handles do not. */
  .grid-layer,
  .curve-layer {
    position: absolute;
    inset: 0;
    overflow: hidden;
    border-radius: inherit;
    pointer-events: none;
  }

  /* The preview square is centered and sized to the graph area; rotation fits it when turned. */
  .preview-layer {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    overflow: hidden;
    border-radius: inherit;
  }

  .shape {
    display: block;
    flex: none;
    inline-size: auto;
    block-size: calc(100% * var(--_tp-easing-editor-headroom, 1));
    aspect-ratio: 1 / 1;
    will-change: transform;
  }

  .preview-layer[data-mode='rotation'] > .shape {
    block-size: 70.7%;
  }

  .handle,
  .point {
    position: absolute;
    top: 0;
    left: 0;
    translate: -50% -50%;
    touch-action: none;
    pointer-events: auto;
  }

  ${rangeHandleStyles('.handle, .point')}

  .frames {
    block-size: 100%;
  }
`;

/** Structure of the expression field: a transparent input over a highlighted mirror. */
export const easingExpressionStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .expression {
    position: relative;
    display: block;
    min-inline-size: 0;
  }

  .highlight,
  .source {
    box-sizing: border-box;
    inline-size: 100%;
    margin: 0;
    border: 0;
    font: inherit;
    letter-spacing: inherit;
  }

  /* Template whitespace collapses away; each token keeps its own spaces exactly. */
  .highlight {
    position: absolute;
    inset: 0;
    overflow: hidden;
    white-space: nowrap;
    pointer-events: none;
  }

  .highlight .token {
    white-space: pre;
  }

  .source {
    position: relative;
    display: block;
    background: transparent;
    color: transparent;
    outline: none;
  }

  .source:disabled {
    cursor: not-allowed;
  }
`;
