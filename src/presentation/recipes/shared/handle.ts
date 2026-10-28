import { motionTransition } from '../../motion.js';
import type { PresentationDeclarations, PresentationRule } from '../../resolver.js';
import { focusRing } from './focus.js';

// Widget handle rings (the color picker's area thumb, wheel handles, ring and triangle thumbs;
// the easing editor's control handles and points): a round marker ringed in the background
// color over a foreground mix, with the Slider thumb's focus and active rings.
// The markers are 12px rings built from tokens.

export const ringMix = 'color-mix(in oklab, var(--tp-foreground) 30%, transparent)';

export const thumbRing: PresentationDeclarations = {
  'border-radius': 'var(--tp-radius-full)',
  border: 'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-background)',
  'box-shadow': `0 0 0 var(--tp-border-width) ${ringMix}, var(--tp-shadow-sm)`,
  background: 'var(--_tp-handle-paint, var(--tp-background))',
  transition: motionTransition(['box-shadow', 'outline-color'], 'fast'),
};
export const activeRing: PresentationDeclarations = {
  'box-shadow': `0 0 0 var(--tp-border-width) ${ringMix}, 0 0 0 calc(var(--tp-ring-width) * 1.5) color-mix(in oklab, var(--tp-ring) 50%, transparent)`,
};

/** A handle of `size` whose hidden input's focus-visible rings it and whose drag marks it active. */
export const thumb = (size: string): readonly PresentationRule[] => [
  { declarations: { 'inline-size': size, 'block-size': size, ...thumbRing } },
  { selector: '&:has(input:focus-visible)', declarations: focusRing },
  { selector: '&[data-dragging]', declarations: activeRing },
];
