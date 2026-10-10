import { convertColor } from './convert.js';
import type { ColorValue } from './types.js';

const linear = (channel: number): number =>
  channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

/** WCAG relative luminance of a color's sRGB projection (0 black … 1 white). */
export function relativeLuminance(value: ColorValue): number {
  const [r = 0, g = 0, b = 0] = convertColor(value, 'srgb').coords;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** A mark color that reads on the given fill: black on light fills, white on dark ones. */
export function contrastColor(value: ColorValue): string {
  return relativeLuminance(value) > 0.35 ? 'rgb(0 0 0)' : 'rgb(255 255 255)';
}
