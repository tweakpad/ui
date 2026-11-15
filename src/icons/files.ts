import type { IconDefinition } from './types.js';

// File kinds and the views of a file listing (24×24 outlines, 2-unit stroke). Every file icon
// shares the sheet with a folded corner; the mark inside names the kind.

const sheet = { d: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z', strokeWidth: 2 };
const fold = { d: 'M14 2v6h6', strokeWidth: 2 };
const file = (...marks: string[]): IconDefinition => ({
  viewBox: '0 0 24 24',
  paths: [sheet, fold, ...marks.map((d) => ({ d, strokeWidth: 2 }))],
});

/** A sheet with a folded corner: any file. */
export const fileIcon: IconDefinition = file();
/** A sheet with a sun and a hill: an image. */
export const fileImageIcon: IconDefinition = file(
  'M9 12.5a1 1 0 1 0 0-.01',
  'M7 19l4-4 2 2 1.5-1.5L17 18',
);
/** A sheet with a play mark: a video. */
export const fileVideoIcon: IconDefinition = file('M10 12v6l5-3Z');
/** A sheet with a note: audio. */
export const fileAudioIcon: IconDefinition = file(
  'M11 17.5a1.5 1.5 0 1 1-3 0a1.5 1.5 0 1 1 3 0Z',
  'M11 17.5V11l3 1',
);
/** A sheet with a zipper and a tab: an archive. */
export const fileArchiveIcon: IconDefinition = file('M10 5h1M10 8h1M10 11h1', 'M9.5 14h2.5v4H9.5Z');
/** A sheet with angle brackets: code or structured text. */
export const fileCodeIcon: IconDefinition = file('M10 12.5l-2 2.5 2 2.5', 'M14 12.5l2 2.5-2 2.5');
/** A sheet with a small table: a spreadsheet. */
export const fileSpreadsheetIcon: IconDefinition = file('M8 12h8v6H8Z', 'M8 15h8M12 12v6');

/** Rows of a list with bullets: the details and compact views. */
export const layoutListIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01', strokeWidth: 2 }],
};
/** Four squares: the icons view. */
export const layoutGridIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h6v6h-6Z', strokeWidth: 2 }],
};
/** A frame over a strip: the gallery view. */
export const layoutGalleryIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M4 4h16v11H4Z', strokeWidth: 2 },
    { d: 'M4 20h3M10.5 20h3M17 20h3', strokeWidth: 2 },
  ],
};
/** Three panes side by side: the columns view. */
export const layoutColumnsIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M3 5h18v14H3ZM9 5v14M15 5v14', strokeWidth: 2 }],
};
/** Dense rows: the compact view. */
export const layoutRowsIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M4 5h16M4 9.5h16M4 14h16M4 18.5h16', strokeWidth: 2 }],
};
