import type { PresentationRule } from '../../resolver.js';

/**
 * Status region paint (`uwg-te-req-pres-1`, `ucl21-map`): muted text and fill, small text, the
 * region's gap and padding, and destructive text while the owning host's status is error.
 */
export const statusAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-sm)',
      background: 'var(--tp-muted)',
      gap: 'var(--tp-space-2)',
      padding: 'var(--tp-space-4)',
    },
  },
  { selector: ':host([data-status="error"]) &', declarations: { color: 'var(--tp-destructive)' } },
];
