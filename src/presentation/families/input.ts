import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { inputCoreAppearance } from '../recipes/core/surfaces.js';
import { inputAppearance } from '../recipes/input.js';

const definition: ComponentDefinition = {
  name: 'Input',
  tagName: 'tp-input',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-input',
  axes: [],
  parts: [
    {
      name: 'input',
      publicName: 'Control',
      presentationKeys: ['input'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'input-prefix',
      publicName: 'Prefix',
      presentationKeys: ['input-prefix'],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
    {
      name: 'input-suffix',
      publicName: 'Suffix',
      presentationKeys: ['input-suffix'],
      cardinality:
        'zero or one descendant of Control; cited behavior sets any required-presence condition',
    },
  ],
};

export const inputPresentation = definePresentation({
  definition,
  bindings: {
    'tp-input': {
      input: 'input',
    },
  },
  sources: [inputCoreAppearance, inputAppearance],
});
