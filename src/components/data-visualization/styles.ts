import { css } from 'lit';
export const visualizationStructure = css`
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
`;
