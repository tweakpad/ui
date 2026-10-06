import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { textAreaCoreAppearance } from '../recipes/core/surfaces.js';
import { textAreaAppearance } from '../recipes/text-area.js';

const definition: ComponentDefinition = {
  name: 'Text area',
  tagName: 'tp-text-area',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-textarea',
  axes: [],
  parts: [
    {
      name: 'text-area',
      publicName: 'Control',
      presentationKeys: ['text-area'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'text-area-resize-affordance',
      publicName: 'Resize affordance',
      presentationKeys: ['text-area-resize-affordance'],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
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
