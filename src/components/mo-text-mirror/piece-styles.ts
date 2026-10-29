import { textDriverCss, textPieceCss } from '../shared/text-reveal-styles.js';

/**
 * Light-tree styles for Text mirror lines, adopted once per root. Each line is cut at the middle
 * of its own text into two windows that stay in place: down the middle by default, across it when
 * `orientation` is `vertical`. Each window slides its half of the line out of that seam to its
 * place, the real line in the end window and an inert copy in the start window, and back into it
 * when the text hides.
 */
export const moTextMirrorPieceCss = /* css */ `${textPieceCss('tp-mo-text-mirror')}
tp-mo-text-mirror [data-tp-mirror] {
  --_tp-tm-mirror-center: calc(
    var(--_tp-tm-mirror-start, 0px) + var(--_tp-tm-mirror-size, 100%) / 2
  );
  --_tp-tm-mirror-reach: calc(var(--_tp-tm-mirror-size, 100%) / 2 + var(--_tp-tm-bleed));
  /* How far the end window's line starts from its place; the start window's copy mirrors it. */
  --_tp-tm-mirror-x: calc(-1 * var(--_tp-tm-mirror-reach));
  --_tp-tm-mirror-y: 0px;
  position: relative;
  clip-path: none;
}

tp-mo-text-mirror[orientation='vertical'] [data-tp-mirror] {
  --_tp-tm-mirror-center: calc(
    var(--_tp-tm-mirror-block-start, 0px) + var(--_tp-tm-mirror-block-size, 100%) / 2
  );
  --_tp-tm-mirror-reach: calc(var(--_tp-tm-mirror-block-size, 100%) / 2 + var(--_tp-tm-bleed));
  --_tp-tm-mirror-x: 0px;
  --_tp-tm-mirror-y: calc(-1 * var(--_tp-tm-mirror-reach));
}

tp-mo-text-mirror [data-tp-mirror-window] {
  display: block;
}

tp-mo-text-mirror [data-tp-mirror-window='end'] {
  clip-path: inset(
    calc(-1 * var(--_tp-tm-bleed)) -100vmax calc(-1 * var(--_tp-tm-bleed))
      var(--_tp-tm-mirror-center)
  );
}

tp-mo-text-mirror [data-tp-mirror-window='start'] {
  position: absolute;
  inset: 0;
  clip-path: inset(
    calc(-1 * var(--_tp-tm-bleed)) calc(100% - var(--_tp-tm-mirror-center))
      calc(-1 * var(--_tp-tm-bleed)) -100vmax
  );
}

/* Vertical: the end window is the half below the seam, the start window the half above it. */
tp-mo-text-mirror[orientation='vertical'] [data-tp-mirror-window='end'] {
  clip-path: inset(var(--_tp-tm-mirror-center) -100vmax calc(-1 * var(--_tp-tm-bleed)) -100vmax);
}

tp-mo-text-mirror[orientation='vertical'] [data-tp-mirror-window='start'] {
  clip-path: inset(
    calc(-1 * var(--_tp-tm-bleed)) -100vmax calc(100% - var(--_tp-tm-mirror-center)) -100vmax
  );
}

tp-mo-text-mirror [data-tp-mirror-slide] {
  display: block;
  transition: translate var(--_tp-tm-duration) var(--_tp-tm-easing);
  transition-delay: calc(
    (var(--_tp-tm-mirror-order, 0) * var(--_tp-tm-stagger, 30ms) + var(--_tp-tm-delay, 0ms)) *
      var(--tp-motion-scale, 1)
  );
}

tp-mo-text-mirror:not([data-revealed], [data-tp-scrub]) [data-tp-mirror-window='end'] > [data-tp-mirror-slide] {
  translate: var(--_tp-tm-mirror-x) var(--_tp-tm-mirror-y);
  transition-duration: 0s;
  transition-delay: 0s;
}

tp-mo-text-mirror:not([data-revealed], [data-tp-scrub]) [data-tp-mirror-window='start'] > [data-tp-mirror-slide] {
  translate: calc(-1 * var(--_tp-tm-mirror-x)) calc(-1 * var(--_tp-tm-mirror-y));
  transition-duration: 0s;
  transition-delay: 0s;
}

/* A hide plays the reveal backwards: the halves slide back into the seam. */
tp-mo-text-mirror[data-tp-hiding]:not([data-revealed]) [data-tp-mirror-slide] {
  transition-duration: var(--_tp-tm-duration);
  transition-delay: calc(
    var(--_tp-tm-mirror-order, 0) * var(--_tp-tm-stagger, 30ms) * var(--tp-motion-scale, 1)
  );
}

/* At rest the real line shows whole and the copy steps aside, so links and selection behave as in
   the original text. */
tp-mo-text-mirror[data-tp-at-rest]:not([data-tp-scrub]) [data-tp-mirror-window='end'] {
  clip-path: none;
}

tp-mo-text-mirror[data-tp-at-rest]:not([data-tp-scrub]) [data-tp-mirror-window='start'] {
  visibility: hidden;
}

/* Scrubbed (Foundation §18.19 tm-scrub): the scroll sets the time; each half shows its eased
   place at that time of the timed reveal, its line's stagger offset included. */
@keyframes tp-mo-text-mirror-end {
  from {
    translate: var(--_tp-tm-mirror-x) var(--_tp-tm-mirror-y);
  }
}

@keyframes tp-mo-text-mirror-start {
  from {
    translate: calc(-1 * var(--_tp-tm-mirror-x)) calc(-1 * var(--_tp-tm-mirror-y));
  }
}

tp-mo-text-mirror[data-tp-scrub] [data-tp-mirror-slide] {
  transition: none;
  animation: tp-mo-text-mirror-end var(--_tp-tm-duration) var(--_tp-tm-easing) both paused;
  animation-delay: calc(
    var(--_tp-tm-mirror-order, 0) * var(--_tp-tm-stagger, 30ms) - var(--_tp-tm-time, 0ms)
  );
}

tp-mo-text-mirror[data-tp-scrub] [data-tp-mirror-window='start'] > [data-tp-mirror-slide] {
  animation-name: tp-mo-text-mirror-start;
}

${textDriverCss('tp-mo-text-mirror', '[data-tp-animate], [data-tp-mirror-slide]')}`;
