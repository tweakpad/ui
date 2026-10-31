import type { PresentationDictionary } from '../resolver.js';

export const kbdAppearance: PresentationDictionary = {
  kbd: [
    {
      declarations: {
        'block-size': 'var(--tp-space-5)',
        'min-inline-size': 'var(--tp-space-5)',
        'padding-inline': 'var(--tp-space-1)',
        gap: 'var(--tp-space-1)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-muted-foreground)',
        'font-family': 'var(--tp-font-sans)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': '1',
        '--_tp-icon-extent': 'var(--tp-icon-size-xs)',
      },
    },
  ],
  'kbd-group': [
    {
      declarations: {
        gap: 'var(--tp-space-1)',
        'font-family': 'var(--tp-font-sans)',
        'font-size': 'var(--tp-text-xs)',
        'line-height': '1',
        'white-space': 'nowrap',
      },
    },
  ],
};
