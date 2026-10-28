import type { PresentationDeclarations } from '../../resolver.js';

// Keyboard focus rings. A ring is an outline: it is painted at full strength so it reaches
// the 3:1 non-text contrast minimum against the surface, and it survives forced-colors
// modes, which drop box-shadow halos. Halos may accompany a ring, never replace it.

/** The focus ring, offset outside the control. */
export const focusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
  'outline-offset': 'var(--tp-ring-offset)',
};

/** The focus ring drawn inside a row that sits flush with its neighbours (list items, tabs). */
export const insetFocusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
  'outline-offset': 'calc(-1 * var(--tp-ring-width))',
};

/**
 * The ring of a focused invalid control: the destructive color at full strength. Invalid
 * paint tints its resting outline; a focused control must not inherit that tint.
 */
export const invalidFocusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-destructive)',
};
