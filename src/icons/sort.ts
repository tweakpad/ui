import type { IconDefinition } from './types.js';

// Sort marks of one chevron size: two stacked chevrons for an unsorted column, and a single
// chevron, centered vertically, for an ascending or a descending sort.

/** Sortable, not sorted: an upper and a lower chevron. */
export const sortIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm7 10 5-5 5 5', strokeWidth: 2 },
    { d: 'm7 14 5 5 5-5', strokeWidth: 2 },
  ],
};

/** Sorted ascending: one chevron pointing up, centered. */
export const sortAscendingIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'm7 14.5 5-5 5 5', strokeWidth: 2 }],
};

/** Sorted descending: one chevron pointing down, centered. */
export const sortDescendingIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'm7 9.5 5 5 5-5', strokeWidth: 2 }],
};
