import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { markerAppearance } from '../recipes/marker.js';

const definition: ComponentDefinition = {
  name: 'Marker',
  tagName: 'tp-marker',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-marker',
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
      publicName: 'Root',
      presentationKeys: [
        'marker',
        'marker-variant-default',
        'marker-variant-separator',
        'marker-variant-border',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'marker-icon',
      publicName: 'Icon',
      presentationKeys: [
        'marker-icon',
        'marker-icon-variant-default',
        'marker-icon-variant-separator',
        'marker-icon-variant-border',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'marker-content',
      publicName: 'Content',
      presentationKeys: [
        'marker-content',
        'marker-content-variant-default',
        'marker-content-variant-separator',
        'marker-content-variant-border',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
