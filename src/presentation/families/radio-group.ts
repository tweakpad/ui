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
      axes: ['orientation'],
    },
    {
      name: 'radio-group-item',
      axes: ['orientation'],
    },
    {
      name: 'radio-group-indicator',
      axes: ['orientation'],
    },
  ],
};

export const radioGroupPresentation = definePresentation({
  definition,
  sources: [radioGroupAppearance],
});
