import type { FlowPoint, FlowRect } from '../types.js';
import { IndexHeap } from './heap.js';
import { collectCoordinates, type ObstacleIndex } from './obstacles.js';
import type { SegmentIndex } from './segments.js';

/**
 * Routing grid: the interesting x and y coordinates of a region and, per grid edge, the flags
 * the A* search reads. Vertex `v = iy * cols + ix`; the horizontal edge stored at `v` leads to
 * `v + 1`, the vertical edge stored at `v` leads to `v + cols`. Flags: `blocked` inside an
 * obstacle, `hug` along a padded boundary, `cross`/`overlap` counts of already routed segments.
 */
export interface RoutingGrid {
  xs: number[];
  ys: number[];
  cols: number;
  rows: number;
  vertices: number;
  region: FlowRect;
  blockedH: Uint8Array;
  blockedV: Uint8Array;
  hugH: Uint8Array;
  hugV: Uint8Array;
  crossH: Uint16Array | undefined;
  crossV: Uint16Array | undefined;
  overlapH: Uint16Array | undefined;
  overlapV: Uint16Array | undefined;
  obstacleIds: string[];
}

/** Reusable typed arrays for grids and searches; one live grid per pool. */
export class GridPool {
  blockedH = new Uint8Array(0);
  blockedV = new Uint8Array(0);
  hugH = new Uint8Array(0);
  hugV = new Uint8Array(0);
  crossH = new Uint16Array(0);
  crossV = new Uint16Array(0);
  overlapH = new Uint16Array(0);
  overlapV = new Uint16Array(0);
  g = new Float64Array(0);
  parent = new Int32Array(0);
  stamp = new Int32Array(0);
  generation = 0;
  readonly heap = new IndexHeap(4096);

  ensureVertices(vertices: number): void {
    if (this.blockedH.length >= vertices) return;
    let size = Math.max(256, this.blockedH.length);
    while (size < vertices) size *= 2;
    this.blockedH = new Uint8Array(size);
    this.blockedV = new Uint8Array(size);
    this.hugH = new Uint8Array(size);
    this.hugV = new Uint8Array(size);
    this.crossH = new Uint16Array(size);
    this.crossV = new Uint16Array(size);
    this.overlapH = new Uint16Array(size);
    this.overlapV = new Uint16Array(size);
  }

  ensureStates(states: number): void {
    if (this.g.length < states) {
      let size = Math.max(1024, this.g.length);
      while (size < states) size *= 2;
      this.g = new Float64Array(size);
      this.parent = new Int32Array(size);
      this.stamp = new Int32Array(size);
      this.generation = 0;
    }
    this.heap.ensureCapacity(states);
  }

  /** A fresh generation stamp; stamps are cleared when the counter wraps. */
  nextGeneration(): number {
    this.generation += 1;
    if (this.generation === 0x7fffffff) {
      this.generation = 1;
      this.stamp.fill(0);
    }
    return this.generation;
  }
}

export interface RoutingGridOptions {
  midlines?: boolean;
  /** Coordinate clustering for huge regions (see `collectCoordinates`). */
  quantum?: number;
  segments?: SegmentIndex | undefined;
  /** Edge whose own segments are ignored when counting crossings and overlaps. */
  excludeEdge?: string | undefined;
  pool?: GridPool;
  /** Grids with more vertices are not built (`undefined` is returned). */
  maxVertices?: number;
}

const EPSILON = 1e-6;

