import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { cardAppearance } from '../recipes/card.js';
import { cardCoreAppearance } from '../recipes/core/card.js';

const definition: ComponentDefinition = {
  name: 'Card',
  tagName: 'tp-card',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-card',
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
      publicName: 'Root',
      presentationKeys: ['card', 'card-size-sm', 'card-size-default'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'card-header',
      publicName: 'Header',
      presentationKeys: ['card-header', 'card-header-size-sm', 'card-header-size-default'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'card-title',
      publicName: 'Title',
      presentationKeys: ['card-title', 'card-title-size-sm', 'card-title-size-default'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'card-description',
      publicName: 'Description',
      presentationKeys: [
        'card-description',
        'card-description-size-sm',
        'card-description-size-default',
      ],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'card-action',
      publicName: 'Action',
      presentationKeys: ['card-action', 'card-action-size-sm', 'card-action-size-default'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'card-content',
      publicName: 'Content',
      presentationKeys: ['card-content', 'card-content-size-sm', 'card-content-size-default'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'card-footer',
      publicName: 'Footer',
      presentationKeys: ['card-footer', 'card-footer-size-sm', 'card-footer-size-default'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
