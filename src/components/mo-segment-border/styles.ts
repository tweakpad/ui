import { css } from 'lit';

/**
 * Segment border's look: its public `--tp-mo-segment-border-*` properties mapped onto the shared
 * surface border look, and the plain segments' lines.
 */
export const moSegmentBorderStyles = css`
  :host {
    --_tp-surface-border-radius: var(--tp-mo-segment-border-radius, var(--tp-radius-lg));
    --_tp-surface-border-color: var(--tp-mo-segment-border-color, var(--tp-border));
    --_tp-surface-border-width: var(--tp-mo-segment-border-width, auto);
    --_tp-surface-border-colors: var(
      --tp-mo-segment-border-glow-colors,
      var(--tp-chart-2),
      var(--tp-chart-1),
      var(--tp-chart-5)
    );
    --_tp-surface-border-core: var(--tp-mo-segment-border-glow-core, light-dark(transparent, #fff));
    --_tp-surface-border-angle: var(--tp-mo-segment-border-glow-angle, 315deg);
    --_tp-surface-border-intensity: var(--tp-mo-segment-border-glow-intensity, 1);
    --_tp-surface-border-spread: var(--tp-mo-segment-border-glow-spread, 12px);
  }

  /* A plain segment: its own color, width and cap, copied from the segment or set on the border. */
  .segment {
    stroke: var(--_seg-color, var(--tp-mo-border-segment-color, var(--tp-primary)));
    stroke-width: var(--_seg-width, var(--tp-mo-border-segment-width, var(--_tp-surface-border-w)));
    stroke-linecap: var(--_seg-cap, var(--tp-mo-border-segment-cap, butt));
  }
`;
