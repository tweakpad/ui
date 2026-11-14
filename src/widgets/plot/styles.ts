import { css } from 'lit';
import { visualizationStructure } from '../../components/data-visualization/styles.js';
export const plotStyles = [
  visualizationStructure,
  css`
    :host {
      block-size: 10rem;
    }

    figure {
      block-size: 100%;
    }

    .viewport {
      position: relative;
      flex: 1;
      min-block-size: 0;
      min-inline-size: 0;
    }

    canvas {
      display: block;
      inline-size: 100%;
      block-size: 100%;
    }

    .empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      pointer-events: none;
    }

    .inspection {
      position: absolute;
      inset-inline-end: 0;
      inset-block-start: 0;
      pointer-events: none;
    }

    /* With a crosshair the hint follows the line along an edge, placed by a transform. Overlay
       positions are physical: the graph's time axis never mirrors, so they are measured from the
       canvas's left edge in either direction. */
    .inspection[data-edge] {
      inset: 0 auto auto 0;
      white-space: nowrap;
    }

    .crosshair,
    .marker,
    .crosshair-label {
      position: absolute;
      inset: 0 auto auto 0;
      pointer-events: none;
    }

    .crosshair {
      display: block;
      inline-size: 1px;
      translate: -0.5px 0;
    }

    .marker {
      display: block;
      inline-size: var(--_tp-plot-marker-size, 8px);
      block-size: var(--_tp-plot-marker-size, 8px);
      margin: calc(var(--_tp-plot-marker-size, 8px) / -2);
    }

    .marker[hidden] {
      display: none;
    }

    .crosshair-label {
      white-space: nowrap;
    }

    .probe {
      position: absolute;
      visibility: hidden;
      pointer-events: none;
    }
  `,
];
