import type { PresentationDictionary } from '../resolver.js';

export const tabsAppearance: PresentationDictionary = {
  tabs: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'tabs-list': [
    {
      selector: '&',
      declarations: {
        padding: 'var(--tp-space-1)',
        'border-radius': 'var(--tp-radius-lg)',
        color: 'var(--tp-muted-foreground)',
      },
    },
    { selector: ":host([variant='enclosed']) &", declarations: { background: 'var(--tp-muted)' } },
    {
      selector: ":host([variant='underline']) &",
      declarations: { background: 'transparent', gap: 'var(--tp-space-1)', 'border-radius': '0' },
    },
  ],
  'tabs-trigger': [
    {
      selector: '&',
      declarations: {
        border: 'var(--tp-border-width) solid transparent',
        background: 'transparent',
        color: 'var(--tp-muted-foreground)',
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        padding: 'var(--tp-space-1) var(--tp-space-2)',
        gap: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
    { selector: '&:hover:not([data-disabled])', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) solid var(--tp-ring)',
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
    { selector: '&[data-disabled]', declarations: { opacity: 'var(--tp-opacity-disabled)' } },
    { selector: '&[data-selected]', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: ":host([variant='enclosed']) &[data-selected]",
      declarations: { background: 'var(--tp-background)', 'box-shadow': 'var(--tp-shadow-sm)' },
    },
    {
      selector: ":host([variant='underline']) &",
      declarations: {
        'border-block-end': 'var(--tp-border-width-strong) solid transparent',
        'border-radius': '0',
      },
    },
    {
      selector: ":host([variant='underline']) &[data-selected]",
      declarations: { 'border-block-end-color': 'var(--tp-foreground)' },
    },
    {
      selector: ":host([variant='underline'][orientation='vertical']) &",
      declarations: {
        'border-block-end-color': 'transparent',
        'border-inline-end': 'var(--tp-border-width-strong) solid transparent',
      },
    },
    {
      selector: ":host([variant='underline'][orientation='vertical']) &[data-selected]",
      declarations: { 'border-inline-end-color': 'var(--tp-foreground)' },
    },
    {
      selector: ':host([data-has-indicator]) &[data-selected]',
      declarations: {
        background: 'transparent',
        'box-shadow': 'none',
        'border-color': 'transparent',
      },
    },
  ],
  'tabs-indicator': [
    {
      selector: '&',
      declarations: {
        background: 'var(--tp-background)',
        'border-radius': 'var(--tp-radius-md)',
        'box-shadow': 'var(--tp-shadow-sm)',
      },
    },
    {
      selector: ":host([variant='underline']) &",
      declarations: {
        background: 'var(--tp-foreground)',
        'border-radius': '0',
        'box-shadow': 'none',
      },
    },
  ],
  'tabs-content': [
    { selector: '&', declarations: { 'font-size': 'var(--tp-text-sm)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) solid var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
};
