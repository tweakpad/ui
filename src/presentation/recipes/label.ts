import type { PresentationDictionary } from '../resolver.js';

export const labelAppearance: PresentationDictionary = {
  'label-optional-indicator': [
    {
      selector: '&',
      declarations: {
        'font-weight': 'var(--tp-font-normal)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
};
