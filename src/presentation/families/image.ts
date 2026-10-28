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
      description: 'The host, which reveal and parallax move.',
    },
    {
      name: 'image-frame',
      description: 'The clipping frame, a fixed-ratio box when `ratio` is set.',
    },
    {
      name: 'image-media',
      description: 'The layer that zoom and parallax transform.',
    },
    {
      name: 'image-picture',
      description: 'The native image.',
    },
    {
      name: 'image-placeholder',
      description: 'The surface shown while the image loads.',
    },
    {
      name: 'image-group',
      description: 'The Image group host.',
    },
    {
      name: 'image-fallback',
      description: 'The surface shown when the image fails.',
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
