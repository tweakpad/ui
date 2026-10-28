import type { IconDefinition } from './types.js';

/** Heading level 1. */
export const heading1Icon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 12h8', strokeWidth: 2 },
    { d: 'M4 18V6', strokeWidth: 2 },
    { d: 'M12 18V6', strokeWidth: 2 },
    { d: 'm17 12 3-2v8', strokeWidth: 2 },
  ],
};

/** Heading level 2. */
export const heading2Icon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 12h8', strokeWidth: 2 },
    { d: 'M4 18V6', strokeWidth: 2 },
    { d: 'M12 18V6', strokeWidth: 2 },
    { d: 'M21 18h-4c0-4 4-3 4-6 0-1.5-2-2.5-4-1', strokeWidth: 2 },
  ],
};

/** Heading level 3. */
export const heading3Icon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 12h8', strokeWidth: 2 },
    { d: 'M4 18V6', strokeWidth: 2 },
    { d: 'M12 18V6', strokeWidth: 2 },
    { d: 'M17.5 10.5c1.7-1 3.5 0 3.5 1.5a2 2 0 0 1-2 2', strokeWidth: 2 },
    { d: 'M17 17.5c2 1.5 4 .3 4-1.5a2 2 0 0 0-2-2', strokeWidth: 2 },
  ],
};

/** Paragraph: a pilcrow. */
export const pilcrowIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M13 4v16', strokeWidth: 2 },
    { d: 'M17 4v16', strokeWidth: 2 },
    { d: 'M19 4H9.5a4.5 4.5 0 0 0 0 9H13', strokeWidth: 2 },
  ],
};

/** Bulleted list. */
export const bulletListIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M3 12h.01', strokeWidth: 2 },
    { d: 'M3 18h.01', strokeWidth: 2 },
    { d: 'M3 6h.01', strokeWidth: 2 },
    { d: 'M8 12h13', strokeWidth: 2 },
    { d: 'M8 18h13', strokeWidth: 2 },
    { d: 'M8 6h13', strokeWidth: 2 },
  ],
};

/** Numbered list. */
export const orderedListIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M10 12h11', strokeWidth: 2 },
    { d: 'M10 18h11', strokeWidth: 2 },
    { d: 'M10 6h11', strokeWidth: 2 },
    { d: 'M4 10h2', strokeWidth: 2 },
    { d: 'M4 6h1v4', strokeWidth: 2 },
    { d: 'M6 18H4c0-1 2-2 2-3s-1-1.5-2-1', strokeWidth: 2 },
  ],
};

/** Task list: a checkbox beside lines. */
export const taskListIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M4 5h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z',
      strokeWidth: 2,
    },
    { d: 'm3 17 2 2 4-4', strokeWidth: 2 },
    { d: 'M13 6h8', strokeWidth: 2 },
    { d: 'M13 12h8', strokeWidth: 2 },
    { d: 'M13 18h8', strokeWidth: 2 },
  ],
};

/** Block quote: lines beside a bar. */
export const quoteIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M17 6H3', strokeWidth: 2 },
    { d: 'M21 12H8', strokeWidth: 2 },
    { d: 'M21 18H8', strokeWidth: 2 },
    { d: 'M3 12v6', strokeWidth: 2 },
  ],
};

/** Code block: angle brackets in a frame. */
export const codeBlockIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M10 9.5 8 12l2 2.5', strokeWidth: 2 },
    { d: 'm14 9.5 2 2.5-2 2.5', strokeWidth: 2 },
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
  ],
};

/** Callout block: a speech box with an exclamation mark. */
export const calloutIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z', strokeWidth: 2 },
    { d: 'M12 7v2', strokeWidth: 2 },
    { d: 'M12 13h.01', strokeWidth: 2 },
  ],
};

/** Embedded page: a window frame. */
export const embedIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M10 4v4', strokeWidth: 2 },
    { d: 'M2 8h20', strokeWidth: 2 },
    { d: 'M6 4v4', strokeWidth: 2 },
  ],
};
