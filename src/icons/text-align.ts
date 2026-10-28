import type { IconDefinition } from './types.js';

/** Lines flush with the left edge. */
export const textAlignLeftIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M15 12H3', strokeWidth: 2 },
    { d: 'M17 18H3', strokeWidth: 2 },
    { d: 'M21 6H3', strokeWidth: 2 },
  ],
};

/** Centered lines. */
export const textAlignCenterIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M17 12H7', strokeWidth: 2 },
    { d: 'M19 18H5', strokeWidth: 2 },
    { d: 'M21 6H3', strokeWidth: 2 },
  ],
};

/** Lines flush with the right edge. */
export const textAlignRightIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M21 12H9', strokeWidth: 2 },
    { d: 'M21 18H7', strokeWidth: 2 },
    { d: 'M21 6H3', strokeWidth: 2 },
  ],
};

/** Justified lines. */
export const textAlignJustifyIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M3 12h18', strokeWidth: 2 },
    { d: 'M3 18h18', strokeWidth: 2 },
    { d: 'M3 6h18', strokeWidth: 2 },
  ],
};
