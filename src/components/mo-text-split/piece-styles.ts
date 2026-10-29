import { textDriverCss, textPieceCss } from '../shared/text-reveal-styles.js';

/**
 * Light-tree styles for Text split pieces (CL Text split `tml-presentation`), adopted once per
 * root: the shared piece layout, then the effect start values and their transitions. Start
 * states use only opacity, translate, scale and filter (Foundation §18.19 `tm-layout`).
 */
export const moTextSplitPieceCss = /* css */ `${textPieceCss('tp-mo-text-split')}
tp-mo-text-split {
  --_tp-tm-distance: var(--tp-mo-text-split-distance, 0.4em);
}

tp-mo-text-split[data-tp-masked] {
  --_tp-tm-distance: calc(100% + var(--_tp-tm-bleed));
}

tp-mo-text-split[data-reveal~='up'],
tp-mo-text-split[data-reveal~='down'] {
  --_tp-tm-clip-block: calc(-1 * var(--_tp-tm-bleed));
}

tp-mo-text-split[data-reveal~='left'],
tp-mo-text-split[data-reveal~='right'] {
  --_tp-tm-clip-inline: calc(-1 * var(--_tp-tm-bleed));
}

tp-mo-text-split [data-tp-animate] {
  transition:
    opacity var(--_tp-tm-duration) var(--_tp-tm-easing),
    translate var(--_tp-tm-duration) var(--_tp-tm-easing),
    scale var(--_tp-tm-duration) var(--_tp-tm-easing),
    filter var(--_tp-tm-duration) var(--_tp-tm-easing);
  transition-delay: calc(
    (var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) + var(--_tp-tm-delay, 0ms)) *
      var(--tp-motion-scale, 1)
  );
}

/* Effect start values, shared by the timed start state and the scrubbed keyframe. */
tp-mo-text-split[data-reveal~='fade'] [data-tp-animate] {
  --_tp-tm-opacity: 0;
}

tp-mo-text-split[data-reveal~='up'] [data-tp-animate] {
  --_tp-tm-y: var(--_tp-tm-distance);
}

tp-mo-text-split[data-reveal~='down'] [data-tp-animate] {
  --_tp-tm-y: calc(-1 * var(--_tp-tm-distance));
}

tp-mo-text-split[data-reveal~='left'] [data-tp-animate] {
  --_tp-tm-x: var(--_tp-tm-distance);
}

tp-mo-text-split[data-reveal~='right'] [data-tp-animate] {
  --_tp-tm-x: calc(-1 * var(--_tp-tm-distance));
}

tp-mo-text-split[data-reveal~='zoom-in'] [data-tp-animate] {
  --_tp-tm-scale: calc(1 - var(--tp-mo-text-split-scale, 0.2));
}

tp-mo-text-split[data-reveal~='zoom-out'] [data-tp-animate] {
  --_tp-tm-scale: calc(1 + var(--tp-mo-text-split-scale, 0.2));
}

tp-mo-text-split[data-reveal~='blur'] [data-tp-animate] {
  --_tp-tm-filter: blur(var(--tp-mo-text-split-blur, 0.15em));
}

tp-mo-text-split[data-reveal]:not([data-revealed], [data-tp-scrub]) [data-tp-animate] {
  opacity: var(--_tp-tm-opacity, 1);
  translate: var(--_tp-tm-x, 0) var(--_tp-tm-y, 0);
  scale: var(--_tp-tm-scale, 1);
  filter: var(--_tp-tm-filter, none);
  /* Returning to the start state is instant; only revealing animates. */
  transition-duration: 0s;
  transition-delay: 0s;
}

/* A hide plays the reveal backwards: the start state is reached through the same transitions. */
tp-mo-text-split[data-reveal][data-tp-hiding]:not([data-revealed]) [data-tp-animate] {
  transition-duration: var(--_tp-tm-duration);
  transition-delay: calc(
    var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) * var(--tp-motion-scale, 1)
  );
}

/* Scrubbed (Foundation §18.19 tm-scrub): the scroll sets the time; each piece shows its eased
   state at that time of the timed reveal, its stagger offset included. */
@keyframes tp-mo-text-split-reveal {
  from {
    opacity: var(--_tp-tm-opacity, 1);
    translate: var(--_tp-tm-x, 0) var(--_tp-tm-y, 0);
    scale: var(--_tp-tm-scale, 1);
    filter: var(--_tp-tm-filter, none);
  }
}

tp-mo-text-split[data-reveal][data-tp-scrub] [data-tp-animate] {
  transition: none;
  animation: tp-mo-text-split-reveal var(--_tp-tm-duration) var(--_tp-tm-easing) both paused;
  animation-delay: calc(
    var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) - var(--_tp-tm-time, 0ms)
  );
}

${textDriverCss('tp-mo-text-split', '[data-tp-animate]')}`;
