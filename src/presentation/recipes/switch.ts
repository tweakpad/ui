import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
const invalidPaint = {
  'border-color':
    'light-dark(var(--tp-destructive), color-mix(in oklab, var(--tp-destructive) 50%, transparent))',
  'box-shadow':
    '0 0 0 var(--tp-ring-width) light-dark(color-mix(in oklab, var(--tp-destructive) 20%, transparent), color-mix(in oklab, var(--tp-destructive) 40%, transparent))',
};
/** shadcn registry Base/Nova Switch paint; translated geometry remains structural. */
export const switchAppearance: PresentationDictionary = {
  switch: [
    {
      selector: '& ~ tp-label:not([hidden])',
      declarations: { 'padding-inline-start': 'var(--tp-space-2)' },
    },
    {
      declarations: {
        background:
          'light-dark(var(--tp-input), color-mix(in oklab, var(--tp-input) 80%, transparent))',
        border: 'var(--tp-border-width) var(--tp-border-style) transparent',
        'border-radius': 'var(--tp-radius-full)',
        transition: motionTransition(['background-color'], 'fast'),
      },
    },
    { selector: '&[data-checked]', declarations: { background: 'var(--tp-primary)' } },
    {
      selector: '&[data-disabled]',
      declarations: { cursor: 'not-allowed', opacity: 'var(--tp-opacity-disabled)' },
    },
    { selector: '&[data-readonly]:not([data-disabled])', declarations: { cursor: 'default' } },
    {
      selector: '&[data-focus-visible]:focus-visible',
      declarations: {
        outline: 'none',
        'border-color': 'var(--tp-ring)',
        'box-shadow':
          '0 0 0 var(--tp-ring-width) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
    {
      selector: '&[data-invalid][data-focus-visible]:focus-visible',
      declarations: { outline: 'none', ...invalidPaint },
    },
    {
      selector: '&[data-invalid]',
      declarations: invalidPaint,
    },
  ],
  'switch-size-default': [],
  'switch-size-sm': [],
  'switch-thumb': [
    {
      declarations: {
        background: 'light-dark(var(--tp-background), var(--tp-foreground))',
        'border-radius': 'var(--tp-radius-full)',
        transition: motionTransition(['transform'], 'fast'),
      },
    },
    {
      selector: '&[data-checked]',
      declarations: {
        background: 'light-dark(var(--tp-background), var(--tp-primary-foreground))',
      },
    },
  ],
  'switch-thumb-size-default': [],
  'switch-thumb-size-sm': [],
};
