/**
 * Easing curve records (UI Widgets Specification 6.2 Definition): the progression of an
 * animated value over normalized time. Four kinds share one canonical string notation each;
 * parameters are kept unrounded until serialization.
 */
export type EasingKind = 'bezier' | 'spring' | 'parametric' | 'custom';
export const EASING_KINDS: readonly EasingKind[] = ['bezier', 'spring', 'parametric', 'custom'];

export type EasingDirection = 'in' | 'out' | 'in-out' | 'out-in';
export const EASING_DIRECTIONS: readonly EasingDirection[] = ['in', 'out', 'in-out', 'out-in'];

/** Formula families; `steps` is the CSS staircase whose position follows the direction. */
export type ParametricFamily =
  'sine' | 'power' | 'expo' | 'circ' | 'back' | 'elastic' | 'bounce' | 'steps';
export const PARAMETRIC_FAMILIES: readonly ParametricFamily[] = [
  'sine',
  'power',
  'expo',
  'circ',
  'back',
  'elastic',
  'bounce',
  'steps',
];

export type StepPosition = 'jump-start' | 'jump-end' | 'jump-both' | 'jump-none';
export const STEP_POSITIONS: readonly StepPosition[] = [
  'jump-start',
  'jump-end',
  'jump-both',
  'jump-none',
];

/** One point of a custom (`linear()`) curve: input time 0–1, output progression. */
export interface EasingPoint {
  readonly input: number;
  readonly output: number;
}

export interface BezierCurve {
  readonly kind: 'bezier';
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}
export interface SpringCurve {
  readonly kind: 'spring';
  readonly mass: number;
  readonly stiffness: number;
  readonly damping: number;
  readonly velocity: number;
}
export interface ParametricCurve {
  readonly kind: 'parametric';
  readonly family: ParametricFamily;
  readonly direction: EasingDirection;
  /** Family parameters by key (`exponent`, `overshoot`, `amplitude`, `period`, `count`). */
  readonly parameters: Readonly<Record<string, number>>;
}
export interface CustomCurve {
  readonly kind: 'custom';
  readonly points: readonly EasingPoint[];
}
export type EasingCurve = BezierCurve | SpringCurve | ParametricCurve | CustomCurve;

export type EasingFunction = (progress: number) => number;

/** Editable numeric parameter of a curve kind, in display units. */
export interface EasingParameterDefinition {
  readonly key: string;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly smallStep: number;
  readonly largeStep: number;
  readonly precision: number;
  readonly default: number;
}

/** Progression bounds of a curve over 0–1, never narrower than the unit range. */
export interface ProgressionRange {
  readonly min: number;
  readonly max: number;
}

/** Bounds the editor applies to progression coordinates (handles and custom points). */
export const PROGRESSION_MIN = -1;
export const PROGRESSION_MAX = 2;
/** Springs never run longer than this (Web Animations needs a finite duration). */
export const SPRING_MAX_SETTLE = 10;
