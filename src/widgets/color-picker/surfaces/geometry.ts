import type { Hsv } from '../color/harmony.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** Saturation/brightness from a point in an area box; the x axis mirrors in RTL. */
export function areaToSv(
  point: Point,
  width: number,
  height: number,
  rtl: boolean,
): { s: number; v: number } {
  const x = width > 0 ? clamp(point.x / width, 0, 1) : 0;
  const y = height > 0 ? clamp(point.y / height, 0, 1) : 0;
  return { s: (rtl ? 1 - x : x) * 100, v: (1 - y) * 100 };
}

/** Thumb position (percentages) of saturation/brightness in the area box. */
export function svToArea(s: number, v: number, rtl: boolean): { left: number; top: number } {
  const x = clamp(s, 0, 100);
  return { left: rtl ? 100 - x : x, top: 100 - clamp(v, 0, 100) };
}

/** Hue (clockwise from 3 o'clock, matching `conic-gradient(from 90deg)`) and saturation of a disc point. */
export function discToHs(point: Point, size: number): { h: number; s: number } {
  const radius = size / 2;
  const dx = point.x - radius;
  const dy = point.y - radius;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const hue = ((angle % 360) + 360) % 360;
  const distance = radius > 0 ? Math.hypot(dx, dy) / radius : 0;
  return { h: hue, s: clamp(distance, 0, 1) * 100 };
}

/** Position (percentages of the disc box) of a hue/saturation pair. */
export function hsToDisc(h: number, s: number): { left: number; top: number } {
  const radians = (h * Math.PI) / 180;
  const distance = clamp(s, 0, 100) / 100;
  return {
    left: 50 + 50 * distance * Math.cos(radians),
    top: 50 + 50 * distance * Math.sin(radians),
  };
}

/** Hue of a point on a ring, measured clockwise from 3 o'clock. */
export function ringToHue(point: Point, size: number): number {
  return discToHs(point, size).h;
}

/** True when a point lies in the ring band between the inner and outer radius (CSS px). */
export function inRingBand(point: Point, size: number, thickness: number): boolean {
  const radius = size / 2;
  const distance = Math.hypot(point.x - radius, point.y - radius);
  return distance <= radius && distance >= radius - thickness;
}

export interface TriangleVertices {
  readonly hue: Point;
  readonly white: Point;
  readonly black: Point;
}

/** The HSV triangle inscribed in a circle of `radius` around `center`, hue vertex at `hueDegrees`. */
export function triangleVertices(
  center: Point,
  radius: number,
  hueDegrees: number,
): TriangleVertices {
  const at = (degrees: number): Point => {
    const radians = (degrees * Math.PI) / 180;
    return { x: center.x + radius * Math.cos(radians), y: center.y + radius * Math.sin(radians) };
  };
  return { hue: at(hueDegrees), white: at(hueDegrees + 120), black: at(hueDegrees + 240) };
}

/** Barycentric coordinates of a point relative to a triangle (not clamped). */
export function barycentric(
  point: Point,
  vertices: TriangleVertices,
): { hue: number; white: number; black: number } {
  const { hue: a, white: b, black: c } = vertices;
  const determinant = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
  if (Math.abs(determinant) < 1e-9) return { hue: 1, white: 0, black: 0 };
  const hue = ((b.y - c.y) * (point.x - c.x) + (c.x - b.x) * (point.y - c.y)) / determinant;
  const white = ((c.y - a.y) * (point.x - c.x) + (a.x - c.x) * (point.y - c.y)) / determinant;
  return { hue, white, black: 1 - hue - white };
}

/** Saturation/brightness of a triangle point; points outside clamp to the nearest edge. */
export function triangleToSv(point: Point, vertices: TriangleVertices): { s: number; v: number } {
  let { hue, white, black } = barycentric(point, vertices);
  hue = clamp(hue, 0, 1);
  white = clamp(white, 0, 1);
  black = clamp(black, 0, 1);
  const total = hue + white + black || 1;
  hue /= total;
  white /= total;
  const v = hue + white;
  const s = v > 1e-9 ? hue / v : 0;
  return { s: clamp(s, 0, 1) * 100, v: clamp(v, 0, 1) * 100 };
}

/** The triangle point of a saturation/brightness pair. */
export function svToTriangle(s: number, v: number, vertices: TriangleVertices): Point {
  const brightness = clamp(v, 0, 100) / 100;
  const saturation = clamp(s, 0, 100) / 100;
  const hue = brightness * saturation;
  const white = brightness * (1 - saturation);
  const black = 1 - brightness;
  return {
    x: hue * vertices.hue.x + white * vertices.white.x + black * vertices.black.x,
    y: hue * vertices.hue.y + white * vertices.white.y + black * vertices.black.y,
  };
}

export function wrapHueDegrees(hue: number): number {
  return ((hue % 360) + 360) % 360;
}

export type { Hsv };
