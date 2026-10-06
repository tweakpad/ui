import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { bubbleAppearance } from '../recipes/bubble.js';
import { passiveVariantAppearance } from '../recipes/core/passive.js';

const definition: ComponentDefinition = {
  name: 'Bubble',
  tagName: 'tp-bubble',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-bubble',
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
      publicName: 'Group',
      presentationKeys: [
        'bubble',
        'bubble-variant-default',
        'bubble-variant-secondary',
        'bubble-variant-subdued',
        'bubble-variant-tinted',
        'bubble-variant-outline',
        'bubble-variant-ghost',
        'bubble-variant-destructive',
        'bubble-align-start',
        'bubble-align-end',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'bubble-root',
      publicName: 'Root',
      presentationKeys: [
        'bubble-root',
        'bubble-root-variant-default',
        'bubble-root-variant-secondary',
        'bubble-root-variant-subdued',
        'bubble-root-variant-tinted',
        'bubble-root-variant-outline',
        'bubble-root-variant-ghost',
        'bubble-root-variant-destructive',
        'bubble-root-align-start',
        'bubble-root-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'bubble-content',
      publicName: 'Content',
      presentationKeys: [
        'bubble-content',
        'bubble-content-variant-default',
        'bubble-content-variant-secondary',
        'bubble-content-variant-subdued',
        'bubble-content-variant-tinted',
        'bubble-content-variant-outline',
        'bubble-content-variant-ghost',
        'bubble-content-variant-destructive',
        'bubble-content-align-start',
        'bubble-content-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
    },
    {
      name: 'bubble-reactions',
      publicName: 'Reactions',
      presentationKeys: [
        'bubble-reactions',
        'bubble-reactions-variant-default',
        'bubble-reactions-variant-secondary',
        'bubble-reactions-variant-subdued',
        'bubble-reactions-variant-tinted',
        'bubble-reactions-variant-outline',
        'bubble-reactions-variant-ghost',
        'bubble-reactions-variant-destructive',
        'bubble-reactions-align-start',
        'bubble-reactions-align-end',
      ],
      cardinality:
        'zero or one descendant of Group; cited behavior sets any required-presence condition',
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
  complete: true,
});
