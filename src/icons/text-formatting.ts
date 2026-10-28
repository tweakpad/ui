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
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16l-7-4-7 4Z',
      strokeWidth: 2,
      fill: 'currentColor',
    },
  ],
};

/** Strikethrough mark. */
export const strikethroughIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M16 4H9a3 3 0 0 0-2.83 4', strokeWidth: 2 },
    { d: 'M14 12a4 4 0 0 1 0 8H6', strokeWidth: 2 },
    { d: 'M4 12L20 12', strokeWidth: 2 },
  ],
};

/** Inline code mark: angle brackets. */
export const codeIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M16 18L22 12L16 6', strokeWidth: 2 },
    { d: 'M8 6L2 12L8 18', strokeWidth: 2 },
  ],
};

/** Superscript mark. */
export const superscriptIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm4 19 8-8', strokeWidth: 2 },
    { d: 'm12 19-8-8', strokeWidth: 2 },
    {
      d: 'M20 12h-4c0-1.5.442-2 1.5-2.5S20 8.334 20 7.002c0-.472-.17-.93-.484-1.29a2.105 2.105 0 0 0-2.617-.436c-.42.239-.738.614-.899 1.06',
      strokeWidth: 2,
    },
  ],
};

/** Subscript mark. */
export const subscriptIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm4 5 8 8', strokeWidth: 2 },
    { d: 'm12 5-8 8', strokeWidth: 2 },
    {
      d: 'M20 19h-4c0-1.5.44-2 1.5-2.5S20 15.33 20 14c0-.47-.17-.93-.48-1.29a2.11 2.11 0 0 0-2.62-.44c-.42.24-.74.62-.9 1.07',
      strokeWidth: 2,
    },
  ],
};

/** Highlight color: a marker. */
export const highlighterIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm9 11-6 6v3h9l3-3', strokeWidth: 2 },
    { d: 'm22 12-4.6 4.6a2 2 0 0 1-2.8 0l-5.2-5.2a2 2 0 0 1 0-2.8L14 4', strokeWidth: 2 },
  ],
};

/** Text color: a letter over its baseline. */
export const baselineIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 20h16', strokeWidth: 2 },
    { d: 'm6 16 6-12 6 12', strokeWidth: 2 },
    { d: 'M8 12h8', strokeWidth: 2 },
  ],
};

/** Clear formatting. */
export const removeFormattingIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 7V4h16v3', strokeWidth: 2 },
    { d: 'M5 20h6', strokeWidth: 2 },
    { d: 'M13 4 8 20', strokeWidth: 2 },
    { d: 'm15 15 5 5', strokeWidth: 2 },
    { d: 'm20 15-5 5', strokeWidth: 2 },
  ],
};
