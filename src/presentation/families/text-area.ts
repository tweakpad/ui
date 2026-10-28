import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { textAreaCoreAppearance } from '../recipes/core/surfaces.js';
import { textAreaAppearance } from '../recipes/text-area.js';

const definition: ComponentDefinition = {
  name: 'Text area',
  tagName: 'tp-text-area',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'text-area',
    },
    {
      name: 'text-area-resize-affordance',
    },
  ],
};

export const textAreaPresentation = definePresentation({
  definition,
  bindings: {
    'tp-text-area': {
      textarea: 'text-area',
    },
  },
  sources: [textAreaCoreAppearance, textAreaAppearance],
});
