import type { PresentationDictionary } from '../resolver.js';
/** Base/Nova scroll anatomy; thickness, padding, radius and motion share theme roles. */
export const scrollAreaAppearance: PresentationDictionary = {
  'scroll-area': [],
  'scroll-area-viewport': [
    { declarations: { outline: 'none' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'calc(var(--tp-ring-width) * -1)',
      },
    },
  ],
  'scroll-area-scrollbar': [
    {
      declarations: {
        padding: 'calc(var(--tp-spacing) / 4)',
        transition:
          'opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { width: 'calc(var(--tp-spacing) * 2.5)' },
    },
    {
      selector: '&[data-orientation="horizontal"]',
      declarations: { height: 'calc(var(--tp-spacing) * 2.5)' },
    },
  ],
  'scroll-area-thumb': [
    { declarations: { background: 'var(--tp-border)', 'border-radius': 'var(--tp-radius-full)' } },
    {
      selector: '&[data-orientation="vertical"]',
      declarations: { 'min-height': 'min(var(--tp-space-4), 100%)' },
    },
    {
      selector: '&[data-orientation="horizontal"]',
      declarations: { 'min-width': 'min(var(--tp-space-4), 100%)' },
    },
  ],
};
