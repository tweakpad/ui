import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

// shadcn Base slider.tsx → style-nova.css .cn-slider*; geometry belongs to the family.
export const sliderAppearance: PresentationDictionary = {
  slider: [
    { declarations: { gap: 'var(--tp-space-2)' } },
    { selector: '& > .header', declarations: { gap: 'var(--tp-space-3)' } },
    {
      // Leave room for the centered endpoint thumb and its focus indication beside Output.
      selector:
        '&:not([data-orientation="vertical"]):has(.header):not(:has([part~="slider-label"]))',
      declarations: { gap: 'var(--tp-space-4)' },
    },
  ],
  'slider-track': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-muted)',
        height: 'var(--tp-spacing)',
        width: '100%',
      },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'var(--tp-spacing)', height: '100%' },
    },
  ],
  'slider-range': [
    { declarations: { 'border-radius': 'var(--tp-radius-full)', background: 'var(--tp-primary)' } },
  ],
  'slider-thumb': [
    {
      declarations: {
        width: 'calc(var(--tp-spacing) * 3)',
        height: 'calc(var(--tp-spacing) * 3)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-ring)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-background)',
        transition: motionTransition(['border-color'], 'fast'),
      },
    },
    {
      selector:
        '&:hover:not([data-disabled]), &:has(input:focus-visible), &[data-active]:not([data-disabled])',
      declarations: {
        'box-shadow':
          '0 0 0 calc(var(--tp-spacing) * .75) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
    {
      selector: '&[data-disabled]',
      declarations: { opacity: 'var(--tp-opacity-disabled)', cursor: 'not-allowed' },
    },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
  ],
  'slider-label': [
    { declarations: { 'font-size': 'var(--tp-text-sm)', 'font-weight': 'var(--tp-font-medium)' } },
  ],
  'slider-output': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-muted-foreground)',
        'font-variant-numeric': 'tabular-nums',
      },
    },
  ],
};
