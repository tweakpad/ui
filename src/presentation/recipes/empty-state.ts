import type { PresentationDictionary } from '../resolver.js';

export const emptyStateAppearance: PresentationDictionary = {
  'empty-state': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-4)',
        padding: 'var(--tp-space-6)',
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
  ],
  'empty-state-header': [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  'empty-state-media': [
    { selector: '&', declarations: { 'margin-block-end': 'var(--tp-space-2)' } },
    {
      selector: ':host([media-treatment="icon"]) &',
      declarations: {
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        'inline-size': 'var(--tp-space-8)',
        'block-size': 'var(--tp-space-8)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
  ],
  'empty-state-title': [
    {
      selector: '&',
      declarations: {
        margin: '0',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'letter-spacing': 'var(--tp-tracking-tight)',
      },
    },
  ],
  'empty-state-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        margin: '0',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-relaxed)',
      },
    },
  ],
  'empty-state-content': [
    { selector: '&', declarations: { gap: 'var(--tp-space-2)', 'font-size': 'var(--tp-text-sm)' } },
  ],
};
