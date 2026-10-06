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
        height: 'var(--tp-space-1)',
        width: '100%',
      },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'var(--tp-space-1)', height: '100%' },
    },
  ],
  'slider-range': [
    { declarations: { 'border-radius': 'var(--tp-radius-full)', background: 'var(--tp-primary)' } },
  ],
  'slider-thumb': [
    {
      declarations: {
        width: 'var(--tp-space-3)',
        height: 'var(--tp-space-3)',
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
          '0 0 0 calc(var(--tp-ring-width) * 1.5) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
    {
      selector: '&[data-disabled]',
      declarations: { opacity: 'var(--tp-opacity-disabled)', cursor: 'not-allowed' },
    },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
  ],
  // Bar variant: a thumbless scrubbing track (Video.js v10 default skin geometry). The Track
  // thickens while the slider is hovered, pointed, dragged or focused. The Thumb keeps its
  // native input but paints nothing; keyboard focus rings the Track.
  'slider-variant-default': [],
  'slider-variant-bar': [
    {
      declarations: {
        '--_tp-slider-bar-size': 'var(--tp-space-1)',
      },
    },
    {
      selector: '&:is(:hover, [data-pointing], [data-dragging], [data-focused])',
      declarations: {
        '--_tp-slider-bar-size': 'var(--tp-space-2)',
      },
    },
  ],
  'slider-track-variant-default': [],
  'slider-track-variant-bar': [
    {
      declarations: {
        background: 'color-mix(in oklab, var(--tp-foreground) 20%, transparent)',
        height: 'var(--_tp-slider-bar-size)',
        transition: motionTransition(['height', 'width']),
      },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'var(--_tp-slider-bar-size)', height: '100%' },
    },
    {
      // The thumbless track carries keyboard focus indication.
      selector: '[part~="slider"][data-focus-visible] &',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
    },
  ],
  'slider-buffer-variant-default': [],
  'slider-buffer-variant-bar': [
    { declarations: { background: 'color-mix(in oklab, var(--tp-foreground) 20%, transparent)' } },
  ],
  'slider-range-variant-default': [],
  'slider-range-variant-bar': [{ declarations: { background: 'var(--tp-foreground)' } }],
  'slider-thumb-variant-default': [],
  'slider-thumb-variant-bar': [
    {
      declarations: {
        width: 'var(--tp-space-2)',
        height: 'var(--tp-space-5)',
        border: '0',
        background: 'transparent',
      },
    },
    {
      selector:
        '&:hover:not([data-disabled]), &:has(input:focus-visible), &[data-active]:not([data-disabled])',
      declarations: { 'box-shadow': 'none' },
    },
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
  // Media buffer: a 35% muted-foreground layer over the muted Track, below the Range.
  'slider-buffer': [
    {
      declarations: {
        'border-radius': 'var(--tp-radius-full)',
        background: 'color-mix(in oklab, var(--tp-muted-foreground) 35%, transparent)',
      },
    },
  ],
  'slider-buffer-orientation-horizontal': [],
  'slider-buffer-orientation-vertical': [],
  // Chapter segments separate with a background-colored gap; the pointed segment
  // receives a 20% muted-foreground layer (docs/styling.md color-mix rule).
  'slider-chapter': [
    {
      selector: '&:not(:last-child)',
      declarations: {
        'border-inline-end': 'var(--tp-space-0-5) var(--tp-border-style) var(--tp-background)',
      },
    },
    {
      selector: '&[data-orientation="vertical"]:not(:last-child)',
      declarations: {
        'border-inline-end': '0',
        'border-block-start': 'var(--tp-space-0-5) var(--tp-border-style) var(--tp-background)',
      },
    },
    {
      selector: '&[data-highlighted]',
      declarations: {
        background: 'color-mix(in oklab, var(--tp-muted-foreground) 20%, transparent)',
      },
    },
  ],
  'slider-chapter-orientation-horizontal': [],
  'slider-chapter-orientation-vertical': [],
};
