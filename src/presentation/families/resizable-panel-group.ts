import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { resizablePanelGroupAppearance } from '../recipes/resizable-panel-group.js';

const definition: ComponentDefinition = {
  name: 'Resizable panel group',
  tagName: 'tp-resizable-panel-group',
  kind: 'compound-reexport',
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
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-panel',
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-separator',
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-handle-decoration',
      axes: ['orientation'],
    },
  ],
};

export const resizablePanelGroupPresentation = definePresentation({
  definition,
  sources: [resizablePanelGroupAppearance],
});
