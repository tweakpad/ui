import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { cardAppearance } from '../recipes/card.js';
import { cardCoreAppearance } from '../recipes/core/card.js';

const definition: ComponentDefinition = {
  name: 'Card',
  tagName: 'tp-card',
  kind: 'presentational-primitive',
  axes: [
    {
      name: 'size',
      values: ['sm', 'default'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'card',
      axes: ['size'],
    },
    {
      name: 'card-header',
      axes: ['size'],
    },
    {
      name: 'card-title',
      axes: ['size'],
    },
    {
      name: 'card-description',
      axes: ['size'],
    },
    {
      name: 'card-action',
      axes: ['size'],
    },
    {
      name: 'card-content',
      axes: ['size'],
    },
    {
      name: 'card-footer',
      axes: ['size'],
    },
  ],
};

export const cardPresentation = definePresentation({
  definition,
  bindings: {
    'tp-card': {
      '.card > header': 'card-header',
      '.card > .content': 'card-content',
      '.card > footer': 'card-footer',
    },
  },
  sources: [cardAppearance, cardCoreAppearance],
});
