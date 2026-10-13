// Adapted from xyflow packages/system/src/utils/edges/bezier-edge.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/edges/straight-edge.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/edges/smoothstep-edge.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/utils/edges/general.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
import { distance, sideNormal } from '../geometry.js';
import type { FlowEdgeKind, FlowEdgeKindOptions, FlowPoint, FlowRect, FlowSide } from '../types.js';

/**
 * Edge path geometry. Every kind resolves to the same record: the control polygon (`points`:
 * `[p0, c1, c2, p1]` for bezier, a polyline otherwise), the SVG `d`, the bounding box, the
 * label `center` and the polyline `length`. Rendering and hit testing read the record; routers
 * produce the orthogonal polylines that `orthogonalPath` turns into rounded paths.
 */
export interface FlowEdgePath {
  kind: FlowEdgeKind;
  points: FlowPoint[];
  d: string;
  bbox: FlowRect;
  center: FlowPoint;
  length: number;
}

export interface FlowPathEndpoint {
  point: FlowPoint;
  side: FlowSide;
}

const EMPTY_RECT: FlowRect = { x: 0, y: 0, width: 0, height: 0 };

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 1000) / 1000);
}

export function polylineLength(points: readonly FlowPoint[]): number {
  let length = 0;
  for (let index = 1; index < points.length; index += 1)
    length += distance(points[index - 1]!, points[index]!);
  return length;
}

/** Axis-aligned bounds of `points`, grown by `padding` on every side. */
export function pathBounds(points: readonly FlowPoint[], padding = 0): FlowRect {
  if (points.length === 0) return { ...EMPTY_RECT };
  let x1 = Infinity;
  let y1 = Infinity;
  let x2 = -Infinity;
  let y2 = -Infinity;
  for (const point of points) {
    if (point.x < x1) x1 = point.x;
    if (point.y < y1) y1 = point.y;
    if (point.x > x2) x2 = point.x;
    if (point.y > y2) y2 = point.y;
  }
  return {
    x: x1 - padding,
    y: y1 - padding,
    width: x2 - x1 + padding * 2,
    height: y2 - y1 + padding * 2,
  };
}

function flatEnough(
  p0: FlowPoint,
  c1: FlowPoint,
  c2: FlowPoint,
  p1: FlowPoint,
  tolerance: number,
): boolean {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return distance(p0, c1) <= tolerance && distance(p0, c2) <= tolerance;
  const d1 = Math.abs((c1.x - p0.x) * dy - (c1.y - p0.y) * dx) / length;
  const d2 = Math.abs((c2.x - p0.x) * dy - (c2.y - p0.y) * dx) / length;
  return d1 <= tolerance && d2 <= tolerance;
}

