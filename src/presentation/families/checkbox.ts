import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { checkboxAppearance } from '../recipes/checkbox.js';

const definition: ComponentDefinition = {
  name: 'Checkbox',
  tagName: 'tp-checkbox',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'checkbox',
    },
    {
      name: 'checkbox-indicator',
    },
  ],
};

export const checkboxPresentation = definePresentation({
  definition,
  bindings: {
    'tp-checkbox': {
      '.root': 'checkbox',
      '.indicator': 'checkbox-indicator',
    },
  },
  sources: [checkboxAppearance],
});
