import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { switchAppearance } from '../recipes/switch.js';

const definition: ComponentDefinition = {
  name: 'Switch',
  tagName: 'tp-switch',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'size',
      values: ['sm', 'default'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'switch',
      description: 'The track with the switch role that receives focus and presses.',
      axes: ['size'],
    },
    {
      name: 'switch-thumb',
      description: 'The thumb that slides along the track; holds the `thumb` slot.',
      axes: ['size'],
    },
  ],
};

export const switchPresentation = definePresentation({
  definition,
  bindings: {
    'tp-switch': {
      '.root': 'switch',
      '.thumb': 'switch-thumb',
    },
  },
  sources: [switchAppearance],
});
