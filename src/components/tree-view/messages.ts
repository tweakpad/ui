import type { TreeViewMessages } from './types.js';

const where = (level: number, parent: string | null, root: string): string =>
  `level ${level}, ${parent ? `in ${parent}` : root}`;

export const DEFAULT_TREE_VIEW_MESSAGES: Required<TreeViewMessages> = {
  loading: 'Loading',
  loadError: (label) => `Couldn't load the items of ${label}.`,
  retry: 'Retry',
  moveHandle: (label) => `Move ${label}`,
  pickedUp: (label, level, parent) =>
    `Picked up ${label}, ${where(level, parent, 'at the top level')}.`,
  moved: (label, level, parent, position) =>
    `${label} moved to position ${position}, ${where(level, parent, 'at the top level')}.`,
  dropped: (label, level, parent, position) =>
    `Dropped ${label} at position ${position}, ${where(level, parent, 'at the top level')}.`,
  cancelled: (label, level, parent, position) =>
    `Reordering cancelled. ${label} returned to position ${position}, ${where(level, parent, 'at the top level')}.`,
  instructions:
    'To move this item, press Control+Enter (Command+Enter on Mac). Then use the up and down arrow keys to move it, the left and right arrow keys to change its level, Space or Enter to drop it, and Escape to cancel.',
  rootName: 'tree',
};
