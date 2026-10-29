import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Text stroke',
  tagName: 'tp-mo-text-stroke',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-text-stroke',
      description: 'The host, around the text and its pieces.',
    },
    {
      name: 'mo-text-stroke-line',
      description: 'A line piece, when the text is split into lines.',
    },
    {
      name: 'mo-text-stroke-word',
      description: 'A word piece, with the outline of its glyphs unless characters are split.',
    },
    {
      name: 'mo-text-stroke-char',
      description: 'A character piece with the outline of its glyph, when characters are split.',
    },
    {
      name: 'mo-text-stroke-outline',
      description: 'The stroked glyph outlines over a piece, hidden from assistive technology.',
    },
  ],
};

/** Text stroke paints only glyph outlines in the text color and inherits typography (CL Text stroke). */
export const moTextStrokePresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-text-stroke': {
      ':host': 'mo-text-stroke',
    },
  },
});
