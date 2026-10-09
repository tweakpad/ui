import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fieldGroupAppearance } from '../recipes/field-group.js';

const definition: ComponentDefinition = {
  name: 'Field group',
  tagName: 'tp-field-group',
  kind: 'preset-composition',
  axes: [
    {
      name: 'orientation',
      values: ['horizontal', 'vertical'],
      default: 'horizontal',
    },
  ],
  parts: [
    {
      name: 'field-group',
      axes: ['orientation'],
    },
    {
      name: 'field-group-control',
      axes: ['orientation'],
    },
    {
      name: 'field-group-separator',
      axes: ['orientation'],
    },
  ],
};

export const fieldGroupPresentation = definePresentation({
  definition,
  bindings: {
    'tp-field-group': {
      "[part~='field-group']": 'field-group',
    },
  },
  sources: [fieldGroupAppearance],
});
