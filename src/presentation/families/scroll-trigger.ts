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
      description: 'The host, an ordinary block around the content.',
    },
    {
      name: 'scroll-trigger-stage',
      description: 'The wrapper of the content, which sticks in place while pinned.',
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
