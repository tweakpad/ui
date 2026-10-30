import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Glow border',
  tagName: 'tp-mo-glow-border',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-glow-border',
      description: 'The host, around the surface it draws the border of.',
    },
    {
      name: 'mo-glow-border-ring',
      description: 'The drawing over the surface border, hidden from assistive technology.',
    },
    {
      name: 'mo-glow-border-line',
      description: 'The border line where the glow does not light it.',
    },
    {
      name: 'mo-glow-border-glow',
      description: 'The canvas of the lit line and its wash.',
    },
    {
      name: 'mo-glow-border-bloom',
      description: 'The canvas of the blurred light around the line.',
    },
  ],
};

/** Glow border paints only the drawing over its surface's border (CL Glow border `mbx-presentation`). */
export const moGlowBorderPresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-glow-border': {
      ':host': 'mo-glow-border',
      "[part~='mo-glow-border-ring']": 'mo-glow-border-ring',
      "[part~='mo-glow-border-line']": 'mo-glow-border-line',
      "[part~='mo-glow-border-glow']": 'mo-glow-border-glow',
      "[part~='mo-glow-border-bloom']": 'mo-glow-border-bloom',
    },
  },
});
