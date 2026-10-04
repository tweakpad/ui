import { describe, it, expect } from 'vitest';
import { resolveSnapPoints, settleSnap } from './geometry.js';
const dimensions = { extent: 600, viewport: 800, font: 20, rootFont: 16, width: 1200, height: 800 };
describe('Drawer snap constraints', () => {
  it('resolves owner units, clamps, drops invalid inputs and keeps the last representative in author order', () => {
    const points = resolveSnapPoints(
      [0.25, '10em', '12.5rem', 'bad', NaN, 1000, 1, '300px'],
      dimensions,
    );
    expect(points.map((point) => [point.value, point.extent])).toEqual([
      ['12.5rem', 200],
      [1, 600],
      ['300px', 300],
    ]);
  });
  it('limits sequential release to one adjacent point and closes only beyond the minimum', () => {
    const points = resolveSnapPoints([200, 400, 600], dimensions);
    expect(settleSnap(points, 600, 500, 3, 600, true, true)?.extent).toBe(400);
    expect(settleSnap(points, 400, 300, 3, 600, true, true)?.extent).toBe(200);
    expect(settleSnap(points, 200, 150, 3, 600, true, true)).toBeNull();
    expect(settleSnap(points, 200, 150, 3, 600, true, false)?.extent).toBe(200);
  });
});
