import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text transform',
  tagName: 'tp-text-transform',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'text-transform',
    },
    {
      name: 'text-transform-value',
    },
    {
      name: 'text-transform-description',
    },
  ],
};

export const textTransformPresentation = definePresentation({
  definition,
  bindings: {
    'tp-text-transform': {
      ':host': 'text-transform',
      '.value': 'text-transform-value',
    },
  },
});
