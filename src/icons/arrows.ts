import type { IconDefinition } from './types.js';

/** Arrow up. */
export const arrowUpIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm5 12 7-7 7 7', strokeWidth: 2 },
    { d: 'M12 19V5', strokeWidth: 2 },
  ],
};

/** Arrow down. */
export const arrowDownIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M12 5v14', strokeWidth: 2 },
    { d: 'm19 12-7 7-7-7', strokeWidth: 2 },
  ],
};

/** Arrow left. */
export const arrowLeftIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'm12 19-7-7 7-7', strokeWidth: 2 },
    { d: 'M19 12H5', strokeWidth: 2 },
  ],
};

/** Arrow right. */
export const arrowRightIcon: IconDefinition = {
  viewBox: '0 0 24 24',
  paths: [
    { d: 'M5 12h14', strokeWidth: 2 },
    { d: 'm12 5 7 7-7 7', strokeWidth: 2 },
  ],
};
