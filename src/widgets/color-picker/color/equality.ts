import { convertColor } from './convert.js';
import type { ColorValue } from './types.js';

const POLAR_HUE_INDEX: Readonly<Partial<Record<ColorValue['space'], number>>> = {
  hsl: 0,
  hsv: 0,
  hwb: 0,
  lch: 2,
  oklch: 2,
};

/** True when the hue of a polar color carries no information. */
function achromatic(value: ColorValue, tolerance: number): boolean {
  switch (value.space) {
    case 'hsl':
    case 'hsv':
    case 'lch':
    case 'oklch':
      return Math.abs(value.coords[1]) <= tolerance;
    case 'hwb':
      return value.coords[1] + value.coords[2] >= 100 - tolerance;
    default:
      return false;
  }
}

/** Smallest angular distance between two hues in degrees. */
export function hueDistance(a: number, b: number): number {
  const difference = Math.abs(((a - b) % 360) + 360) % 360;
  return Math.min(difference, 360 - difference);
}

/**
 * Compares two colors in the space of the first within `tolerance`. Polar hues compare
 * circularly and are ignored when the color is achromatic in that space.
 */
export function colorEquals(a: ColorValue, b: ColorValue, tolerance = 1e-7): boolean {
  const other = convertColor(b, a.space);
  if (Math.abs(a.alpha - other.alpha) > tolerance) return false;
  const hueIndex = POLAR_HUE_INDEX[a.space];
  const ignoreHue = hueIndex !== undefined && achromatic(a, tolerance);
  for (let index = 0; index < a.coords.length; index++) {
    const mine = a.coords[index] ?? 0;
    const theirs = other.coords[index] ?? 0;
    if (index === hueIndex) {
      if (!ignoreHue && hueDistance(mine, theirs) > tolerance) return false;
      continue;
    }
    if (Math.abs(mine - theirs) > tolerance) return false;
  }
  return true;
}
