import { describe, expect, it } from 'vitest';
import { fitCornerRadii, fitDashPattern, parseCornerRadius, ringPath } from './ring-path.js';

const r = (x: number, y = x) => ({ x, y });

describe('parseCornerRadius', () => {
  it('reads one or two lengths and percentages of the box', () => {
    expect(parseCornerRadius('8px', 100, 50)).toEqual({ x: 8, y: 8 });
    expect(parseCornerRadius('8px 4px', 100, 50)).toEqual({ x: 8, y: 4 });
    expect(parseCornerRadius('50%', 100, 40)).toEqual({ x: 50, y: 20 });
    expect(parseCornerRadius('0px', 100, 40)).toEqual({ x: 0, y: 0 });
  });
});

describe('fitCornerRadii', () => {
  it('shrinks every radius by one factor when adjacent radii exceed a side', () => {
    const radii = fitCornerRadii({
      width: 100,
      height: 40,
      radii: [r(9999), r(9999), r(9999), r(9999)],
    });
    for (const radius of radii) expect(radius.x).toBeCloseTo(20);
  });

  it('keeps radii that fit', () => {
    expect(fitCornerRadii({ width: 100, height: 40, radii: [r(8), r(0), r(8), r(0)] })).toEqual([
      r(8),
      r(0),
      r(8),
      r(0),
    ]);
  });
});

describe('ringPath', () => {
  it('draws a square box as four sides inset by half the stroke', () => {
    const path = ringPath({ width: 100, height: 40, radii: [r(0), r(0), r(0), r(0)] }, 0.5);
    expect(path.d).toBe('M0.5 0.5H99.5L99.5 0.5V39.5L99.5 39.5H0.5L0.5 39.5V0.5L0.5 0.5Z');
    expect(path.length).toBeCloseTo(2 * 99 + 2 * 39);
  });

  it('reduces the radii by the inset and measures circular corners', () => {
    const path = ringPath({ width: 100, height: 40, radii: [r(10), r(10), r(10), r(10)] }, 1);
    expect(path.d.startsWith('M10 1H90A9 9 0 0 1 99 10')).toBe(true);
    const straight = 2 * (98 - 18) + 2 * (38 - 18);
    expect(path.length).toBeCloseTo(straight + 2 * Math.PI * 9, 3);
  });

  it('follows elliptical and per-corner radii', () => {
    const path = ringPath({ width: 100, height: 40, radii: [r(20, 10), r(0), r(6), r(0)] }, 0);
    expect(path.d).toContain('A20 10 0 0 1 20 0');
    expect(path.d).toContain('A6 6 0 0 1 94 40');
  });

  it('collapses a pill to semicircular ends', () => {
    const path = ringPath(
      { width: 100, height: 20, radii: [r(9999), r(9999), r(9999), r(9999)] },
      0,
    );
    expect(path.length).toBeCloseTo(2 * 80 + 2 * Math.PI * 10, 3);
  });
});

describe('fitDashPattern', () => {
  it('stretches the pattern so whole periods fill the perimeter', () => {
    const { dash, period } = fitDashPattern(103, 6, 4);
    expect(Math.round(103 / period)).toBe(10);
    expect(103 / period).toBeCloseTo(10);
    expect(dash / period).toBeCloseTo(0.6);
  });

  it('keeps at least one period', () => {
    expect(fitDashPattern(3, 6, 4).period).toBeCloseTo(3);
  });
});
