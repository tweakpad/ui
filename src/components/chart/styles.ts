import { css } from 'lit';
export const chartStructure = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  .plot {
    position: relative;
    inline-size: 100%;
    aspect-ratio: 16 / 9;
    min-inline-size: 0;
  }

  .plot > svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }

  .style-scope {
    position: relative;
  }

  /* A legend at the inline start or end stands in a column beside the plot, and wraps below it
     when the chart is too narrow for both. */
  .body {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    min-inline-size: 0;
  }

  .body > .style-scope {
    flex: 1 1 18rem;
    min-inline-size: 0;
  }

  .legend[data-placement='start'],
  .legend[data-placement='end'] {
    flex-flow: column nowrap;
    align-items: stretch;
  }

  .legend-block {
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
  }

  /* Content in the middle of polar marks, centered where the renderer reports their center. */
  .center {
    position: absolute;
    left: var(--_tp-center-x, 50%);
    top: var(--_tp-center-y, 50%);
    translate: -50% -50%;
    max-inline-size: var(--_tp-center-size, none);
    display: grid;
    justify-items: center;
    text-align: center;
    pointer-events: none;
  }

  /* Over a top half circle the content sits above the center, below a bottom half under it. */
  .center[data-room='above'] {
    translate: -50% -100%;
  }

  .center[data-room='below'] {
    translate: -50% 0;
  }

  :host([loading]) .center {
    visibility: hidden;
  }

  /* The built-in marks let axis labels at the edges spill past the plot. */
  .plot > svg.marks {
    overflow: visible;
  }

  .live {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* While loading, placeholders stand where the marks will be. */
  :host([loading]) .plot > * {
    visibility: hidden;
  }

  .loading {
    position: absolute;
    inset: 8px 8px 26px 40px;
    display: flex;
    align-items: flex-end;
    gap: 3%;
    pointer-events: none;
  }

  .loading .bar {
    flex: 1;
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  .loading .block {
    inline-size: 100%;
    block-size: 100%;
  }

  .loading[data-type='disc'],
  .loading[data-type='ring'] {
    inset: 8px;
    justify-content: center;
    align-items: center;
  }

  .loading .disc,
  .loading .ring {
    block-size: 100%;
    aspect-ratio: 1;
    border-radius: 50%;
  }

  .loading .ring {
    mask: radial-gradient(closest-side, transparent 52%, black 53%);
  }

  .loading .wave {
    inline-size: 100%;
    block-size: 70%;
    align-self: center;
    border-radius: 0;
    mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 40' preserveAspectRatio='none'%3E%3Cpath d='M0 30 C10 20 15 12 25 16 S40 34 50 24 S65 6 75 12 S90 22 100 8' fill='none' stroke='black' stroke-width='5' stroke-linecap='round' vector-effect='non-scaling-stroke'/%3E%3C/svg%3E")
      0 0 / 100% 100% no-repeat;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .series-entry {
    display: flex;
    align-items: center;
    min-inline-size: 0;
  }

  .series-value {
    margin-inline-start: auto;
    font-variant-numeric: tabular-nums;
  }

  .inspection-content {
    display: grid;
  }

  .encoding {
    display: inline-block;
    flex-shrink: 0;
  }

  .encoding[data-indicator='line'] {
    align-self: stretch;
  }

  .encoding[data-indicator='dashed'] {
    align-self: stretch;
  }

  tp-icon {
    inline-size: var(--tp-icon-size-sm);
    block-size: var(--tp-icon-size-sm);
  }

  /* After the legend's own rules: beside the plot it keeps a readable width. */
  .body > .legend,
  .body > .legend-block {
    flex: 0 1 auto;
    min-inline-size: 10rem;
  }
`;
