import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { paginationAppearance } from '../recipes/pagination.js';

const definition: ComponentDefinition = {
  name: 'Pagination',
  tagName: 'tp-pagination',
  kind: 'flattening-compound',
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
    },
    {
      name: 'pagination-list',
    },
    {
      name: 'pagination-page-item',
    },
    {
      name: 'pagination-page-link',
      axes: ['pageLinkVariant'],
    },
    {
      name: 'pagination-previous',
    },
    {
      name: 'pagination-next',
    },
    {
      name: 'pagination-ellipsis',
    },
  ],
};

export const paginationPresentation = definePresentation({
  definition,
  sources: [paginationAppearance],
});
