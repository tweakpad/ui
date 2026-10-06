import type { PresentationDictionary } from '../resolver.js';
import { scrollbarRules, scrollbarThumbRules } from './shared/scrollbar.js';
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
  'scroll-area-scrollbar': scrollbarRules,
  'scroll-area-thumb': scrollbarThumbRules,
};
