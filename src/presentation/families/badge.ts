import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { badgeAppearance } from '../recipes/badge.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'Badge',
  tagName: 'tp-badge',
  kind: 'thin-wrapper',
  sourceNode: 'ucl22-badge',
  axes: [
    {
      name: 'variant',
      values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'badge',
      publicName: 'Root',
      presentationKeys: [
        'badge',
        'badge-variant-default',
        'badge-variant-secondary',
        'badge-variant-destructive',
        'badge-variant-outline',
        'badge-variant-ghost',
        'badge-variant-link',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
  ],
};

export const badgePresentation = definePresentation({
  definition,
  bindings: {
    'tp-badge': {
      '.badge': 'badge',
    },
  },
  sources: [badgeAppearance, passiveVariantAppearance(definition, 'badge')],
  complete: true,
});
