import type { PresentationDeclarations } from '../../resolver.js';

/** The callout surface (`uwg-te-tab-vocabulary-r17`): the Alert surface with its icon column gap. */
export const calloutSurface: PresentationDeclarations = {
  'column-gap': 'var(--tp-space-2)',
  padding: 'var(--tp-space-2) var(--tp-space-2-5)',
  border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
  'border-radius': 'var(--tp-radius-lg)',
  background: 'var(--tp-card)',
  color: 'var(--tp-card-foreground)',
  'font-size': 'var(--tp-text-sm)',
  'box-shadow': 'var(--tp-shadow-none)',
};
