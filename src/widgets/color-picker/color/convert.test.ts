import { describe, expect, it } from 'vitest';
import { convertColor, mixColors, normalizeHue } from './convert.js';
import { color, type ColorSpace } from './types.js';

const close = (actual: readonly number[], expected: readonly number[], digits = 4): void => {
  expect(actual.length).toBe(expected.length);
  actual.forEach((value, index) => expect(value).toBeCloseTo(expected[index]!, digits));
};

describe('color conversion graph', () => {
  it('maps the reference points of white and red', () => {
    const white = color('srgb', [1, 1, 1]);
    close(convertColor(white, 'xyz-d65').coords, [0.9505, 1, 1.089], 3);
    close(convertColor(white, 'oklab').coords, [1, 0, 0], 3);
    close(convertColor(white, 'lab').coords, [100, 0, 0], 2);
    const red = color('srgb', [1, 0, 0]);
    close(convertColor(red, 'oklch').coords, [0.628, 0.2577, 29.23], 2);
    close(convertColor(red, 'lab').coords, [54.29, 80.8, 69.89], 1);
    close(convertColor(red, 'hsl').coords, [0, 100, 50]);
    close(convertColor(red, 'hsv').coords, [0, 100, 100]);
    close(convertColor(red, 'hwb').coords, [0, 0, 0]);
    close(convertColor(red, 'cmyk').coords, [0, 100, 100, 0]);
  });

  it('round-trips an sRGB grid through every space within 1e-5', () => {
    const spaces: ColorSpace[] = [
      'oklch',
      'oklab',
      'lab',
      'lch',
      'hsl',
      'hsv',
      'hwb',
      'cmyk',
      'xyz-d50',
    ];
    for (let r = 0; r <= 16; r += 4)
      for (let g = 0; g <= 16; g += 4)
        for (let b = 0; b <= 16; b += 4) {
          const source = color('srgb', [r / 16, g / 16, b / 16], 0.5);
          for (const space of spaces) {
            const back = convertColor(convertColor(source, space), 'srgb');
            back.coords.forEach((channel, index) =>
              expect(Math.abs(channel - source.coords[index]!)).toBeLessThan(1e-5),
            );
            expect(back.alpha).toBe(0.5);
          }
        }
  });

  it('gives achromatic colors hue 0 and keeps hsl/hsv/hwb consistent', () => {
    const gray = color('srgb', [0.5, 0.5, 0.5]);
    expect(convertColor(gray, 'hsl').coords[0]).toBe(0);
    expect(convertColor(gray, 'oklch').coords[2]).toBe(0);
    close(convertColor(color('hsl', [120, 100, 50]), 'srgb').coords, [0, 1, 0]);
    close(convertColor(color('hsv', [240, 100, 100]), 'srgb').coords, [0, 0, 1]);
    close(convertColor(color('hwb', [0, 50, 50]), 'srgb').coords, [0.5, 0.5, 0.5]);
    close(convertColor(color('hwb', [0, 80, 80]), 'srgb').coords, [0.5, 0.5, 0.5]);
    close(convertColor(color('cmyk', [0, 0, 0, 100]), 'srgb').coords, [0, 0, 0]);
    close(convertColor(color('srgb', [0, 0, 0]), 'cmyk').coords, [0, 0, 0, 100]);
  });

  it('normalizes hues and mixes in OKLab', () => {
    expect(normalizeHue(-120)).toBe(240);
    expect(normalizeHue(720)).toBe(0);
    const mixed = mixColors(color('srgb', [0, 0, 0]), color('srgb', [1, 1, 1]), 0.5);
    expect(mixed.space).toBe('oklab');
    expect(mixed.coords[0]).toBeCloseTo(0.5, 6);
    const rgb = convertColor(mixed, 'srgb').coords;
    expect(rgb[0]).toBeCloseTo(rgb[1], 6);
    expect(rgb[1]).toBeCloseTo(rgb[2], 6);
  });
});
