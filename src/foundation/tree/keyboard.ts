import { arrowKeys } from '../collection.js';
import type { Direction } from '../types.js';
import type { TreeModel, VisibleRows } from './model.js';

export interface TreeKeyInput {
  key: string;
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

export type TreeKeyAction =
  /** Move focus; `extend` grows the range selection from the anchor (Shift+Arrow). */
  | { type: 'focus'; id: string; extend?: boolean }
  | { type: 'expand'; id: string }
  | { type: 'collapse'; id: string }
  | { type: 'expand-siblings'; id: string }
  | { type: 'activate'; id: string }
  | { type: 'toggle'; id: string }
  | { type: 'select-range'; id: string }
  | { type: 'select-to-edge'; id: string; edge: 'start' | 'end' }
  | { type: 'select-all' };

export interface TreeKeyContext {
  model: TreeModel<unknown>;
  rows: VisibleRows;
  expanded: ReadonlySet<string>;
  focused: string;
  direction: Direction;
  multiple: boolean;
}

/**
 * APG tree keyboard map over the visible rows. Returns null for keys the tree leaves alone
 * (printable characters are typeahead and handled by the caller).
 */
export function treeKeyAction(input: TreeKeyInput, context: TreeKeyContext): TreeKeyAction | null {
  const { model, rows, expanded, focused, multiple } = context;
  const index = rows.indexOf(focused);
  if (index < 0) return null;
  const node = model.get(focused);
  if (!node) return null;
  const command = input.ctrlKey || input.metaKey;
  if (input.altKey) return null;
  const { next: forward, previous: backward } = arrowKeys('horizontal', context.direction);
  switch (input.key) {
    case 'ArrowDown':
    case 'ArrowUp': {
      if (command) return null;
      const next = rows.at(index + (input.key === 'ArrowDown' ? 1 : -1));
      if (next === undefined) return null;
      return { type: 'focus', id: next, extend: multiple && input.shiftKey };
    }
    case forward:
      if (input.shiftKey || command) return null;
      if (!node.expandable) return null;
      if (!expanded.has(focused)) return { type: 'expand', id: focused };
      return node.children.length ? { type: 'focus', id: node.children[0]! } : null;
    case backward:
      if (input.shiftKey || command) return null;
      if (node.expandable && expanded.has(focused)) return { type: 'collapse', id: focused };
      return node.parentId === null ? null : { type: 'focus', id: node.parentId };
    case 'Home':
    case 'End': {
      const edge = input.key === 'Home' ? 'start' : 'end';
      const target = rows.at(edge === 'start' ? 0 : rows.length - 1);
      if (target === undefined) return null;
      if (multiple && command && input.shiftKey)
        return { type: 'select-to-edge', id: target, edge };
      if (command || input.shiftKey) return null;
      return { type: 'focus', id: target };
    }
    case '*':
      return command ? null : { type: 'expand-siblings', id: focused };
    case 'Enter':
      return command || input.shiftKey ? null : { type: 'activate', id: focused };
    case ' ':
      if (command) return null;
      if (input.shiftKey) return multiple ? { type: 'select-range', id: focused } : null;
      return { type: 'toggle', id: focused };
    case 'a':
    case 'A':
      return multiple && command && !input.shiftKey ? { type: 'select-all' } : null;
    default:
      return null;
  }
}

/** A key that types into typeahead: one printable character without command modifiers. */
export function isTypeaheadKey(input: TreeKeyInput): boolean {
  return (
    input.key.length === 1 && input.key !== ' ' && !input.ctrlKey && !input.metaKey && !input.altKey
  );
}
