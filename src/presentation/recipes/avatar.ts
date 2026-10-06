import type { PresentationDictionary } from '../resolver.js';

export const avatarAppearance: PresentationDictionary = {
  avatar: [
    {
      selector: '&',
      declarations: {
        width: 'var(--tp-control-height-lg)',
        height: 'var(--tp-control-height-lg)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'transparent',
      },
    },
    {
      selector: '&::after',
      declarations: {
        content: "''",
        position: 'absolute',
        inset: '0',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'inherit',
        'pointer-events': 'none',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-control-height-md)',
        height: 'var(--tp-control-height-md)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-space-16)',
        height: 'var(--tp-space-16)',
      },
    },
  ],
  'avatar-image': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
      },
    },
  ],
  'avatar-fallback': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-semibold)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-muted-foreground)',
        'border-radius': 'inherit',
      },
    },
  ],
  'avatar-overflow-count': [
    ...(['sm', 'default', 'lg'] as const).map((size, index) => ({
      selector: `:host([size="${size}"]) & > tp-icon`,
      declarations: {
        'min-inline-size': `var(--tp-space-${index + 3})`,
        'max-inline-size': `var(--tp-space-${index + 3})`,
        'min-block-size': `var(--tp-space-${index + 3})`,
        'max-block-size': `var(--tp-space-${index + 3})`,
      },
    })),
  ],
  'avatar-badge': [
    {
      declarations: {
        'inline-size': 'calc(var(--tp-spacing) * 2.5)',
        'block-size': 'calc(var(--tp-spacing) * 2.5)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-primary)',
        color: 'var(--tp-primary-foreground)',
        'box-shadow': '0 0 0 var(--tp-border-width-strong) var(--tp-background)',
      },
    },
    {
      selector: ':host([size="sm"]) &',
      declarations: { 'inline-size': 'var(--tp-space-2)', 'block-size': 'var(--tp-space-2)' },
    },
    {
      selector: ':host([size="lg"]) &',
      declarations: { 'inline-size': 'var(--tp-space-3)', 'block-size': 'var(--tp-space-3)' },
    },
    {
      selector: '& ::slotted(tp-icon)',
      declarations: {
        'max-inline-size': 'var(--tp-space-2)',
        'max-block-size': 'var(--tp-space-2)',
      },
    },
    {
      selector: ':host([size="sm"]) & ::slotted(tp-icon)',
      declarations: { visibility: 'hidden' },
    },
  ],
};
