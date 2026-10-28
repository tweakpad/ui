import { cubicBezier } from '../motion-easing.js';
import { easingFunction } from './evaluate.js';
import { normalizeParameters } from './parametric.js';
import { linearPoints, sampleEasing } from './sample.js';
import { DEFAULT_SPRING } from './spring.js';
import {
  EASING_DIRECTIONS,
  PROGRESSION_MAX,
  PROGRESSION_MIN,
  type BezierCurve,
  type EasingCurve,
  type EasingDirection,
  type EasingFunction,
  type EasingKind,
  type ParametricCurve,
  type ParametricFamily,
} from './types.js';

type Quad = readonly [number, number, number, number];

/** Known cubic Bézier approximations of the parametric families at their default parameters. */
const BEZIER_SEEDS: Readonly<Record<string, Quad>> = {
  'sine:in': [0.12, 0, 0.39, 0],
  'sine:out': [0.61, 1, 0.88, 1],
  'sine:in-out': [0.37, 0, 0.63, 1],
  'power:in': [0.11, 0, 0.5, 0],
  'power:out': [0.5, 1, 0.89, 1],
  'power:in-out': [0.45, 0, 0.55, 1],
  'expo:in': [0.7, 0, 0.84, 0],
  'expo:out': [0.16, 1, 0.3, 1],
  'expo:in-out': [0.87, 0, 0.13, 1],
  'circ:in': [0.55, 0, 1, 0.45],
  'circ:out': [0, 0.55, 0.45, 1],
  'circ:in-out': [0.85, 0, 0.15, 1],
  'back:in': [0.36, 0, 0.66, -0.56],
  'back:out': [0.34, 1.56, 0.64, 1],
  'back:in-out': [0.68, -0.6, 0.32, 1.6],
};
const SAMPLES = 33;

/**
 * Whether a parametric record is a single ease a cubic Bézier can stand in for: the families with
 * a known Bézier approximation. Elastic, bounce and steps need points.
 */
export function hasBezierFit(curve: ParametricCurve): boolean {
  return `${curve.family}:in` in BEZIER_SEEDS;
}

const squaredError = (a: EasingFunction, b: EasingFunction): number => {
  let error = 0;
  for (let index = 0; index <= SAMPLES; index++) {
    const t = index / SAMPLES;
    const d = a(t) - b(t);
    error += d * d;
  }
  return error;
};

/** Least-squares cubic Bézier fit of a progression function by coordinate descent. */
export function fitBezier(fn: EasingFunction, seed: Quad = [0.42, 0, 0.58, 1]): BezierCurve {
  let best: number[] = [...seed];
  let bestError = squaredError(cubicBezier(...(best as unknown as Quad)), fn);
  let step = 0.25;
  const bounds: ReadonlyArray<readonly [number, number]> = [
    [0, 1],
    [PROGRESSION_MIN, PROGRESSION_MAX],
    [0, 1],
    [PROGRESSION_MIN, PROGRESSION_MAX],
  ];
  for (let round = 0; round < 40; round++) {
    let improved = false;
    for (let index = 0; index < 4; index++)
      for (const direction of [-1, 1]) {
        const candidate = [...best];
        const [low, high] = bounds[index]!;
        candidate[index] = Math.min(high, Math.max(low, candidate[index]! + direction * step));
        const error = squaredError(cubicBezier(...(candidate as unknown as Quad)), fn);
        if (error < bestError - 1e-12) {
          best = candidate;
          bestError = error;
          improved = true;
        }
      }
    if (!improved) step /= 2;
    if (step < 1e-4) break;
  }
  const [x1, y1, x2, y2] = best as unknown as Quad;
  return { kind: 'bezier', x1, y1, x2, y2 };
}

/** The parametric record (default parameters) whose progression is closest to `fn`. */
export function closestParametric(fn: EasingFunction): ParametricCurve {
  const families: readonly ParametricFamily[] = [
    'sine',
    'power',
    'expo',
    'circ',
    'back',
    'elastic',
    'bounce',
  ];
  let best: ParametricCurve | undefined;
  let bestError = Number.POSITIVE_INFINITY;
  for (const family of families)
    for (const direction of EASING_DIRECTIONS) {
      const candidate: ParametricCurve = {
        kind: 'parametric',
        family,
        direction,
        parameters: normalizeParameters(family),
      };
      const error = squaredError(easingFunction(candidate), fn);
      if (error < bestError) {
        bestError = error;
        best = candidate;
      }
    }
  return best!;
}

/**
 * Converts a record to another kind for the kind Tabs (Widgets 6.2 `uwg-ee-req-prop-1`): a
 * Bézier fit, a simplified point list, the default spring, or the closest parametric preset.
 */
export function convertEasingCurve(curve: EasingCurve, kind: EasingKind): EasingCurve {
  if (curve.kind === kind) return curve;
  const fn = easingFunction(curve);
  switch (kind) {
    case 'bezier': {
      const seed =
        curve.kind === 'parametric'
          ? BEZIER_SEEDS[`${curve.family}:${curve.direction as EasingDirection}`]
          : undefined;
      return fitBezier(fn, seed);
    }
    case 'custom': {
      const points =
        curve.kind === 'parametric' && curve.family === 'steps'
          ? sampleEasing(
              fn,
              2 * Math.round(normalizeParameters('steps', curve.parameters).count ?? 4) + 1,
            )
          : linearPoints(fn, { maximum: 24, tolerance: 0.004 });
      return { kind: 'custom', points };
    }
    case 'spring':
      return DEFAULT_SPRING;
    case 'parametric':
      return closestParametric(fn);
  }
}
