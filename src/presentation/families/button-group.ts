import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonGroupAppearance } from '../recipes/button-group.js';

const definition: ComponentDefinition = {
  name: 'Button group',
  tagName: 'tp-button-group',
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
      name: 'button-group',
      axes: ['orientation'],
    },
    {
      name: 'button-group-control',
      axes: ['orientation'],
    },
    {
      name: 'button-group-text-segment',
      axes: ['orientation'],
    },
    {
      name: 'button-group-separator',
      axes: ['orientation'],
    },
  ],
};

export const buttonGroupPresentation = definePresentation({
  definition,
  bindings: {
    'tp-button-group': {
      "[part~='button-group']": 'button-group',
    },
  },
  sources: [buttonGroupAppearance],
});
