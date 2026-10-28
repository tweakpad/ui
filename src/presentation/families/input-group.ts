import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { inputGroupAppearance } from '../recipes/input-group.js';
import { inputGroupCoreAppearance } from '../recipes/core/input-group.js';

const definition: ComponentDefinition = {
  name: 'Input group',
  tagName: 'tp-input-group',
  kind: 'preset-composition',
  axes: [
    {
      name: 'actionSize',
      values: ['xs', 'sm', 'icon-xs', 'icon-sm'],
      default: 'xs',
    },
    {
      name: 'actionVariant',
      values: ['ghost', 'default', 'secondary', 'destructive', 'outline', 'link'],
      default: 'ghost',
    },
  ],
  parts: [
    {
      name: 'input-group',
    },
    {
      name: 'input-group-control',
    },
    {
      name: 'input-group-addon',
    },
    {
      name: 'input-group-action',
      axes: ['actionSize', 'actionVariant'],
    },
    {
      name: 'input-group-text',
    },
  ],
};

export const inputGroupPresentation = definePresentation({
  definition,
  bindings: {
    'tp-input-group': {
      "[part='input-group']": 'input-group',
      '.addon': 'input-group-addon',
    },
  },
  sources: [inputGroupAppearance, inputGroupCoreAppearance],
});
