import type { PresentationDictionary } from '../resolver.js';

export const separatorAppearance: PresentationDictionary = {
  separator: [
    {
      selector: '&',
      declarations: {
        'background-color': 'var(--tp-border)',
      },
    },
  ],
};
