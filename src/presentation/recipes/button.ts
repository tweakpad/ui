import type { PresentationDictionary } from '../resolver.js';

export const buttonAppearance: PresentationDictionary = {
  button: [
    {
      selector: '&',
      declarations: {
        gap: 'var(--tp-space-2)',
      },
    },
  ],
  'button-leading-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
  'button-trailing-mark': [
    {
      selector: '&',
      declarations: {
        'font-size': 'var(--tp-icon-size-md)',
      },
    },
    {
      selector: ":host([size='xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-xs']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='icon-sm']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-sm)',
      },
    },
    {
      selector: ":host([size='lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
    {
      selector: ":host([size='icon-lg']) &",
      declarations: {
        'font-size': 'var(--tp-icon-size-lg)',
      },
    },
  ],
};
