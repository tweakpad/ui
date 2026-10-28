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
      description: 'The group around the members, named by `label`.',
      axes: ['orientation'],
    },
    {
      name: 'button-group-control',
      description: 'The boundary of each member control, where the group joins the seams.',
      axes: ['orientation'],
    },
    {
      name: 'button-group-text-segment',
      description: 'The box of a Button group text, joined like a member.',
      axes: ['orientation'],
    },
    {
      name: 'button-group-separator',
      description: 'A Separator between members, turned across the row.',
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
