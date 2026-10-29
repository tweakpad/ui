import { textDriverCss, textPieceCss } from '../shared/text-reveal-styles.js';

/**
 * Light-tree styles for Text stroke pieces, adopted once per root. Each word or character carries
 * an outline of its own glyphs (an SVG over the piece). The outline draws over the whole duration,
 * the text fills in over its second half and the outline fades out over its last quarter; a hide
 * plays them back. The dash restarts on every glyph.
 */
export const moTextStrokePieceCss = /* css */ `${textPieceCss('tp-mo-text-stroke')}
tp-mo-text-stroke {
  --_tp-tm-stroke-length: var(--tp-mo-text-stroke-length, 6em);
}

tp-mo-text-stroke :is([data-tp-piece='word'], [data-tp-piece='char']) {
  position: relative;
}

tp-mo-text-stroke [data-tp-animate] {
  --_tp-tm-piece-delay: calc(
    (var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) + var(--_tp-tm-delay, 0ms)) *
      var(--tp-motion-scale, 1)
  );
  transition: -webkit-text-fill-color calc(var(--_tp-tm-duration) / 2) var(--_tp-tm-easing)
    calc(var(--_tp-tm-piece-delay) + var(--_tp-tm-duration) / 2);
}

tp-mo-text-stroke [data-tp-outline] {
  --_tp-tm-stroke-delay: calc(
    (var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) + var(--_tp-tm-delay, 0ms)) *
      var(--tp-motion-scale, 1)
  );
  position: absolute;
  inset: 0;
  inline-size: 100%;
  block-size: 100%;
  overflow: visible;
  pointer-events: none;
  user-select: none;
  fill: none;
  stroke: currentcolor;
  stroke-width: var(--tp-mo-text-stroke-width, 0.03em);
  stroke-linejoin: round;
  opacity: 0;
  transition:
    opacity calc(var(--_tp-tm-duration) / 4) var(--_tp-tm-easing)
      calc(var(--_tp-tm-stroke-delay) + var(--_tp-tm-duration) * 3 / 4),
    stroke-dashoffset var(--_tp-tm-duration) var(--_tp-tm-easing) var(--_tp-tm-stroke-delay);
}

tp-mo-text-stroke [data-tp-outline] text {
  stroke-dasharray: var(--_tp-tm-stroke-length) var(--_tp-tm-stroke-length);
  stroke-dashoffset: 0;
  transition: inherit;
}

/* The start state: no fill, the whole outline undrawn. Returning to it is instant. */
tp-mo-text-stroke:not([data-revealed], [data-tp-scrub]) [data-tp-animate] {
  -webkit-text-fill-color: transparent;
  transition-duration: 0s;
  transition-delay: 0s;
}

tp-mo-text-stroke:not([data-revealed], [data-tp-scrub]) [data-tp-outline] {
  opacity: 1;
  transition-duration: 0s;
  transition-delay: 0s;
}

tp-mo-text-stroke:not([data-revealed], [data-tp-scrub]) [data-tp-outline] text {
  stroke-dashoffset: var(--_tp-tm-stroke-length);
}

/* A hide plays the reveal backwards: the outline returns at once, the fill fades over the first
   half and the outline undraws over the last three quarters. */
tp-mo-text-stroke[data-tp-hiding]:not([data-revealed]) [data-tp-animate] {
  transition-duration: calc(var(--_tp-tm-duration) / 2);
  transition-delay: calc(
    var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) * var(--tp-motion-scale, 1)
  );
}

tp-mo-text-stroke[data-tp-hiding]:not([data-revealed]) [data-tp-outline] {
  transition:
    opacity calc(var(--_tp-tm-duration) / 4) var(--_tp-tm-easing) var(--_tp-tm-stroke-delay),
    stroke-dashoffset calc(var(--_tp-tm-duration) * 3 / 4) var(--_tp-tm-easing)
      calc(var(--_tp-tm-stroke-delay) + var(--_tp-tm-duration) / 4);
}

/* Scrubbed (Foundation §18.19 tm-scrub): the scroll sets the time; each piece shows its eased
   state at that time of the timed reveal, its stagger offset included. */
@keyframes tp-mo-text-stroke-fill {
  from,
  50% {
    -webkit-text-fill-color: transparent;
  }
}

@keyframes tp-mo-text-stroke-outline {
  from,
  75% {
    opacity: 1;
  }

  to {
    opacity: 0;
  }
}

@keyframes tp-mo-text-stroke-draw {
  from {
    stroke-dashoffset: var(--_tp-tm-stroke-length);
  }
}

tp-mo-text-stroke[data-tp-scrub] [data-tp-animate],
tp-mo-text-stroke[data-tp-scrub] [data-tp-outline],
tp-mo-text-stroke[data-tp-scrub] [data-tp-outline] text {
  transition: none;
  animation: tp-mo-text-stroke-fill var(--_tp-tm-duration) var(--_tp-tm-easing) both paused;
  animation-delay: calc(
    var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) - var(--_tp-tm-time, 0ms)
  );
}

tp-mo-text-stroke[data-tp-scrub] [data-tp-outline] {
  animation-name: tp-mo-text-stroke-outline;
}

tp-mo-text-stroke[data-tp-scrub] [data-tp-outline] text {
  animation-name: tp-mo-text-stroke-draw;
}

${textDriverCss('tp-mo-text-stroke', '[data-tp-animate], [data-tp-outline], [data-tp-outline] text')}`;
