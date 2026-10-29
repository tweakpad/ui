import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text mirror',
  tagName: 'tp-mo-text-mirror',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-text-mirror',
      description: 'The host, around the text and its lines.',
    },
    {
      name: 'mo-text-mirror-line',
      description: 'A line piece, cut at the middle of its text into two sliding halves.',
    },
    {
      name: 'mo-text-mirror-word',
      description: 'A word piece inside a line.',
    },
  ],
};

/** Text mirror paints no surface and inherits typography (CL Text mirror). */
export const moTextMirrorPresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-text-mirror': {
      ':host': 'mo-text-mirror',
    },
  },
});
