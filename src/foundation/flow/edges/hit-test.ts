import { rectContainsPoint } from '../geometry.js';
import type { FlowPoint } from '../types.js';
import { pathPolyline, type FlowEdgePath } from './paths.js';

/** Distance-to-polyline hit testing for edges; tolerances are screen pixels divided by the zoom. */
export interface FlowSegmentHit {
  distance: number;
  /** Nearest point on the polyline. */
  point: FlowPoint;
  /** Segment index (`points[segment]` → `points[segment + 1]`). */
  segment: number;
  /** Parameter along that segment in 0–1. */
  t: number;
}

export interface FlowPathHit extends FlowSegmentHit {
  hit: boolean;
}

export function closestPointOnSegment(
  point: FlowPoint,
  a: FlowPoint,
  b: FlowPoint,
): { point: FlowPoint; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { point: { x: a.x, y: a.y }, t: 0 };
  const t = Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0), 1);
  return { point: { x: a.x + dx * t, y: a.y + dy * t }, t };
}

export function distanceToSegment(point: FlowPoint, a: FlowPoint, b: FlowPoint): number {
  const closest = closestPointOnSegment(point, a, b).point;
  return Math.hypot(point.x - closest.x, point.y - closest.y);
}

export function distanceToPolyline(point: FlowPoint, points: readonly FlowPoint[]): FlowSegmentHit {
  if (points.length === 0) return { distance: Infinity, point: { ...point }, segment: 0, t: 0 };
  if (points.length === 1) {
    const only = points[0]!;
    return {
      distance: Math.hypot(point.x - only.x, point.y - only.y),
      point: { x: only.x, y: only.y },
      segment: 0,
      t: 0,
    };
  }
  let best: FlowSegmentHit = { distance: Infinity, point: { ...point }, segment: 0, t: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const closest = closestPointOnSegment(point, points[index - 1]!, points[index]!);
    const distance = Math.hypot(point.x - closest.point.x, point.y - closest.point.y);
    if (distance < best.distance)
      best = { distance, point: closest.point, segment: index - 1, t: closest.t };
  }
  return best;
}

/** Whether `point` lies within `tolerance / zoom` of the path (bbox pre-check first). */
export function hitTestPath(
  path: FlowEdgePath,
  point: FlowPoint,
  tolerance: number,
  zoom = 1,
): FlowPathHit {
  const reach = tolerance / Math.max(zoom, 1e-6);
  const bbox = path.bbox;
  const padded = {
    x: bbox.x - reach,
    y: bbox.y - reach,
    width: bbox.width + reach * 2,
    height: bbox.height + reach * 2,
  };
  if (!rectContainsPoint(padded, point))
    return { hit: false, distance: Infinity, point: { ...point }, segment: 0, t: 0 };
  const nearest = distanceToPolyline(point, pathPolyline(path));
  return { ...nearest, hit: nearest.distance <= reach };
}

/** The nearest hit among several paths, or `undefined` when none is within reach. */
export function hitTestPaths<Id>(
  paths: Iterable<readonly [Id, FlowEdgePath]>,
  point: FlowPoint,
  tolerance: number,
  zoom = 1,
): (FlowPathHit & { id: Id }) | undefined {
  let best: (FlowPathHit & { id: Id }) | undefined;
  for (const [id, path] of paths) {
    const hit = hitTestPath(path, point, tolerance, zoom);
    if (!hit.hit) continue;
    if (!best || hit.distance < best.distance) best = { ...hit, id };
  }
  return best;
}
