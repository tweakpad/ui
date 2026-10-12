import type { FlowPoint } from '../../../foundation/flow/types.js';

/** Arc-length parameter (0..1) of the point on the polyline nearest to `point`. */
export function projectOntoPolyline(points: readonly FlowPoint[], point: FlowPoint): number {
  if (points.length < 2) return 0;
  const lengths: number[] = [];
  let total = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    lengths.push(length);
    total += length;
  }
  if (total === 0) return 0;
  let best = { distance: Infinity, at: 0 };
  let before = 0;
  for (let index = 0; index + 1 < points.length; index += 1) {
    const a = points[index]!;
    const b = points[index + 1]!;
    const length = lengths[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const t =
      length === 0
        ? 0
        : Math.max(
            0,
            Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (length * length)),
          );
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const distance = Math.hypot(point.x - px, point.y - py);
    if (distance < best.distance) best = { distance, at: (before + length * t) / total };
    before += length;
  }
  return best.at;
}

/**
 * Index at which a new waypoint at `point` keeps the existing waypoints ordered along the
 * rendered path (Widgets §6.3 Keyboard and pointer: waypoints).
 */
export function waypointInsertIndex(
  pathPoints: readonly FlowPoint[],
  waypoints: readonly FlowPoint[],
  point: FlowPoint,
): number {
  const at = projectOntoPolyline(pathPoints, point);
  let index = 0;
  for (const waypoint of waypoints)
    if (projectOntoPolyline(pathPoints, waypoint) < at) index += 1;
    else break;
  return index;
}

export function insertWaypoint(
  pathPoints: readonly FlowPoint[],
  waypoints: readonly FlowPoint[],
  point: FlowPoint,
): FlowPoint[] {
  const index = waypointInsertIndex(pathPoints, waypoints, point);
  return [...waypoints.slice(0, index), { x: point.x, y: point.y }, ...waypoints.slice(index)];
}
