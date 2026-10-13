import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_KIND_OPTIONS } from '../defaults.js';
import {
  bezierPath,
  edgePath,
  edgePathThrough,
  flattenBezier,
  orthogonalPath,
  pathBounds,
  pathPolyline,
  polylineLength,
  smoothStepPath,
  stepPath,
  straightPath,
} from './paths.js';

const source = { point: { x: 0, y: 20 }, side: 'right' as const };
const target = { point: { x: 150, y: 100 }, side: 'left' as const };

describe('edge paths', () => {
  it('builds the xyflow bezier path and center', () => {
    const path = bezierPath(source, target, DEFAULT_EDGE_KIND_OPTIONS.bezier);
    expect(path.kind).toBe('bezier');
    expect(path.d).toBe('M0,20 C75,20 75,100 150,100');
    expect(path.points).toEqual([
      { x: 0, y: 20 },
      { x: 75, y: 20 },
      { x: 75, y: 100 },
      { x: 150, y: 100 },
    ]);
    expect(path.center).toEqual({ x: 75, y: 60 });
    expect(path.bbox.x).toBe(0);
    expect(path.bbox.width).toBe(150);
    expect(path.length).toBeGreaterThan(Math.hypot(150, 80));
  });

  it('uses the curvature offset when the target lies behind the source side', () => {
    const path = bezierPath(
      { point: { x: 100, y: 0 }, side: 'right' },
      { point: { x: 0, y: 0 }, side: 'left' },
      DEFAULT_EDGE_KIND_OPTIONS.bezier,
    );
    expect(path.points[1]!.x).toBeCloseTo(100 + 0.25 * 25 * Math.sqrt(100), 9);
    expect(path.points[2]!.x).toBeCloseTo(0 - 0.25 * 25 * Math.sqrt(100), 9);
  });

  it('builds straight paths with the midpoint center', () => {
    const path = straightPath(source, target);
    expect(path.d).toBe('M0,20 L150,100');
    expect(path.center).toEqual({ x: 75, y: 60 });
    expect(path.length).toBeCloseTo(Math.hypot(150, 80), 9);
    expect(path.bbox).toEqual({ x: 0, y: 20, width: 150, height: 80 });
  });

  it('builds the xyflow smoothstep polyline with rounded bends', () => {
    const path = smoothStepPath(source, target, DEFAULT_EDGE_KIND_OPTIONS.smoothstep);
    expect(path.points).toEqual([
      { x: 0, y: 20 },
      { x: 20, y: 20 },
      { x: 75, y: 20 },
      { x: 75, y: 100 },
      { x: 130, y: 100 },
      { x: 150, y: 100 },
    ]);
    expect(path.d).toBe('M0 20L20 20L 70,20Q 75,20 75,25L 75,95Q 75,100 80,100L130 100L150 100');
    expect(path.center).toEqual({ x: 75, y: 60 });
    expect(path.length).toBe(20 + 55 + 80 + 55 + 20);
  });

  it('step is smoothstep with square corners', () => {
    const path = stepPath(source, target, DEFAULT_EDGE_KIND_OPTIONS.step);
    expect(path.kind).toBe('step');
    expect(path.d).toBe('M0 20L20 20L75 20L75 100L130 100L150 100');
  });

  it('places the smoothstep label on the longest segment for same-side ports', () => {
    const path = smoothStepPath(
      { point: { x: 0, y: 0 }, side: 'right' },
      { point: { x: 0, y: 200 }, side: 'right' },
      DEFAULT_EDGE_KIND_OPTIONS.smoothstep,
    );
    expect(path.points[0]).toEqual({ x: 0, y: 0 });
    expect(path.points[path.points.length - 1]).toEqual({ x: 0, y: 200 });
    expect(path.center).toEqual({ x: 20, y: 100 });
  });

  it('handles the overlapping same-side gap case without duplicate points', () => {
    const path = smoothStepPath(
      { point: { x: 0, y: 0 }, side: 'right' },
      { point: { x: 10, y: 100 }, side: 'right' },
      DEFAULT_EDGE_KIND_OPTIONS.smoothstep,
    );
    for (let index = 1; index < path.points.length; index += 1)
      expect(path.points[index]).not.toEqual(path.points[index - 1]);
  });

  it('renders orthogonal router points with rounded corners and a longest-segment center', () => {
    const path = orthogonalPath(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 30 },
        { x: 160, y: 30 },
      ],
      8,
    );
    expect(path.kind).toBe('orthogonal');
    expect(path.d).toBe('M0 0L 92,0Q 100,0 100,8L 100,22Q 100,30 108,30L160 30');
    expect(path.center).toEqual({ x: 50, y: 0 });
    expect(path.length).toBe(190);
    expect(orthogonalPath([], 8).d).toBe('');
  });

  it('flattens beziers within tolerance and measures bounds', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 50, y: 0 },
      { x: 50, y: 100 },
      { x: 100, y: 100 },
    ];
    const coarse = flattenBezier(points, 5);
    const fine = flattenBezier(points, 0.1);
    expect(coarse[0]).toEqual({ x: 0, y: 0 });
    expect(coarse[coarse.length - 1]).toEqual({ x: 100, y: 100 });
    expect(fine.length).toBeGreaterThan(coarse.length);
    expect(polylineLength(fine)).toBeGreaterThan(polylineLength(coarse) - 1);
    expect(flattenBezier([{ x: 1, y: 2 }])).toEqual([{ x: 1, y: 2 }]);
    expect(pathBounds(points, 4)).toEqual({ x: -4, y: -4, width: 108, height: 108 });
    expect(pathBounds([])).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  it('dispatches by kind and falls back for orthogonal without a router', () => {
    expect(edgePath('bezier', source, target, DEFAULT_EDGE_KIND_OPTIONS.bezier).kind).toBe(
      'bezier',
    );
    expect(edgePath('straight', source, target, DEFAULT_EDGE_KIND_OPTIONS.straight).kind).toBe(
      'straight',
    );
    expect(edgePath('step', source, target, DEFAULT_EDGE_KIND_OPTIONS.step).kind).toBe('step');
    expect(edgePath('smoothstep', source, target, DEFAULT_EDGE_KIND_OPTIONS.smoothstep).kind).toBe(
      'smoothstep',
    );
    const fallback = edgePath('orthogonal', source, target, DEFAULT_EDGE_KIND_OPTIONS.orthogonal);
    expect(fallback.kind).toBe('orthogonal');
    expect(fallback.points.length).toBeGreaterThan(2);
  });

  it('is deterministic', () => {
    const a = smoothStepPath(source, target, DEFAULT_EDGE_KIND_OPTIONS.smoothstep);
    const b = smoothStepPath(source, target, DEFAULT_EDGE_KIND_OPTIONS.smoothstep);
    expect(a).toEqual(b);
  });
});

