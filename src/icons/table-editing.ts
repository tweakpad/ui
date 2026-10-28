import type { IconDefinition } from './types.js';

/** Table: a framed grid. */
export const tableIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M12 3v18', strokeWidth: 2 },
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M3 9h18', strokeWidth: 2 },
    { d: 'M3 15h18', strokeWidth: 2 },
  ],
};

/** Insert a row above: an arrow up to an edge. */
export const insertRowAboveIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M5 3h14', strokeWidth: 2 },
    { d: 'm18 13-6-6-6 6', strokeWidth: 2 },
    { d: 'M12 7v14', strokeWidth: 2 },
  ],
};

/** Insert a row below: an arrow down to an edge. */
export const insertRowBelowIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M12 17V3', strokeWidth: 2 },
    { d: 'm6 11 6 6 6-6', strokeWidth: 2 },
    { d: 'M19 21H5', strokeWidth: 2 },
  ],
};

/** Insert a column on the left: an arrow to the left edge. */
export const insertColumnLeftIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M3 19V5', strokeWidth: 2 },
    { d: 'm13 6-6 6 6 6', strokeWidth: 2 },
    { d: 'M7 12h14', strokeWidth: 2 },
  ],
};

/** Insert a column on the right: an arrow to the right edge. */
export const insertColumnRightIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M17 12H3', strokeWidth: 2 },
    { d: 'm11 18 6-6-6-6', strokeWidth: 2 },
    { d: 'M21 5v14', strokeWidth: 2 },
  ],
};

/** Merge cells. */
export const mergeCellsIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M12 21v-6', strokeWidth: 2 },
    { d: 'M12 9V3', strokeWidth: 2 },
    { d: 'M3 15h18', strokeWidth: 2 },
    { d: 'M3 9h18', strokeWidth: 2 },
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
  ],
};

/** Split a cell. */
export const splitCellIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M12 15V9', strokeWidth: 2 },
    { d: 'M3 15h18', strokeWidth: 2 },
    { d: 'M3 9h18', strokeWidth: 2 },
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
  ],
};

/** Header row: a frame with a top band. */
export const headerRowIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M3 9h18', strokeWidth: 2 },
  ],
};

/** Header column: a frame with a side band. */
export const headerColumnIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2z',
      strokeWidth: 2,
    },
    { d: 'M9 3v18', strokeWidth: 2 },
  ],
};

/** Background color: a paint bucket. */
export const paintBucketIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm19 11-8-8-8.6 8.6a2 2 0 0 0 0 2.8l5.2 5.2c.8.8 2 .8 2.8 0L19 11Z', strokeWidth: 2 },
    { d: 'm5 2 5 5', strokeWidth: 2 },
    { d: 'M2 13h15', strokeWidth: 2 },
    { d: 'M22 20a2 2 0 1 1-4 0c0-1.6 1.7-2.4 2-4 .3 1.6 2 2.4 2 4Z', strokeWidth: 2 },
  ],
};

/** Clear contents: an eraser. */
export const clearCellsIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    {
      d: 'm7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21',
      strokeWidth: 2,
    },
    { d: 'M22 21H7', strokeWidth: 2 },
    { d: 'm5 11 9 9', strokeWidth: 2 },
  ],
};