function midpoint(a: FlowPoint, b: FlowPoint): FlowPoint {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function subdivide(
  p0: FlowPoint,
  c1: FlowPoint,
  c2: FlowPoint,
  p1: FlowPoint,
  tolerance: number,
  depth: number,
  out: FlowPoint[],
): void {
  if (depth >= 16 || flatEnough(p0, c1, c2, p1, tolerance)) {
    out.push(p1);
    return;
  }
  const p01 = midpoint(p0, c1);
  const p12 = midpoint(c1, c2);
  const p23 = midpoint(c2, p1);
  const p012 = midpoint(p01, p12);
  const p123 = midpoint(p12, p23);
  const mid = midpoint(p012, p123);
  subdivide(p0, p01, p012, mid, tolerance, depth + 1, out);
  subdivide(mid, p123, p23, p1, tolerance, depth + 1, out);
}

/**
 * Flattens a cubic `[p0, c1, c2, p1]`, or a chain of cubics sharing their ends
 * (`[p0, c1, c2, p1, c1', c2', p2, …]`), by de Casteljau subdivision; other arrays are returned
 * as copies.
 */
export function flattenBezier(points: readonly FlowPoint[], tolerance = 0.25): FlowPoint[] {
  if (points.length < 4 || (points.length - 1) % 3 !== 0)
    return points.map((point) => ({ x: point.x, y: point.y }));
  const out: FlowPoint[] = [{ x: points[0]!.x, y: points[0]!.y }];
  for (let index = 0; index + 3 < points.length; index += 3)
    subdivide(
      points[index]!,
      points[index + 1]!,
      points[index + 2]!,
      points[index + 3]!,
      Math.max(tolerance, 1e-6),
      0,
      out,
    );
  return out;
}

/** The polyline a path renders as (bezier kinds flattened). */
export function pathPolyline(path: FlowEdgePath, tolerance = 0.25): FlowPoint[] {
  return path.kind === 'bezier' ? flattenBezier(path.points, tolerance) : path.points;
}

function controlOffset(span: number, curvature: number): number {
  if (span >= 0) return 0.5 * span;
  return curvature * 25 * Math.sqrt(-span);
}

function controlPoint(
  side: FlowSide,
  from: FlowPoint,
  to: FlowPoint,
  curvature: number,
): FlowPoint {
  switch (side) {
    case 'left':
      return { x: from.x - controlOffset(from.x - to.x, curvature), y: from.y };
    case 'right':
      return { x: from.x + controlOffset(to.x - from.x, curvature), y: from.y };
    case 'top':
      return { x: from.x, y: from.y - controlOffset(from.y - to.y, curvature) };
    default:
      return { x: from.x, y: from.y + controlOffset(to.y - from.y, curvature) };
  }
}

export function bezierPath(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  options: Required<FlowEdgeKindOptions>,
): FlowEdgePath {
  const c1 = controlPoint(source.side, source.point, target.point, options.curvature);
  const c2 = controlPoint(target.side, target.point, source.point, options.curvature);
  const points = [source.point, c1, c2, target.point];
  // Cubic bezier at t = 0.5: cheap to compute and close enough to the arc-length midpoint.
  const center = {
    x: source.point.x * 0.125 + c1.x * 0.375 + c2.x * 0.375 + target.point.x * 0.125,
    y: source.point.y * 0.125 + c1.y * 0.375 + c2.y * 0.375 + target.point.y * 0.125,
  };
  const flattened = flattenBezier(points);
  return {
    kind: 'bezier',
    points,
    d: `M${formatNumber(source.point.x)},${formatNumber(source.point.y)} C${formatNumber(c1.x)},${formatNumber(c1.y)} ${formatNumber(c2.x)},${formatNumber(c2.y)} ${formatNumber(target.point.x)},${formatNumber(target.point.y)}`,
    bbox: pathBounds(flattened),
    center,
    length: polylineLength(flattened),
  };
}

/** Midpoint between two endpoints and the absolute offsets (xyflow `getEdgeCenter`). */
export function edgeCenter(source: FlowPoint, target: FlowPoint): FlowPoint {
  const xOffset = Math.abs(target.x - source.x) / 2;
  const yOffset = Math.abs(target.y - source.y) / 2;
  return {
    x: target.x < source.x ? target.x + xOffset : target.x - xOffset,
    y: target.y < source.y ? target.y + yOffset : target.y - yOffset,
  };
}

export function straightPath(source: FlowPathEndpoint, target: FlowPathEndpoint): FlowEdgePath {
  const points = [source.point, target.point];
  return {
    kind: 'straight',
    points,
    d: `M${formatNumber(source.point.x)},${formatNumber(source.point.y)} L${formatNumber(target.point.x)},${formatNumber(target.point.y)}`,
    bbox: pathBounds(points),
    center: edgeCenter(source.point, target.point),
    length: polylineLength(points),
  };
}

function stepDirection(source: FlowPoint, sourceSide: FlowSide, target: FlowPoint): FlowPoint {
  if (sourceSide === 'left' || sourceSide === 'right')
    return source.x < target.x ? { x: 1, y: 0 } : { x: -1, y: 0 };
  return source.y < target.y ? { x: 0, y: 1 } : { x: 0, y: -1 };
}

/**
 * Orthogonal-looking polyline between two sides (xyflow `getPoints`): a gap out of each port,
 * one or two bends, and the label center on the longest segment for same-side cases.
 */
function stepPoints(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  offset: number,
  stepPosition: number,
): { points: FlowPoint[]; center: FlowPoint } {
  const sourceDir = sideNormal(source.side);
  const targetDir = sideNormal(target.side);
  const sourceGapped = {
    x: source.point.x + sourceDir.x * offset,
    y: source.point.y + sourceDir.y * offset,
  };
  const targetGapped = {
    x: target.point.x + targetDir.x * offset,
    y: target.point.y + targetDir.y * offset,
  };
  const dir = stepDirection(sourceGapped, source.side, targetGapped);
  const axis: 'x' | 'y' = dir.x !== 0 ? 'x' : 'y';
  const currDir = dir[axis];

  let points: FlowPoint[];
  let centerX: number;
  let centerY: number;
  const sourceGapOffset = { x: 0, y: 0 };
  const targetGapOffset = { x: 0, y: 0 };

  if (sourceDir[axis] * targetDir[axis] === -1) {
    if (axis === 'x') {
      centerX = sourceGapped.x + (targetGapped.x - sourceGapped.x) * stepPosition;
      centerY = (sourceGapped.y + targetGapped.y) / 2;
    } else {
      centerX = (sourceGapped.x + targetGapped.x) / 2;
      centerY = sourceGapped.y + (targetGapped.y - sourceGapped.y) * stepPosition;
    }
    const verticalSplit: FlowPoint[] = [
      { x: centerX, y: sourceGapped.y },
      { x: centerX, y: targetGapped.y },
    ];
    const horizontalSplit: FlowPoint[] = [
      { x: sourceGapped.x, y: centerY },
      { x: targetGapped.x, y: centerY },
    ];
    if (sourceDir[axis] === currDir) points = axis === 'x' ? verticalSplit : horizontalSplit;
    else points = axis === 'x' ? horizontalSplit : verticalSplit;
  } else {
    const sourceTarget: FlowPoint[] = [{ x: sourceGapped.x, y: targetGapped.y }];
    const targetSource: FlowPoint[] = [{ x: targetGapped.x, y: sourceGapped.y }];
    if (axis === 'x') points = sourceDir.x === currDir ? targetSource : sourceTarget;
    else points = sourceDir.y === currDir ? sourceTarget : targetSource;

    if (source.side === target.side) {
      const diff = Math.abs(source.point[axis] - target.point[axis]);
      if (diff <= offset) {
        const gapOffset = Math.min(offset - 1, offset - diff);
        if (sourceDir[axis] === currDir)
          sourceGapOffset[axis] = (sourceGapped[axis] > source.point[axis] ? -1 : 1) * gapOffset;
        else targetGapOffset[axis] = (targetGapped[axis] > target.point[axis] ? -1 : 1) * gapOffset;
      }
    }

    if (source.side !== target.side) {
      const opposite: 'x' | 'y' = axis === 'x' ? 'y' : 'x';
      const isSameDir = sourceDir[axis] === targetDir[opposite];
      const sourceGtTargetOppo = sourceGapped[opposite] > targetGapped[opposite];
      const sourceLtTargetOppo = sourceGapped[opposite] < targetGapped[opposite];
      const flipSourceTarget =
        (sourceDir[axis] === 1 &&
          ((!isSameDir && sourceGtTargetOppo) || (isSameDir && sourceLtTargetOppo))) ||
        (sourceDir[axis] !== 1 &&
          ((!isSameDir && sourceLtTargetOppo) || (isSameDir && sourceGtTargetOppo)));
      if (flipSourceTarget) points = axis === 'x' ? sourceTarget : targetSource;
    }

    const first = points[0]!;
    const sourceGapPoint = {
      x: sourceGapped.x + sourceGapOffset.x,
      y: sourceGapped.y + sourceGapOffset.y,
    };
    const targetGapPoint = {
      x: targetGapped.x + targetGapOffset.x,
      y: targetGapped.y + targetGapOffset.y,
    };
    const maxXDistance = Math.max(
      Math.abs(sourceGapPoint.x - first.x),
      Math.abs(targetGapPoint.x - first.x),
    );
    const maxYDistance = Math.max(
      Math.abs(sourceGapPoint.y - first.y),
      Math.abs(targetGapPoint.y - first.y),
    );
    if (maxXDistance >= maxYDistance) {
      centerX = (sourceGapPoint.x + targetGapPoint.x) / 2;
      centerY = first.y;
    } else {
      centerX = first.x;
      centerY = (sourceGapPoint.y + targetGapPoint.y) / 2;
    }
  }

  const gappedSource = {
    x: sourceGapped.x + sourceGapOffset.x,
    y: sourceGapped.y + sourceGapOffset.y,
  };
  const gappedTarget = {
    x: targetGapped.x + targetGapOffset.x,
    y: targetGapped.y + targetGapOffset.y,
  };
  const first = points[0]!;
  const last = points[points.length - 1]!;
  const pathPoints: FlowPoint[] = [
    source.point,
    ...(gappedSource.x !== first.x || gappedSource.y !== first.y ? [gappedSource] : []),
    ...points,
    ...(gappedTarget.x !== last.x || gappedTarget.y !== last.y ? [gappedTarget] : []),
    target.point,
  ];
  return { points: pathPoints, center: { x: centerX, y: centerY } };
}

/** The rounded corner at `b` between `a` and `c` (xyflow `getBend`). */
export function bendSegment(a: FlowPoint, b: FlowPoint, c: FlowPoint, size: number): string {
  const bendSize = Math.min(distance(a, b) / 2, distance(b, c) / 2, size);
  const { x, y } = b;
  if ((a.x === x && x === c.x) || (a.y === y && y === c.y) || bendSize <= 0)
    return `L${formatNumber(x)} ${formatNumber(y)}`;
  if (a.y === y) {
    const xDir = a.x < c.x ? -1 : 1;
    const yDir = a.y < c.y ? 1 : -1;
    return `L ${formatNumber(x + bendSize * xDir)},${formatNumber(y)}Q ${formatNumber(x)},${formatNumber(y)} ${formatNumber(x)},${formatNumber(y + bendSize * yDir)}`;
  }
  const xDir = a.x < c.x ? 1 : -1;
  const yDir = a.y < c.y ? -1 : 1;
  return `L ${formatNumber(x)},${formatNumber(y + bendSize * yDir)}Q ${formatNumber(x)},${formatNumber(y)} ${formatNumber(x + bendSize * xDir)},${formatNumber(y)}`;
}

/** SVG path data for an axis-aligned polyline with rounded corners of `borderRadius`. */
export function roundedPolylineData(points: readonly FlowPoint[], borderRadius: number): string {
  if (points.length === 0) return '';
  const first = points[0]!;
  let d = `M${formatNumber(first.x)} ${formatNumber(first.y)}`;
  for (let index = 1; index < points.length - 1; index += 1)
    d += bendSegment(points[index - 1]!, points[index]!, points[index + 1]!, borderRadius);
  if (points.length > 1) {
    const last = points[points.length - 1]!;
    d += `L${formatNumber(last.x)} ${formatNumber(last.y)}`;
  }
  return d;
}

export function smoothStepPath(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  options: Required<FlowEdgeKindOptions>,
): FlowEdgePath {
  const { points, center } = stepPoints(source, target, options.offset, options.stepPosition);
  return {
    kind: 'smoothstep',
    points,
    d: roundedPolylineData(points, options.borderRadius),
    bbox: pathBounds(points),
    center,
    length: polylineLength(points),
  };
}

/** `smoothstep` with square corners. */
export function stepPath(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  options: Required<FlowEdgeKindOptions>,
): FlowEdgePath {
  return { ...smoothStepPath(source, target, { ...options, borderRadius: 0 }), kind: 'step' };
}

/** Midpoint of the longest segment of a polyline; ties keep the earliest segment. */
export function longestSegmentCenter(points: readonly FlowPoint[]): FlowPoint {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return { x: points[0]!.x, y: points[0]!.y };
  let best = 0;
  let bestLength = -1;
  for (let index = 1; index < points.length; index += 1) {
    const length = distance(points[index - 1]!, points[index]!);
    if (length > bestLength) {
      bestLength = length;
      best = index;
    }
  }
  return midpoint(points[best - 1]!, points[best]!);
}

/** Router output (axis-aligned polyline) rendered with rounded corners. */
export function orthogonalPath(points: readonly FlowPoint[], borderRadius: number): FlowEdgePath {
  const copy = points.map((point) => ({ x: point.x, y: point.y }));
  return {
    kind: 'orthogonal',
    points: copy,
    d: roundedPolylineData(copy, borderRadius),
    bbox: pathBounds(copy),
    center: longestSegmentCenter(copy),
    length: polylineLength(copy),
  };
}

/** `points` without repeated points or middle points on a straight run. */
function simplifyPolyline(points: readonly FlowPoint[]): FlowPoint[] {
  const out: FlowPoint[] = [];
  for (const point of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - point.x) < 1e-9 && Math.abs(last.y - point.y) < 1e-9) continue;
    const before = out[out.length - 2];
    if (before && last) {
      const cross =
        (last.x - before.x) * (point.y - last.y) - (last.y - before.y) * (point.x - last.x);
      const dot =
        (last.x - before.x) * (point.x - last.x) + (last.y - before.y) * (point.y - last.y);
      if (Math.abs(cross) < 1e-9 && dot > 0) out.pop();
    }
    out.push({ x: point.x, y: point.y });
  }
  return out;
}

