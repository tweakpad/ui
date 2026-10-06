import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { skeletonAppearance } from '../recipes/skeleton.js';

const definition: ComponentDefinition = {
  name: 'Skeleton',
  tagName: 'tp-skeleton',
  kind: 'thin-wrapper',
  sourceNode: 'ucl22-skeleton',
  axes: [],
  parts: [
    {
      name: 'skeleton',
      publicName: 'Placeholder',
      presentationKeys: ['skeleton'],
      cardinality: 'exactly one public owner host per control instance',
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
