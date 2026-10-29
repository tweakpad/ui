import { visuallyHiddenRule } from '../../foundation/visually-hidden.js';

/**
 * Light-tree styles every Motion › Text element's pieces share, for the element `host` (CL Text
 * motion `tml-presentation`). Pieces add no box size, so the split text lays out exactly like the
 * original; effects use only opacity, translate, scale, filter, fill color and SVG strokes
 * (Foundation §18.19 `tm-layout`). The host's own `--<host>-duration`, `-easing` and
 * `-mask-bleed` feed the shared timing. Each element appends its effect rules.
 */
export const textPieceCss = (host: string): string => /* css */ `
${host} {
  --_tp-tm-duration: calc(
    var(--${host}-duration, var(--tp-duration-slow)) * var(--tp-motion-scale, 1)
  );
  --_tp-tm-easing: var(--${host}-easing, var(--tp-easing-enter));
  --_tp-tm-bleed: var(--${host}-mask-bleed, 0.1em);
  --_tp-tm-clip-block: -100vmax;
  --_tp-tm-clip-inline: -100vmax;
}

${host} [data-tp-piece='word'],
${host} [data-tp-piece='char'],
${host} [data-tp-piece='mask'] {
  /* Inline boxes are block containers: they must not inherit the paragraph's indent. */
  text-indent: 0;
}

${host} [data-tp-piece='word'],
${host} [data-tp-piece='char'] {
  display: inline-block;
}

${host} [data-tp-piece='word'] {
  white-space: nowrap;
}

/* A line holds exactly one measured line. Between a width change and its recalculation (in the
   same frame) a stale line must not wrap, or content below would move for that layout pass. */
${host} [data-tp-piece='line'] {
  display: block;
  text-indent: 0;
  text-wrap-mode: nowrap;
}

${host} [data-tp-piece='line'][data-tp-first-line] {
  text-indent: inherit;
}

${host} [data-tp-piece='mask'] {
  display: inline-block;
  clip-path: inset(var(--_tp-tm-clip-block) var(--_tp-tm-clip-inline));
}

${host} [data-tp-piece='mask'][data-tp-mask-unit='lines'] {
  display: block;
}

${visuallyHiddenRule(`${host} [data-tp-text]`)}
`;

/** A claimed motion driver animates the pieces itself (Foundation §18.19 `tm-driver`). */
export const textDriverCss = (host: string, pieces: string): string => /* css */ `
${host}[data-tp-motion-driven~='reveal'] :is(${pieces}) {
  transition: none !important;
}
`;
