import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { imageAppearance } from '../recipes/image.js';

const definition: ComponentDefinition = {
  name: 'Image',
  tagName: 'tp-image',
  kind: 'preset-composition',
  axes: [],
  parts: [
    {
      name: 'image',
    },
    {
      name: 'image-frame',
    },
    {
      name: 'image-media',
    },
    {
      name: 'image-picture',
    },
    {
      name: 'image-placeholder',
    },
    {
      name: 'image-group',
    },
    {
      name: 'image-fallback',
    },
  ],
};

export const imagePresentation = definePresentation({
  definition,
  bindings: {
    'tp-image-group': {
      ':host': 'image-group',
    },
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
