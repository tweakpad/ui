import type { PresentationDictionary } from '../resolver.js';
export const listItemAppearance: PresentationDictionary = {
  'list-item': [
    { declarations: { gap: 'var(--tp-space-4)' } },
    {
      selector: ':host(:has(tp-list-item[size="sm"])) &',
      declarations: { gap: 'calc(var(--tp-spacing) * 2.5)' },
    },
    {
      selector: ':host(:has(tp-list-item[size="xs"])) &',
      declarations: { gap: 'var(--tp-space-2)' },
    },
  ],
  'list-item-root': [
    { selector: '.row:has(> &)', declarations: { 'column-gap': 'var(--tp-space-3)' } },
    {
      selector: ':host([size="sm"]) .row:has(> &)',
      declarations: { 'column-gap': 'var(--tp-space-2)' },
    },
    {
      selector: ':host([size="xs"]) .row:has(> &)',
      declarations: { 'column-gap': 'var(--tp-space-1)' },
    },
    { selector: '&:is(a,button):hover', declarations: { background: 'var(--tp-muted)' } },
    {
      selector: '&:is(a,button):focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
        'border-color': 'var(--tp-ring)',
      },
    },
    {
      selector: '&[data-selected]',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
    {
      selector: '&',
      declarations: {
        'row-gap': '0',
        'font-size': 'var(--tp-text-sm)',
        'text-decoration': 'none',
        color: 'var(--tp-foreground)',
        'text-align': 'start',
        'font-family': 'inherit',
        padding: 'var(--tp-space-2) var(--tp-space-3)',
        'border-radius': 'var(--tp-radius-sm)',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        padding: 'var(--tp-space-1) var(--tp-space-2)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        padding: 'var(--tp-space-2)',
      },
    },
  ],
  'list-item-actions': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'padding-inline-end': 'calc(var(--tp-space-3) + var(--tp-border-width))',
      },
    },
    {
      selector: ':host(:is([size="sm"],[size="xs"])) &',
      declarations: { 'padding-inline-end': 'calc(var(--tp-space-2) + var(--tp-border-width))' },
    },
  ],
  'list-item-description': [
    {
      selector: '&',
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    { selector: ':host([size="xs"]) &', declarations: { 'font-size': 'var(--tp-text-xs)' } },
    // The selected row paints the accent fill; supporting text keeps contrast on it.
    { selector: ':host([selected]) &', declarations: { color: 'var(--tp-accent-foreground)' } },
  ],

  'list-item-content': [
    { declarations: { gap: 'var(--tp-space-1)' } },
    { selector: ':host([size="xs"]) &', declarations: { gap: '0' } },
  ],
  'list-item-title': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
  'list-item-media': [
    { declarations: { gap: 'var(--tp-space-2)' } },
    {
      selector: '&[data-treatment="icon"]',
      declarations: {
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: '&[data-treatment="image"]',
      declarations: {
        'inline-size': 'var(--tp-space-10)',
        'block-size': 'var(--tp-space-10)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: ':host([size="sm"]) &[data-treatment="image"]',
      declarations: { 'inline-size': 'var(--tp-space-8)', 'block-size': 'var(--tp-space-8)' },
    },
    {
      selector: ':host([size="xs"]) &[data-treatment="image"]',
      declarations: { 'inline-size': 'var(--tp-space-6)', 'block-size': 'var(--tp-space-6)' },
    },
    {
      selector: '&[data-treatment="icon"] ::slotted(tp-icon)',
      declarations: {
        'min-inline-size': '100%',
        'max-inline-size': '100%',
        'min-block-size': '100%',
        'max-block-size': '100%',
      },
    },
    {
      selector: '&[data-treatment="image"] ::slotted(img)',
      declarations: { 'inline-size': '100%', 'block-size': '100%', 'object-fit': 'cover' },
    },
  ],
  'list-item-header': [
    { declarations: { gap: 'var(--tp-space-2)', 'padding-block-end': 'var(--tp-space-3)' } },
    {
      selector: ':host([size="sm"]) &',
      declarations: { 'padding-block-end': 'var(--tp-space-2)' },
    },
    {
      selector: ':host([size="xs"]) &',
      declarations: { 'padding-block-end': 'var(--tp-space-1)' },
    },
  ],
  'list-item-footer': [
    { declarations: { gap: 'var(--tp-space-2)', 'padding-block-start': 'var(--tp-space-3)' } },
    {
      selector: ':host([size="sm"]) &',
      declarations: { 'padding-block-start': 'var(--tp-space-2)' },
    },
    {
      selector: ':host([size="xs"]) &',
      declarations: { 'padding-block-start': 'var(--tp-space-1)' },
    },
  ],
  'list-item-separator': [{ declarations: { 'margin-block': 'var(--tp-space-2)' } }],
};
