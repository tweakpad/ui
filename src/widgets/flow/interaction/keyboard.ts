import type { FlowModel } from '../../../foundation/flow/model/model.js';

export type FlowArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

/**
 * Spatial focus traversal (Widgets §6.3 Accessibility): the node whose center lies in the
 * arrow's half-plane and is nearest to the focused node's center, document order breaking ties.
 * Returns undefined when nothing lies in that direction.
 */
export function nextNodeInDirection(
  model: FlowModel,
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
  { action: 'delete', keys: 'Delete, Backspace', description: 'Delete the selection' },
  { action: 'undo', keys: 'Mod+Z', description: 'Undo' },
  { action: 'redo', keys: 'Mod+Shift+Z', description: 'Redo' },
  { action: 'copy', keys: 'Mod+C', description: 'Copy the selection' },
  { action: 'cut', keys: 'Mod+X', description: 'Cut the selection' },
  { action: 'paste', keys: 'Mod+V', description: 'Paste' },
  { action: 'duplicate', keys: 'Mod+D', description: 'Duplicate the selection' },
  { action: 'select-all', keys: 'Mod+A', description: 'Select everything' },
  { action: 'zoom-in', keys: '+, =', description: 'Zoom in' },
  { action: 'zoom-out', keys: '-', description: 'Zoom out' },
  { action: 'fit', keys: '0', description: 'Fit the graph' },
  { action: 'zoom-reset', keys: '1', description: 'Zoom to 100%' },
  { action: 'tool-select', keys: 'V', description: 'Select tool' },
  { action: 'tool-pan', keys: 'H', description: 'Pan tool' },
  { action: 'edges', keys: 'E', description: 'Cycle the focused node’s edges' },
  { action: 'context-menu', keys: 'Shift+F10, ContextMenu', description: 'Open the context menu' },
];
