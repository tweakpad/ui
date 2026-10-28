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
      description:
        'The shared border, focus ring and invalid state around the editor and its addons.',
    },
    {
      name: 'input-group-control',
      description: "The editor inside the group, whose own border gives way to the group's.",
    },
    {
      name: 'input-group-addon',
      description: 'The region at one edge that holds text, Icons and controls beside the editor.',
    },
    {
      name: 'input-group-action',
      description: 'A Button in the `action` slot.',
      axes: ['actionSize', 'actionVariant'],
    },
    {
      name: 'input-group-text',
      description: 'A text segment in an addon, such as a unit or a prefix.',
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
