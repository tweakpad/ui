import { toCssEasing } from '../../foundation/easing/css.js';
import { easingFunction } from '../../foundation/easing/evaluate.js';
import { sampleEasing } from '../../foundation/easing/sample.js';
import { parseEasingCurve } from '../../foundation/easing/parse.js';
import { formatEasingNumber } from '../../foundation/easing/serialize.js';
import type { EasingCurve } from '../../foundation/easing/types.js';
import type { EasingAdapter, EasingAdapterContext } from './types.js';

/**
 * The built-in CSS adapter: `cubic-bezier()`, `steps()` and `linear()` verbatim, springs and
 * parametric curves as `linear()` samples; with a duration the output is the transition
 * fragment `<time> <easing>` (`300ms cubic-bezier(…)`).
 */
export const cssEasingAdapter: EasingAdapter = {
  id: 'css',
  label: 'CSS',
  format(curve, context) {
    const easing = context.css;
    if (context.duration === null) return easing;
    return `${formatEasingNumber(context.duration * 1000, 0)}ms ${easing}`;
  },
};

/** The context an adapter receives for a record. */
export function adapterContext(curve: EasingCurve, duration: number | null): EasingAdapterContext {
  const fn = easingFunction(curve);
  return {
    duration,
    css: toCssEasing(curve),
    samples: (count) => sampleEasing(fn, count),
  };
}

/** A parsed expression: the curve and, when the text starts with a time, the duration in seconds. */
export interface EasingExpression {
  readonly curve: EasingCurve;
  readonly duration?: number;
}

/**
 * Parses the expression field back: an optional `<time>` (`ms` or `s`) followed by any easing
 * notation the value model accepts (CSS or not); null when the text is not an easing.
 */
export function parseEasingExpression(text: string): EasingExpression | null {
  const match = /^\s*(?:(\d*\.?\d+)\s*(ms|s)\s+)?(.*?)\s*$/i.exec(text);
  if (!match) return null;
  const curve = parseEasingCurve(match[3] ?? '');
  if (!curve) return null;
  if (match[1] === undefined) return { curve };
  const amount = Number(match[1]);
  return { curve, duration: match[2]!.toLowerCase() === 'ms' ? amount / 1000 : amount };
}
