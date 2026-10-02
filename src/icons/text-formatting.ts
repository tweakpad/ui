import type { IconDefinition } from './types.js';

/** Plain artwork for the existing Icon renderer used in Toggle compositions. */
export const boldIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M6 12h8a4 4 0 0 1 0 8H6V4h7a4 4 0 0 1 0 8', strokeWidth: 2 }],
};
export const italicIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M19 4h-9M14 20H5M15 4 9 20', strokeWidth: 2 }],
};
export const underlineIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M6 3v7a6 6 0 0 0 12 0V3M4 21h16', strokeWidth: 2 }],
};
export const bookmarkIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4Z', strokeWidth: 2 }],
};
export const filledBookmarkIcon: IconDefinition = {
  ...bookmarkIcon,
  paths: bookmarkIcon.paths.map((path) => ({ ...path, fill: 'currentColor' })),
};
