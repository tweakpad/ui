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
      description: 'The box with the checkbox role that receives focus and presses.',
    },
    {
      name: 'checkbox-indicator',
      description: 'The check or mixed mark inside the box, shown while checked or mixed.',
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
