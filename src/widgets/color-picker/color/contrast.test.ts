import { describe, expect, it } from 'vitest';
import { contrastColor, relativeLuminance } from './contrast.js';
import { parseColor } from './parse.js';

describe('contrast', () => {
  it('measures relative luminance on the sRGB projection', () => {
    expect(relativeLuminance(parseColor('#ffffff')!)).toBeCloseTo(1, 5);
    expect(relativeLuminance(parseColor('#000000')!)).toBeCloseTo(0, 5);
    expect(relativeLuminance(parseColor('#808080')!)).toBeCloseTo(0.2159, 3);
    expect(relativeLuminance(parseColor('oklch(1 0 0)')!)).toBeCloseTo(1, 2);
  });
  it('picks a black mark on light fills and a white mark on dark ones', () => {
    expect(contrastColor(parseColor('#fdd835')!)).toBe('rgb(0 0 0)');
    expect(contrastColor(parseColor('#2622a5')!)).toBe('rgb(255 255 255)');
  });
});
