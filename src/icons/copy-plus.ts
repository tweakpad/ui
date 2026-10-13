import type { IconDefinition } from './types.js';

/** Duplicate (lucide `copy-plus` geometry). */
export const copyPlusIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M15 12L15 18', strokeWidth: 2 },
    { d: 'M12 15L18 15', strokeWidth: 2 },
    {
      d: 'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2', strokeWidth: 2 },
  ],
};
