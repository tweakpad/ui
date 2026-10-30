import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Border',
  tagName: 'tp-mo-border',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-border',
      description: 'The host, around the surface it draws the border of.',
    },
    {
      name: 'mo-border-ring',
      description: 'The drawing over the surface border, hidden from assistive technology.',
    },
    {
      name: 'mo-border-line',
      description: 'The drawn border, solid or dashed.',
    },
    {
      name: 'mo-border-glow',
      description: 'The canvas of the lit line and its wash, with the glow effect or glowing segments.',
    },
    {
      name: 'mo-border-bloom',
      description: 'The canvas of the blurred light around the line, with the glow effect or glowing segments.',
    },
    {
      name: 'mo-border-segment-line',
      description: 'The drawn piece of a plain segment, one per plain segment.',
    },
    {
      name: 'mo-border-segment',
      description: 'A segment child, which renders nothing itself.',
    },
  ],
};

/** Border paints only the drawing over its surface's border (CL Border `mbx-presentation`). */
export const moBorderPresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-border': {
      ':host': 'mo-border',
      "[part~='mo-border-ring']": 'mo-border-ring',
      "[part~='mo-border-line']": 'mo-border-line',
      "[part~='mo-border-glow']": 'mo-border-glow',
      "[part~='mo-border-bloom']": 'mo-border-bloom',
      "[part~='mo-border-segment-line']": 'mo-border-segment-line',
    },
    'tp-mo-border-segment': {
      ':host': 'mo-border-segment',
    },
  },
});
