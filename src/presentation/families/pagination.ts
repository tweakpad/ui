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
      description: 'The navigation landmark around the links.',
    },
    {
      name: 'pagination-list',
      description: 'The list of links.',
    },
    {
      name: 'pagination-page-item',
      description: 'The list item around each link or omitted range.',
    },
    {
      name: 'pagination-page-link',
      description: 'A numbered page link; the current page is marked `aria-current="page"`.',
      axes: ['pageLinkVariant'],
    },
    {
      name: 'pagination-previous',
      description: 'The link to the previous page.',
    },
    {
      name: 'pagination-next',
      description: 'The link to the next page.',
    },
    {
      name: 'pagination-ellipsis',
      description: 'The mark for an omitted range of pages, hidden from assistive technology.',
    },
  ],
};

export const paginationPresentation = definePresentation({
  definition,
  sources: [paginationAppearance],
});
