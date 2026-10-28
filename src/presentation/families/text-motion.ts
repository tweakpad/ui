import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text motion',
  tagName: 'tp-text-motion',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'text-motion',
      description: 'The host, around the text and its pieces.',
    },
    {
      name: 'text-motion-line',
      description: 'A line piece, when the text is split into lines.',
    },
    {
      name: 'text-motion-word',
      description: 'A word piece.',
    },
    {
      name: 'text-motion-char',
      description: 'A character piece, when the text is split into characters.',
    },
    {
      name: 'text-motion-mask',
      description: 'The clipping wrapper around a masked piece, which the piece emerges from.',
    },
  ],
};

/** Text motion paints no surface and inherits typography (CL Text motion `tml-presentation`). */
export const textMotionPresentation = definePresentation({
  definition,
  bindings: {
    'tp-text-motion': {
      ':host': 'text-motion',
    },
  },
});