/**
 * An axis-aligned polyline that leaves the source along its side, passes through every waypoint
 * in order and enters the target along its side. Each leg keeps the current heading while that
 * moves toward the next point and turns first otherwise, so a leg never doubles back.
 */
function orthogonalThrough(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  waypoints: readonly FlowPoint[],
  offset: number,
): FlowPoint[] {
  const out = sideNormal(source.side);
  const into = sideNormal(target.side);
  const points: FlowPoint[] = [
    source.point,
    { x: source.point.x + out.x * offset, y: source.point.y + out.y * offset },
  ];
  let horizontal = out.x !== 0;
  let sign = horizontal ? out.x : out.y;
  const visit = (next: FlowPoint): void => {
    const current = points[points.length - 1]!;
    if (current.x !== next.x && current.y !== next.y) {
      const ahead = Math.sign(horizontal ? next.x - current.x : next.y - current.y) === sign;
      points.push(horizontal === ahead ? { x: next.x, y: current.y } : { x: current.x, y: next.y });
    }
    const from = points[points.length - 1]!;
    points.push(next);
    if (from.y === next.y && from.x !== next.x) {
      horizontal = true;
      sign = Math.sign(next.x - from.x);
    } else if (from.x === next.x && from.y !== next.y) {
      horizontal = false;
      sign = Math.sign(next.y - from.y);
    }
  };
  for (const waypoint of waypoints) visit(waypoint);
  visit({ x: target.point.x + into.x * offset, y: target.point.y + into.y * offset });
  points.push(target.point);
  return simplifyPolyline(points);
}

