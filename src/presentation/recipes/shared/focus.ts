import type { PresentationDeclarations } from '../../resolver.js';

/** The library focus ring: the ring token at the ring width and offset. */
export const focusRing: PresentationDeclarations = {
  outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
  'outline-offset': 'var(--tp-ring-offset)',
};
