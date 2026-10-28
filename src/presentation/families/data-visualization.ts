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
      description: 'The figure that frames the chart, its legend and its caption.',
    },
    {
      name: 'data-visualization-plot-region',
      description: 'The area the renderer draws in; 16:9 unless its aspect ratio is changed.',
    },
    {
      name: 'data-visualization-series',
      description: 'One series entry of the legend: its mark and label.',
    },
    {
      name: 'data-visualization-legend',
      description: 'The legend.',
    },
    {
      name: 'data-visualization-inspection-surface',
      description: 'The tooltip that shows the inspected datum.',
    },
    {
      name: 'data-visualization-style-scope',
      description: 'The wrapper that publishes the series color properties.',
    },
  ],
};

export const dataVisualizationPresentation = definePresentation({
  definition,
  sources: [dataVisualizationAppearance],
});
