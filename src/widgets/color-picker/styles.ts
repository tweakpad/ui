import { css } from 'lit';

/** Structure only: layout, geometry, hit targets and hidden inputs. Appearance is the recipe. */
export const colorPickerStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  :host([picker='popup']) {
    display: inline-block;
  }

  /* Nested controls and surfaces dim themselves exactly once. */
  :host([data-disabled]) {
    cursor: auto;
    opacity: 1;
  }

  .root {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  .label {
    display: block;
  }

  .panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--_tp-color-picker-space, var(--tp-space-3));
    min-inline-size: 0;
  }

  .view {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--_tp-color-picker-space, var(--tp-space-3));
    min-inline-size: 0;
  }

  .view[hidden] {
    display: none;
  }

  tp-tabs.views {
    min-inline-size: 0;
  }

  .controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    min-inline-size: 0;
  }

  .controls[data-eyedropper] {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .sliders {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  .channels {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--tp-space-2);
    min-inline-size: 0;
  }

  .fields {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    align-items: center;
    min-inline-size: 0;
  }

  .fields:not([data-preview]) {
    grid-template-columns: minmax(0, 1fr);
  }

  .fields-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--tp-space-2);
    min-inline-size: 0;
  }

  .fields-row > tp-select {
    flex: none;
  }

  /* Fields share the row and wrap below their basis instead of truncating their text. */
  .field {
    flex: 1 1 calc(var(--tp-spacing) * 20);
    min-inline-size: calc(var(--tp-spacing) * 14);
  }

  .field tp-input-group,
  .field tp-input {
    inline-size: 100%;
  }

  .channel-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: end;
    min-inline-size: 0;
  }

  .channel-row .field {
    flex: none;
    inline-size: calc(var(--tp-spacing) * 20);
  }

  tp-slider {
    inline-size: 100%;
    min-inline-size: 0;
  }

  .toolbar {
    display: flex;
    align-items: center;
    min-inline-size: 0;
  }

  .toolbar tp-select {
    flex: 1 1 auto;
    min-inline-size: 0;
  }

  .swatches,
  .schemes {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  .swatch-group,
  .scheme-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: var(--tp-space-1-5);
    min-inline-size: 0;
  }

  .heading {
    font-size: var(--tp-text-xs);
    color: var(--tp-muted-foreground);
  }

  tp-toggle-group.scheme {
    inline-size: 100%;
  }

  /* Strip members share the row; the registered item rule reads the inline-size override. */
  tp-toggle-group.scheme tp-toggle {
    flex: 1 1 0;
    min-inline-size: 0;

    --_tp-color-picker-swatch-inline: 100%;
  }

  /* The fill is slotted into the Toggle; it covers the Toggle's own box (flat-tree containing block). */
  .swatch {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
  }

  .footer:not(:has(*)) {
    display: none;
  }

  .popup-panel {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    min-inline-size: 0;
  }

  .preview {
    display: block;
    flex: none;
  }

  /* The preview is slotted into the trigger Button as a sized block. */
  tp-button.trigger .preview {
    inline-size: calc(var(--tp-control-height-md) - var(--tp-spacing) * 3);
    block-size: calc(var(--tp-control-height-md) - var(--tp-spacing) * 3);
    pointer-events: none;
  }

  .visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;

/** Shared structure of the render surfaces (area, wheel, triangle). */
export const colorSurfaceStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  :host([hidden]) {
    display: none;
  }

  .surface {
    position: relative;
    touch-action: none;
    user-select: none;
  }

  .surface[data-disabled] {
    cursor: not-allowed;
  }

  .thumb,
  .handle {
    position: absolute;
    top: 0;
    left: 0;
    translate: -50% -50%;
    touch-action: none;
  }

  .thumb::after,
  .handle::after {
    content: '';
    position: absolute;
    inset: min(calc(var(--tp-space-2) * -1), calc((100% - var(--tp-target-size-min)) / 2));
  }

  input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    padding: 0;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  input[aria-orientation='vertical'] {
    writing-mode: vertical-lr;
  }

  svg.line {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    pointer-events: none;
    overflow: visible;
  }

  /* Ring box: a square the size of the area; the ring paint is a masked layer inside it. */
  .ring-box {
    aspect-ratio: 1;
    inline-size: min(100%, var(--_tp-color-picker-area, calc(var(--tp-spacing) * 40)));
    margin-inline: auto;
  }

  .ring {
    position: absolute;
    inset: 0;
    mask-image: radial-gradient(
      circle closest-side,
      transparent calc(100% - var(--_tp-color-picker-ring, 20px) - 0.5px),
      #000 calc(100% - var(--_tp-color-picker-ring, 20px) + 0.5px)
    );
  }

  .triangle {
    position: absolute;
    inset: var(--_tp-color-picker-ring, 20px);
  }

  canvas {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
`;
