import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { imageAppearance } from '../recipes/image.js';

const definition: ComponentDefinition = {
  name: 'Image',
  tagName: 'tp-image',
  kind: 'preset-composition',
  sourceNode: 'ucl21-image',
  axes: [],
  parts: [
    {
      name: 'image',
      publicName: 'Root',
      presentationKeys: ['image'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'image-frame',
      publicName: 'Frame',
      presentationKeys: ['image-frame'],
      cardinality: 'exactly one, in Root',
    },
    {
      name: 'image-media',
      publicName: 'Media',
      presentationKeys: ['image-media'],
      cardinality: 'exactly one, in Frame',
    },
    {
      name: 'image-picture',
      publicName: 'Picture',
      presentationKeys: ['image-picture'],
      cardinality: 'exactly one, in Media',
    },
    {
      name: 'image-placeholder',
      publicName: 'Placeholder',
      presentationKeys: ['image-placeholder'],
      cardinality: 'zero or one descendant of Frame, present while loading',
    },
    {
      name: 'image-fallback',
      publicName: 'Fallback',
      presentationKeys: ['image-fallback'],
      cardinality: 'zero or one descendant of Frame, present on error or without a source',
    },
  ],
};

export const imagePresentation = definePresentation({
  definition,
  bindings: {
    'tp-image': {
      ':host': 'image',
      "[part~='frame']": 'image-frame',
      "[part~='media']": 'image-media',
      "[part~='picture']": 'image-picture',
      "[part~='placeholder']": 'image-placeholder',
      "[part~='fallback']": 'image-fallback',
    },
  },
  sources: [imageAppearance],
});
