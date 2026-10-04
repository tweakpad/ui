import { describe, expect, it } from 'vitest';
import { Point, Position, Rectangle } from './geometry.js';

describe('source geometry, V-37/V-44', () => {
  it('preserves inclusive point edges and strictly positive shape intersections', () => {
    const rect = new Rectangle(0, 0, 20, 10);
    expect(rect.containsPoint({ x: 20, y: 10 })).toBe(true);
    expect(rect.intersectionArea(new Rectangle(20, 0, 10, 10))).toBe(0);
    expect(rect.intersectionArea(new Rectangle(10, 0, 20, 10))).toBe(100);
    expect(Rectangle.intersectionRatio(rect, new Rectangle(10, 0, 20, 10))).toBeCloseTo(1 / 3);
    expect(rect.corners).toEqual([
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 0, y: 10 },
      { x: 20, y: 10 },
    ]);
  });
  it('preserves alignment and source scale without mutation', () => {
    const rect = new Rectangle(5, 10, 10, 20);
    rect.scale = { x: -2, y: 3 };
    expect(rect.translate(4, -2).scale).toEqual(rect.scale);
    expect(Rectangle.delta(rect, new Rectangle(0, 0, 20, 10), { x: 'end', y: 'start' })).toEqual(
      new Point(-5, 10),
    );
    expect(rect.left).toBe(5);
  });
  it('rejects invalid samples and handles zero elapsed time and tied directions', () => {
    const position = new Position({ x: 0, y: 0 });
    position.set({ x: 5, y: 5 }, 1);
    position.set({ x: 10, y: 10 }, 1);
    expect(position.velocity).toEqual({ x: 0, y: 0 });
    expect(position.direction).toBe('down');
    expect(() => position.set({ x: NaN, y: 0 })).toThrow(TypeError);
    expect(position.current).toEqual(new Point(10, 10));
    for (const width of [-1, NaN, Infinity])
      expect(() => new Rectangle(0, 0, width, 1)).toThrow(TypeError);
  });
});
