import type { PresentationDictionary } from '../resolver.js';
import { focusRing } from './shared/focus.js';

// Widgets Specification Heatmap Presentation. The size axis sets the cell, the gap and the label
// text; the shape axis the cell radius. Public `--tp-heatmap-*` hooks set on the host win over
// these defaults, which live in private properties so a part never shadows a host write.

const size = (cell: string, gap: string, text: string) => [
  {
    declarations: {
      '--_cell': `var(--tp-heatmap-cell-size, ${cell})`,
      '--_gap': `var(--tp-heatmap-gap, ${gap})`,
      '--_legend-cell': `var(--tp-heatmap-cell-size, ${cell})`,
      'font-size': text,
    },
  },
];

const radius = (value: string) => [
  { declarations: { '--_radius': `var(--tp-heatmap-radius, ${value})` } },
];

/** The cell paint: its level color (level 0 while loading). */
const levelPaint = { background: 'var(--tp-heatmap-level-color)' };

export const heatmapAppearance: PresentationDictionary = {
  heatmap: [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        // The default size, which the size keys replace.
        '--_cell': 'var(--tp-heatmap-cell-size, 0.75rem)',
        '--_gap': 'var(--tp-heatmap-gap, 3px)',
        // Separated groups sit one cell apart, at every size.
        '--_group-gap': 'var(--tp-heatmap-group-gap, var(--_cell))',
        '--_legend-cell': 'var(--tp-heatmap-cell-size, 0.75rem)',
        'font-size': 'var(--tp-text-xs)',
        '--_empty': 'var(--tp-muted)',
        '--_color': 'var(--tp-heatmap-color, var(--tp-primary))',
        '--_color-subtle': 'var(--tp-heatmap-subtle-color, var(--tp-primary-subtle))',
        '--_radius': 'var(--tp-heatmap-radius, calc(var(--_cell) / 5))',
      },
    },
  ],
  'heatmap-size-xs': size('0.5rem', '2px', 'calc(var(--tp-text-xs) * 0.875)'),
  'heatmap-size-sm': size('0.625rem', '2px', 'var(--tp-text-xs)'),
  'heatmap-size-default': size('0.75rem', '3px', 'var(--tp-text-xs)'),
  'heatmap-size-lg': size('1rem', '4px', 'var(--tp-text-sm)'),
  'heatmap-shape-square': radius('0px'),
  'heatmap-shape-rounded': radius('max(2px, 20%)'),
  'heatmap-shape-circle': radius('50%'),
  'heatmap-grid': [],
  'heatmap-column-labels': [],
  'heatmap-column-label': [{ declarations: { 'line-height': '1.2' } }],
  'heatmap-row-labels': [],
  'heatmap-row-label': [
    { declarations: { 'padding-inline-end': 'var(--tp-space-1)', 'line-height': '1' } },
  ],
  'heatmap-cell': [
    { declarations: { ...levelPaint, 'border-radius': 'var(--_radius)' } },
    { selector: '&:focus-visible', declarations: focusRing },
    {
      // An inner ring, so selected neighbours stay apart and keep the grid's rhythm; the focus
      // ring stays an outline outside the cell.
      selector: '&[data-selected]',
      declarations: {
        'box-shadow': 'inset 0 0 0 var(--tp-ring-width) var(--tp-foreground)',
      },
    },
    {
      // Cells of levels outside the legend filter show the empty color, as cells without a value
      // do: only the pressed levels keep a color, and the grid keeps its shape.
      selector: '&[data-filtered]',
      declarations: { background: 'var(--tp-heatmap-empty-color, var(--_empty))' },
    },
    {
      selector: '&[data-disabled]',
      declarations: { opacity: 'var(--tp-opacity-disabled)' },
    },
  ],
  'heatmap-footer': [{ declarations: { gap: 'var(--tp-space-2)' } }],
  'heatmap-legend': [
    { declarations: { gap: 'calc(var(--_gap) + 1px)' } },
    // A level toggle shows only its swatch: pressing it fills nothing, the crossed-out swatches
    // of the other levels show the filter.
    {
      // The control takes the swatch's own size and corners, so a filterable legend keeps the
      // plain legend's spacing.
      selector: '& tp-toggle',
      declarations: {
        '--tp-pressed': 'transparent',
        '--tp-pressed-border': 'transparent',
        '--tp-control-height-xs': 'var(--_legend-cell)',
        '--tp-radius-md': 'var(--_radius)',
      },
    },
    {
      selector: '& tp-toggle + tp-toggle',
      declarations: { 'margin-inline-start': 'calc(var(--_gap) + 1px)' },
    },
  ],
  'heatmap-legend-cell': [
    { declarations: { ...levelPaint, 'border-radius': 'var(--_radius)' } },
    {
      // A level the filter hides: a diagonal stroke crosses its color, a muted line edged on both
      // sides with the background so it reads on any swatch.
      selector: '&[data-excluded]',
      declarations: {
        background: [
          'linear-gradient(to top right,',
          'transparent calc(50% - 1.75px),',
          'var(--tp-background) calc(50% - 1.75px) calc(50% - 0.5px),',
          'var(--tp-muted-foreground) calc(50% - 0.5px) calc(50% + 0.5px),',
          'var(--tp-background) calc(50% + 0.5px) calc(50% + 1.75px),',
          'transparent calc(50% + 1.75px)),',
          'var(--tp-heatmap-level-color)',
        ].join(' '),
      },
    },
  ],
};