/**
 * A smooth curve through the waypoints (Catmull-Rom converted to cubic segments) that leaves the
 * source and enters the target along their sides, like the two-point bezier: the end control
 * points sit on the side normals at half the first and last chords.
 */
function bezierThrough(
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  waypoints: readonly FlowPoint[],
): FlowPoint[] {
  const anchors = [source.point, ...waypoints, target.point];
  const out = sideNormal(source.side);
  const into = sideNormal(target.side);
  const points: FlowPoint[] = [anchors[0]!];
  for (let index = 0; index + 1 < anchors.length; index += 1) {
    const from = anchors[index]!;
    const to = anchors[index + 1]!;
    const before = anchors[index - 1];
    const after = anchors[index + 2];
    const chord = distance(from, to);
    const c1 = before
      ? { x: from.x + (to.x - before.x) / 6, y: from.y + (to.y - before.y) / 6 }
      : { x: from.x + out.x * chord * 0.5, y: from.y + out.y * chord * 0.5 };
    const c2 = after
      ? { x: to.x - (after.x - from.x) / 6, y: to.y - (after.y - from.y) / 6 }
      : { x: to.x + into.x * chord * 0.5, y: to.y + into.y * chord * 0.5 };
    points.push(c1, c2, to);
  }
  return points;
}

