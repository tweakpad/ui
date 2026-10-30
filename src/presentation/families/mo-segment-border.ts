import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Segment border',
  tagName: 'tp-mo-segment-border',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'mo-segment-border',
      description: 'The host, around the surface it draws the border of.',
    },
    {
      name: 'mo-segment-border-ring',
      description: 'The drawing over the surface border, hidden from assistive technology.',
    },
    {
      name: 'mo-segment-border-focus',
      description:
        'The focus ring, outside the border, while keyboard focus is inside and the effect does not show it.',
    },
    {
      name: 'mo-segment-border-line',
      description: 'The border line under the segments.',
    },
    {
      name: 'mo-segment-border-segment-line',
      description: 'The drawn piece of a plain segment, one per plain segment.',
    },
    {
      name: 'mo-segment-border-glow',
      description: 'The canvas of the glowing segments.',
    },
    {
      name: 'mo-segment-border-bloom',
      description: 'The canvas of the blurred light around the glowing segments.',
    },
    {
      name: 'mo-border-segment',
      description: 'A segment child, which renders nothing itself.',
    },
  ],
};

/** Segment border paints only the drawing over its surface's border (CL Segment border `msb-presentation`). */
export const moSegmentBorderPresentation = definePresentation({
  definition,
  bindings: {
    'tp-mo-segment-border': {
      ':host': 'mo-segment-border',
      "[part~='mo-segment-border-ring']": 'mo-segment-border-ring',
      "[part~='mo-segment-border-focus']": 'mo-segment-border-focus',
      "[part~='mo-segment-border-line']": 'mo-segment-border-line',
      "[part~='mo-segment-border-segment-line']": 'mo-segment-border-segment-line',
      "[part~='mo-segment-border-glow']": 'mo-segment-border-glow',
      "[part~='mo-segment-border-bloom']": 'mo-segment-border-bloom',
    },
    'tp-mo-border-segment': {
      ':host': 'mo-border-segment',
    },
  },
});
