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
      description: 'The flex container laying the panels out along the group axis.',
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-panel',
      description: 'A panel; marked while collapsed.',
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-separator',
      description:
        'The focusable separator of a handle, with its enlarged pointer target; marked while dragging or disabled.',
      axes: ['orientation'],
    },
    {
      name: 'resizable-panel-group-handle-decoration',
      description: 'The grip a handle shows with `with-handle`.',
      axes: ['orientation'],
    },
  ],
};

export const resizablePanelGroupPresentation = definePresentation({
  definition,
  sources: [resizablePanelGroupAppearance],
});
