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
    },
    {
      name: 'text-motion-line',
    },
    {
      name: 'text-motion-word',
    },
    {
      name: 'text-motion-char',
    },
    {
      name: 'text-motion-mask',
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
