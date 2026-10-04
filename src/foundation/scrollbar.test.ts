import { describe, expect, it } from 'vitest';
import { scrollbarMetrics, scrollbarProgress } from './scrollbar.js';

describe('shared Scroll Area / Carousel scrollbar geometry', () => {
  it('preserves fractional extent and clamps the shared minimum to tiny tracks', () => {
    expect(scrollbarMetrics(100.5, 200, 1000, 0.5, 16)).toEqual({
      length: 20.1,
      travel: 80.4,
      position: 40.2,
    });
    expect(scrollbarMetrics(8, 20, 1000, 1, 16)).toEqual({ length: 8, travel: 0, position: 0 });
  });
  it('compresses overshoot at each edge without exceeding track bounds', () => {
    expect(scrollbarMetrics(100, 50, 100, -0.5, 16)).toEqual({
      length: 25,
      travel: 50,
      position: 0,
    });
    expect(scrollbarMetrics(100, 50, 100, 1.5, 16)).toEqual({
      length: 25,
      travel: 50,
      position: 75,
    });
  });
  it('keeps empty/full tracks finite and supports explicit clamped thumb size', () => {
    expect(scrollbarMetrics(0, 0, 0, 0, 16)).toEqual({ length: 0, travel: 0, position: 0 });
    expect(scrollbarMetrics(100, 100, 100, 0, 16).length).toBe(100);
    expect(scrollbarMetrics(100, 10, 100, 0.5, 16, 30).position).toBe(35);
  });
  it('converts scaled pointer grab positions and RTL without jump or division by zero', () => {
    expect(scrollbarProgress(100, 20, 2, 10, 60, false)).toBe(0.5);
    expect(scrollbarProgress(60, 20, 2, 10, 60, true)).toBeCloseTo(5 / 6);
    expect(scrollbarProgress(999, 20, 2, 0, 60, false)).toBe(1);
    expect(scrollbarProgress(20, 20, 0, 0, 0, false)).toBe(0);
  });
});
