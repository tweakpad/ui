import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_KIND_OPTIONS } from '../defaults.js';
import {
  bezierPath,
  edgePath,
  flattenBezier,
  orthogonalPath,
  pathBounds,
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
