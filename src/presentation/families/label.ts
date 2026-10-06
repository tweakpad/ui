import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { labelAppearance } from '../recipes/label.js';

const definition: ComponentDefinition = {
  name: 'Label',
  tagName: 'tp-label',
  kind: 'preset-composition',
  sourceNode: 'ucl22-label',
  axes: [],
  parts: [
    {
      name: 'label',
      publicName: 'Root',
      presentationKeys: ['label'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'label-optional-indicator',
      publicName: 'Optional indicator',
      presentationKeys: ['label-optional-indicator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
