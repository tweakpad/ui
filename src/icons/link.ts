import type { IconDefinition } from './types.js';

/** Link: two chain links. */
export const linkIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', strokeWidth: 2 },
    { d: 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71', strokeWidth: 2 },
  ],
};

/** Remove a link: a broken chain. */
export const unlinkIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'm18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71',
      strokeWidth: 2,
    },
    {
      d: 'm5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71',
      strokeWidth: 2,
    },
    { d: 'M8 2L8 5', strokeWidth: 2 },
    { d: 'M2 8L5 8', strokeWidth: 2 },
    { d: 'M16 19L16 22', strokeWidth: 2 },
    { d: 'M19 16L22 16', strokeWidth: 2 },
  ],
};

/** Apply or confirm: an arrow turning down and back. */
export const cornerDownLeftIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M9 10L4 15L9 20', strokeWidth: 2 },
    { d: 'M20 4v7a4 4 0 0 1-4 4H4', strokeWidth: 2 },
  ],
};
