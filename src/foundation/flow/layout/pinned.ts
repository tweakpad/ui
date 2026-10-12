import { rectsIntersect } from '../geometry.js';
import type { FlowLayoutDirection, FlowPoint, FlowRect } from '../types.js';
import type { FlowLayoutNode } from './types.js';

export function partitionPinned<T extends Pick<FlowLayoutNode, 'pinned'>>(
  nodes: readonly T[],
): { pinned: T[]; free: T[] } {
  const pinned: T[] = [];
  const free: T[] = [];
  for (const node of nodes) (node.pinned ? pinned : free).push(node);
  return { pinned, free };
}

/**
 * Flows a laid-out block around pinned rects: starting at `anchor`, the block slides along
 * the main axis past every pinned rect it overlaps (by `spacing`) until it is clear.
 * Deterministic and bounded by the number of pinned rects.
 */
export function placeAroundPinned(
  block: { width: number; height: number },
  anchor: FlowPoint,
  pinned: readonly FlowRect[],
  direction: FlowLayoutDirection,
  spacing: number,
): FlowPoint {
  let x = anchor.x;
  let y = anchor.y;
  if (block.width <= 0 || block.height <= 0 || pinned.length === 0) return { x, y };
  for (let guard = 0; guard <= pinned.length; guard += 1) {
    const rect = { x, y, width: block.width, height: block.height };
    let moved = false;
    for (const other of pinned) {
      if (!rectsIntersect(rect, other)) continue;
      if (direction === 'horizontal') x = other.x + other.width + spacing;
      else y = other.y + other.height + spacing;
      moved = true;
      break;
    }
    if (!moved) break;
  }
  return { x, y };
}
