import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { markerAppearance } from '../recipes/marker.js';

const definition: ComponentDefinition = {
  name: 'Marker',
  tagName: 'tp-marker',
  kind: 'presentational-primitive',
  axes: [
    {
      name: 'variant',
      values: ['default', 'separator', 'border'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'marker',
      description:
        'The row holding the icon and the content, and the rules of the separator and border treatments; a link or button delegate replaces it.',
      axes: ['variant'],
    },
    {
      name: 'marker-icon',
      description: 'The wrapper of the `icon` slot, hidden from assistive technology.',
      axes: ['variant'],
    },
    {
      name: 'marker-content',
      description: 'The wrapper of the text, which the shimmer sweeps.',
      axes: ['variant'],
    },
  ],
};

export const markerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-marker': {
      '.root': 'marker',
      '.icon': 'marker-icon',
      '.content': 'marker-content',
    },
  },
  sources: [markerAppearance],
});
