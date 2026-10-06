import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { inputGroupAppearance } from '../recipes/input-group.js';
import { inputGroupCoreAppearance } from '../recipes/core/input-group.js';

const definition: ComponentDefinition = {
  name: 'Input group',
  tagName: 'tp-input-group',
  kind: 'preset-composition',
  sourceNode: 'ucl17-input-group',
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
      publicName: 'Root',
      presentationKeys: ['input-group'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'input-group-control',
      publicName: 'Control',
      presentationKeys: ['input-group-control'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'input-group-addon',
      publicName: 'Addon',
      presentationKeys: ['input-group-addon'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'input-group-action',
      publicName: 'Action',
      presentationKeys: [
        'input-group-action',
        'input-group-action-size-xs',
        'input-group-action-size-sm',
        'input-group-action-size-icon-xs',
        'input-group-action-size-icon-sm',
        'input-group-action-variant-ghost',
        'input-group-action-variant-default',
        'input-group-action-variant-secondary',
        'input-group-action-variant-destructive',
        'input-group-action-variant-outline',
        'input-group-action-variant-link',
      ],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'input-group-text',
      publicName: 'Text',
      presentationKeys: ['input-group-text'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
