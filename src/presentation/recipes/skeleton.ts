import type { PresentationDictionary } from '../resolver.js';

export const skeletonAppearance: PresentationDictionary = {
  skeleton: [
    {
      selector: '&',
      declarations: {
        'border-radius': 'inherit',
        background: 'var(--tp-muted)',
      },
    },
    {
      selector: '&[animated][data-motion="sweep"]::after',
      declarations: {
        background: 'linear-gradient(90deg, transparent, var(--tp-muted-foreground), transparent)',
      },
    },
  ],
};
