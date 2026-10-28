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
      description: 'The stack of a Bubble group.',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-root',
      description: 'The message container: its alignment and its named group.',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-content',
      description: 'The framed content and the treatment of the variant.',
      axes: ['variant', 'align'],
    },
    {
      name: 'bubble-reactions',
      description: 'The row of reactions on the edge of the message.',
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
