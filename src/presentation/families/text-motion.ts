import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text motion',
  tagName: 'tp-text-motion',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-text-motion',
  axes: [],
  parts: [
    {
      name: 'text-motion',
      publicName: 'Root',
      presentationKeys: ['text-motion'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'text-motion-line',
      publicName: 'Line',
      presentationKeys: ['text-motion-line'],
      cardinality: "zero or more light-tree pieces ([data-tp-piece='line']) when split has lines",
    },
    {
      name: 'text-motion-word',
      publicName: 'Word',
      presentationKeys: ['text-motion-word'],
      cardinality: "zero or more light-tree pieces ([data-tp-piece='word']), in Lines",
    },
    {
      name: 'text-motion-char',
      publicName: 'Char',
      presentationKeys: ['text-motion-char'],
      cardinality: "zero or more light-tree pieces ([data-tp-piece='char']), in Words",
    },
    {
      name: 'text-motion-mask',
      publicName: 'Mask',
      presentationKeys: ['text-motion-mask'],
      cardinality: "zero or more light-tree wrappers ([data-tp-piece='mask']) of the masked unit",
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
