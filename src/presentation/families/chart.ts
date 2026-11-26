import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { chartAppearance } from '../recipes/chart.js';

const definition: ComponentDefinition = {
  name: 'Chart',
  tagName: 'tp-chart',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'chart',
      description: 'The figure that frames the chart, its legend and its caption.',
    },
    {
      name: 'chart-plot-region',
      description:
        'The area the marks or the renderer draw in; 16:9 unless its aspect ratio is changed.',
    },
    {
      name: 'chart-grid',
      description:
        'The dashed grid lines at the y ticks and the line at zero of the built-in marks, the rings and spokes of radar charts and the tracks of radial rings.',
    },
    {
      name: 'chart-axis',
      description:
        'The axis labels, tick marks and titles of the built-in marks, the spoke labels of radar charts and the tick and ring labels of radial charts.',
    },
    {
      name: 'chart-cursor',
      description: 'The crosshair or band that marks the inspected position.',
    },
    {
      name: 'chart-skeleton',
      description: 'The placeholder marks shown while the chart is loading.',
    },
    {
      name: 'chart-series',
      description: 'One series entry of the legend: its mark and label.',
    },
    {
      name: 'chart-legend',
      description: 'The legend.',
    },
    {
      name: 'chart-legend-title',
      description: 'The heading above the legend entries, when the legend has a title.',
    },
    {
      name: 'chart-inspection-surface',
      description: 'The tooltip that shows the inspected datum.',
    },
    {
      name: 'chart-style-scope',
      description: 'The wrapper that publishes the series color properties.',
    },
  ],
};

export const chartPresentation = definePresentation({
  definition,
  sources: [chartAppearance],
});
