import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { switchAppearance } from '../recipes/switch.js';

const definition: ComponentDefinition = {
  name: 'Switch',
  tagName: 'tp-switch',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-switch',
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
      publicName: 'Control',
      presentationKeys: ['switch', 'switch-size-sm', 'switch-size-default'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'switch-thumb',
      publicName: 'Thumb',
      presentationKeys: ['switch-thumb', 'switch-thumb-size-sm', 'switch-thumb-size-default'],
      cardinality: 'zero or more descendants of Control; cited behavior sets any stronger minimum',
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
