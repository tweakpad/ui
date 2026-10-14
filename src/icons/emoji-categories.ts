import { clockIcon } from './clock.js';
import type { IconDefinition } from './types.js';

const outline = (...paths: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: paths.map((d) => ({ d, strokeWidth: 2 })),
});

/** Category bar icons of the Emoji picker, keyed by the standard category identifiers. */
export const emojiCategoryIcons = {
  recent: clockIcon,
  'smileys-emotion': outline(
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    'M8.5 14.5a4.5 4.5 0 0 0 7 0',
    'M9 9.5v.5M15 9.5v.5',
  ),
  'people-body': outline('M15.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0', 'M5 20.5a7 7 0 0 1 14 0'),
  'animals-nature': outline('M5 19C5 11 10 5 19 5c0 9-6 14-14 14', 'M5 19l8-8'),
  'food-drink': outline(
    'M12 8C9 6 5 7.5 5 12.5S8 21 10 21c1 0 1.4-.5 2-.5s1 .5 2 .5c2 0 5-3.5 5-8.5S15 6 12 8',
    'M12 8c0-2 1-3.5 2.5-4.5',
  ),
  'travel-places': outline('M3 16v-4l2.5-5h13l2.5 5v4z', 'M3 12h18', 'M7 16v3M17 16v3'),
  activities: outline(
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    'M5.6 5.6a9 9 0 0 1 0 12.8',
    'M18.4 5.6a9 9 0 0 0 0 12.8',
  ),
  objects: outline(
    'M9 18h6M10 21h4',
    'M12 3a6 6 0 0 0-3.4 10.9c.6.4.9 1 .9 1.6V16h5v-.5c0-.6.3-1.2.9-1.6A6 6 0 0 0 12 3',
  ),
  symbols: outline('M10 4 8 20M16 4l-2 16M4.5 9h15M4 15h15'),
  flags: outline('M5 21V4', 'M5 4h12l-2.5 4.5L17 13H5'),
  custom: outline(
    'M12 3l1.9 5.6L19.5 10.5l-5.6 1.9L12 18l-1.9-5.6L4.5 10.5l5.6-1.9z',
    'M19 17v4M17 19h4',
  ),
} satisfies Record<string, IconDefinition>;
