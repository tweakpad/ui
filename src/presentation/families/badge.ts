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
      values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'badge',
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
