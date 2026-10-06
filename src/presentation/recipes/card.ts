import type { PresentationDictionary } from '../resolver.js';

export const cardAppearance: PresentationDictionary = {
  'card-header': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-1)',
      },
    },
  ],
  'card-content': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-5)',
      },
    },
  ],
  'card-footer': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
};
