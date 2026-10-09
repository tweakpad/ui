import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { nativeSelectAppearance } from '../recipes/native-select.js';

const definition: ComponentDefinition = {
  name: 'Native select',
  tagName: 'tp-native-select',
  kind: 'compound-reexport',
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
      axes: ['size'],
    },
    {
      name: 'native-select-control',
      axes: ['size'],
    },
    {
      name: 'native-select-option-group',
      axes: ['size'],
    },
    {
      name: 'native-select-option',
      axes: ['size'],
    },
    {
      name: 'native-select-indicator',
      axes: ['size'],
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
