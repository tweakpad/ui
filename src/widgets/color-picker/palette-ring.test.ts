import { describe, expect, it } from 'vitest';
import { PALETTE_RING, ringSegments } from './palette-ring.js';

const reach = (segment: { polygon: string }) =>
  Math.max(
    ...segment.polygon
      .split(', ')
      .map((p) => Math.hypot(parseFloat(p.split(' ')[0]!) - 50, parseFloat(p.split(' ')[1]!) - 50)),
  );

describe('palette ring', () => {
  it('centers the base segment at the top and keeps every segment the same thickness', () => {
    const [first, second, third] = ringSegments(3, 0);
    expect(first!.markX).toBe(50);
    expect(first!.markY).toBeCloseTo(50 - 100 * ((PALETTE_RING.inner + PALETTE_RING.outer) / 2), 1);
    for (const segment of [first!, second!, third!])
      expect(reach(segment)).toBeCloseTo(100 * PALETTE_RING.outer, 0);
  });
  it('gives principal hues twice the span of a variant', () => {
    const segments = ringSegments(5, 0, [true, false, false, false, true]);
    // Weights 2 + 1 + 1 + 1 + 2 = 7 units over 360°.
    expect(segments[0]!.span).toBeCloseTo((360 * 2) / 7, 1);
    expect(segments[1]!.span).toBeCloseTo(360 / 7, 1);
    expect(segments[4]!.span).toBeCloseTo((360 * 2) / 7, 1);
    expect(segments.reduce((sum, segment) => sum + segment.span, 0)).toBeCloseTo(360, 1);
  });
  it('rotates the ring so the base sits at the top whatever its wheel index', () => {
    const segments = ringSegments(5, 2);
    expect(segments).toHaveLength(5);
    expect(segments[2]!.markX).toBe(50);
    expect(segments[2]!.markY).toBeLessThan(50);
    // Wheel order runs clockwise from the base.
    expect(segments[3]!.markX).toBeGreaterThan(50);
    expect(segments[1]!.markX).toBeLessThan(50);
  });
  it('closes each polygon along the inner arc and keeps a gap between neighbours', () => {
    const [a, b] = ringSegments(2, 0);
    const points = a!.polygon.split(', ');
    expect(points.length % 2).toBe(0);
    expect(points[0]).not.toBe(points[points.length - 1]);
    expect(a!.polygon).not.toEqual(b!.polygon);
    expect(ringSegments(0, 0)).toEqual([]);
  });
});
