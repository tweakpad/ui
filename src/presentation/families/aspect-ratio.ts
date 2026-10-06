import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Aspect-ratio box',
  tagName: 'tp-aspect-ratio',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-aspect-ratio',
  axes: [],
  parts: [
    {
      name: 'aspect-ratio-box',
      publicName: 'Root',
      presentationKeys: ['aspect-ratio-box'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'aspect-ratio-box-content',
      publicName: 'Content',
      presentationKeys: ['aspect-ratio-box-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const aspectRatioPresentation = definePresentation({
  definition,
});
