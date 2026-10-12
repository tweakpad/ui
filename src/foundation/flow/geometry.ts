import type { FlowExtent, FlowPoint, FlowRect, FlowSide, FlowSize } from './types.js';

/**
 * Rect and point math for the flow engine. Pure functions over plain objects; `clamp*`, the
 * bounds union, the overlap area and grid snapping follow xyflow's `utils/general.ts`.
 * Adapted from xyflow packages/system/src/utils/general.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
 */

export const infiniteExtent: FlowExtent = [
  [-Infinity, -Infinity],
  [Infinity, Infinity],
];

export function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

export function rectsIntersect(a: FlowRect, b: FlowRect): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

export function rectContains(outer: FlowRect, inner: FlowRect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectContainsPoint(rect: FlowRect, point: FlowPoint): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function unionRects(rects: readonly FlowRect[]): FlowRect {
  if (rects.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const rect of rects) {
    x1 = Math.min(x1, rect.x);
    y1 = Math.min(y1, rect.y);
    x2 = Math.max(x2, rect.x + rect.width);
    y2 = Math.max(y2, rect.y + rect.height);
  }
  return { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
}

export function expandRect(rect: FlowRect, padding: number): FlowRect {
  return {
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

export function overlapArea(a: FlowRect, b: FlowRect): number {
  const xOverlap = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
  return Math.ceil(xOverlap * yOverlap);
}

export function rectCenter(rect: FlowRect): FlowPoint {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function rectsEqual(a: FlowRect, b: FlowRect, epsilon = 0): boolean {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.width - b.width) <= epsilon &&
    Math.abs(a.height - b.height) <= epsilon
  );
}

export function pointsEqual(a: FlowPoint, b: FlowPoint, epsilon = 0): boolean {
  return Math.abs(a.x - b.x) <= epsilon && Math.abs(a.y - b.y) <= epsilon;
}

export function distance(a: FlowPoint, b: FlowPoint): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Distance from a point to a rect (0 inside). */
export function distanceToRect(point: FlowPoint, rect: FlowRect): number {
  const dx = Math.max(rect.x - point.x, 0, point.x - (rect.x + rect.width));
  const dy = Math.max(rect.y - point.y, 0, point.y - (rect.y + rect.height));
  return Math.hypot(dx, dy);
}

/** Keeps `position` inside `extent` for a box of `size` (xyflow `clampPosition`). */
export function clampPointToExtent(
  position: FlowPoint,
  extent: FlowExtent,
  size: FlowSize = { width: 0, height: 0 },
): FlowPoint {
  return {
    x: clamp(position.x, extent[0][0], extent[1][0] - size.width),
    y: clamp(position.y, extent[0][1], extent[1][1] - size.height),
  };
}

export function rectToExtent(rect: FlowRect): FlowExtent {
  return [
    [rect.x, rect.y],
    [rect.x + rect.width, rect.y + rect.height],
  ];
}

export function snapPoint(point: FlowPoint, grid: readonly [number, number] = [1, 1]): FlowPoint {
  return {
    x: grid[0] > 0 ? Math.round(point.x / grid[0]) * grid[0] : point.x,
    y: grid[1] > 0 ? Math.round(point.y / grid[1]) * grid[1] : point.y,
  };
}

export function sideNormal(side: FlowSide): FlowPoint {
  switch (side) {
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    default:
      return { x: 1, y: 0 };
  }
}

export function oppositeSide(side: FlowSide): FlowSide {
  switch (side) {
    case 'top':
      return 'bottom';
    case 'bottom':
      return 'top';
    case 'left':
      return 'right';
    default:
      return 'left';
  }
}

export function isHorizontalSide(side: FlowSide): boolean {
  return side === 'left' || side === 'right';
}

/** The side of a rect that faces `direction` (largest axis component; ties prefer x). */
export function sideOf(direction: FlowPoint): FlowSide {
  if (Math.abs(direction.x) >= Math.abs(direction.y)) return direction.x >= 0 ? 'right' : 'left';
  return direction.y >= 0 ? 'bottom' : 'top';
}

/** Rounds coordinates for hashing and comparison (1/1000 of a unit). */
export function roundCoord(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** FNV-1a over the rounded rect coordinates; stable across equal rects. */
export function rectHash(rect: FlowRect, seed = 0x811c9dc5): number {
  let hash = seed >>> 0;
  for (const value of [rect.x, rect.y, rect.width, rect.height]) {
    hash = hashNumber(hash, roundCoord(value));
  }
  return hash >>> 0;
}

export function hashNumber(hash: number, value: number): number {
  const text = String(value);
  let result = hash >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}

export function hashString(hash: number, text: string): number {
  let result = hash >>> 0;
  for (let index = 0; index < text.length; index += 1) {
    result ^= text.charCodeAt(index);
    result = Math.imul(result, 0x01000193);
  }
  return result >>> 0;
}
