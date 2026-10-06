import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { buttonGroupAppearance } from '../recipes/button-group.js';

const definition: ComponentDefinition = {
  name: 'Button group',
  tagName: 'tp-button-group',
  kind: 'preset-composition',
  sourceNode: 'ucl22-button-group',
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
      publicName: 'Root',
      presentationKeys: [
        'button-group',
        'button-group-orientation-horizontal',
        'button-group-orientation-vertical',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'button-group-control',
      publicName: 'Control',
      presentationKeys: [
        'button-group-control',
        'button-group-control-orientation-horizontal',
        'button-group-control-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'button-group-text-segment',
      publicName: 'Text segment',
      presentationKeys: [
        'button-group-text-segment',
        'button-group-text-segment-orientation-horizontal',
        'button-group-text-segment-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'button-group-separator',
      publicName: 'Separator',
      presentationKeys: [
        'button-group-separator',
        'button-group-separator-orientation-horizontal',
        'button-group-separator-orientation-vertical',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
