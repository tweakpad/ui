import type { PresentationDictionary } from '../resolver.js';
/** Base Attachment + Nova cn-attachment-* mapped to shared theme roles. */
export const attachmentAppearance: PresentationDictionary = {
  attachment: [
    {
      declarations: {
        gap: 'var(--tp-space-3)',
        'padding-block': 'var(--tp-space-1)',
        'scroll-padding-inline': 'var(--tp-space-1)',
      },
    },
  ],
  'attachment-root': [
    {
      declarations: {
        'padding-block': 'var(--tp-space-2)',
        'padding-inline': 'calc(var(--tp-spacing) * 2.5)',
        gap: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        background: 'var(--tp-card)',
        color: 'var(--tp-card-foreground)',
        'box-shadow': 'none',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'padding-block': 'calc(var(--tp-spacing) * 1.5)',
        'padding-inline': 'var(--tp-space-2)',
        gap: 'calc(var(--tp-spacing) * 2.5)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'padding-block': 'var(--tp-space-1)',
        'padding-inline': 'calc(var(--tp-spacing) * 1.5)',
        'border-radius': 'var(--tp-radius-md)',
        gap: 'calc(var(--tp-spacing) * 1.5)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
    {
      selector: ":host([orientation='vertical']) &",
      declarations: { 'inline-size': 'calc(var(--tp-spacing) * 24)' },
    },
    {
      selector: ":host([orientation='vertical']) &[data-content]",
      declarations: { 'inline-size': 'calc(var(--tp-spacing) * 30)' },
    },
    {
      selector: ":host(:not([orientation='vertical'])) &",
      declarations: { 'min-inline-size': 'min(100%, calc(var(--tp-spacing) * 40))' },
    },
    { selector: '&[data-media]', declarations: { padding: 'var(--tp-space-2)' } },
    {
      selector: ":host([size='sm']) &[data-media]",
      declarations: { padding: 'calc(var(--tp-spacing) * 1.5)' },
    },
    {
      selector: ":host([size='xs']) &[data-media]",
      declarations: { padding: 'var(--tp-space-1)' },
    },
    { selector: '&[data-status="idle"]', declarations: { 'border-style': 'dashed' } },
    {
      selector: '&[data-status="error"]',
      declarations: {
        'border-color': 'color-mix(in oklab, var(--tp-destructive) 30%, transparent)',
      },
    },
    {
      selector: '&[data-trigger]:hover',
      declarations: { background: 'color-mix(in oklab, var(--tp-muted) 50%, var(--tp-card))' },
    },
    {
      selector: '&:focus-within',
      declarations: {
        outline:
          'var(--tp-border-width) solid color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
  ],
  'attachment-media': [
    {
      declarations: {
        'inline-size': 'calc(var(--tp-spacing) * 10)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: { 'inline-size': 'calc(var(--tp-spacing) * 8)' },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: { 'inline-size': 'calc(var(--tp-spacing) * 7)' },
    },
    { selector: ":host([orientation='vertical']) &", declarations: { 'inline-size': '100%' } },
    {
      selector: ":host([status='error']) &",
      declarations: {
        background: 'color-mix(in oklab, var(--tp-destructive) 10%, transparent)',
        color: 'var(--tp-destructive)',
      },
    },
    {
      selector:
        ":host(:is([status='uploading'],[status='processing'],[status='error'])) &[data-treatment='image']",
      declarations: { opacity: '.6' },
    },
  ],
  'attachment-content': [
    { declarations: { 'line-height': 'var(--tp-leading-tight)' } },
    {
      selector: ":host([orientation='vertical']) &",
      declarations: { 'padding-inline': 'var(--tp-space-1)' },
    },
  ],
  'attachment-title': [{ declarations: { 'font-weight': 'var(--tp-font-medium)' } }],
  'attachment-description': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'margin-block-start': 'calc(var(--tp-spacing) / 2)',
      },
    },
    { selector: ":host([status='error']) &", declarations: { color: 'var(--tp-destructive)' } },
  ],
  'attachment-actions': [{ declarations: { gap: 'var(--tp-space-1)' } }],
  'attachment-action': [],
  'attachment-trigger': [
    { declarations: { 'border-radius': 'inherit' } },
    {
      selector: '&::part(button)',
      declarations: {
        'inline-size': '100%',
        'block-size': '100%',
        'min-block-size': '0',
        padding: '0',
        border: '0',
        background: 'transparent',
        'border-radius': 'inherit',
      },
    },
  ],
};
