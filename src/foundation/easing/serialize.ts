import { normalizePoints } from './evaluate.js';
import {
  normalizeParameters,
  parametricParameterDefinitions,
  stepPositionOf,
} from './parametric.js';
import type { EasingCurve } from './types.js';

/** At most `decimals` decimals, trailing zeros removed, `-0` folded to `0`. */
export function formatEasingNumber(value: number, decimals = 3): string {
  const text = Number(value.toFixed(decimals)).toString();
  return text === '-0' ? '0' : text;
}

/** The canonical notation of a record (Widgets 6.2 `uwg-ee-req-def-2`). */
export function serializeEasingCurve(curve: EasingCurve): string {
  switch (curve.kind) {
    case 'bezier':
      return `cubic-bezier(${[curve.x1, curve.y1, curve.x2, curve.y2].map((n) => formatEasingNumber(n)).join(', ')})`;
    case 'spring': {
      const parts = [curve.mass, curve.stiffness, curve.damping].map((n) => formatEasingNumber(n));
      if (curve.velocity) parts.push(formatEasingNumber(curve.velocity));
      return `spring(${parts.join(' ')})`;
    }
    case 'parametric': {
      const parameters = normalizeParameters(curve.family, curve.parameters);
      if (curve.family === 'steps')
        return `steps(${Math.round(parameters.count ?? 4)}, ${stepPositionOf(curve.direction)})`;
      const values = parametricParameterDefinitions(curve.family).map((definition) =>
        formatEasingNumber(parameters[definition.key]!),
      );
      return `${curve.family}(${[curve.direction, ...values].join(' ')})`;
    }
    case 'custom': {
      const points = normalizePoints(curve.points);
      const last = points.length - 1;
      return `linear(${points
        .map((point, index) => {
          const output = formatEasingNumber(point.output);
          if ((index === 0 && point.input === 0) || (index === last && point.input === 1))
            return output;
          return `${output} ${formatEasingNumber(point.input * 100, 1)}%`;
        })
        .join(', ')})`;
    }
  }
}
