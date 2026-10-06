import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { paginationAppearance } from '../recipes/pagination.js';

const definition: ComponentDefinition = {
  name: 'Pagination',
  tagName: 'tp-pagination',
  kind: 'flattening-compound',
  sourceNode: 'ucl20-pagination',
  axes: [
    {
      name: 'pageLinkVariant',
      values: ['text', 'icon'],
      default: 'icon',
    },
  ],
  parts: [
    {
      name: 'pagination',
      publicName: 'Navigation region',
      presentationKeys: ['pagination'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'pagination-list',
      publicName: 'List',
      presentationKeys: ['pagination-list'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'pagination-page-item',
      publicName: 'Page item',
      presentationKeys: ['pagination-page-item'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'pagination-page-link',
      publicName: 'Page link',
      presentationKeys: [
        'pagination-page-link',
        'pagination-page-link-variant-text',
        'pagination-page-link-variant-icon',
      ],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'pagination-previous',
      publicName: 'Previous',
      presentationKeys: ['pagination-previous'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'pagination-next',
      publicName: 'Next',
      presentationKeys: ['pagination-next'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
    {
      name: 'pagination-ellipsis',
      publicName: 'Ellipsis',
      presentationKeys: ['pagination-ellipsis'],
      cardinality:
        'zero or one descendant of Navigation region; cited behavior sets any required-presence condition',
    },
  ],
};

export const paginationPresentation = definePresentation({
  definition,
  sources: [paginationAppearance],
});
