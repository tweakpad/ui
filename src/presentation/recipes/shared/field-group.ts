import type { PresentationRule } from '../../resolver.js';

/** Stacked spacing between fields, shared by Field groups and Form. */
export const fieldGroupRules: readonly PresentationRule[] = [
  { declarations: { gap: 'var(--tp-space-5)' } },
];
