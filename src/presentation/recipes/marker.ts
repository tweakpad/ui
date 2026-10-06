import type { PresentationDictionary } from '../resolver.js';

export const markerAppearance: PresentationDictionary = {
  marker: [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'min-block-size': 'var(--tp-icon-size-sm)',
        color: 'var(--tp-muted-foreground)',
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'text-align': 'start',
        background: 'transparent',
        border: '0',
        padding: '0',
      },
    },
    { selector: ':host([tone="accent"]) &', declarations: { color: 'var(--tp-primary)' } },
    { selector: ':host([tone="danger"]) &', declarations: { color: 'var(--tp-destructive)' } },
    { selector: ':host([tone="success"]) &', declarations: { color: 'var(--tp-success)' } },
    {
      selector: ':host([variant="separator"]) &::before, :host([variant="separator"]) &::after',
      declarations: {
        content: "''",
        'block-size': 'var(--tp-border-width)',
        'min-inline-size': '0',
        flex: '1',
        background: 'var(--tp-border)',
      },
    },
    {
      selector: ':host([variant="separator"]) &::before',
      declarations: { 'margin-inline-end': 'var(--tp-space-1)' },
    },
    {
      selector: ':host([variant="separator"]) &::after',
      declarations: { 'margin-inline-start': 'var(--tp-space-1)' },
    },
    {
      selector: ':host([variant="border"]) &',
      declarations: {
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'padding-block-end': 'var(--tp-space-2)',
      },
    },
    { selector: '&:is(button,a)', declarations: { cursor: 'pointer' } },
    {
      selector: '&:is(a)',
      declarations: {
        'text-decoration': 'underline',
        'text-underline-offset': 'var(--tp-space-1)',
      },
    },
    { selector: '&:is(button,a):hover', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:is(button,a):focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'marker-icon': [
    {
      declarations: {
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: '& ::slotted(tp-icon)',
      declarations: {
        'min-inline-size': '100%',
        'max-inline-size': '100%',
        'min-block-size': '100%',
        'max-block-size': '100%',
      },
    },
  ],
  'marker-content': [
    { selector: ':host([variant="separator"]) &', declarations: { 'text-align': 'center' } },
    {
      selector: '& ::slotted(a)',
      declarations: {
        color: 'inherit',
        'text-decoration': 'underline',
        'text-underline-offset': 'var(--tp-space-1)',
      },
    },
    { selector: '& ::slotted(a:hover)', declarations: { color: 'var(--tp-foreground)' } },
  ],
};