/** First index whose value is `≥ value`. */
export function lowerBound(values: readonly number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid]! < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** First index whose value is `> value`. */
export function upperBound(values: readonly number[], value: number): number {
  let low = 0;
  let high = values.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (values[mid]! <= value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** Index of `value` in a sorted coordinate list (within the epsilon), or `-1`. */
export function coordinateIndex(values: readonly number[], value: number): number {
  const at = lowerBound(values, value - EPSILON);
  if (at < values.length && Math.abs(values[at]! - value) <= EPSILON) return at;
  return -1;
}

export function gridVertex(grid: RoutingGrid, point: FlowPoint): number {
  const ix = coordinateIndex(grid.xs, point.x);
  const iy = coordinateIndex(grid.ys, point.y);
  if (ix < 0 || iy < 0) return -1;
  return iy * grid.cols + ix;
}

export function gridPoint(grid: RoutingGrid, vertex: number): FlowPoint {
  return { x: grid.xs[vertex % grid.cols]!, y: grid.ys[Math.floor(vertex / grid.cols)]! };
}

/**
 * Builds the grid of a region: coordinates from the obstacles, the given points and optional
 * midlines; blocked and hug flags per obstacle; crossing and overlap counts from the segment
 * index. Returns `undefined` when the vertex count exceeds `maxVertices`.
 */
export function buildRoutingGrid(
  obstacles: ObstacleIndex,
  region: FlowRect,
  points: readonly FlowPoint[],
  options: RoutingGridOptions = {},
): RoutingGrid | undefined {
  const coordinates = collectCoordinates(obstacles, region, points, {
    midlines: options.midlines ?? true,
    ...(options.quantum !== undefined ? { quantum: options.quantum } : {}),
  });
  const { xs, ys, obstacleIds } = coordinates;
  const cols = xs.length;
  const rows = ys.length;
  const vertices = cols * rows;
  if (options.maxVertices !== undefined && vertices > options.maxVertices) return undefined;
  const pool = options.pool ?? new GridPool();
  pool.ensureVertices(vertices);
  const blockedH = pool.blockedH;
  const blockedV = pool.blockedV;
  const hugH = pool.hugH;
  const hugV = pool.hugV;
  blockedH.fill(0, 0, vertices);
  blockedV.fill(0, 0, vertices);
  hugH.fill(0, 0, vertices);
  hugV.fill(0, 0, vertices);

  // Obstacles are blocked conservatively: the enclosing grid lines (the last line at or before
  // the near edge, the first at or after the far edge) hug, everything between is blocked. With
  // exact coordinates that is the boundary itself; with clustered ones it never under-blocks.
  for (const id of obstacleIds) {
    const rect = obstacles.rectOf(id)!;
    const rx2 = rect.x + rect.width;
    const ry2 = rect.y + rect.height;
    const ix1 = Math.max(0, upperBound(xs, rect.x + EPSILON) - 1);
    const ix2 = Math.min(cols - 1, lowerBound(xs, rx2 - EPSILON));
    const iy1 = Math.max(0, upperBound(ys, rect.y + EPSILON) - 1);
    const iy2 = Math.min(rows - 1, lowerBound(ys, ry2 - EPSILON));
    if (ix1 > ix2 || iy1 > iy2) continue;
    // A clamped line (the region edge inside the obstacle) is interior, not a hug line.
    const nearY = ys[iy1]! <= rect.y + EPSILON;
    const farY = ys[iy2]! >= ry2 - EPSILON;
    const nearX = xs[ix1]! <= rect.x + EPSILON;
    const farX = xs[ix2]! >= rx2 - EPSILON;
    for (let iy = iy1; iy <= iy2; iy += 1) {
      const boundary = (iy === iy1 && nearY) || (iy === iy2 && farY);
      const row = iy * cols;
      for (let ix = ix1; ix < ix2; ix += 1) {
        if (boundary) hugH[row + ix] = 1;
        else blockedH[row + ix] = 1;
      }
    }
    for (let ix = ix1; ix <= ix2; ix += 1) {
      const boundary = (ix === ix1 && nearX) || (ix === ix2 && farX);
      for (let iy = iy1; iy < iy2; iy += 1) {
        if (boundary) hugV[iy * cols + ix] = 1;
        else blockedV[iy * cols + ix] = 1;
      }
    }
  }

  let crossH: Uint16Array | undefined;
  let crossV: Uint16Array | undefined;
  let overlapH: Uint16Array | undefined;
  let overlapV: Uint16Array | undefined;
  const segments = options.segments?.size
    ? options.segments.query(region, options.excludeEdge, false)
    : [];
  if (segments.length > 0) {
    crossH = pool.crossH;
    crossV = pool.crossV;
    overlapH = pool.overlapH;
    overlapV = pool.overlapV;
    crossH.fill(0, 0, vertices);
    crossV.fill(0, 0, vertices);
    overlapH.fill(0, 0, vertices);
    overlapV.fill(0, 0, vertices);
    for (const segment of segments) {
      if (segment.horizontal) {
        // Crosses vertical grid edges whose column lies strictly inside and whose row
        // interval strictly contains the segment's y.
        const iy = strictRow(ys, segment.y1);
        if (iy >= 0) {
          const from = lowerBound(xs, segment.x1 + EPSILON);
          const to = upperBound(xs, segment.x2 - EPSILON) - 1;
          for (let ix = Math.max(from, 0); ix <= Math.min(to, cols - 1); ix += 1)
            crossV[iy * cols + ix] = crossV[iy * cols + ix]! + 1;
        }
        // Overlaps horizontal grid edges on the same row within the span.
        const row = coordinateIndex(ys, segment.y1);
        if (row >= 0) {
          const from = lowerBound(xs, segment.x1 - EPSILON);
          const to = upperBound(xs, segment.x2 + EPSILON) - 1;
          for (let ix = from; ix < to && ix < cols - 1; ix += 1)
            overlapH[row * cols + ix] = overlapH[row * cols + ix]! + 1;
        }
      } else {
        const ix = strictRow(xs, segment.x1);
        if (ix >= 0) {
          const from = lowerBound(ys, segment.y1 + EPSILON);
          const to = upperBound(ys, segment.y2 - EPSILON) - 1;
          for (let iy = Math.max(from, 0); iy <= Math.min(to, rows - 1); iy += 1)
            crossH[iy * cols + ix] = crossH[iy * cols + ix]! + 1;
        }
        const col = coordinateIndex(xs, segment.x1);
        if (col >= 0) {
          const from = lowerBound(ys, segment.y1 - EPSILON);
          const to = upperBound(ys, segment.y2 + EPSILON) - 1;
          for (let iy = from; iy < to && iy < rows - 1; iy += 1)
            overlapV[iy * cols + col] = overlapV[iy * cols + col]! + 1;
        }
      }
    }
  }

  return {
    xs,
    ys,
    cols,
    rows,
    vertices,
    region,
    blockedH,
    blockedV,
    hugH,
    hugV,
    crossH,
    crossV,
    overlapH,
    overlapV,
    obstacleIds,
  };
}

/** The grid interval `[i, i + 1]` that strictly contains `value`, or `-1` when on a line. */
function strictRow(values: readonly number[], value: number): number {
  const at = lowerBound(values, value - EPSILON);
  if (at < values.length && Math.abs(values[at]! - value) <= EPSILON) return -1;
  if (at === 0 || at >= values.length) return -1;
  return at - 1;
}
