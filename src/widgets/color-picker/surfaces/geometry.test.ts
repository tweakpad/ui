import { describe, expect, it } from 'vitest';
import {
  areaToSv,
  barycentric,
  discToHs,
  hsToDisc,
  inRingBand,
  ringToHue,
  svToArea,
  svToTriangle,
  triangleToSv,
  triangleVertices,
} from './geometry.js';

describe('area geometry', () => {
  it('maps the plane in both directions and mirrors in RTL', () => {
    expect(areaToSv({ x: 50, y: 0 }, 200, 100, false)).toEqual({ s: 25, v: 100 });
    expect(areaToSv({ x: 50, y: 0 }, 200, 100, true)).toEqual({ s: 75, v: 100 });
    expect(areaToSv({ x: -10, y: 500 }, 200, 100, false)).toEqual({ s: 0, v: 0 });
    expect(svToArea(25, 100, false)).toEqual({ left: 25, top: 0 });
    expect(svToArea(25, 100, true)).toEqual({ left: 75, top: 0 });
  });
});

describe('disc geometry', () => {
  it('round-trips hue and saturation, clockwise from 3 o’clock', () => {
    expect(discToHs({ x: 100, y: 50 }, 100)).toEqual({ h: 0, s: 100 });
    expect(discToHs({ x: 50, y: 100 }, 100).h).toBeCloseTo(90);
    expect(discToHs({ x: 50, y: 50 }, 100).s).toBe(0);
    expect(discToHs({ x: 500, y: 50 }, 100).s).toBe(100);
    for (const [h, s] of [
      [0, 100],
      [45, 50],
      [200, 75],
      [359, 10],
    ]) {
      const position = hsToDisc(h!, s!);
      const back = discToHs({ x: position.left, y: position.top }, 100);
      expect(back.h).toBeCloseTo(h!, 6);
      expect(back.s).toBeCloseTo(s!, 6);
    }
    expect(ringToHue({ x: 50, y: 0 }, 100)).toBeCloseTo(270);
    expect(inRingBand({ x: 95, y: 50 }, 100, 20)).toBe(true);
    expect(inRingBand({ x: 60, y: 50 }, 100, 20)).toBe(false);
    expect(inRingBand({ x: 120, y: 50 }, 100, 20)).toBe(false);
  });
});

describe('triangle geometry', () => {
  const vertices = triangleVertices({ x: 50, y: 50 }, 50, 30);

  it('places the vertices on the circle 120 degrees apart', () => {
    for (const vertex of [vertices.hue, vertices.white, vertices.black])
      expect(Math.hypot(vertex.x - 50, vertex.y - 50)).toBeCloseTo(50, 9);
    expect(barycentric(vertices.hue, vertices)).toEqual({ hue: 1, white: 0, black: 0 });
    const centroid = barycentric({ x: 50, y: 50 }, vertices);
    expect(centroid.hue).toBeCloseTo(1 / 3, 9);
    expect(centroid.white).toBeCloseTo(1 / 3, 9);
  });

  it('round-trips saturation and brightness and clamps outside points', () => {
    for (const [s, v] of [
      [100, 100],
      [0, 100],
      [50, 50],
      [20, 80],
      [100, 10],
    ]) {
      const back = triangleToSv(svToTriangle(s!, v!, vertices), vertices);
      expect(back.s).toBeCloseTo(s!, 6);
      expect(back.v).toBeCloseTo(v!, 6);
    }
    expect(triangleToSv(vertices.black, vertices).v).toBeCloseTo(0, 9);
    const outside = triangleToSv({ x: 500, y: 500 }, vertices);
    expect(outside.s).toBeGreaterThanOrEqual(0);
    expect(outside.s).toBeLessThanOrEqual(100);
    expect(outside.v).toBeGreaterThanOrEqual(0);
    expect(outside.v).toBeLessThanOrEqual(100);
  });
});
