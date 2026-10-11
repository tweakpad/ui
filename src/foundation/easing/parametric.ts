import type {
  EasingDirection,
  EasingFunction,
  EasingParameterDefinition,
  ParametricCurve,
  ParametricFamily,
  StepPosition,
} from './types.js';

/** Parameter definitions per family (Widgets 6.2 Definition, kinds table). */
const PARAMETERS: Readonly<Record<ParametricFamily, readonly EasingParameterDefinition[]>> = {
  sine: [],
  power: [
    {
      key: 'exponent',
      min: 1,
      max: 10,
      step: 0.1,
      smallStep: 0.01,
      largeStep: 1,
      precision: 2,
      default: 2,
    },
  ],
  expo: [],
  circ: [],
  back: [
    {
      key: 'overshoot',
      min: 0,
      max: 5,
      step: 0.05,
      smallStep: 0.01,
      largeStep: 0.5,
      precision: 3,
      default: 1.70158,
    },
  ],
  elastic: [
    {
      key: 'amplitude',
      min: 1,
      max: 3,
      step: 0.05,
      smallStep: 0.01,
      largeStep: 0.5,
      precision: 2,
      default: 1,
    },
    {
      key: 'period',
      min: 0.1,
      max: 1,
      step: 0.01,
      smallStep: 0.001,
      largeStep: 0.1,
      precision: 3,
      default: 0.3,
    },
  ],
  bounce: [],
  steps: [
    {
      key: 'count',
      min: 1,
      max: 50,
      step: 1,
      smallStep: 1,
      largeStep: 5,
      precision: 0,
      default: 4,
    },
  ],
};

export function parametricParameterDefinitions(
  family: ParametricFamily,
): readonly EasingParameterDefinition[] {
  return PARAMETERS[family];
}

/** The family's parameters with defaults filled in and values clamped to their ranges. */
export function normalizeParameters(
  family: ParametricFamily,
  parameters: Readonly<Record<string, number>> = {},
): Readonly<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const definition of PARAMETERS[family]) {
    const raw = parameters[definition.key];
    const value = Number.isFinite(raw) ? (raw as number) : definition.default;
    result[definition.key] = Math.min(definition.max, Math.max(definition.min, value));
  }
  return result;
}

const STEP_POSITION_BY_DIRECTION: Readonly<Record<EasingDirection, StepPosition>> = {
  in: 'jump-start',
  out: 'jump-end',
  'in-out': 'jump-both',
  'out-in': 'jump-none',
};
const DIRECTION_BY_STEP_POSITION: Readonly<Record<StepPosition, EasingDirection>> = {
  'jump-start': 'in',
  'jump-end': 'out',
  'jump-both': 'in-out',
  'jump-none': 'out-in',
};
export const stepPositionOf = (direction: EasingDirection): StepPosition =>
  STEP_POSITION_BY_DIRECTION[direction];
export const directionOfStepPosition = (position: StepPosition): EasingDirection =>
  DIRECTION_BY_STEP_POSITION[position];

const bounceOut = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (t < 1 / d1) return n1 * t * t;
  if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
  if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
  return n1 * (t -= 2.625 / d1) * t + 0.984375;
};

/** The "in" form of a family (Penner easing formulas). */
function easeIn(
  family: ParametricFamily,
  parameters: Readonly<Record<string, number>>,
): EasingFunction {
  switch (family) {
    case 'sine':
      return (t) => 1 - Math.cos((t * Math.PI) / 2);
    case 'power': {
      const exponent = parameters.exponent ?? 2;
      return (t) => t ** exponent;
    }
    case 'expo':
      return (t) => (t <= 0 ? 0 : 2 ** (10 * t - 10));
    case 'circ':
      return (t) => 1 - Math.sqrt(Math.max(0, 1 - t * t));
    case 'back': {
      const s = parameters.overshoot ?? 1.70158;
      return (t) => (s + 1) * t * t * t - s * t * t;
    }
    case 'elastic': {
      const amplitude = Math.max(1, parameters.amplitude ?? 1);
      const period = parameters.period ?? 0.3;
      const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
      return (t) =>
        t <= 0
          ? 0
          : t >= 1
            ? 1
            : -(amplitude * 2 ** (10 * (t - 1)) * Math.sin(((t - 1 - s) * 2 * Math.PI) / period));
    }
    case 'bounce':
      return (t) => 1 - bounceOut(1 - t);
    case 'steps':
      // Steps are positioned, not directed; see `stepsFunction`.
      return (t) => t;
  }
}

/** Direction transforms applied to an "in" function. */
export function withDirection(fn: EasingFunction, direction: EasingDirection): EasingFunction {
  switch (direction) {
    case 'in':
      return fn;
    case 'out':
      return (t) => 1 - fn(1 - t);
    case 'in-out':
      return (t) => (t < 0.5 ? fn(2 * t) / 2 : 1 - fn(2 - 2 * t) / 2);
    case 'out-in':
      return (t) => (t < 0.5 ? (1 - fn(1 - 2 * t)) / 2 : (1 + fn(2 * t - 1)) / 2);
  }
}

/** CSS `steps()` staircase; `jump-none` needs at least two steps. */
export function stepsFunction(count: number, position: StepPosition): EasingFunction {
  const n = Math.max(1, Math.round(count));
  switch (position) {
    case 'jump-start':
      return (t) => (t <= 0 ? 0 : Math.min(1, Math.ceil(t * n) / n));
    case 'jump-end':
      return (t) => (t >= 1 ? 1 : Math.max(0, Math.floor(t * n) / n));
    case 'jump-both':
      return (t) => (t >= 1 ? 1 : t <= 0 ? 0 : (Math.floor(t * n) + 1) / (n + 1));
    case 'jump-none': {
      const m = Math.max(2, n);
      return (t) => (t >= 1 ? 1 : Math.max(0, Math.floor(t * m) / (m - 1)));
    }
  }
}

/** The progression function of a parametric record. */
export function parametricFunction(curve: ParametricCurve): EasingFunction {
  const parameters = normalizeParameters(curve.family, curve.parameters);
  if (curve.family === 'steps')
    return stepsFunction(parameters.count ?? 4, stepPositionOf(curve.direction));
  const fn = withDirection(easeIn(curve.family, parameters), curve.direction);
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : fn(t));
}
