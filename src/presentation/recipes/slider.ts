import { motionTransition } from '../motion.js';
import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { focusRing } from './shared/focus.js';
import { handleSurface } from './shared/handle.js';
import {
  inlineControlEdge,
  inlineControlFill,
  inlineControlLabel,
  inlineControlRings,
  inlineControlSurface,
  inlineControlValue,
} from './shared/inline-control.js';

// Slider paint; geometry belongs to the family.

/** The full-height edge an inline slider paints at the value while it is in use. */
const inlineEdge = {
  content: "''",
  position: 'absolute',
  'inset-block': '0',
  width: 'var(--tp-space-0-5)',
  background: inlineControlEdge,
  opacity: 'var(--_tp-slider-edge, 0)',
  transition: motionTransition(['opacity'], 'fast'),
};

/** Inline paint applies to horizontal sliders; a vertical inline slider keeps the default look. */
const horizontal = (rules: PresentationRule[]): PresentationRule[] =>
  rules.map((rule) => ({
    ...rule,
    selector: (rule.selector ?? '&').replace('&', '&:not([data-orientation="vertical"])'),
  }));
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
        background: handleSurface,
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
    // The halo is shared with hover; keyboard focus adds the ring.
    { selector: '&:has(input:focus-visible)', declarations: focusRing },
    // The host already applies the disabled opacity; dimming the thumb too would double it.
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
  ],
  // Bar variant: a thumbless scrubbing track. The Track
  // thickens while the slider is hovered, pointed, dragged or focused. The Thumb keeps its
  // native input but paints nothing; keyboard focus rings the Track.
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
      declarations: focusRing,
    },
  ],
  'slider-buffer-variant-bar': [
    { declarations: { background: 'color-mix(in oklab, var(--tp-foreground) 20%, transparent)' } },
  ],
  'slider-range-variant-bar': [{ declarations: { background: 'var(--tp-foreground)' } }],
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
    // The Track carries the ring; the unpainted Thumb draws none.
    { selector: '&:has(input:focus-visible)', declarations: { outline: 'none' } },
  ],
  // Inline variant: one control-height row for stacked controls. The Track is the row
  // surface and the Range fills it to the value in the primary color. While the slider is in
  // use (hovered, pointed, dragged or focused) the Range paints a full-height primary edge at
  // the value; the Track's rounded clip trims it at the bar's ends. Keyboard focus and validity
  // ring the row.
  'slider-variant-inline': horizontal([
    { declarations: { '--_tp-slider-edge': '0' } },
    {
      selector: '&:is(:hover, [data-pointing], [data-dragging], [data-focused])',
      declarations: { '--_tp-slider-edge': '1' },
    },
  ]),
  'slider-track-variant-inline': horizontal([
    { declarations: { ...inlineControlSurface, height: '100%', width: '100%', overflow: 'clip' } },
    ...inlineControlRings('[part~="slider"]'),
  ]),
  'slider-range-variant-inline': horizontal([
    { declarations: { 'border-radius': '0', background: inlineControlFill } },
    {
      selector: '&::after',
      declarations: { ...inlineEdge, 'inset-inline-end': '0' },
    },
    // A range of several values marks both of its ends.
    {
      selector: '&[data-multiple]::before',
      declarations: { ...inlineEdge, 'inset-inline-start': '0' },
    },
  ]),
  'slider-buffer-variant-inline': horizontal([{ declarations: { 'border-radius': '0' } }]),
  // The Range draws the edge, so the Thumb keeps only its input and hit area.
  'slider-thumb-variant-inline': horizontal([
    {
      declarations: {
        width: 'var(--tp-space-0-5)',
        height: 'var(--tp-control-height-md)',
        border: '0',
        'border-radius': '0',
        background: 'transparent',
      },
    },
    {
      selector:
        '&:hover:not([data-disabled]), &:has(input:focus-visible), &[data-active]:not([data-disabled])',
      declarations: { 'box-shadow': 'none' },
    },
    // The row carries the ring; the Thumb draws none.
    { selector: '&:has(input:focus-visible)', declarations: { outline: 'none' } },
  ]),
  'slider-label-variant-inline': horizontal([{ declarations: inlineControlLabel }]),
  'slider-output-variant-inline': horizontal([
    { declarations: { ...inlineControlValue, transition: motionTransition(['color'], 'fast') } },
    {
      selector: '[part~="slider"]:is(:hover, [data-pointing], [data-dragging], [data-focused]) &',
      declarations: { color: 'var(--tp-foreground)' },
    },
  ]),
  // Ticks: hairlines across the track; the center tick is longer and stronger.
  'slider-tick': [
    {
      declarations: {
        width: 'var(--tp-border-width)',
        height: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'color-mix(in oklab, var(--tp-muted-foreground) 50%, transparent)',
      },
    },
    {
      selector: '&[data-center]',
      declarations: { height: 'var(--tp-space-3)', background: 'var(--tp-muted-foreground)' },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'var(--tp-space-2)', height: 'var(--tp-border-width)' },
    },
    {
      selector: '&[data-orientation="vertical"][data-center]',
      declarations: { width: 'var(--tp-space-3)' },
    },
  ],
  'slider-tick-variant-inline': horizontal([
    { declarations: { height: 'var(--tp-space-2)' } },
    // Ticks under the fill take the primary color.
    { selector: '&[data-filled]', declarations: { background: inlineControlEdge } },
    // Ticks on the bounds would sit on the row's edges.
    { selector: '&[data-edge]', declarations: { display: 'none' } },
    { selector: '&[data-center]', declarations: { height: 'var(--tp-space-4)' } },
  ]),
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
};
