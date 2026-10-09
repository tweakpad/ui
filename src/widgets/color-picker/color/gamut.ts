import { convertColor } from './convert.js';
import { color, type ColorValue } from './types.js';

const GAMUT_EPSILON = 1e-6;
const JND = 0.02;
const CHROMA_EPSILON = 0.0001;

/** True when the color lies inside the sRGB gamut (with a small tolerance). */
export function inGamut(value: ColorValue, epsilon = GAMUT_EPSILON): boolean {
  const { coords } = convertColor(value, 'srgb');
  return coords.every((channel) => channel >= -epsilon && channel <= 1 + epsilon);
}

/** Clips sRGB coordinates to 0–1. */
export function clipToGamut(value: ColorValue): ColorValue {
  const srgb = convertColor(value, 'srgb');
  return color(
    'srgb',
    [
      Math.min(1, Math.max(0, srgb.coords[0])),
      Math.min(1, Math.max(0, srgb.coords[1])),
      Math.min(1, Math.max(0, srgb.coords[2])),
    ],
    srgb.alpha,
  );
}

/** Euclidean distance in OKLab. */
export function deltaEOK(a: ColorValue, b: ColorValue): number {
  const first = convertColor(a, 'oklab');
  const second = convertColor(b, 'oklab');
  return Math.hypot(
    first.coords[0] - second.coords[0],
    first.coords[1] - second.coords[1],
    first.coords[2] - second.coords[2],
  );
}

/**
 * CSS Color 4 §13.2 gamut mapping to sRGB: reduces OKLCH chroma by bisection until the
 * clipped candidate is within the just-noticeable difference, preserving lightness and
 * hue. In-gamut colors are returned converted to sRGB without change.
 */
export function toGamut(value: ColorValue): ColorValue {
  if (inGamut(value)) return convertColor(value, 'srgb');
  const oklch = convertColor(value, 'oklch');
  const [lightness, chroma, hue] = oklch.coords;
  if (lightness >= 1) return color('srgb', [1, 1, 1], value.alpha);
  if (lightness <= 0) return color('srgb', [0, 0, 0], value.alpha);
  let min = 0;
  let max = chroma;
  let minInGamut = true;
  let current = oklch;
  while (max - min > CHROMA_EPSILON) {
    const candidate = (min + max) / 2;
    current = color('oklch', [lightness, candidate, hue], value.alpha);
    if (minInGamut && inGamut(current)) {
      min = candidate;
      continue;
    }
    const clipped = clipToGamut(current);
    const difference = deltaEOK(clipped, current);
    if (difference < JND) {
      if (JND - difference < CHROMA_EPSILON) return clipped;
      minInGamut = false;
      min = candidate;
    } else max = candidate;
  }
  return clipToGamut(current);
}
