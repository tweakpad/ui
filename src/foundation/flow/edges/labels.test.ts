import { describe, expect, it } from 'vitest';
import { DEFAULT_EDGE_KIND_OPTIONS } from '../defaults.js';
import { cumulativeLengths, labelAnchor, longestSegmentAnchor, pointAlongPath } from './labels.js';
import { bezierPath, orthogonalPath, straightPath } from './paths.js';

describe('edge labels', () => {
  const polyline = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 50 },
  ];

  it('walks cumulative lengths', () => {
    expect(cumulativeLengths(polyline)).toEqual([0, 100, 150]);
    expect(pointAlongPath(polyline, 0)).toEqual({
      point: { x: 0, y: 0 },
      angle: 0,
      segment: 0,
      t: 0,
    });
    expect(pointAlongPath(polyline, 0.5)).toEqual({
      point: { x: 75, y: 0 },
      angle: 0,
      segment: 0,
      t: 0.5,
    });
    const late = pointAlongPath(polyline, 0.9);
    expect(late.point).toEqual({ x: 100, y: 35 });
    expect(late.angle).toBe(90);
    expect(late.segment).toBe(1);
    expect(pointAlongPath(polyline, 2).point).toEqual({ x: 100, y: 50 });
    expect(pointAlongPath([], 0.5).point).toEqual({ x: 0, y: 0 });
    expect(pointAlongPath([{ x: 3, y: 4 }], 0.5).point).toEqual({ x: 3, y: 4 });
  });

  it('flattens bezier paths before walking them', () => {
    const path = bezierPath(
      { point: { x: 0, y: 0 }, side: 'right' },
      { point: { x: 100, y: 100 }, side: 'left' },
      DEFAULT_EDGE_KIND_OPTIONS.bezier,
    );
    const mid = pointAlongPath(path, 0.5);
    expect(mid.point.x).toBeCloseTo(50, 0);
    expect(mid.point.y).toBeCloseTo(50, 0);
  });

  it('anchors on the longest segment', () => {
    const anchor = longestSegmentAnchor(polyline);
    expect(anchor.point).toEqual({ x: 50, y: 0 });
    expect(anchor.angle).toBe(0);
    expect(anchor.segment).toBe(0);
  });

  it('resolves label anchors by position, align and placement', () => {
    const path = straightPath(
      { point: { x: 0, y: 0 }, side: 'right' },
      { point: { x: 100, y: 0 }, side: 'left' },
    );
    expect(labelAnchor(path, { text: 'a' }).point).toEqual({ x: 50, y: 0 });
    expect(labelAnchor(path, { text: 'a', position: 0.25 }).point).toEqual({ x: 25, y: 0 });
    expect(labelAnchor(path, { text: 'a', align: 'start' }).point).toEqual({ x: 20, y: 0 });
    expect(labelAnchor(path, { text: 'a', align: 'end' }).point).toEqual({ x: 80, y: 0 });
    const above = labelAnchor(path, { text: 'a', placement: 'above' }, { offset: 10 });
    expect(above.point.y).toBeCloseTo(-10, 9);
    const below = labelAnchor(path, { text: 'a', placement: 'below' }, { offset: 10 });
    expect(below.point.y).toBeCloseTo(10, 9);
    expect(above.normal.y).toBeLessThan(0);
    expect(above.placement).toBe('above');
    expect(above.align).toBe('center');
  });

  it('keeps "above" visually up for reversed paths', () => {
    const reversed = straightPath(
      { point: { x: 100, y: 0 }, side: 'left' },
      { point: { x: 0, y: 0 }, side: 'right' },
    );
    const above = labelAnchor(reversed, { text: 'a', placement: 'above' }, { offset: 10 });
    expect(above.point.y).toBeCloseTo(-10, 9);
  });

  it('uses the longest segment for orthogonal paths', () => {
    const path = orthogonalPath(
      [
        { x: 0, y: 0 },
        { x: 20, y: 0 },
        { x: 20, y: 200 },
        { x: 40, y: 200 },
      ],
      0,
    );
    const anchor = labelAnchor(path, { text: 'a' });
    expect(anchor.point).toEqual({ x: 20, y: 100 });
    expect(anchor.angle).toBe(90);
  });
});
