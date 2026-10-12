import type { FlowEdgeLabel, FlowPoint } from '../types.js';
import { longestSegmentCenter, pathPolyline, type FlowEdgePath } from './paths.js';

/**
 * Label placement along a path: parameter `t` over cumulative polyline lengths (bezier kinds
 * flattened), tangent angle for rotation and a normal for `above`/`below` placement.
 */
export interface FlowPathPosition {
  point: FlowPoint;
  /** Tangent angle in degrees, screen orientation (clockwise positive). */
  angle: number;
  /** Index of the polyline segment the point lies on. */
  segment: number;
  /** Parameter in 0–1 over the whole path. */
  t: number;
}

export interface FlowLabelAnchor extends FlowPathPosition {
  /** Unit normal pointing visually up (negative y) from the tangent. */
  normal: FlowPoint;
  align: NonNullable<FlowEdgeLabel['align']>;
  placement: NonNullable<FlowEdgeLabel['placement']>;
}

export interface FlowLabelAnchorOptions {
  /** Distance moved along the normal for `above`/`below` placement (default 0). */
  offset?: number;
  /** Bezier flattening tolerance (default 0.25). */
  tolerance?: number;
}

export function cumulativeLengths(points: readonly FlowPoint[]): number[] {
  const lengths = [0];
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1]!;
    const point = points[index]!;
    lengths.push(lengths[index - 1]! + Math.hypot(point.x - previous.x, point.y - previous.y));
  }
  return lengths;
}

function tangentAngle(a: FlowPoint, b: FlowPoint): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

function polylineOf(
  path: FlowEdgePath | readonly FlowPoint[],
  tolerance: number,
): readonly FlowPoint[] {
  return Array.isArray(path)
    ? (path as readonly FlowPoint[])
    : pathPolyline(path as FlowEdgePath, tolerance);
}

/** The point at parameter `t` (0–1 of the polyline length). */
export function pointAlongPath(
  path: FlowEdgePath | readonly FlowPoint[],
  t: number,
  tolerance = 0.25,
): FlowPathPosition {
  const points = polylineOf(path, tolerance);
  if (points.length === 0) return { point: { x: 0, y: 0 }, angle: 0, segment: 0, t: 0 };
  if (points.length === 1) return { point: { ...points[0]! }, angle: 0, segment: 0, t: 0 };
  const clamped = Math.min(Math.max(t, 0), 1);
  const lengths = cumulativeLengths(points);
  const total = lengths[lengths.length - 1]!;
  if (total === 0) return { point: { ...points[0]! }, angle: 0, segment: 0, t: clamped };
  const target = clamped * total;
  let segment = 1;
  while (segment < lengths.length - 1 && lengths[segment]! < target) segment += 1;
  const a = points[segment - 1]!;
  const b = points[segment]!;
  const span = lengths[segment]! - lengths[segment - 1]!;
  const local = span === 0 ? 0 : (target - lengths[segment - 1]!) / span;
  return {
    point: { x: a.x + (b.x - a.x) * local, y: a.y + (b.y - a.y) * local },
    angle: tangentAngle(a, b),
    segment: segment - 1,
    t: clamped,
  };
}

/** Nearest path position to `point` (used to orient `center` anchors). */
function positionNear(points: readonly FlowPoint[], point: FlowPoint): FlowPathPosition {
  if (points.length < 2) return { point: { ...point }, angle: 0, segment: 0, t: 0 };
  const lengths = cumulativeLengths(points);
  const total = lengths[lengths.length - 1]!;
  let best = { distance: Infinity, segment: 0, local: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const local =
      lengthSquared === 0
        ? 0
        : Math.min(Math.max(((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared, 0), 1);
    const px = a.x + dx * local;
    const py = a.y + dy * local;
    const d = Math.hypot(point.x - px, point.y - py);
    if (d < best.distance) best = { distance: d, segment: index - 1, local };
  }
  const a = points[best.segment]!;
  const b = points[best.segment + 1]!;
  const at =
    lengths[best.segment]! + (lengths[best.segment + 1]! - lengths[best.segment]!) * best.local;
  return {
    point: { ...point },
    angle: tangentAngle(a, b),
    segment: best.segment,
    t: total === 0 ? 0 : at / total,
  };
}

/** Midpoint of the longest segment with its tangent (step and orthogonal kinds). */
export function longestSegmentAnchor(points: readonly FlowPoint[]): FlowPathPosition {
  const center = longestSegmentCenter(points);
  return positionNear(points, center);
}

function upwardNormal(angle: number): FlowPoint {
  const radians = (angle * Math.PI) / 180;
  const normal = { x: -Math.sin(radians), y: Math.cos(radians) };
  if (normal.y > 0 || (normal.y === 0 && normal.x < 0)) return { x: -normal.x, y: -normal.y };
  return normal;
}

/**
 * Anchor for a label: explicit `position` → `t`; else `align` `start`/`end` near the ends; else
 * the path's own center (longest segment for step kinds, bezier midpoint otherwise).
 */
export function labelAnchor(
  path: FlowEdgePath,
  label: FlowEdgeLabel,
  options: FlowLabelAnchorOptions = {},
): FlowLabelAnchor {
  const tolerance = options.tolerance ?? 0.25;
  const align = label.align ?? 'center';
  const placement = label.placement ?? 'on';
  const points = pathPolyline(path, tolerance);
  let position: FlowPathPosition;
  if (label.position !== undefined) position = pointAlongPath(points, label.position);
  else if (align === 'start') position = pointAlongPath(points, 0.2);
  else if (align === 'end') position = pointAlongPath(points, 0.8);
  else position = positionNear(points, path.center);
  const normal = upwardNormal(position.angle);
  const offset = options.offset ?? 0;
  const sign = placement === 'above' ? 1 : placement === 'below' ? -1 : 0;
  return {
    ...position,
    point: {
      x: position.point.x + normal.x * offset * sign,
      y: position.point.y + normal.y * offset * sign,
    },
    normal,
    align,
    placement,
  };
}
