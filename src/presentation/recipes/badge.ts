import type { PresentationDictionary } from '../resolver.js';

export const badgeAppearance: PresentationDictionary = {
  badge: [
    {
      selector: '&',
      declarations: {
        // Nova cn-badge: h-5 gap-1 px-2 py-0.5 text-xs font-medium, icons size-3.
        'block-size': 'var(--tp-space-5)',
        gap: 'var(--tp-space-1)',
        padding: '0 var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        'font-family': 'inherit',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-normal)',
        'white-space': 'nowrap',
        '--_tp-icon-extent': 'var(--tp-icon-size-xs)',
        'text-decoration': 'none',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    {
      selector: ':host([interactive]) &:is(button,a)',
      declarations: { appearance: 'none', cursor: 'pointer' },
    },
    {
      selector: ':host([interactive]) &:is(button,a):focus-visible',
      declarations: {
        'border-color': 'var(--tp-ring)',
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
    {
      selector: ':host([interactive][variant="destructive"]) &:is(button,a):focus-visible',
      declarations: { 'border-color': 'var(--tp-destructive)' },
    },
    {
      selector: ':host([disabled]) &:is(button,a)',
      declarations: { cursor: 'not-allowed' },
    },
  ],
};
