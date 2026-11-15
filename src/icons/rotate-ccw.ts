import type { IconDefinition } from './types.js';

/** A circular arrow turning counterclockwise: a quarter turn left (24×24 outline, 2-unit stroke). */
export const rotateCcwIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M3 12a9 9 0 1 0 9-9a9.75 9.75 0 0 0-6.74 2.74L3 8', strokeWidth: 2 },
    { d: 'M3 3v5h5', strokeWidth: 2 },
  ],
};
