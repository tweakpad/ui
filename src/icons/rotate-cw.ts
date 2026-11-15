import type { IconDefinition } from './types.js';

/** A circular arrow turning clockwise: a quarter turn right (24×24 outline, 2-unit stroke). */
export const rotateCwIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8', strokeWidth: 2 },
    { d: 'M21 3v5h-5', strokeWidth: 2 },
  ],
};
