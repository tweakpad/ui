import type { IconDefinition } from './types.js';

/** Align to the left edge (lucide `align-start-vertical` geometry). */
export const alignStartVerticalIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M8 14h5a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-5a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    {
      d: 'M8 4h12a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M2 2v20', strokeWidth: 2 },
  ],
};

/** Align to the top edge (lucide `align-start-horizontal` geometry). */
export const alignStartHorizontalIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M6 6h2a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    {
      d: 'M16 6h2a2 2 0 0 1 2 2v5a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-5a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M22 2H2', strokeWidth: 2 },
  ],
};

/** Distribute horizontally (lucide `align-horizontal-distribute-center` geometry). */
export const alignHorizontalDistributeCenterIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M6 5h2a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    {
      d: 'M16 7h2a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-2a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M17 22v-5', strokeWidth: 2 },
    { d: 'M17 7V2', strokeWidth: 2 },
    { d: 'M7 22v-3', strokeWidth: 2 },
    { d: 'M7 5V2', strokeWidth: 2 },
  ],
};

/** Distribute vertically (lucide `align-vertical-distribute-center` geometry). */
export const alignVerticalDistributeCenterIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M22 17h-3', strokeWidth: 2 },
    { d: 'M22 7h-5', strokeWidth: 2 },
    { d: 'M5 17H2', strokeWidth: 2 },
    { d: 'M7 7H2', strokeWidth: 2 },
    {
      d: 'M7 14h10a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    {
      d: 'M9 4h6a2 2 0 0 1 2 2v2a2 2 0 0 1 -2 2h-6a2 2 0 0 1 -2 -2v-2a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
  ],
};
