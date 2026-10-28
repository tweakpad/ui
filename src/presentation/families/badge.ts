import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { badgeAppearance } from '../recipes/badge.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'Badge',
  tagName: 'tp-badge',
  kind: 'thin-wrapper',
  axes: [
    {
      name: 'variant',
      values: [
        'default',
        'secondary',
        'destructive',
        'success',
        'warning',
        'outline',
        'ghost',
        'link',
      ],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'badge',
      description: 'The pill: the host of the label and of the variant appearance.',
      axes: ['variant'],
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
});
