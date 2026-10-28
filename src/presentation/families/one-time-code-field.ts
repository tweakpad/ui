import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { oneTimeCodeAppearance } from '../recipes/one-time-code-field.js';

const definition: ComponentDefinition = {
  name: 'One-time code field',
  tagName: 'tp-one-time-code-field',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'one-time-code-field',
    },
    {
      name: 'one-time-code-field-group',
    },
    {
      name: 'one-time-code-field-slot',
    },
    {
      name: 'one-time-code-field-separator',
    },
  ],
};

export const oneTimeCodeFieldPresentation = definePresentation({
  definition,
  bindings: {
    'tp-one-time-code-field': {
      '.root': 'one-time-code-field',
      '.group': 'one-time-code-field-group',
      '.slot': 'one-time-code-field-slot',
    },
  },
  sources: [oneTimeCodeAppearance],
});