function polylineRecord(kind: FlowEdgeKind, points: FlowPoint[], d: string): FlowEdgePath {
  const flattened = kind === 'bezier' ? flattenBezier(points) : points;
  return {
    kind,
    points,
    d,
    bbox: pathBounds(flattened),
    center: pointAtHalfLength(flattened),
    length: polylineLength(flattened),
  };
}

/** The point halfway along a polyline. */
function pointAtHalfLength(points: readonly FlowPoint[]): FlowPoint {
  const half = polylineLength(points) / 2;
  let walked = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const length = distance(a, b);
    if (walked + length >= half && length > 0) {
      const t = (half - walked) / length;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    walked += length;
  }
  const last = points[points.length - 1] ?? { x: 0, y: 0 };
  return { x: last.x, y: last.y };
}

/**
 * The path of `kind` through `waypoints`, the must-pass points it visits in order (Widgets §6.3
 * Edges): a polyline for `straight`, an axis-aligned path with the kind's corners for `step`,
 * `smoothstep` and an unrouted `orthogonal`, and a smooth curve for `bezier`. Without waypoints
 * it is `edgePath`. The obstacle-aware router honors waypoints for the edges it draws.
 */
export function edgePathThrough(
  kind: FlowEdgeKind,
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  waypoints: readonly FlowPoint[],
  options: Required<FlowEdgeKindOptions>,
): FlowEdgePath {
  if (waypoints.length === 0) return edgePath(kind, source, target, options);
  if (kind === 'straight') {
    const points = simplifyPolyline([source.point, ...waypoints, target.point]);
    return polylineRecord('straight', points, roundedPolylineData(points, 0));
  }
  if (kind === 'bezier') {
    const points = bezierThrough(source, target, waypoints);
    let d = `M${formatNumber(points[0]!.x)},${formatNumber(points[0]!.y)}`;
    for (let index = 1; index + 2 < points.length; index += 3) {
      const [c1, c2, to] = [points[index]!, points[index + 1]!, points[index + 2]!];
      d += ` C${formatNumber(c1.x)},${formatNumber(c1.y)} ${formatNumber(c2.x)},${formatNumber(c2.y)} ${formatNumber(to.x)},${formatNumber(to.y)}`;
    }
    return polylineRecord('bezier', points, d);
  }
  const points = orthogonalThrough(source, target, waypoints, options.offset);
  const radius = kind === 'step' ? 0 : options.borderRadius;
  return polylineRecord(kind, points, roundedPolylineData(points, radius));
}

/** Builds the path of `kind` between two endpoints (orthogonal without a router falls back to smoothstep). */
export function edgePath(
  kind: FlowEdgeKind,
  source: FlowPathEndpoint,
  target: FlowPathEndpoint,
  options: Required<FlowEdgeKindOptions>,
): FlowEdgePath {
  switch (kind) {
    case 'bezier':
      return bezierPath(source, target, options);
    case 'straight':
      return straightPath(source, target);
    case 'step':
      return stepPath(source, target, options);
    case 'orthogonal':
      return { ...smoothStepPath(source, target, options), kind: 'orthogonal' };
    default:
      return smoothStepPath(source, target, options);
  }
}
