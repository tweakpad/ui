import type { PresentationDictionary } from '../resolver.js';

export const paginationAppearance: PresentationDictionary = {
  'pagination-list': [
    {
      declarations: {
        margin: '0',
        padding: '0',
        'list-style': 'none',
        gap: 'calc(var(--tp-spacing) / 2)',
      },
    },
  ],
  'pagination-page-link-variant-icon': [
    {
      declarations: {
        'inline-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'padding-inline': '0',
        'justify-content': 'center',
      },
    },
  ],
  'pagination-ellipsis': [
    {
      declarations: {
        'inline-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
        'block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
      },
    },
  ],
};
