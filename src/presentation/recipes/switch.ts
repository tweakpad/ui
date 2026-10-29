import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';
import { fillColor, fillShown } from './shared/fill.js';
import { focusRing } from './shared/focus.js';
import {
  inlineControlLabel,
  inlineControlRings,
  inlineControlSurface,
} from './shared/inline-control.js';
const invalidPaint = {
  'border-color':
    'light-dark(var(--tp-destructive), color-mix(in oklab, var(--tp-destructive) 50%, transparent))',
  'box-shadow':
    '0 0 0 var(--tp-ring-width) light-dark(color-mix(in oklab, var(--tp-destructive) 20%, transparent), color-mix(in oklab, var(--tp-destructive) 40%, transparent))',
};
/** Switch paint; translated geometry remains structural. */
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
      },
    },
    fillColor('var(--tp-primary)'),
    fillShown('&[data-checked]'),
    // The host already applies the disabled opacity; dimming the root too would double it.
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
    { selector: '&[data-readonly]:not([data-disabled])', declarations: { cursor: 'default' } },
    {
      selector: '&[data-focus-visible]:focus-visible',
      declarations: {
        ...focusRing,
        'border-color': 'var(--tp-ring)',
        'box-shadow':
          '0 0 0 var(--tp-ring-width) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
    {
      selector: '&[data-invalid][data-focus-visible]:focus-visible',
      declarations: { 'outline-color': 'var(--tp-destructive)', ...invalidPaint },
    },
    {
      selector: '&[data-invalid]',
      declarations: invalidPaint,
    },
  ],
  // Inline variant: the row is the shared inline row, its label at the start inset like a Select
  // trigger's text and the track at the end inset like the trigger's chevron. The row carries the
  // focus and validity rings, so the track draws neither.
  'switch-row-variant-inline': [
    {
      declarations: {
        ...inlineControlSurface,
        'min-block-size': 'var(--tp-control-height-md)',
        gap: 'var(--tp-space-2)',
        'padding-inline-start': 'var(--tp-space-2-5)',
        'padding-inline-end': 'var(--tp-space-3)',
      },
    },
    { selector: '& > tp-label', declarations: inlineControlLabel },
    ...inlineControlRings('&', ':has(> [part~="switch"]:focus-visible)'),
  ],
  'switch-variant-inline': [
    {
      // As specific as the base invalid rule for focusable parts, so the row's ring replaces it.
      selector: '&[data-focus-visible]:focus-visible, &[data-invalid][part~="focusable"]',
      declarations: { outline: 'none', 'border-color': 'transparent', 'box-shadow': 'none' },
    },
  ],
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
};
