import type { PresentationDictionary } from '../resolver.js';

// The dot paints its status role; secondary is the neutral status, so it takes the muted
// foreground: the secondary surface role has no contrast as a small mark.
const roles = {
  default: 'primary',
  secondary: 'muted-foreground',
  success: 'success',
  warning: 'warning',
  destructive: 'destructive',
} as const;

const dot = (role: string) => ({
  declarations: { background: `var(--tp-status-dot-color, var(--tp-${role}))` },
});

export const statusDotAppearance: PresentationDictionary = {
  'status-dot': [
    {
      declarations: { gap: 'var(--tp-space-1-5)' },
    },
  ],
  'status-dot-indicator': [
    { declarations: { 'border-radius': 'var(--tp-radius-full)' } },
    // An unknown variant keeps the default color.
    dot(roles.default),
  ],
  ...Object.fromEntries(
    Object.entries(roles).map(([variant, role]) => [
      `status-dot-indicator-variant-${variant}`,
      [dot(role)],
    ]),
  ),
};
