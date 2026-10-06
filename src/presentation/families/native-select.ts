import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { nativeSelectAppearance } from '../recipes/native-select.js';

const definition: ComponentDefinition = {
  name: 'Native select',
  tagName: 'tp-native-select',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-native-select',
  axes: [
    {
      name: 'size',
      values: ['sm', 'default'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'native-select',
      publicName: 'Wrapper',
      presentationKeys: ['native-select', 'native-select-size-sm', 'native-select-size-default'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'native-select-control',
      publicName: 'Control',
      presentationKeys: [
        'native-select-control',
        'native-select-control-size-sm',
        'native-select-control-size-default',
      ],
      cardinality:
        'zero or one descendant of Wrapper; cited behavior sets any required-presence condition',
    },
    {
      name: 'native-select-option-group',
      publicName: 'Option group',
      presentationKeys: [
        'native-select-option-group',
        'native-select-option-group-size-sm',
        'native-select-option-group-size-default',
      ],
      cardinality:
        'zero or more descendants of Wrapper; cited behavior sets any required-presence condition',
    },
    {
      name: 'native-select-option',
      publicName: 'Option',
      presentationKeys: [
        'native-select-option',
        'native-select-option-size-sm',
        'native-select-option-size-default',
      ],
      cardinality: 'zero or more descendants of Wrapper; cited behavior sets any stronger minimum',
    },
    {
      name: 'native-select-indicator',
      publicName: 'Indicator',
      presentationKeys: [
        'native-select-indicator',
        'native-select-indicator-size-sm',
        'native-select-indicator-size-default',
      ],
      cardinality:
        'zero or one descendant of Wrapper; cited behavior sets any required-presence condition',
    },
  ],
};

export const nativeSelectPresentation = definePresentation({
  definition,
  bindings: {
    'tp-native-select': {
      '[part~="native-select"]': 'native-select',
      '[part~="native-select-control"]': 'native-select-control',
      '[part~="native-select-option-group"]': 'native-select-option-group',
      '[part~="native-select-option"]': 'native-select-option',
      '[part~="native-select-indicator"]': 'native-select-indicator',
    },
  },
  sources: [nativeSelectAppearance],
});
