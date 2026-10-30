import { describe, expect, it } from 'vitest';
import { ringPath } from './ring-path.js';
import { ringSamples } from './ring-samples.js';

const r = (x: number, y = x) => ({ x, y });
const card = { width: 200, height: 100, radii: [r(14), r(14), r(14), r(14)] as const };

describe('ringSamples', () => {
  it('measures the same perimeter as the drawn path', () => {
    for (const box of [
      card,
      { width: 100, height: 20, radii: [r(9999), r(9999), r(9999), r(9999)] as const },
      { width: 120, height: 60, radii: [r(20, 10), r(0), r(6), r(0)] as const },
    ])
      expect(ringSamples(box, 0.5).length).toBeCloseTo(ringPath(box, 0.5).length, 2);
  });

  it('samples about every step, in increasing distance, on the centerline', () => {
    const samples = ringSamples(card, 0.5, 1.5);
    expect(samples.count).toBeGreaterThan(samples.length / 1.6);
    for (let index = 1; index < samples.count; index++) {
      expect(samples.s[index]!).toBeGreaterThan(samples.s[index - 1]!);
      const gap = Math.hypot(
        samples.x[index]! - samples.x[index - 1]!,
        samples.y[index]! - samples.y[index - 1]!,
      );
      expect(gap).toBeLessThan(2);
    }
    expect(samples.x[0]).toBeCloseTo(13.5 + 0.5);
    expect(samples.y[0]).toBeCloseTo(0.5);
  });

  it('places the corners at 45° steps of angle whatever the shape', () => {
    const samples = ringSamples({ width: 400, height: 100, radii: [r(0), r(0), r(0), r(0)] }, 0);
    const at = (x: number, y: number) => {
      let best = 0;
      for (let index = 0; index < samples.count; index++)
        if (
          Math.hypot(samples.x[index]! - x, samples.y[index]! - y) <
          Math.hypot(samples.x[best]! - x, samples.y[best]! - y)
        )
          best = index;
      return samples.angle[best]!;
    };
    const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
    expect(at(400, 0)).toBeCloseTo(45, 0);
    expect(at(400, 100)).toBeCloseTo(135, 0);
    expect(at(0, 100)).toBeCloseTo(225, 0);
    expect(circular(at(200, 0), 0)).toBeLessThan(0.5);
  });
});
