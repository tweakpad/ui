import type { PresentationDictionary } from '../resolver.js';

export const messageAppearance: PresentationDictionary = {
  message: [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'message-root': [
    { declarations: { 'column-gap': 'var(--tp-space-2)', 'font-size': 'var(--tp-text-sm)' } },
  ],
  'message-avatar': [{ declarations: { 'min-inline-size': 'var(--tp-control-height-lg)' } }],
  'message-content': [{ declarations: { gap: 'calc(var(--tp-spacing) * 2.5)' } }],
  'message-header': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'padding-inline': 'var(--tp-space-3)',
        'margin-block-end': 'var(--tp-space-2)',
      },
    },
  ],
  'message-footer': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'padding-inline': 'var(--tp-space-3)',
        'margin-block-start': 'var(--tp-space-2)',
      },
    },
  ],
};
