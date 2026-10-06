import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { checkboxAppearance } from '../recipes/checkbox.js';

const definition: ComponentDefinition = {
  name: 'Checkbox',
  tagName: 'tp-checkbox',
  kind: 'compound-reexport',
  sourceNode: 'ucl16-checkbox',
  axes: [],
  parts: [
    {
      name: 'checkbox',
      publicName: 'Control',
      presentationKeys: ['checkbox'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'checkbox-indicator',
      publicName: 'Indicator',
      presentationKeys: ['checkbox-indicator'],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
  ],
};

export const checkboxPresentation = definePresentation({
  definition,
  bindings: {
    'tp-checkbox': {
      '.root': 'checkbox',
      '.indicator': 'checkbox-indicator',
    },
  },
  sources: [checkboxAppearance],
});
