import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { skeletonAppearance } from '../recipes/skeleton.js';

const definition: ComponentDefinition = {
  name: 'Skeleton',
  tagName: 'tp-skeleton',
  kind: 'thin-wrapper',
  axes: [],
  parts: [
    {
      name: 'skeleton',
    },
  ],
};

export const skeletonPresentation = definePresentation({
  definition,
  bindings: {
    'tp-skeleton': {
      "[part~='skeleton']": 'skeleton',
    },
  },
  sources: [skeletonAppearance],
});
