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
    },
    {
      name: 'aspect-ratio-box-content',
    },
  ],
};

export const aspectRatioPresentation = definePresentation({
  definition,
});
