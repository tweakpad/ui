import { cubicBezier } from '../motion-easing.js';
import { parametricFunction } from './parametric.js';
import { springFunction } from './spring.js';
import type {
  CustomCurve,
  EasingCurve,
  EasingFunction,
  EasingPoint,
  ProgressionRange,
} from './types.js';

/** CSS `linear()` interpolation between ordered points; the input is clamped to 0–1. */
export function linearFunction(points: readonly EasingPoint[]): EasingFunction {
  const ordered = normalizePoints(points);
  return (t) => {
    const input = Math.min(1, Math.max(0, t));
    if (input <= ordered[0]!.input) return ordered[0]!.output;
    for (let index = 1; index < ordered.length; index++) {
      const next = ordered[index]!;
      if (input > next.input) continue;
      const previous = ordered[index - 1]!;
      const span = next.input - previous.input;
      if (span <= 0) return next.output;
      const ratio = (input - previous.input) / span;
      return previous.output + (next.output - previous.output) * ratio;
    }
    return ordered[ordered.length - 1]!.output;
  };
}

/** At least two points, inputs clamped to 0–1 and made non-decreasing, ends at 0% and 100%. */
export function normalizePoints(points: readonly EasingPoint[]): readonly EasingPoint[] {
  const list = points
    .filter((point) => Number.isFinite(point.input) && Number.isFinite(point.output))
    .map((point) => ({ input: Math.min(1, Math.max(0, point.input)), output: point.output }));
  if (list.length === 0)
    return [
      { input: 0, output: 0 },
      { input: 1, output: 1 },
    ];
  if (list.length === 1) list.push({ input: 1, output: list[0]!.output });
  let floor = 0;
  const monotonic = list.map((point) => {
    floor = Math.max(floor, point.input);
    return { input: floor, output: point.output };
  });
  monotonic[0] = { input: 0, output: monotonic[0]!.output };
  monotonic[monotonic.length - 1] = { input: 1, output: monotonic[monotonic.length - 1]!.output };
  return monotonic;
}

/** The progression function of a record: never clamped to 0–1 (Widgets 6.2 `uwg-ee-req-def-3`). */
export function easingFunction(curve: EasingCurve): EasingFunction {
  switch (curve.kind) {
    case 'bezier':
      return cubicBezier(clampUnit(curve.x1), curve.y1, clampUnit(curve.x2), curve.y2);
    case 'spring':
      return springFunction(curve);
    case 'parametric':
      return parametricFunction(curve);
    case 'custom':
      return linearFunction((curve as CustomCurve).points);
  }
}

export const clampUnit = (value: number): number => Math.min(1, Math.max(0, value));

/** Lowest and highest progression over 0–1, never narrower than the unit range. */
export function progressionRange(fn: EasingFunction, samples = 200): ProgressionRange {
  let min = 0;
  let max = 1;
  for (let index = 0; index <= samples; index++) {
    const value = fn(index / samples);
    if (value < min) min = value;
    if (value > max) max = value;
  }
  return { min, max };
}
