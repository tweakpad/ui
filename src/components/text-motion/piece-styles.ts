/**
 * Light-tree styles for Text motion pieces (CL Text motion `tml-presentation`), adopted once per
 * root. Pieces add no box size, so the split text lays out exactly like the original; start
 * states use only opacity, translate, scale and filter (Foundation §18.19 `tm-layout`).
 */
export const textMotionPieceCss = /* css */ `
tp-text-motion {
  --_tp-tm-duration: calc(
    var(--tp-text-motion-duration, calc(var(--tp-duration-normal, 280ms) * 2)) *
      var(--tp-motion-scale, 1)
  );
  --_tp-tm-easing: var(--tp-text-motion-easing, ease-out);
  --_tp-tm-bleed: var(--tp-text-motion-mask-bleed, 0.1em);
  --_tp-tm-distance: var(--tp-text-motion-distance, 0.4em);
  --_tp-tm-clip-block: -100vmax;
  --_tp-tm-clip-inline: -100vmax;
}

tp-text-motion[data-tp-masked] {
  --_tp-tm-distance: calc(100% + var(--_tp-tm-bleed));
}

tp-text-motion[data-reveal~='up'],
tp-text-motion[data-reveal~='down'] {
  --_tp-tm-clip-block: calc(-1 * var(--_tp-tm-bleed));
}

tp-text-motion[data-reveal~='left'],
tp-text-motion[data-reveal~='right'] {
  --_tp-tm-clip-inline: calc(-1 * var(--_tp-tm-bleed));
}

tp-text-motion [data-tp-piece='word'],
tp-text-motion [data-tp-piece='char'],
tp-text-motion [data-tp-piece='mask'] {
  /* Inline boxes are block containers: they must not inherit the paragraph's indent. */
  text-indent: 0;
}

tp-text-motion [data-tp-piece='word'],
tp-text-motion [data-tp-piece='char'] {
  display: inline-block;
}

tp-text-motion [data-tp-piece='word'] {
  white-space: nowrap;
}

/* A line holds exactly one measured line. Between a width change and its recalculation (in the
   same frame) a stale line must not wrap, or content below would move for that layout pass. */
tp-text-motion [data-tp-piece='line'] {
  display: block;
  text-indent: 0;
  text-wrap-mode: nowrap;
}

tp-text-motion [data-tp-piece='line'][data-tp-first-line] {
  text-indent: inherit;
}

tp-text-motion [data-tp-piece='mask'] {
  display: inline-block;
  clip-path: inset(var(--_tp-tm-clip-block) var(--_tp-tm-clip-inline));
}

tp-text-motion [data-tp-piece='mask'][data-tp-mask-unit='lines'] {
  display: block;
}

tp-text-motion [data-tp-text] {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

tp-text-motion [data-tp-animate] {
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
tp-text-motion[data-reveal~='fade'] [data-tp-animate] {
  --_tp-tm-opacity: 0;
}

tp-text-motion[data-reveal~='up'] [data-tp-animate] {
  --_tp-tm-y: var(--_tp-tm-distance);
}

tp-text-motion[data-reveal~='down'] [data-tp-animate] {
  --_tp-tm-y: calc(-1 * var(--_tp-tm-distance));
}

tp-text-motion[data-reveal~='left'] [data-tp-animate] {
  --_tp-tm-x: var(--_tp-tm-distance);
}

tp-text-motion[data-reveal~='right'] [data-tp-animate] {
  --_tp-tm-x: calc(-1 * var(--_tp-tm-distance));
}

tp-text-motion[data-reveal~='zoom-in'] [data-tp-animate] {
  --_tp-tm-scale: calc(1 - var(--tp-text-motion-scale, 0.2));
}

tp-text-motion[data-reveal~='zoom-out'] [data-tp-animate] {
  --_tp-tm-scale: calc(1 + var(--tp-text-motion-scale, 0.2));
}

tp-text-motion[data-reveal~='blur'] [data-tp-animate] {
  --_tp-tm-filter: blur(var(--tp-text-motion-blur, 0.15em));
}

tp-text-motion[data-reveal]:not([data-revealed], [data-tp-scrub]) [data-tp-animate] {
  opacity: var(--_tp-tm-opacity, 1);
  translate: var(--_tp-tm-x, 0) var(--_tp-tm-y, 0);
  scale: var(--_tp-tm-scale, 1);
  filter: var(--_tp-tm-filter, none);
  /* Returning to the start state is instant; only revealing animates. */
  transition-duration: 0s;
  transition-delay: 0s;
}

/* Scrubbed (Foundation §18.19 tm-scrub): the scroll sets the time; each piece shows its eased
   state at that time of the timed reveal, its stagger offset included. */
@keyframes tp-text-motion-reveal {
  from {
    opacity: var(--_tp-tm-opacity, 1);
    translate: var(--_tp-tm-x, 0) var(--_tp-tm-y, 0);
    scale: var(--_tp-tm-scale, 1);
    filter: var(--_tp-tm-filter, none);
  }
}

tp-text-motion[data-reveal][data-tp-scrub] [data-tp-animate] {
  transition: none;
  animation: tp-text-motion-reveal var(--_tp-tm-duration) var(--_tp-tm-easing) both paused;
  animation-delay: calc(
    var(--tp-text-order, 0) * var(--_tp-tm-stagger, 30ms) - var(--_tp-tm-time, 0ms)
  );
}

tp-text-motion[data-tp-motion-driven~='reveal'] [data-tp-animate] {
  transition: none !important;
}
`;
