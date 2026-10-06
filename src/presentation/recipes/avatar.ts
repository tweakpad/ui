import type { PresentationDictionary } from '../resolver.js';

export const avatarAppearance: PresentationDictionary = {
  avatar: [
    {
      selector: '&',
      declarations: {
        // Nova cn-avatar: size-8, sm size-6, lg size-10.
        width: 'var(--tp-space-8)',
        height: 'var(--tp-space-8)',
        'font-size': 'var(--tp-text-sm)',
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
        width: 'var(--tp-space-6)',
        height: 'var(--tp-space-6)',
        'font-size': 'var(--tp-text-xs)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-space-10)',
        height: 'var(--tp-space-10)',
      },
    },
  ],
  'avatar-image': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'avatar-fallback': [
    {
      selector: '&',
      declarations: {
        'font-size': 'inherit',
        'font-weight': 'var(--tp-font-medium)',
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
        // Nova avatar badge: size-2.5, sm size-2, lg size-3.
        'inline-size': 'var(--tp-space-2-5)',
        'block-size': 'var(--tp-space-2-5)',
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
