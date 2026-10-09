import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Time',
  tagName: 'tp-time',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'time',
    },
    {
      name: 'time-value',
    },
    {
      name: 'time-description',
    },
  ],
};

export const timePresentation = definePresentation({
  definition,
  bindings: {
    'tp-time': {
      ':host': 'time',
      time: 'time-value',
    },
  },
});
