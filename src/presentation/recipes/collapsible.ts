import type { PresentationDictionary } from '../resolver.js';

export const collapsibleAppearance: PresentationDictionary = {
  'collapsible-heading': [
    {
      selector: '&',
      declarations: {
        font: 'inherit',
      },
    },
  ],
  'collapsible-trigger': [
    {
      selector: '&:focus-visible',
      declarations: {
        'outline-offset': 'calc(-1 * var(--tp-ring-width))',
      },
    },
  ],
  'collapsible-leading': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'collapsible-trailing': [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
};
