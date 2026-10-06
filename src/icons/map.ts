import type { IconDefinition } from './types.js';

/** Map pin (lucide `map-pin` geometry). */
export const mapPinIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0',
      strokeWidth: 2,
    },
    { d: 'M15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0', strokeWidth: 2 },
  ],
};

/** Home view (lucide `house` geometry). */
export const homeIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8', strokeWidth: 2 },
    {
      d: 'M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      strokeWidth: 2,
    },
  ],
};

/** Fit everything in view (lucide `scan` geometry). */
export const scanIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2',
      strokeWidth: 2,
    },
  ],
};
