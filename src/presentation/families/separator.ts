import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { separatorAppearance } from '../recipes/separator.js';

const definition: ComponentDefinition = {
  name: 'Separator',
  tagName: 'tp-separator',
  kind: 'thin-wrapper',
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
      axes: ['orientation'],
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
