import { describe, expect, it } from 'vitest';
import { GlowPalette, mixLab, toLab, toRgba, type Rgba } from './glow-palette.js';

const red: Rgba = [1, 0, 0, 1];
const blue: Rgba = [0, 0, 1, 1];
const close = (a: readonly number[], b: readonly number[]) =>
  a.forEach((value, index) => expect(value).toBeCloseTo(b[index]!, 3));

describe('OKLab', () => {
  it('round-trips sRGB colors', () => {
    for (const color of [red, blue, [0.2, 0.6, 0.4, 0.5] as Rgba, [1, 1, 1, 1] as Rgba])
      close(toRgba(toLab(color)), color);
  });

  it('mixes toward the second color', () => {
    const white = toLab([1, 1, 1, 1]);
    close(toRgba(mixLab(toLab(red), white, 1)), [1, 1, 1, 1]);
    close(toRgba(mixLab(toLab(red), white, 0)), red);
    expect(toRgba(mixLab(toLab(red), white, 0.5))[1]).toBeGreaterThan(0.3);
  });
});

describe('GlowPalette', () => {
  it('places colors evenly from the start angle and wraps back to the first', () => {
    const palette = new GlowPalette([red, blue], 90);
    close(toRgba(palette.at(90)), red);
    close(toRgba(palette.at(270)), blue);
    // Halfway back to the first color.
    const between = toRgba(palette.at(0));
    expect(between[0]).toBeGreaterThan(0.2);
    expect(between[2]).toBeGreaterThan(0.2);
    close(toRgba(palette.at(450)), red);
  });

  it('blends far-apart hues through the hues between them, not through gray', () => {
    const sky: Rgba = [0.055, 0.647, 0.914, 1];
    const amber: Rgba = [0.851, 0.467, 0.024, 1];
    const middle = toLab(toRgba(new GlowPalette([sky, amber], 0).at(90)));
    expect(Math.hypot(middle[1], middle[2])).toBeGreaterThan(0.08);
  });

  it('turns with the rotation', () => {
    const palette = new GlowPalette([red, blue], 0);
    close(toRgba(palette.at(90, 90)), red);
  });

  it('falls back to white without colors', () => {
    close(toRgba(new GlowPalette([]).at(123)), [1, 1, 1, 1]);
  });
});
