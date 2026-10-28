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
      description: 'The surface: fill, outline, corners and elevation.',
      axes: ['size'],
    },
    {
      name: 'card-header',
      description: 'The header section around the title, the description and the action.',
      axes: ['size'],
    },
    {
      name: 'card-title',
      description: 'The wrapper of the `header` slot.',
      axes: ['size'],
    },
    {
      name: 'card-description',
      description: 'The wrapper of the `description` slot, in muted text.',
      axes: ['size'],
    },
    {
      name: 'card-action',
      description: 'The wrapper of the `action` slot, at the end of the header.',
      axes: ['size'],
    },
    {
      name: 'card-content',
      description: 'The content section around the default slot.',
      axes: ['size'],
    },
    {
      name: 'card-footer',
      description: 'The footer section around the `footer` slot.',
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
