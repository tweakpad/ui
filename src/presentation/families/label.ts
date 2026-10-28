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
      description: "The Label's host, which carries the label text style.",
    },
    {
      name: 'label-optional-indicator',
      description: 'The "Optional" hint after the text.',
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
