import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { inputCoreAppearance } from '../recipes/core/surfaces.js';
import { inputAppearance } from '../recipes/input.js';

const definition: ComponentDefinition = {
  name: 'Input',
  tagName: 'tp-input',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'input',
    },
    {
      name: 'input-prefix',
    },
    {
      name: 'input-suffix',
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
