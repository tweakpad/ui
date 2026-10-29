import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { checkboxAppearance } from '../recipes/checkbox.js';

const definition: ComponentDefinition = {
  name: 'Checkbox',
  tagName: 'tp-checkbox',
  kind: 'compound-reexport',
  axes: [
    {
      // inline: one compact row with the label at the start and the box at the end.
      name: 'variant',
      values: ['default', 'inline'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'checkbox',
      description:
        'The control with the checkbox role around the box and the label; it receives focus and presses, and is the row of an inline Checkbox.',
      axes: ['variant'],
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
