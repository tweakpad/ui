import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dataVisualizationAppearance } from '../recipes/data-visualization.js';

const definition: ComponentDefinition = {
  name: 'Data visualization',
  tagName: 'tp-data-visualization',
  kind: 'presentational-primitive',
  sourceNode: 'ucl21-data-visualization',
  axes: [],
  parts: [
    {
      name: 'data-visualization',
      publicName: 'Root',
      presentationKeys: ['data-visualization'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'data-visualization-plot-region',
      publicName: 'Plot region',
      presentationKeys: ['data-visualization-plot-region'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'data-visualization-series',
      publicName: 'Series',
      presentationKeys: ['data-visualization-series'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'data-visualization-legend',
      publicName: 'Legend',
      presentationKeys: ['data-visualization-legend'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'data-visualization-inspection-surface',
      publicName: 'Inspection surface',
      presentationKeys: ['data-visualization-inspection-surface'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'data-visualization-style-scope',
      publicName: 'Style scope',
      presentationKeys: ['data-visualization-style-scope'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const dataVisualizationPresentation = definePresentation({
  definition,
  sources: [dataVisualizationAppearance],
});
