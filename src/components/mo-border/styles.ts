import { css, unsafeCSS } from 'lit';
import { ambientPeriod } from '../../presentation/motion.js';

const period = unsafeCSS(ambientPeriod('placeholder'));

/**
 * The ring (one perimeter path drawn as the line, its dashes and the draw) and the glow's two
 * canvases over it. Geometry comes from the measured surface through private properties
 * (`--_tp-mo-border-*`); the public `--tp-mo-border-*` properties set the look and timing, and the
 * script reads the glow's look and timing resolved here.
 */
export const moBorderStyles = css`
  :host {
    --_w: var(--_tp-mo-border-w, 1px);
    --_dir: -1;
    --_draw-duration: calc(
      var(--tp-mo-border-draw-duration, var(--tp-duration-slow)) * var(--tp-motion-scale, 1)
    );
    --_draw-easing: var(--tp-mo-border-draw-easing, var(--tp-easing-enter));
    --_play: var(--tp-motion-play-state, running);
    --_lap: var(--tp-mo-border-loop-duration, ${period});

    /* The glow's look, resolved for the script (registered: colors and lengths compute). */
    --_tp-mo-border-colors: var(
      --tp-mo-border-glow-colors,
      var(--tp-chart-2),
      var(--tp-chart-1),
      var(--tp-chart-5)
    );
    --_tp-mo-border-core: var(--tp-mo-border-glow-core, light-dark(transparent, #fff));
    --_tp-mo-border-angle: var(--tp-mo-border-glow-angle, 315deg);
    --_tp-mo-border-intensity: var(--tp-mo-border-glow-intensity, 1);
    --_tp-mo-border-fill: var(--tp-mo-border-glow-fill, 0);
    --_tp-mo-border-spread: var(--tp-mo-border-glow-spread, 12px);
    --_tp-mo-border-tail: var(--tp-mo-border-light-length, 0.22);

    /* A block, or an inline block around an inline child; never a grid or flex container, which
       would change how the child computes its display. */
    display: block;
    position: relative;
    border-radius: var(--tp-mo-border-radius, var(--tp-radius-lg));
  }

  :host([data-tp-inline]) {
    display: inline-block;
  }

  :host([rotation='ccw']) {
    --_dir: 1;
  }

  /* Dashes hold still off screen, with trigger="none", and outside their hover or focus. */
  :host([data-tp-offscreen]),
  :host([data-trigger='none']),
  :host(:is([data-trigger='hover'], [data-trigger='pointer']):not(:hover)),
  :host([data-trigger='focus']:not(:focus-within)) {
    --_play: paused;
  }

  .ring,
  .glow,
  .bloom {
    position: absolute;
    inset-block-start: 0;
    inset-inline-start: 0;
    pointer-events: none;
  }

  .ring {
    overflow: visible;
  }

  /* The bloom: the lit strokes drawn wider, blurred by the compositor. */
  .bloom {
    opacity: 0.9;
    filter: blur(calc(var(--_tp-mo-border-spread) / 2));
  }

  path {
    fill: none;
  }

  .line {
    stroke: var(--tp-mo-border-color, var(--tp-border));
    stroke-width: var(--_w);
  }

  /* A plain segment: its own color, width and cap, copied from the segment or set on the border. */
  .segment {
    stroke: var(--_seg-color, var(--tp-mo-border-segment-color, var(--tp-primary)));
    stroke-width: var(--_seg-width, var(--tp-mo-border-segment-width, var(--_w)));
    stroke-linecap: var(--_seg-cap, var(--tp-mo-border-segment-cap, butt));
  }

  /* Dashes: whole periods fill the perimeter, so the pattern has no seam where the path closes. */
  .dashes {
    stroke-dasharray: var(--_tp-mo-border-dash)
      calc(var(--_tp-mo-border-period) - var(--_tp-mo-border-dash));
  }

  :host([data-tp-march]) .dashes {
    animation: tp-mo-border-march var(--tp-mo-border-march-duration, var(--tp-duration-slow)) linear
      infinite;
    animation-play-state: var(--_play);
  }

  :host([data-tp-breathe]) .dashes {
    animation: tp-mo-border-breathe var(--tp-mo-border-breathe-duration, ${period})
      var(--tp-easing-standard) infinite alternate;
    animation-play-state: var(--_play);
  }

  :host([data-tp-motion-driven~='loop']) .dashes {
    animation: none !important;
  }

  :host([data-tp-march][data-tp-breathe]) .dashes {
    animation:
      tp-mo-border-march var(--tp-mo-border-march-duration, var(--tp-duration-slow)) linear infinite,
      tp-mo-border-breathe var(--tp-mo-border-breathe-duration, ${period}) var(--tp-easing-standard)
        infinite alternate;
    animation-play-state: var(--_play);
  }

  /* The draw: a mask stroked along the same path from its start, by the registered amount drawn. */
  .draw {
    --_tp-mo-border-drawn: 0;

    stroke: #fff;
    stroke-width: calc(var(--_w) * 4 + 8px);
    stroke-dasharray: 1 1;
    stroke-dashoffset: calc(var(--_dir) * (var(--_tp-mo-border-drawn) - 1));
    transition: --_tp-mo-border-drawn var(--_draw-duration) var(--_draw-easing);
    transition-delay: var(--_tp-mo-border-delay, 0ms);
  }

  :host([data-tp-hiding]) .draw {
    transition-delay: 0ms;
  }

  :host([data-tp-scrub]) .draw {
    transition: none;
    animation: tp-mo-border-draw var(--_draw-duration) var(--_draw-easing) both paused;
    animation-delay: calc(0ms - var(--_tp-mo-border-time, 0ms));
  }

  :host([data-tp-motion-driven~='reveal']) .draw {
    transition: none !important;
  }

  /* Drawn: by the reveal, with trigger="none", or while hovered or holding focus. */
  :host([data-revealed]) .draw,
  :host([data-trigger='none']) .draw,
  :host(:is([data-trigger='hover'], [data-trigger='pointer']):hover) .draw,
  :host([data-trigger='focus']:focus-within) .draw {
    --_tp-mo-border-drawn: 1;
  }

  /* The timing probe resolves the glow's lap and fade to computed times and easings. */
  .timing {
    transition:
      --_tp-mo-border-lap var(--_lap) var(--tp-mo-border-loop-easing, linear)
        var(--tp-mo-border-loop-delay, 0s),
      --_tp-mo-border-fade
        calc(
          var(--tp-mo-border-fade-duration, var(--tp-duration-normal)) * var(--tp-motion-scale, 1)
        )
        var(--tp-mo-border-fade-easing, var(--tp-easing-standard))
        var(--tp-mo-border-fade-out-delay, var(--tp-duration-fast));
  }

  /* Reduced motion rests the dashes instead of freezing them mid-cycle. */
  @container style(--tp-motion-play-state: paused) {
    :host([data-effect]:is([data-tp-march], [data-tp-breathe])) .dashes {
      animation: none;
    }
  }

  @keyframes tp-mo-border-march {
    to {
      stroke-dashoffset: calc(var(--_tp-mo-border-period) * var(--_dir));
    }
  }

  @keyframes tp-mo-border-breathe {
    to {
      stroke-dasharray: var(--_tp-mo-border-dash-to)
        calc(var(--_tp-mo-border-period) - var(--_tp-mo-border-dash-to));
    }
  }

  @keyframes tp-mo-border-draw {
    from {
      --_tp-mo-border-drawn: 0;
    }

    to {
      --_tp-mo-border-drawn: 1;
    }
  }
`;
