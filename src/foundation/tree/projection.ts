/*
 * Tree reorder projection, ported from the dnd-kit sortable tree example
 * (apps/stories/stories/react/Sortable/Tree/utilities.ts, MIT, pinned e522d9c6):
 * `getProjection`, `getMaxDepth`, `getMinDepth` and `getDragDepth`, generalized to item ids.
 */
import type { TreeModel } from './model.js';

export interface ProjectedRow {
  id: string;
  /** Zero-based depth. */
  depth: number;
  parentId: string | null;
}

export interface TreeProjection {
  depth: number;
  minDepth: number;
  maxDepth: number;
  parentId: string | null;
}

export interface TreeMove {
  itemId: string;
  fromParentId: string | null;
  fromIndex: number;
  toParentId: string | null;
  toIndex: number;
}

/** Depth steps covered by an inline offset; mirrored for right-to-left. */
export function dragDepth(offset: number, indentation: number, rtl = false): number {
  if (!(indentation > 0)) return 0;
  return Math.round((rtl ? -offset : offset) / indentation);
}

/**
 * Projection of the source row at `index` in the sorted rows (its descendants removed): the
 * requested depth clamped between the next row's depth and one more than the previous row's.
 */
export function projectDepth(
  rows: readonly ProjectedRow[],
  index: number,
  requestedDepth: number,
): TreeProjection {
  const previous = rows[index - 1];
  const next = rows[index + 1];
  const maxDepth = previous ? previous.depth + 1 : 0;
  const minDepth = next ? Math.min(next.depth, maxDepth) : 0;
  const depth = Math.min(maxDepth, Math.max(minDepth, requestedDepth));
  return { depth, minDepth, maxDepth, parentId: projectedParent(rows, index, depth) };
}

function projectedParent(
  rows: readonly ProjectedRow[],
  index: number,
  depth: number,
): string | null {
  const previous = rows[index - 1];
  if (depth === 0 || !previous) return null;
  if (depth === previous.depth) return previous.parentId;
  if (depth > previous.depth) return previous.id;
  for (let cursor = index - 1; cursor >= 0; cursor--)
    if (rows[cursor]!.depth === depth) return rows[cursor]!.parentId;
  return null;
}

/** The resulting move: the target index counts the new parent's children before the source. */
export function resolveMove(
  model: TreeModel<unknown>,
  rows: readonly ProjectedRow[],
  index: number,
  parentId: string | null,
): TreeMove | null {
  const source = rows[index];
  const node = source && model.get(source.id);
  if (!source || !node) return null;
  let toIndex = 0;
  let shown = 0;
  for (let cursor = 0; cursor < rows.length; cursor++) {
    const row = rows[cursor]!;
    if (row.parentId !== parentId || row.id === source.id) continue;
    shown += 1;
    if (cursor < index) toIndex += 1;
  }
  // A collapsed parent shows none of its children: the source is appended to them.
  if (parentId !== null && !shown) {
    const children = model.get(parentId)?.children ?? [];
    toIndex = children.filter((id) => id !== source.id).length;
  }
  return {
    itemId: source.id,
    fromParentId: node.parentId,
    fromIndex: node.index,
    toParentId: parentId,
    toIndex,
  };
}

/** Whether a move changes the tree and lands somewhere structurally valid. */
export function validMove(model: TreeModel<unknown>, move: TreeMove): boolean {
  if (move.toParentId === move.itemId) return false;
  if (move.toParentId !== null) {
    const parent = model.get(move.toParentId);
    if (!parent || model.isDescendant(move.toParentId, move.itemId)) return false;
    // Children that are not loaded yet cannot be ordered against.
    if (parent.expandable && !parent.loaded) return false;
  }
  const siblings =
    move.toParentId === null ? model.roots : (model.get(move.toParentId)?.children ?? []);
  const limit = siblings.filter((id) => id !== move.itemId).length;
  if (move.toIndex < 0 || move.toIndex > limit) return false;
  return !(move.fromParentId === move.toParentId && move.fromIndex === move.toIndex);
}

/**
 * Applies a move to consumer items, re-creating only the parents whose children change (and
 * their ancestors); untouched items keep their identity.
 */
export function applyMove<T>(
  model: TreeModel<T>,
  move: TreeMove,
  withChildren: (item: T, children: T[]) => T,
): T[] {
  const childIds = (id: string | null): string[] => [
    ...(id === null ? model.roots : (model.get(id)?.children ?? [])),
  ];
  const changed = new Map<string | null, string[]>();
  const from = childIds(move.fromParentId).filter((id) => id !== move.itemId);
  changed.set(move.fromParentId, from);
  const to =
    move.fromParentId === move.toParentId
      ? from
      : childIds(move.toParentId).filter((id) => id !== move.itemId);
  to.splice(Math.min(move.toIndex, to.length), 0, move.itemId);
  changed.set(move.toParentId, to);
  const dirty = new Set<string | null>([move.fromParentId, move.toParentId]);
  for (const parent of [move.fromParentId, move.toParentId])
    if (parent !== null) for (const ancestor of model.ancestors(parent)) dirty.add(ancestor);
  dirty.add(null);

  const build = (id: string): T => {
    const node = model.get(id)!;
    if (!dirty.has(id)) return node.item;
    const children = (changed.get(id) ?? childIds(id)).map(build);
    return withChildren(node.item, children);
  };
  return (changed.get(null) ?? childIds(null)).map(build);
}
