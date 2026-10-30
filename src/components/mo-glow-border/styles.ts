import { css, unsafeCSS } from 'lit';
import { ambientPeriod } from '../../presentation/motion.js';

const period = unsafeCSS(ambientPeriod('placeholder'));

/** The comet tail length, resolved for the script. */
export const TAIL = '--_tp-mo-glow-border-tail';

/**
 * Glow border's look and timing: its public `--tp-mo-glow-border-*` properties mapped onto the
 * shared surface border look, and the timing probe that resolves the lap and the fade to computed
 * times and easings.
 */
export const moGlowBorderStyles = css`
  :host {
    --_tp-surface-border-radius: var(--tp-mo-glow-border-radius, var(--tp-radius-lg));
    --_tp-surface-border-color: var(--tp-mo-glow-border-color, var(--tp-border));
    --_tp-surface-border-width: var(--tp-mo-glow-border-width, auto);
    --_tp-surface-border-colors: var(
      --tp-mo-glow-border-colors,
      var(--tp-chart-2),
      var(--tp-chart-1),
      var(--tp-chart-5)
    );
    --_tp-surface-border-core: var(--tp-mo-glow-border-core, light-dark(transparent, #fff));
    --_tp-surface-border-angle: var(--tp-mo-glow-border-angle, 315deg);
    --_tp-surface-border-intensity: var(--tp-mo-glow-border-intensity, 1);
    --_tp-surface-border-fill: var(--tp-mo-glow-border-fill, 0);
    --_tp-surface-border-spread: var(--tp-mo-glow-border-spread, 12px);
    --_tp-mo-glow-border-tail: var(--tp-mo-glow-border-light-length, 0.22);
  }

  .timing {
    transition:
      --_tp-mo-glow-border-lap var(--tp-mo-glow-border-loop-duration, ${period})
        var(--tp-mo-glow-border-loop-easing, linear) var(--tp-mo-glow-border-loop-delay, 0s),
      --_tp-mo-glow-border-fade
        calc(
          var(--tp-mo-glow-border-fade-duration, var(--tp-duration-normal)) *
            var(--tp-motion-scale, 1)
        )
        var(--tp-mo-glow-border-fade-easing, var(--tp-easing-standard))
        var(--tp-mo-glow-border-fade-out-delay, var(--tp-duration-fast));
  }
`;
