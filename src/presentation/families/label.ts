import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { labelAppearance } from '../recipes/label.js';

const definition: ComponentDefinition = {
  name: 'Label',
  tagName: 'tp-label',
  kind: 'preset-composition',
  axes: [],
  parts: [
    {
      name: 'label',
    },
    {
      name: 'label-optional-indicator',
    },
  ],
};

export const labelPresentation = definePresentation({
  definition,
  bindings: {
    'tp-label': {
      ':host': 'label',
      '.optional': 'label-optional-indicator',
    },
  },
  sources: [labelAppearance],
});
