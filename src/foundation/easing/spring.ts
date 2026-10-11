import { SPRING_MAX_SETTLE, type EasingFunction, type SpringCurve } from './types.js';

/** Spring parameter ranges (Widgets 6.2 Definition, kinds table). */
export const SPRING_PARAMETERS = [
  {
    key: 'mass',
    min: 0.1,
    max: 10,
    step: 0.1,
    smallStep: 0.01,
    largeStep: 1,
    precision: 2,
    default: 1,
  },
  {
    key: 'stiffness',
    min: 1,
    max: 1000,
    step: 1,
    smallStep: 0.1,
    largeStep: 10,
    precision: 1,
    default: 100,
  },
  {
    key: 'damping',
    min: 0,
    max: 100,
    step: 0.5,
    smallStep: 0.1,
    largeStep: 5,
    precision: 1,
    default: 10,
  },
  {
    key: 'velocity',
    min: -10,
    max: 10,
    step: 0.1,
    smallStep: 0.01,
    largeStep: 1,
    precision: 2,
    default: 0,
  },
] as const;

export const DEFAULT_SPRING: SpringCurve = {
  kind: 'spring',
  mass: 1,
  stiffness: 100,
  damping: 10,
  velocity: 0,
};

const REST_DISPLACEMENT = 0.001;
const REST_VELOCITY = 0.01;
const SCAN_STEP = 0.001;

/**
 * Closed-form damped harmonic oscillator released at displacement -1 (position 0, target 1)
 * with the initial velocity; returns the displacement from the target at `t` seconds.
 */
function displacement(curve: SpringCurve): (t: number) => number {
  const mass = Math.max(1e-6, curve.mass);
  const stiffness = Math.max(1e-6, curve.stiffness);
  const damping = Math.max(0, curve.damping);
  const omega = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  const x0 = -1;
  const v0 = curve.velocity;
  if (zeta < 1) {
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const b = (v0 + zeta * omega * x0) / omegaD;
    return (t) =>
      Math.exp(-zeta * omega * t) * (x0 * Math.cos(omegaD * t) + b * Math.sin(omegaD * t));
  }
  if (zeta === 1) {
    const b = v0 + omega * x0;
    return (t) => (x0 + b * t) * Math.exp(-omega * t);
  }
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = -omega * (zeta - root);
  const r2 = -omega * (zeta + root);
  const c1 = (v0 - r2 * x0) / (r1 - r2);
  const c2 = x0 - c1;
  return (t) => c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t);
}

/**
 * Seconds until the spring stays within 0.001 of its target with negligible velocity, capped
 * at ten seconds; an undamped spring never settles and reports the cap.
 */
export function springSettleTime(curve: SpringCurve): number {
  const x = displacement(curve);
  let last = 0;
  let previous = x(0);
  for (let t = SCAN_STEP; t <= SPRING_MAX_SETTLE; t += SCAN_STEP) {
    const current = x(t);
    const speed = Math.abs(current - previous) / SCAN_STEP;
    if (Math.abs(current) >= REST_DISPLACEMENT || speed >= REST_VELOCITY) last = t;
    previous = current;
  }
  return Math.min(SPRING_MAX_SETTLE, Math.max(0.05, last + SCAN_STEP));
}

/** Progression over the spring's own time, in seconds. */
export function springProgression(curve: SpringCurve): (seconds: number) => number {
  const x = displacement(curve);
  return (seconds) => 1 + x(Math.max(0, seconds));
}

/** Progression over normalized time 0–1 of the settle time (Widgets 6.2 kinds table). */
export function springFunction(curve: SpringCurve): EasingFunction {
  const settle = springSettleTime(curve);
  const at = springProgression(curve);
  return (t) => (t <= 0 ? 0 : t >= 1 ? 1 : at(t * settle));
}
