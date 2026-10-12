import type { IconDefinition } from './types.js';

/** Flow layout: one node fanning out to two others through a connector bus (original artwork). */
export const workflowIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M3.5 8.5h4A1.5 1.5 0 0 1 9 10v4a1.5 1.5 0 0 1-1.5 1.5h-4A1.5 1.5 0 0 1 2 14v-4a1.5 1.5 0 0 1 1.5-1.5z',
      strokeWidth: 2,
    },
    {
      d: 'M16.5 2h4A1.5 1.5 0 0 1 22 3.5v4A1.5 1.5 0 0 1 20.5 9h-4A1.5 1.5 0 0 1 15 7.5v-4A1.5 1.5 0 0 1 16.5 2z',
      strokeWidth: 2,
    },
    {
      d: 'M16.5 15h4a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-4a1.5 1.5 0 0 1-1.5-1.5v-4a1.5 1.5 0 0 1 1.5-1.5z',
      strokeWidth: 2,
    },
    { d: 'M9 12h3M12 5.5v13M12 5.5h3M12 18.5h3', strokeWidth: 2 },
  ],
};
