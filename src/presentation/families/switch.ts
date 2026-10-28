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
      axes: ['size'],
    },
    {
      name: 'switch-thumb',
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
