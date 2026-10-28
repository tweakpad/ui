import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Visually hidden',
  tagName: 'tp-visually-hidden',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'visually-hidden',
    },
  ],
};

export const visuallyHiddenPresentation = definePresentation({
  definition,
  bindings: {
    'tp-visually-hidden': {
      ':host': 'visually-hidden',
    },
  },
});
