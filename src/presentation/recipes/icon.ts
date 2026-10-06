import type { PresentationDictionary } from '../resolver.js';

export const iconAppearance: PresentationDictionary = {
  icon: [
    {
      selector: '&',
      declarations: {
        'inline-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        'block-size': 'var(--tp-icon-size, var(--tp-icon-size-md))',
        color: 'inherit',
      },
    },
  ],
};
