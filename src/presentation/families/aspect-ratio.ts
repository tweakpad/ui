import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Aspect-ratio box',
  tagName: 'tp-aspect-ratio',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'aspect-ratio-box',
      description: 'The box that holds the ratio; also exposed as `root`.',
    },
    {
      name: 'aspect-ratio-box-content',
      description: 'The layer the content fills, the full size of the box.',
    },
  ],
};

export const aspectRatioPresentation = definePresentation({
  definition,
});
