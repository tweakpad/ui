import type { PresentationDictionary } from '../resolver.js';

export const bubbleAppearance: PresentationDictionary = {
  bubble: [{ selector: '&', declarations: { gap: 'var(--tp-space-2)' } }],
  'bubble-root': [{ selector: '&', declarations: { gap: 'var(--tp-space-1)' } }],
  'bubble-content': [
    { declarations: { gap: 'var(--tp-space-2)' } },
    { selector: '& > slot::slotted(:is(p,ul,ol,pre,blockquote))', declarations: { margin: '0' } },
    {
      selector: '&',
      declarations: {
        'border-radius': 'var(--tp-radius-lg)',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-relaxed)',
        'font-family': 'inherit',
        'text-align': 'start',
        'text-decoration': 'none',
      },
    },
    {
      selector: '&:is(button,a)',
      declarations: { cursor: 'pointer' },
    },
    {
      selector: ':host([variant="ghost"]) &',
      declarations: { padding: '0', 'border-radius': '0', border: '0' },
    },
    {
      selector: '&:is(button,a):focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'bubble-reactions': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'calc(var(--tp-spacing) * 0.5) calc(var(--tp-spacing) * 1.5)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-muted)',
        'box-shadow': '0 0 0 var(--tp-border-width-strong) var(--tp-background)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '&[data-controls]',
      declarations: { padding: '0', 'border-radius': 'var(--tp-radius-lg)' },
    },
  ],
};
