import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { plotAppearance } from '../recipes/plot.js';
const definition: ComponentDefinition = {
  name: 'Plot',
  tagName: 'tp-plot',
  kind: 'flattening-compound',
  axes: [{ name: 'size', values: ['sm', 'default', 'lg'], default: 'default' }],
  parts: [
    {
      name: 'plot',
      axes: ['size'],
      description: 'The figure containing the graph and its text alternative.',
    },
    {
      name: 'plot-surface',
      description: 'The canvas and its replaceable surface, grid and guide paint.',
    },
    { name: 'plot-label', description: 'The visible accessible name.' },
    { name: 'plot-description', description: 'The application supplied interpretation.' },
    { name: 'plot-legend', description: 'The informational series legend.' },
    { name: 'plot-series', description: 'A series label and mark in the legend.' },
    { name: 'plot-inspection', description: 'The inspected sample, without editing controls.' },
    { name: 'plot-empty', description: 'The empty dataset message.' },
    {
      name: 'plot-crosshair',
      description: 'The vertical guide at the inspected x, drawn with `crosshair`.',
    },
    {
      name: 'plot-marker',
      description:
        "A dot on an inspected sample (`data-series`) or on a series' latest sample (`data-latest`).",
    },
    {
      name: 'plot-crosshair-label',
      description: 'The chip on the x axis with the inspected x, drawn with `crosshair`.',
    },
  ],
};
export const plotPresentation = definePresentation({ definition, sources: [plotAppearance] });
