import { css } from 'lit';
export const sliderStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .root {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-inline-size: 0;
    flex-wrap: wrap;
  }

  [part~='slider-output'] {
    white-space: nowrap;
    flex: none;
  }

  .control {
    position: relative;
    display: flex;
    align-items: center;
    min-inline-size: 0;
    block-size: var(--tp-control-height-md);
    touch-action: none;
    user-select: none;
  }

  .track {
    position: relative;
    inline-size: 100%;
  }

  .range {
    position: absolute;
    block-size: 100%;
  }

  /* Non-semantic buffer ranges and chapter segments: domain-percentage geometry. */
  .buffer,
  .chapter {
    position: absolute;
    block-size: 100%;
    pointer-events: none;
  }

  :host([orientation='vertical']) {
    display: inline-flex;
    inline-size: fit-content;
    max-inline-size: 100%;
  }

  :host([orientation='vertical']) .control {
    flex-direction: column;
    justify-content: center;
    inline-size: var(--tp-control-height-md);

    /* Composing library controls (the media volume popup) may shorten the vertical extent. */
    min-block-size: var(--_tp-slider-vertical-length, calc(var(--tp-spacing) * 40));
    flex: 1;
    block-size: auto;
  }

  :host([orientation='vertical']) .root {
    align-items: center;
    block-size: 100%;
  }

  :host([orientation='vertical']) .track {
    /* Fill the actual Control, including when only its minimum extent is set. */
    position: absolute;
    inset-block: 0;
    block-size: auto;
  }

  :host([orientation='vertical']) :is(.range, .buffer, .chapter) {
    inline-size: 100%;
    block-size: auto;
  }

  /* Value-only controls form an inline readout; labels retain the stacked header. */
  .root:not([data-orientation='vertical']):has(.header):not(:has([part~='slider-label'])) {
    flex-direction: row;
    align-items: center;
  }

  .root:not([data-orientation='vertical']):has(.header):not(:has([part~='slider-label'])) .control {
    flex: 1;
  }

  ::slotted(tp-slider-thumb) {
    position: absolute;
  }

  .control > tp-slider-thumb {
    position: absolute;
  }
`;
export const sliderThumbStyles = css`
  :host {
    position: absolute;
    display: block;
    inline-size: 0;
    block-size: 0;
    opacity: 1 !important;
  }

  .thumb {
    position: absolute;
    top: 0;
    left: 0;
    transform: translate(-50%, -50%);
    touch-action: none;
  }

  .thumb::after {
    content: '';
    position: absolute;
    inset: min(calc(var(--tp-spacing) * -2), calc((100% - var(--tp-target-size-min)) / 2));
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
`;
