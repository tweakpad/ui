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
      description: 'The host, which inherits font and color from its context.',
    },
    {
      name: 'time-value',
      description:
        'The native time element: tabular numerals that do not wrap, and the focus ring while a tooltip is available.',
    },
    {
      name: 'time-description',
      description: 'The tooltip with the full date and time.',
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
