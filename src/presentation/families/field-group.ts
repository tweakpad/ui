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
      description: 'The joined row or column that holds the editors.',
      axes: ['orientation'],
    },
    {
      name: 'field-group-control',
      description: 'The outer edge of each editor, where neighboring borders meet in a seam.',
      axes: ['orientation'],
    },
    {
      name: 'field-group-separator',
      description: 'A Separator between two editors.',
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
