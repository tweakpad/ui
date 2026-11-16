// Where a dragged item lands among the items of a list or a tree, decided once for every
// component that reorders: the item under the pointer (or the nearest one across a gap), the side
// of it the pointer is on (or inside it, for an item that takes children), and the line that
// marks the place between two items. Coordinates are along the axis the items follow.

/** Where a dragged item lands against the item under the pointer. */
export type LandingSide = 'before' | 'into' | 'after';

/** An item's extent along the axis the items follow. */
export interface LandingBox {
  readonly start: number;
  readonly end: number;
}

/**
 * The side of `box` that `at` lands on: its halves, or for an item that takes the dragged item
 * as a child (`into`), its first quarter, middle half and last quarter. `reversed` flips the axis,
 * for a right-to-left row of items measured left to right.
 */
export function landingSide(
  box: LandingBox,
  at: number,
  options: { readonly into?: boolean; readonly reversed?: boolean } = {},
): LandingSide {
  const extent = box.end - box.start;
  const along = extent > 0 ? (at - box.start) / extent : 0.5;
  const fraction = options.reversed ? 1 - along : along;
  if (!options.into) return fraction < 0.5 ? 'before' : 'after';
  return fraction < 0.25 ? 'before' : fraction >= 0.75 ? 'after' : 'into';
}

/** The entry whose box contains `at`, else the one whose center is nearest it; null when none. */
export function landingTarget<T extends { readonly box: LandingBox }>(
  entries: Iterable<T>,
  at: number,
): T | null {
  let nearest: T | null = null;
  let distance = Number.POSITIVE_INFINITY;
  for (const entry of entries) {
    const { start, end } = entry.box;
    if (at >= start && at < end) return entry;
    const away = Math.abs(at - (start + end) / 2);
    if (away < distance) {
      distance = away;
      nearest = entry;
    }
  }
  return nearest;
}

/**
 * Where the line that marks a landing place goes: halfway across the gap between the item before
 * it and the item after it, or `gap` / 2 beyond the only one. `direction` is -1 along an axis
 * measured against the items' order (a right-to-left row measured left to right).
 */
export function landingLine(
  before: LandingBox | null,
  after: LandingBox | null,
  gap = 0,
  direction: 1 | -1 = 1,
): number | null {
  if (before && after) return (before.end + after.start) / 2;
  if (before) return before.end + (direction * gap) / 2;
  if (after) return after.start - (direction * gap) / 2;
  return null;
}
