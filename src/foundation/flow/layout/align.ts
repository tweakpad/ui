import type { FlowPoint, FlowRect } from '../types.js';

export interface AlignItem {
  id: string;
  rect: FlowRect;
}

export type AlignMode = 'left' | 'center-x' | 'right' | 'top' | 'center-y' | 'bottom';

export interface MovedItem {
  id: string;
  position: FlowPoint;
}

const THRESHOLD = 0.5;

function moved(items: readonly AlignItem[], target: (item: AlignItem) => FlowPoint): MovedItem[] {
  const result: MovedItem[] = [];
  for (const item of items) {
    const position = target(item);
    if (
      Math.abs(position.x - item.rect.x) > THRESHOLD ||
      Math.abs(position.y - item.rect.y) > THRESHOLD
    )
      result.push({ id: item.id, position });
  }
  return result;
}

/** Aligns items to the selection's edge or centre; returns only the items that move. */
export function alignNodes(items: readonly AlignItem[], mode: AlignMode): MovedItem[] {
  if (items.length < 2) return [];
  const minX = Math.min(...items.map((item) => item.rect.x));
  const maxX = Math.max(...items.map((item) => item.rect.x + item.rect.width));
  const minY = Math.min(...items.map((item) => item.rect.y));
  const maxY = Math.max(...items.map((item) => item.rect.y + item.rect.height));
  return moved(items, ({ rect }) => {
    switch (mode) {
      case 'left':
        return { x: minX, y: rect.y };
      case 'center-x':
        return { x: (minX + maxX) / 2 - rect.width / 2, y: rect.y };
      case 'right':
        return { x: maxX - rect.width, y: rect.y };
      case 'top':
        return { x: rect.x, y: minY };
      case 'center-y':
        return { x: rect.x, y: (minY + maxY) / 2 - rect.height / 2 };
      default:
        return { x: rect.x, y: maxY - rect.height };
    }
  });
}

/**
 * Distributes items along an axis in their current order: `even` spreads the gaps evenly
 * between the first and last item (which stay), a number sets every gap.
 */
export function distributeNodes(
  items: readonly AlignItem[],
  axis: 'x' | 'y',
  spacing: number | 'even',
): MovedItem[] {
  if (items.length < 3 && spacing === 'even') return [];
  if (items.length < 2) return [];
  const size = axis === 'x' ? 'width' : 'height';
  const sorted = [...items].sort((a, b) => a.rect[axis] - b.rect[axis] || (a.id < b.id ? -1 : 1));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  let gap: number;
  if (spacing === 'even') {
    const total = last.rect[axis] + last.rect[size] - first.rect[axis];
    const occupied = sorted.reduce((sum, item) => sum + item.rect[size], 0);
    gap = (total - occupied) / (sorted.length - 1);
  } else gap = spacing;
  const targets = new Map<string, number>();
  let cursor = first.rect[axis];
  for (const item of sorted) {
    targets.set(item.id, cursor);
    cursor += item.rect[size] + gap;
  }
  return moved(items, ({ id, rect }) =>
    axis === 'x' ? { x: targets.get(id)!, y: rect.y } : { x: rect.x, y: targets.get(id)! },
  );
}

export function snapNodesToGrid(
  items: readonly AlignItem[],
  grid: readonly [number, number],
): MovedItem[] {
  const [gx, gy] = grid;
  return moved(items, ({ rect }) => ({
    x: gx > 0 ? Math.round(rect.x / gx) * gx : rect.x,
    y: gy > 0 ? Math.round(rect.y / gy) * gy : rect.y,
  }));
}