describe('edge paths through waypoints', () => {
  const waypoints = [
    { x: 60, y: -40 },
    { x: 110, y: 160 },
  ];
  /** Shortest distance from `point` to the polyline. */
  const gap = (points: readonly { x: number; y: number }[], point: { x: number; y: number }) => {
    let best = Infinity;
    for (let index = 1; index < points.length; index += 1) {
      const a = points[index - 1]!;
      const b = points[index]!;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = dx * dx + dy * dy;
      const t = length
        ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / length))
        : 0;
      best = Math.min(best, Math.hypot(point.x - (a.x + dx * t), point.y - (a.y + dy * t)));
    }
    return best;
  };

  it('is the plain path without waypoints', () => {
    for (const kind of ['bezier', 'straight', 'step', 'smoothstep'] as const)
      expect(edgePathThrough(kind, source, target, [], DEFAULT_EDGE_KIND_OPTIONS[kind])).toEqual(
        edgePath(kind, source, target, DEFAULT_EDGE_KIND_OPTIONS[kind]),
      );
  });

  it('draws a straight edge as a polyline through the waypoints', () => {
    const path = edgePathThrough(
      'straight',
      source,
      target,
      waypoints,
      DEFAULT_EDGE_KIND_OPTIONS.straight,
    );
    expect(path.kind).toBe('straight');
    expect(path.points).toEqual([source.point, ...waypoints, target.point]);
  });

  it('draws step kinds as axis-aligned paths through every waypoint, out and in along the sides', () => {
    for (const kind of ['smoothstep', 'step'] as const) {
      const options = DEFAULT_EDGE_KIND_OPTIONS[kind];
      const path = edgePathThrough(kind, source, target, waypoints, options);
      const points = path.points;
      expect(path.kind).toBe(kind);
      for (let index = 1; index < points.length; index += 1)
        expect(
          points[index]!.x === points[index - 1]!.x || points[index]!.y === points[index - 1]!.y,
        ).toBe(true);
      for (const waypoint of waypoints) expect(gap(points, waypoint)).toBeLessThan(1e-9);
      expect(points[0]).toEqual(source.point);
      expect(points[1]!.y).toBe(source.point.y);
      expect(points[1]!.x).toBeGreaterThan(source.point.x);
      expect(points[points.length - 1]).toEqual(target.point);
      expect(points[points.length - 2]!.y).toBe(target.point.y);
      expect(points[points.length - 2]!.x).toBeLessThan(target.point.x);
      if (kind === 'step') expect(path.d).not.toContain('Q');
      else expect(path.d).toContain('Q');
    }
  });

  it('draws a bezier as a smooth curve through the waypoints that leaves along the source side', () => {
    const path = edgePathThrough(
      'bezier',
      source,
      target,
      waypoints,
      DEFAULT_EDGE_KIND_OPTIONS.bezier,
    );
    expect(path.kind).toBe('bezier');
    expect(path.points).toHaveLength(3 * (waypoints.length + 1) + 1);
    expect(path.d.match(/C/g)).toHaveLength(waypoints.length + 1);
    const line = pathPolyline(path);
    for (const waypoint of waypoints) expect(gap(line, waypoint)).toBeLessThan(1e-9);
    expect(line[0]).toEqual(source.point);
    expect(line[line.length - 1]).toEqual(target.point);
    // The first control point lies on the source side's normal, the last on the target's.
    expect(path.points[1]!.y).toBe(source.point.y);
    expect(path.points[1]!.x).toBeGreaterThan(source.point.x);
    expect(path.points[path.points.length - 2]!.y).toBe(target.point.y);
    expect(path.points[path.points.length - 2]!.x).toBeLessThan(target.point.x);
    expect(path.length).toBeGreaterThan(
      polylineLength([source.point, ...waypoints, target.point]) - 1,
    );
  });

  it('flattens a chain of cubic segments through their shared ends', () => {
    const chain = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
      { x: 30, y: 10 },
      { x: 40, y: 10 },
      { x: 50, y: 0 },
      { x: 60, y: 0 },
    ];
    const flat = flattenBezier(chain);
    expect(flat[0]).toEqual(chain[0]);
    expect(flat[flat.length - 1]).toEqual(chain[6]);
    expect(flat).toContainEqual(chain[3]);
  });
});
