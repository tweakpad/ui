import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Time',
  tagName: 'tp-time',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-time',
  axes: [],
  parts: [
    {
      name: 'time',
      publicName: 'Root',
      presentationKeys: ['time'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'time-value',
      publicName: 'Value',
      presentationKeys: ['time-value'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'time-description',
      publicName: 'Description',
      presentationKeys: ['time-description'],
      cardinality: 'zero or one descendant of Root; present while `tooltip` is enabled',
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
