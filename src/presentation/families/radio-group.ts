import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { radioGroupAppearance } from '../recipes/radio-group.js';

const definition: ComponentDefinition = {
  name: 'Radio group',
  tagName: 'tp-radio-group',
  kind: 'compound-reexport',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'vertical',
    },
  ],
  parts: [
    {
      name: 'radio-group',
      description: 'The element with the radiogroup role that holds the items.',
      axes: ['orientation'],
    },
    {
      name: 'radio-group-item',
      description: 'The radio with its label inside each item, which receives focus and presses.',
      axes: ['orientation'],
    },
    {
      name: 'radio-group-indicator',
      description: "The dot inside the selected item's radio.",
      axes: ['orientation'],
    },
  ],
};

export const radioGroupPresentation = definePresentation({
  definition,
  sources: [radioGroupAppearance],
});
