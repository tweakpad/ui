import { SpatialIndex, type SpatialIndexOptions } from '../spatial-index.js';
import type { FlowPoint, FlowRect } from '../types.js';

/** An axis-aligned segment of a routed edge; coordinates are normalized so `x1 ≤ x2`, `y1 ≤ y2`. */
export interface RouteSegment {
  edgeId: string;
  index: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  horizontal: boolean;
}

const EPSILON = 1e-6;
const KEY_SEPARATOR = '\u0000';

/**
 * Spatial index over the axis-aligned segments of routed edges. Routers read it for crossing
 * and colinear-overlap costs; the planner keeps it in sync with the raw (pre-nudge) routes.
 */
export class SegmentIndex {
  readonly #index: SpatialIndex;
  readonly #segments = new Map<string, RouteSegment[]>();
  readonly #byKey = new Map<string, RouteSegment>();

  constructor(options: SpatialIndexOptions = {}) {
    this.#index = new SpatialIndex(options);
  }

  /** Number of indexed edges. */
  get size(): number {
    return this.#segments.size;
  }

  has(edgeId: string): boolean {
    return this.#segments.has(edgeId);
  }

  segmentsOf(edgeId: string): readonly RouteSegment[] {
    return this.#segments.get(edgeId) ?? [];
  }

  /** Replaces the segments of `edgeId` with the axis-aligned runs of `points`. */
  set(edgeId: string, points: readonly FlowPoint[]): void {
    this.remove(edgeId);
    const segments: RouteSegment[] = [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const a = points[index]!;
      const b = points[index + 1]!;
      const horizontal = Math.abs(a.y - b.y) <= EPSILON;
      const vertical = Math.abs(a.x - b.x) <= EPSILON;
      if (!horizontal && !vertical) continue;
      if (horizontal && vertical) continue;
      const segment: RouteSegment = {
        edgeId,
        index,
        x1: Math.min(a.x, b.x),
        y1: Math.min(a.y, b.y),
        x2: Math.max(a.x, b.x),
        y2: Math.max(a.y, b.y),
        horizontal,
      };
      segments.push(segment);
      const key = edgeId + KEY_SEPARATOR + index;
      this.#byKey.set(key, segment);
      this.#index.insert(key, {
        x: segment.x1 - 0.5,
        y: segment.y1 - 0.5,
        width: segment.x2 - segment.x1 + 1,
        height: segment.y2 - segment.y1 + 1,
      });
    }
    this.#segments.set(edgeId, segments);
  }

  remove(edgeId: string): boolean {
    const segments = this.#segments.get(edgeId);
    if (!segments) return false;
    for (const segment of segments) {
      const key = edgeId + KEY_SEPARATOR + segment.index;
      this.#byKey.delete(key);
      this.#index.remove(key);
    }
    this.#segments.delete(edgeId);
    return true;
  }

  clear(): void {
    this.#segments.clear();
    this.#byKey.clear();
    this.#index.clear();
  }

  /** Segments whose bounds touch `rect`, in edge/index order unless `sorted` is false. */
  query(rect: FlowRect, exclude?: string, sorted = true): RouteSegment[] {
    const result: RouteSegment[] = [];
    for (const key of this.#index.queryRect(rect)) {
      const segment = this.#byKey.get(key)!;
      if (exclude !== undefined && segment.edgeId === exclude) continue;
      if (
        segment.x2 < rect.x - EPSILON ||
        segment.x1 > rect.x + rect.width + EPSILON ||
        segment.y2 < rect.y - EPSILON ||
        segment.y1 > rect.y + rect.height + EPSILON
      )
        continue;
      result.push(segment);
    }
    if (sorted) result.sort(compareSegments);
    return result;
  }

  /** Perpendicular segments of other edges crossing the open interior of `a → b`. */
  crossings(a: FlowPoint, b: FlowPoint, exclude?: string): number {
    const horizontal = Math.abs(a.y - b.y) <= EPSILON;
    let count = 0;
    for (const segment of this.query(boundsOf(a, b), exclude)) {
      if (segment.horizontal === horizontal) continue;
      if (horizontal) {
        const x1 = Math.min(a.x, b.x);
        const x2 = Math.max(a.x, b.x);
        if (
          segment.x1 > x1 + EPSILON &&
          segment.x1 < x2 - EPSILON &&
          segment.y1 < a.y - EPSILON &&
          segment.y2 > a.y + EPSILON
        )
          count += 1;
      } else {
        const y1 = Math.min(a.y, b.y);
        const y2 = Math.max(a.y, b.y);
        if (
          segment.y1 > y1 + EPSILON &&
          segment.y1 < y2 - EPSILON &&
          segment.x1 < a.x - EPSILON &&
          segment.x2 > a.x + EPSILON
        )
          count += 1;
      }
    }
    return count;
  }

  /** Colinear segments of other edges sharing more than a point with `a → b`. */
  overlaps(a: FlowPoint, b: FlowPoint, exclude?: string): number {
    const horizontal = Math.abs(a.y - b.y) <= EPSILON;
    let count = 0;
    for (const segment of this.query(boundsOf(a, b), exclude)) {
      if (segment.horizontal !== horizontal) continue;
      if (horizontal) {
        if (Math.abs(segment.y1 - a.y) > EPSILON) continue;
        const x1 = Math.min(a.x, b.x);
        const x2 = Math.max(a.x, b.x);
        if (Math.min(x2, segment.x2) - Math.max(x1, segment.x1) > EPSILON) count += 1;
      } else {
        if (Math.abs(segment.x1 - a.x) > EPSILON) continue;
        const y1 = Math.min(a.y, b.y);
        const y2 = Math.max(a.y, b.y);
        if (Math.min(y2, segment.y2) - Math.max(y1, segment.y1) > EPSILON) count += 1;
      }
    }
    return count;
  }
}

function boundsOf(a: FlowPoint, b: FlowPoint): FlowRect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) };
}

function compareSegments(a: RouteSegment, b: RouteSegment): number {
  if (a.edgeId !== b.edgeId) return a.edgeId < b.edgeId ? -1 : 1;
  return a.index - b.index;
}
