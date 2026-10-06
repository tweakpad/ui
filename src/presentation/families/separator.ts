import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { separatorAppearance } from '../recipes/separator.js';

const definition: ComponentDefinition = {
  name: 'Separator',
  tagName: 'tp-separator',
  kind: 'thin-wrapper',
  sourceNode: 'ucl21-separator',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'separator',
      publicName: 'Rule',
      presentationKeys: [
        'separator',
        'separator-orientation-horizontal',
        'separator-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
  ],
};

export const separatorPresentation = definePresentation({
  definition,
  bindings: {
    'tp-navigation-panel-separator': {},
    'tp-separator': {
      ':host': 'separator',
    },
  },
  sources: [separatorAppearance],
});
