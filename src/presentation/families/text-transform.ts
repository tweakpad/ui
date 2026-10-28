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
      description: 'The host, which paints no surface and inherits font and color.',
    },
    {
      name: 'text-transform-value',
      description:
        'The presented text: a `data` element carrying the raw number for numeric input.',
    },
    {
      name: 'text-transform-description',
      description: 'The Tooltip showing the complete text while the text is shortened.',
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
