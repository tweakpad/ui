import type { IconDefinition } from './types.js';

const outline = (...paths: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: paths.map((d) => ({ d, strokeWidth: 1.75 })),
});

export const navigationIcons = {
  search: outline('M21 21l-5-5', 'M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15'),
  panel: outline('M9 3v18', 'M4 3h16v18H4z'),
  selector: outline('m9 9 3-3 3 3', 'm9 15 3 3 3-3'),
  terminal: outline('M3 4h18v16H3z', 'm7 8 3 3-3 3', 'M13 14h4'),
  models: outline('M5 8h14v12H5z', 'M12 4v4', 'M2 12h3m14 0h3', 'M8 12h1m6 0h1', 'M8 16h8'),
  book: outline('M12 5v15', 'M12 5C8 2 4 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-2-1-6-2-10 1'),
  settings: outline('M3 6h18M3 12h18M3 18h18', 'M7 3v6m10 0v6M9 15v6'),
  frame: outline('M7 2v20M17 2v20M2 7h20M2 17h20'),
  chart: outline('M21 12a9 9 0 1 1-9-9v9z', 'M15 2v7h7a9 9 0 0 0-7-7'),
  map: outline('m3 5 6-3 6 3 6-3v17l-6 3-6-3-6 3z', 'M9 2v17m6-14v17'),
  more: {
    viewBox: '0 0 24 24',
    paths: [{ d: 'M5 12h.01M12 12h.01M19 12h.01', strokeWidth: 4 }],
  },
  folder: outline('M3 6h6l2 2h10v12H3z'),
  share: outline('M4 18v-4a4 4 0 0 1 4-4h12', 'm16 6 4 4-4 4'),
  trash: outline('M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7'),
  account: outline(
    'M20 21v-2a6 6 0 0 0-6-6h-4a6 6 0 0 0-6 6v2',
    'M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
  ),
  card: outline('M3 5h18v14H3z', 'M3 10h18M7 15h3'),
  bell: outline('M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'),
  sparkle: outline('m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z'),
  logout: outline('M9 3H3v18h6', 'M9 12h12m-4-4 4 4-4 4'),
} as const;
