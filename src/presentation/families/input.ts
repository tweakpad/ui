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
      description: "The native input, rendered in the page's own tree.",
    },
    {
      name: 'input-prefix',
      description:
        'Reserved for content before the editor; the Input renders none, so such content goes in an Input group.',
    },
    {
      name: 'input-suffix',
      description:
        'Reserved for content after the editor; the Input renders none, so such content goes in an Input group.',
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
