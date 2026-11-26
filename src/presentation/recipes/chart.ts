import type { PresentationDictionary } from '../resolver.js';
import { motionTransition } from '../motion.js';
import { popupSpacingAppearance } from './command-surface.js';
import { divider, surfaceEdge } from './shared/edges.js';
import { focusRing } from './shared/focus.js';
/** Chart anatomy, tooltip treatment, common popup inset and theme palette. */
export const chartAppearance: PresentationDictionary = {
  chart: [
    { declarations: { gap: 'var(--tp-space-4)', 'font-size': 'var(--tp-text-sm)' } },
    { selector: '& figcaption', declarations: { color: 'var(--tp-muted-foreground)' } },
    { selector: '& .body', declarations: { gap: 'var(--tp-space-6)' } },
    { selector: '& .series-entry', declarations: { gap: 'var(--tp-space-2)' } },
    { selector: '& .inspection-content', declarations: { gap: 'var(--tp-space-2)' } },
    { selector: '& .inspection-label', declarations: { 'font-weight': 'var(--tp-font-medium)' } },
    { selector: '& .series-name', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: '& .encoding',
      declarations: {
        'inline-size': 'var(--tp-space-2-5)',
        'block-size': 'var(--tp-space-2-5)',
        background: 'var(--_tp-series-color)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
    {
      selector: '& .encoding[data-indicator="line"]',
      declarations: { 'inline-size': 'var(--tp-space-1)', 'block-size': 'auto' },
    },
    {
      selector: '& .encoding[data-indicator="dashed"]',
      declarations: {
        'inline-size': '0',
        'block-size': 'auto',
        background: 'transparent',
        'border-radius': '0',
        'border-inline-start': 'var(--tp-border-width) dashed var(--_tp-series-color)',
      },
    },
  ],
  'chart-plot-region': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        'font-variant-numeric': 'tabular-nums',
      },
    },
    // The built-in marks: dashed grid lines at the y ticks and a solid line at zero.
    {
      selector: '& .grid-line',
      declarations: {
        stroke: divider.color,
        'stroke-dasharray': '3 4',
        'shape-rendering': 'crispEdges',
      },
    },
    {
      selector: '& .zero-line',
      declarations: {
        stroke: 'color-mix(in oklab, var(--tp-muted-foreground) 70%, transparent)',
        'shape-rendering': 'crispEdges',
      },
    },
    { selector: '& .axis text', declarations: { fill: 'currentColor' } },
    {
      selector: '& .tick, & .axis-line',
      declarations: { stroke: divider.color, 'shape-rendering': 'crispEdges' },
    },
    {
      selector: '& .line',
      declarations: {
        fill: 'none',
        'stroke-width': '2',
        'stroke-linejoin': 'round',
        'stroke-linecap': 'round',
      },
    },
    {
      selector: '& .stem',
      declarations: {
        stroke: 'var(--tp-muted-foreground)',
        'stroke-opacity': '0.6',
        'stroke-dasharray': '3 3',
      },
    },
    // Inspection: a crosshair with a dot per series over lines, a band behind bars.
    {
      selector: '& .cursor-line',
      declarations: { stroke: 'var(--tp-muted-foreground)', 'stroke-opacity': '0.5' },
    },
    {
      selector: '& .cursor-dot',
      declarations: { stroke: 'var(--tp-background)', 'stroke-width': '2' },
    },
    // A tint of the text color, so the band shows on the page and on a Card alike.
    {
      selector: '& .cursor-band',
      declarations: { fill: 'var(--tp-foreground)', 'fill-opacity': '0.08' },
    },
    // Polar marks: slices, rings over their tracks, radar shapes, and the inspected series.
    {
      selector: '& .track',
      declarations: { fill: 'none', stroke: 'var(--tp-muted)', 'stroke-linecap': 'round' },
    },
    { selector: '& .ring', declarations: { fill: 'none', 'stroke-linecap': 'round' } },
    { selector: '& .ring-line', declarations: { fill: 'none' } },
    {
      selector: '& .area',
      declarations: { 'fill-opacity': '0.2', 'stroke-width': '2', 'stroke-linejoin': 'round' },
    },
    { selector: '& .series', declarations: { transition: motionTransition(['opacity'], 'fast') } },
    { selector: '& .series.dim', declarations: { opacity: '0.35' } },
    {
      selector: '& .ring-label, & .line-label',
      declarations: { 'font-weight': 'var(--tp-font-medium)' },
    },
    { selector: '& .ring-label', declarations: { fill: 'var(--tp-foreground)' } },
    { selector: '& .marks', declarations: { outline: 'none' } },
    { selector: '& .marks:focus-visible', declarations: focusRing },
  ],
  'chart-legend': [
    { declarations: { gap: 'var(--tp-space-4)' } },
    // Beside the plot the entries stack, values aligned at the end.
    {
      selector: '&[data-placement="start"], &[data-placement="end"]',
      declarations: { gap: 'var(--tp-space-3)' },
    },
    // Above the plot the legend reads like a header, from the start.
    { selector: '&[data-placement="top"]', declarations: { 'justify-content': 'flex-start' } },
  ],
  'chart-legend-title': [
    {
      declarations: {
        color: 'var(--tp-foreground)',
        'font-weight': 'var(--tp-font-medium)',
        'margin-block-end': 'var(--tp-space-3)',
      },
    },
  ],
  'chart-inspection-surface': [
    ...popupSpacingAppearance,
    {
      declarations: {
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        border: surfaceEdge.border,
        'border-radius': 'var(--tp-radius-lg)',
        'box-shadow': 'var(--tp-shadow-lg)',
        'font-size': 'var(--tp-text-xs)',
        'min-inline-size': 'calc(var(--tp-space-10) * 3)',
      },
    },
  ],
};
