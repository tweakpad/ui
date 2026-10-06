import type { PresentationDictionary } from '../resolver.js';
import { popupSpacingAppearance } from './command-surface.js';
/** Base chart anatomy, Nova tooltip treatment, common popup inset and theme palette. */
export const dataVisualizationAppearance: PresentationDictionary = {
  'data-visualization': [
    { declarations: { gap: 'var(--tp-space-4)', 'font-size': 'var(--tp-text-sm)' } },
    { selector: '& figcaption', declarations: { color: 'var(--tp-muted-foreground)' } },
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
  'data-visualization-plot-region': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'data-visualization-style-scope': [],
  'data-visualization-series': [],
  'data-visualization-legend': [{ declarations: { gap: 'var(--tp-space-4)' } }],
  'data-visualization-inspection-surface': [
    ...popupSpacingAppearance,
    {
      declarations: {
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-lg)',
        'box-shadow': 'var(--tp-shadow-lg)',
        'font-size': 'var(--tp-text-xs)',
        'min-inline-size': 'calc(var(--tp-space-10) * 3)',
      },
    },
  ],
};
