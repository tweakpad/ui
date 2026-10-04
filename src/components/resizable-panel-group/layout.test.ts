import { describe, expect, it } from 'vitest';
import { extentInPixels, normalizeLayout, resizeBoundary, resizePanel } from './layout.js';
import type { PanelBounds } from './types.js';
const bound = (min = 0, max = 1000, extra: Partial<PanelBounds> = {}): PanelBounds => ({
  min,
  max,
  disabled: false,
  collapsible: false,
  collapsed: 0,
  ...extra,
});
describe('resizable panel constraints', () => {
  it('distinguishes pixel numbers from percent strings and resolves relative units', () => {
    const resolve = (value: number | string) =>
      extentInPixels(value, 600, 20, 16, { width: 1000, height: 800 });
    expect([
      resolve(25),
      resolve('25'),
      resolve('2rem'),
      resolve('2em'),
      resolve('10vh'),
      resolve('10vw'),
    ]).toEqual([25, 150, 32, 40, 80, 100]);
    expect(resolve('-1px')).toBeUndefined();
  });
  it('redistributes beyond a constrained neighbor without changing disabled sizes', () => {
    const bounds = [bound(50), bound(100, 1000, { disabled: true }), bound(50), bound(50)];
    expect(resizeBoundary([100, 100, 100, 100], bounds, 0, 125)).toEqual([200, 100, 50, 50]);
  });
  it('preserves bounds and reports infeasibility instead of forcing the total', () => {
    expect(normalizeLayout([50, 50], [bound(80), bound(80)], 100)).toEqual({
      sizes: [80, 80],
      feasible: false,
    });
    expect(normalizeLayout([100, 100], [bound(0, 40), bound(0, 40)], 100)).toEqual({
      sizes: [40, 40],
      feasible: false,
    });
  });
  it('crosses collapsed gaps atomically and refuses an impossible expansion', () => {
    const bounds = [bound(50, 200, { collapsible: true }), bound(80, 200)];
    expect(resizePanel([50, 150], bounds, 0, 49)).toEqual([0, 200]);
    expect(resizePanel([0, 200], bounds, 0, 50)).toEqual([50, 150]);
    expect(resizePanel([0, 100], [bounds[0]!, bound(80, 200)], 0, 50)).toEqual([0, 100]);
  });
  it('never changes disabled panels even when new constraints are infeasible', () => {
    expect(
      normalizeLayout([0, 0], [bound(80, 100, { disabled: true }), bound(50)], 100, [30, 70]),
    ).toEqual({ sizes: [30, 70], feasible: false });
  });
  it('maintains total and all bounds across both boundary directions', () => {
    const bounds = [bound(40, 220), bound(20, 200), bound(80, 250)];
    for (let delta = -500; delta <= 500; delta += 17) {
      const sizes = resizeBoundary([100, 100, 100], bounds, 1, delta);
      expect(sizes.reduce((a, b) => a + b, 0)).toBeCloseTo(300);
      sizes.forEach((size, i) => {
        expect(size).toBeGreaterThanOrEqual(bounds[i]!.min);
        expect(size).toBeLessThanOrEqual(bounds[i]!.max);
      });
    }
  });
});
