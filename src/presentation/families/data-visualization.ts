import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dataVisualizationAppearance } from '../recipes/data-visualization.js';

const definition: ComponentDefinition = {
  name: 'Data visualization',
  tagName: 'tp-data-visualization',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'data-visualization',
    },
    {
      name: 'data-visualization-plot-region',
    },
    {
      name: 'data-visualization-series',
    },
    {
      name: 'data-visualization-legend',
    },
    {
      name: 'data-visualization-inspection-surface',
    },
    {
      name: 'data-visualization-style-scope',
    },
  ],
};

export const dataVisualizationPresentation = definePresentation({
  definition,
  sources: [dataVisualizationAppearance],
});
