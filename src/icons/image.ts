import type { IconDefinition } from './types.js';

/** A picture frame crossed out: an image that could not be shown (24×24 outline, 2-unit stroke). */
export const imageOffIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M8.5 5h10A1.5 1.5 0 0 1 20 6.5v9', strokeWidth: 2 },
    { d: 'M18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-11', strokeWidth: 2 },
    { d: 'M4 16l4.5-4.5 3 3', strokeWidth: 2 },
    { d: 'M14.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0', strokeWidth: 2 },
    { d: 'M3 3l18 18', strokeWidth: 2 },
  ],
};

/** A picture frame with a sun and a hill: an image file (24×24 outline, 2-unit stroke). */
export const imageIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4z',
      strokeWidth: 2,
    },
    { d: 'M4 16l4.5-4.5L18 20', strokeWidth: 2 },
    { d: 'M14.5 9.5a1 1 0 1 0 2 0a1 1 0 1 0-2 0', strokeWidth: 2 },
  ],
};
