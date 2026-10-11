import type { EasingFunction, EasingPoint } from './types.js';

/** `count` evenly spaced samples (at least two) of a progression function. */
export function sampleEasing(fn: EasingFunction, count: number): readonly EasingPoint[] {
  const n = Math.max(2, Math.round(count));
  const points: EasingPoint[] = [];
  for (let index = 0; index < n; index++) {
    const input = index / (n - 1);
    points.push({ input, output: fn(input) });
  }
  return points;
}

/** Ramer–Douglas–Peucker simplification keeping every point farther than `tolerance`. */
export function simplifyPoints(
  points: readonly EasingPoint[],
  tolerance: number,
): readonly EasingPoint[] {
  if (points.length <= 2) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    const a = points[start]!;
    const b = points[end]!;
    let farthest = -1;
    let distance = tolerance;
    for (let index = start + 1; index < end; index++) {
      const d = perpendicularDistance(points[index]!, a, b);
      if (d > distance) {
        distance = d;
        farthest = index;
      }
    }
    if (farthest < 0) continue;
    keep[farthest] = true;
    stack.push([start, farthest], [farthest, end]);
  }
  return points.filter((_, index) => keep[index]);
}

function perpendicularDistance(point: EasingPoint, a: EasingPoint, b: EasingPoint): number {
  const dx = b.input - a.input;
  const dy = b.output - a.output;
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point.input - a.input, point.output - a.output);
  return (
    Math.abs(dy * point.input - dx * point.output + b.input * a.output - b.output * a.input) /
    length
  );
}

/** Samples a function and simplifies the result to at most `maximum` points. */
export function linearPoints(
  fn: EasingFunction,
  options: { samples?: number; tolerance?: number; maximum?: number } = {},
): readonly EasingPoint[] {
  const samples = sampleEasing(fn, options.samples ?? 200);
  let tolerance = options.tolerance ?? 0.002;
  let points = simplifyPoints(samples, tolerance);
  const maximum = options.maximum ?? 100;
  while (points.length > maximum) {
    tolerance *= 1.5;
    points = simplifyPoints(samples, tolerance);
  }
  return points;
}
