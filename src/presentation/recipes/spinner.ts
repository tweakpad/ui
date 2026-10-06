import type { PresentationDictionary } from '../resolver.js';

export const spinnerAppearance: PresentationDictionary = {
  spinner: [
    {
      selector: '&',
      declarations: {
        color: 'inherit',
        width: 'var(--tp-icon-size-md)',
        height: 'var(--tp-icon-size-md)',
        border: 'var(--tp-border-width-strong) var(--tp-border-style) currentcolor',
        'border-right-color': 'transparent',
        'border-radius': 'var(--tp-radius-full)',
      },
    },
    {
      selector: "&[size='sm']",
      declarations: {
        width: 'var(--tp-icon-size-sm)',
        height: 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: "&[size='lg']",
      declarations: {
        width: 'var(--tp-icon-size-lg)',
        height: 'var(--tp-icon-size-lg)',
      },
    },
  ],
};
