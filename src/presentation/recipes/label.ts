import type { PresentationDictionary } from '../resolver.js';

export const labelAppearance: PresentationDictionary = {
  // Nova cn-label: gap-2 text-sm leading-none font-medium.
  label: [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
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
