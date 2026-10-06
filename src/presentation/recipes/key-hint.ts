import type { PresentationDictionary } from '../resolver.js';

export const keyHintAppearance: PresentationDictionary = {
  'key-hint': [
    {
      declarations: {
        'block-size': 'calc(var(--tp-spacing) * 6.25)',
        'min-inline-size': 'calc(var(--tp-spacing) * 6.25)',
        'padding-inline': 'var(--tp-space-1)',
        gap: 'var(--tp-space-1)',
        'border-radius': 'var(--tp-radius-sm)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-muted-foreground)',
        'font-family': 'var(--tp-font-sans)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': '1',
        '--tp-icon-size-md': 'calc(var(--tp-spacing) * 3.75)',
      },
    },
  ],
  'key-hint-group': [
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
