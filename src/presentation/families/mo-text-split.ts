import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text split',
  tagName: 'tp-mo-text-split',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-text-split',
      description: 'The host, around the text and its pieces.',
    },
    {
      name: 'mo-text-split-line',
      description: 'A line piece, when the text is split into lines.',
    },
    {
      name: 'mo-text-split-word',
      description: 'A word piece.',
    },
    {
      name: 'mo-text-split-char',
      description: 'A character piece, when the text is split into characters.',
    },
    {
      name: 'mo-text-split-mask',
      description: 'The clipping wrapper around a masked piece, which the piece emerges from.',
    },
  ],
};

/** Text split paints no surface and inherits typography (CL Text split `tml-presentation`). */
export const moTextSplitPresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-text-split': {
      ':host': 'mo-text-split',
    },
  },
});
