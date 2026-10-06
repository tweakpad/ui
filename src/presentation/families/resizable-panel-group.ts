import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { resizablePanelGroupAppearance } from '../recipes/resizable-panel-group.js';

const definition: ComponentDefinition = {
  name: 'Resizable panel group',
  tagName: 'tp-resizable-panel-group',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-resizable-panels',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'resizable-panel-group',
      publicName: 'Group',
      presentationKeys: [
        'resizable-panel-group',
        'resizable-panel-group-orientation-horizontal',
        'resizable-panel-group-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'resizable-panel-group-panel',
      publicName: 'Panel',
      presentationKeys: [
        'resizable-panel-group-panel',
        'resizable-panel-group-panel-orientation-horizontal',
        'resizable-panel-group-panel-orientation-vertical',
      ],
      cardinality: 'zero or more descendants of Group; cited behavior sets any stronger minimum',
    },
    {
      name: 'resizable-panel-group-separator',
      publicName: 'Separator',
      presentationKeys: [
        'resizable-panel-group-separator',
        'resizable-panel-group-separator-orientation-horizontal',
        'resizable-panel-group-separator-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'resizable-panel-group-handle-decoration',
      publicName: 'Handle decoration',
      presentationKeys: [
        'resizable-panel-group-handle-decoration',
        'resizable-panel-group-handle-decoration-orientation-horizontal',
        'resizable-panel-group-handle-decoration-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
  ],
};

export const resizablePanelGroupPresentation = definePresentation({
  definition,
  sources: [resizablePanelGroupAppearance],
});
