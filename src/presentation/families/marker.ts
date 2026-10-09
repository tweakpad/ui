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
      axes: ['variant'],
    },
    {
      name: 'marker-icon',
      axes: ['variant'],
    },
    {
      name: 'marker-content',
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
