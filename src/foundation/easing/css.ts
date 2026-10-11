import { clampUnit, easingFunction } from './evaluate.js';
import { stepPositionOf, normalizeParameters } from './parametric.js';
import { linearPoints } from './sample.js';
import { formatEasingNumber, serializeEasingCurve } from './serialize.js';
import type { EasingCurve, EasingPoint } from './types.js';

export interface CssEasingOptions {
  /** Upper bound of `linear()` points for sampled kinds; default 100. */
  readonly maximumPoints?: number;
  /** Simplification tolerance in progression units; default 0.002. */
  readonly tolerance?: number;
}

/** A CSS `linear()` function from ordered points. */
export function cssLinear(points: readonly EasingPoint[]): string {
  return serializeEasingCurve({ kind: 'custom', points });
}

/**
 * The CSS timing function of a record: `cubic-bezier()`, `steps()` and `linear()` verbatim,
 * springs and parametric families sampled into `linear()` (Widgets 6.2 Definition note).
 */
export function toCssEasing(curve: EasingCurve, options: CssEasingOptions = {}): string {
  switch (curve.kind) {
    case 'bezier':
      return `cubic-bezier(${[clampUnit(curve.x1), curve.y1, clampUnit(curve.x2), curve.y2].map((n) => formatEasingNumber(n)).join(', ')})`;
    case 'custom':
      return serializeEasingCurve(curve);
    case 'parametric':
      if (curve.family === 'steps') {
        const parameters = normalizeParameters('steps', curve.parameters);
        return `steps(${Math.round(parameters.count ?? 4)}, ${stepPositionOf(curve.direction)})`;
      }
      return cssLinear(
        linearPoints(easingFunction(curve), {
          maximum: options.maximumPoints ?? 100,
          tolerance: options.tolerance ?? 0.002,
        }),
      );
    case 'spring':
      return cssLinear(
        linearPoints(easingFunction(curve), {
          maximum: options.maximumPoints ?? 100,
          tolerance: options.tolerance ?? 0.002,
        }),
      );
  }
}

/** True when the owner window parses the text as an animation timing function. */
export function cssEasingSupported(
  text: string,
  owner: (Window & typeof globalThis) | null | undefined,
): boolean {
  const css = owner?.CSS;
  if (!css?.supports) return true;
  return css.supports('animation-timing-function', text);
}
