import type { IconDefinition } from './types.js';

/** Left-to-right layout: two nodes joined by a horizontal edge (original artwork). */
export const layoutHorizontalIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M3.5 8h4A1.5 1.5 0 0 1 9 9.5v5A1.5 1.5 0 0 1 7.5 16h-4A1.5 1.5 0 0 1 2 14.5v-5A1.5 1.5 0 0 1 3.5 8z',
      strokeWidth: 2,
    },
    {
      d: 'M16.5 8h4A1.5 1.5 0 0 1 22 9.5v5a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-5A1.5 1.5 0 0 1 16.5 8z',
      strokeWidth: 2,
    },
    { d: 'M9 12h6', strokeWidth: 2 },
  ],
};
