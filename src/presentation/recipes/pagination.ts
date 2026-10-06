import type { PresentationDictionary } from '../resolver.js';

export const paginationAppearance: PresentationDictionary = {
  'pagination-list': [
    {
      declarations: {
        margin: '0',
        padding: '0',
        'list-style': 'none',
        gap: 'var(--tp-space-0-5)',
      },
    },
  ],
  'pagination-page-link-variant-icon': [
    {
      declarations: {
        // Nova PaginationLink: Button size icon (size-8).
        'inline-size': 'var(--tp-control-height-md)',
        'min-inline-size': 'var(--tp-control-height-md)',
        'padding-inline': '0',
        'justify-content': 'center',
      },
    },
  ],
  'pagination-ellipsis': [
    {
      declarations: {
        // Nova cn-pagination-ellipsis: size-8.
        'inline-size': 'var(--tp-control-height-md)',
        'block-size': 'var(--tp-control-height-md)',
      },
    },
  ],
};
