import type { IconDefinition } from './types.js';

/** Top-to-bottom layout: two nodes joined by a vertical edge (original artwork). */
export const layoutVerticalIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M9.5 2h5A1.5 1.5 0 0 1 16 3.5v4A1.5 1.5 0 0 1 14.5 9h-5A1.5 1.5 0 0 1 8 7.5v-4A1.5 1.5 0 0 1 9.5 2z',
      strokeWidth: 2,
    },
    {
      d: 'M9.5 15h5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-5A1.5 1.5 0 0 1 8 20.5v-4A1.5 1.5 0 0 1 9.5 15z',
      strokeWidth: 2,
    },
    { d: 'M12 9v6', strokeWidth: 2 },
  ],
};
