import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { bubbleAppearance } from '../recipes/bubble.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'Bubble',
  tagName: 'tp-bubble',
  kind: 'presentational-primitive',
  axes: [
    {
      name: 'variant',
      values: ['default', 'secondary', 'subdued', 'tinted', 'outline', 'ghost', 'destructive'],
      default: 'secondary',
    },
    {
      name: 'align',
      values: ['start', 'end'],
      default: 'start',
    },
    {
      name: 'reactionsAlign',
      values: ['start', 'end'],
      default: 'end',
    },
  ],
  parts: [
    {
      name: 'bubble',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-root',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-content',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-reactions',
      axes: ['variant', 'reactionsAlign'],
    },
  ],
};

export const bubblePresentation = definePresentation({
  definition,
  bindings: {
    'tp-bubble': {
      '.bubble': 'bubble-root',
    },
  },
  sources: [bubbleAppearance, passiveVariantAppearance(definition, 'bubble-content')],
});
