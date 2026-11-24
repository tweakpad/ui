import type { FlowGraphView } from '../../../foundation/flow/groups/view.js';
import {
  COLLAPSE_KEYS,
  COPY_KEYS,
  CUT_KEYS,
  DELETE_KEYS,
  DUPLICATE_KEYS,
  ENTER_GROUP_KEYS,
  EXIT_GROUP_KEYS,
  GROUP_KEYS,
  PASTE_KEYS,
  SELECT_ALL_KEYS,
  UNGROUP_KEYS,
  ZOOM_FIT_KEYS,
  ZOOM_OUT_KEYS,
  ZOOM_RESET_KEYS,
} from '../shortcuts.js';

export type FlowArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * Spatial focus traversal (Widgets §6.3 Accessibility): the node whose center lies in the
 * arrow's half-plane and is nearest to the focused node's center, document order breaking ties.
 * Returns undefined when nothing lies in that direction.
 */
export function nextNodeInDirection(
  model: FlowGraphView,
  fromId: string,
  key: FlowArrowKey,
): string | undefined {
  const origin = model.nodeRect(fromId);
  if (!origin) return undefined;
  const cx = origin.x + origin.width / 2;
  const cy = origin.y + origin.height / 2;
  let best: { id: string; score: number } | undefined;
  for (const node of model.nodes) {
    if (node.id === fromId || node.hidden) continue;
    const rect = model.nodeRect(node.id);
    if (!rect) continue;
    const dx = rect.x + rect.width / 2 - cx;
    const dy = rect.y + rect.height / 2 - cy;
    const forward =
      key === 'ArrowRight' ? dx : key === 'ArrowLeft' ? -dx : key === 'ArrowDown' ? dy : -dy;
    if (forward <= 0.5) continue;
    // Prefer nodes close to the axis of travel: lateral drift weighs more than distance ahead.
    const lateral = key === 'ArrowRight' || key === 'ArrowLeft' ? Math.abs(dy) : Math.abs(dx);
    const score = forward + lateral * 2;
    if (!best || score < best.score) best = { id: node.id, score };
  }
  return best?.id;
}

export interface FlowShortcutRow {
  action: string;
  keys: string;
  description: string;
}

/** The documented shortcut table (docs Keyboard section renders it through `tp-kbd`). */
export const FLOW_SHORTCUTS: readonly FlowShortcutRow[] = [
  {
    action: 'focus-next',
    keys: 'ArrowRight, ArrowLeft, ArrowUp, ArrowDown',
    description: 'Move focus between nodes',
  },
  { action: 'focus-first', keys: 'Home', description: 'Focus the first node' },
  { action: 'focus-last', keys: 'End', description: 'Focus the last node' },
  {
    action: 'nudge',
    keys: 'Shift+ArrowRight, Shift+ArrowLeft, Shift+ArrowUp, Shift+ArrowDown',
    description: 'Nudge the selection by one grid step',
  },
  {
    action: 'nudge-large',
    keys: 'Mod+Shift+ArrowRight, Mod+Shift+ArrowLeft, Mod+Shift+ArrowUp, Mod+Shift+ArrowDown',
    description: 'Nudge the selection by four grid steps',
  },
  {
    action: 'enter',
    keys: 'Enter',
    description: 'Enter the focused node, start or confirm a connection',
  },
  {
    action: 'toggle-select',
    keys: 'Space',
    description: 'Toggle the focused node in the selection',
  },
  {
    action: 'escape',
    keys: 'Escape',
    description: 'Cancel the gesture, leave the node or clear the selection',
  },
  { action: 'enter-group', keys: ENTER_GROUP_KEYS, description: 'Open the focused group' },
  {
    action: 'exit-group',
    keys: EXIT_GROUP_KEYS,
    description: 'Return to the view the current group sits in',
  },
  { action: 'group', keys: GROUP_KEYS, description: 'Group the selection' },
  { action: 'ungroup', keys: UNGROUP_KEYS, description: 'Ungroup the selected group' },
  { action: 'collapse', keys: COLLAPSE_KEYS, description: 'Collapse or expand the focused group' },
  { action: 'delete', keys: DELETE_KEYS.join(', '), description: 'Delete the selection' },
  { action: 'undo', keys: 'Mod+Z', description: 'Undo' },
  { action: 'redo', keys: 'Mod+Shift+Z', description: 'Redo' },
  { action: 'copy', keys: COPY_KEYS, description: 'Copy the selection' },
  { action: 'cut', keys: CUT_KEYS, description: 'Cut the selection' },
  { action: 'paste', keys: PASTE_KEYS, description: 'Paste' },
  { action: 'duplicate', keys: DUPLICATE_KEYS, description: 'Duplicate the selection' },
  { action: 'select-all', keys: SELECT_ALL_KEYS, description: 'Select everything' },
  { action: 'zoom-in', keys: '+, =', description: 'Zoom in' },
  { action: 'zoom-out', keys: ZOOM_OUT_KEYS, description: 'Zoom out' },
  { action: 'fit', keys: ZOOM_FIT_KEYS, description: 'Fit the graph' },
  { action: 'zoom-reset', keys: ZOOM_RESET_KEYS, description: 'Zoom to 100%' },
  { action: 'tool-select', keys: 'V', description: 'Select tool' },
  { action: 'tool-pan', keys: 'H', description: 'Pan tool' },
  { action: 'edges', keys: 'E', description: 'Cycle the focused node’s edges' },
  { action: 'context-menu', keys: 'Shift+F10, ContextMenu', description: 'Open the context menu' },
];
