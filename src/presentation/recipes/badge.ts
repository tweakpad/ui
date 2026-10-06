import type { PresentationDictionary } from '../resolver.js';

export const badgeAppearance: PresentationDictionary = {
  badge: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        'font-family': 'inherit',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-semibold)',
        'line-height': 'var(--tp-leading-normal)',
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
