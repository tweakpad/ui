import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';

const definition: ComponentDefinition = {
  name: 'Scroll trigger',
  tagName: 'tp-scroll-trigger',
  kind: 'thin-wrapper',
  sourceNode: 'ucl21-scroll-trigger',
  axes: [],
  parts: [
    {
      name: 'scroll-trigger',
      publicName: 'Root',
      presentationKeys: ['scroll-trigger'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'scroll-trigger-stage',
      publicName: 'Stage',
      presentationKeys: ['scroll-trigger-stage'],
      cardinality: 'exactly one, in Root, around its content; sticky while pinned',
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
