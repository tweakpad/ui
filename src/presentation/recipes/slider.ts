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
  // Bar variant: a thumbless scrubbing track (Video.js v10 default skin geometry). The played
  // Range ends in a solid cap; Track and cap grow while the slider is hovered, pointed, dragged
  // or focused. The Thumb keeps its native input and only paints a keyboard focus ring.
  'slider-variant-default': [],
  'slider-variant-bar': [
    {
      declarations: {
        '--_tp-slider-bar-size': 'calc(var(--tp-spacing) * 1.25)',
        '--_tp-slider-bar-cap': 'calc(var(--tp-spacing) * .625)',
      },
    },
    {
      selector: '&:is(:hover, [data-pointing], [data-dragging], [data-focused])',
      declarations: {
        '--_tp-slider-bar-size': 'calc(var(--tp-spacing) * 2.25)',
        '--_tp-slider-bar-cap': 'calc(var(--tp-spacing) * 1.25)',
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
  ],
  'slider-buffer-variant-default': [],
  'slider-buffer-variant-bar': [
    { declarations: { background: 'color-mix(in oklab, var(--tp-foreground) 20%, transparent)' } },
  ],
  'slider-range-variant-default': [],
  'slider-range-variant-bar': [
    { declarations: { background: 'var(--tp-foreground)' } },
    {
      // The solid end cap: a rounded bar taller than the Track at the Range's end.
      selector: '&::after',
      declarations: {
        content: "''",
        position: 'absolute',
        'inset-block-start': '50%',
        'inset-inline-end': '0',
        'inline-size': 'var(--_tp-slider-bar-cap)',
        'block-size': 'calc(var(--_tp-slider-bar-size) + var(--tp-spacing) * 2.5)',
        translate: '50% -50%',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-foreground)',
        transition: motionTransition(['inline-size', 'block-size']),
      },
    },
    {
      selector: '&[data-orientation="vertical"]::after',
      declarations: {
        'inset-block-start': '0',
        'inset-inline-end': 'auto',
        'inset-inline-start': '50%',
        'inline-size': 'calc(var(--_tp-slider-bar-size) + var(--tp-spacing) * 2.5)',
        'block-size': 'var(--_tp-slider-bar-cap)',
        translate: '-50% -50%',
      },
    },
  ],
  'slider-thumb-variant-default': [],
  'slider-thumb-variant-bar': [
    {
      declarations: {
        width: 'calc(var(--tp-spacing) * 2)',
        height: 'calc(var(--tp-spacing) * 5)',
        border: '0',
        background: 'transparent',
      },
    },
    {
      selector:
        '&:hover:not([data-disabled]), &:has(input:focus-visible), &[data-active]:not([data-disabled])',
      declarations: { 'box-shadow': 'none' },
    },
    {
      selector: '&:has(input:focus-visible)',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-ring-offset)',
      },
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
        'border-inline-end':
          'calc(var(--tp-spacing) * .5) var(--tp-border-style) var(--tp-background)',
      },
    },
    {
      selector: '&[data-orientation="vertical"]:not(:last-child)',
      declarations: {
        'border-inline-end': '0',
        'border-block-start':
          'calc(var(--tp-spacing) * .5) var(--tp-border-style) var(--tp-background)',
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
