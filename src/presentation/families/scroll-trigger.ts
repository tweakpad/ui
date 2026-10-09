import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Scroll trigger',
  tagName: 'tp-scroll-trigger',
  kind: 'thin-wrapper',
  axes: [],
  parts: [
    {
      name: 'scroll-trigger',
    },
    {
      name: 'scroll-trigger-stage',
    },
  ],
};

/** Scroll trigger paints no surface (CL Scroll trigger `stl-presentation`). */
export const scrollTriggerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-scroll-trigger': {
      ':host': 'scroll-trigger',
      "[part~='stage']": 'scroll-trigger-stage',
    },
  },
});
