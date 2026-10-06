import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { breadcrumbAppearance } from '../recipes/breadcrumb.js';

const definition: ComponentDefinition = {
  name: 'Breadcrumb',
  tagName: 'tp-breadcrumb',
  kind: 'flattening-compound',
  sourceNode: 'ucl20-breadcrumb',
  axes: [],
  parts: [
    {
      name: 'breadcrumb',
      publicName: 'Navigation region',
      presentationKeys: ['breadcrumb'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'breadcrumb-ordered-list',
      publicName: 'Ordered list',
      presentationKeys: ['breadcrumb-ordered-list'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'breadcrumb-item',
      publicName: 'Item',
      presentationKeys: ['breadcrumb-item'],
      cardinality:
        'zero or more descendants of Navigation region; cited behavior sets any stronger minimum',
    },
    {
      name: 'breadcrumb-link',
      publicName: 'Link',
      presentationKeys: ['breadcrumb-link'],
      cardinality:
        'zero or more descendants of Navigation region; cited behavior sets any stronger minimum',
    },
    {
      name: 'breadcrumb-current-page',
      publicName: 'Current page',
      presentationKeys: ['breadcrumb-current-page'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'breadcrumb-separator',
      publicName: 'Separator',
      presentationKeys: ['breadcrumb-separator'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'breadcrumb-ellipsis',
      publicName: 'Ellipsis',
      presentationKeys: ['breadcrumb-ellipsis'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
  ],
};

export const breadcrumbPresentation = definePresentation({
  definition,
  sources: [breadcrumbAppearance],
});
