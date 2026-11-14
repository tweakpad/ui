import type { PresentationDictionary } from '../resolver.js';
import { dataVisualizationAppearance } from './data-visualization.js';
import { divider } from './shared/edges.js';
/** Shared chart metadata treatment and replaceable Plot surface paint. */
export const plotAppearance: PresentationDictionary = {
  plot: dataVisualizationAppearance['data-visualization']!,
  'plot-size-sm': [
    { declarations: { gap: 'var(--tp-space-2)', 'font-size': 'var(--tp-text-xs)' } },
  ],
  'plot-size-lg': [
    { declarations: { gap: 'var(--tp-space-5)', 'font-size': 'var(--tp-text-base)' } },
  ],
  'plot-legend': dataVisualizationAppearance['data-visualization-legend']!,
  'plot-series': [],
  'plot-label': [{ declarations: { 'font-weight': 'var(--tp-font-medium)' } }],
  'plot-description': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'plot-empty': [{ declarations: { color: 'var(--tp-muted-foreground)' } }],
  'plot-inspection': dataVisualizationAppearance['data-visualization-inspection-surface']!,
  // The crosshair is a dashed line in the guide color; its dash and gap follow `crosshair.dash`.
  'plot-crosshair': [
    {
      declarations: {
        background:
          'repeating-linear-gradient(to bottom, var(--tp-plot-guide, var(--tp-muted-foreground)) 0 var(--_tp-crosshair-dash, 3px), transparent 0 calc(var(--_tp-crosshair-dash, 3px) + var(--_tp-crosshair-gap, 3px)))',
      },
    },
  ],
  // A sample dot in the series color, ringed with the surface so it reads over the line.
  'plot-marker': [
    {
      declarations: {
        'border-radius': '50%',
        background: 'var(--_tp-series-color)',
        'box-shadow': '0 0 0 2px var(--tp-background)',
      },
    },
  ],
  'plot-crosshair-label': [
    ...dataVisualizationAppearance['data-visualization-inspection-surface']!,
    { declarations: { 'margin-block-start': 'var(--tp-space-1)', 'min-inline-size': '0' } },
  ],
  'plot-surface': [
    {
      declarations: {
        '--tp-plot-surface': 'var(--tp-muted)',
        '--tp-plot-grid': divider.color,
        '--tp-plot-guide': 'var(--tp-muted-foreground)',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
  ],
};
