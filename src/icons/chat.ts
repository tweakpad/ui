import type { IconDefinition } from './types.js';

const outline = (...paths: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: paths.map((d) => ({ d, strokeWidth: 2 })),
});

/** Shared outline marks for conversation composers. Render with tp-icon. */
export const chatIcons = {
  send: outline('M12 19V5', 'm5 12 7-7 7 7'),
  conversation: outline(
    'M10.5 3.1a9 9 0 0 1 3 0',
    'M16.9 4.5a9 9 0 0 1 2.1 2.1',
    'M20.9 10.5a9 9 0 0 1 0 3',
    'M19.5 16.9a9 9 0 0 1-2.1 2.1',
    'M13.5 20.9a9 9 0 0 1-3 0',
    'M7 19.5 3 21l1.5-4',
    'M3.1 13.5a9 9 0 0 1 0-3',
    'M4.5 7.1a9 9 0 0 1 2.1-2.1',
  ),
  attachment: outline(
    'm21.4 11.6-9.2 9.2a6 6 0 0 1-8.5-8.5l10-10a4 4 0 0 1 5.7 5.7l-10 10a2 2 0 0 1-2.8-2.8l9.2-9.2',
  ),
  image: outline(
    'M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z',
    'm21 15-5-5L5 21',
    'M9 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
  ),
  research: outline('m4 8 12-5 4 9-13 5Z', 'm5 10-3 1 2 5 3-1', 'm14 15-4 7', 'm14 15 4 7'),
  globe: outline(
    'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
    'M3 12h18',
    'M12 3a18 18 0 0 1 0 18 18 18 0 0 1 0-18',
  ),
};
