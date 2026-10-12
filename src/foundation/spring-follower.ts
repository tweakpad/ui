import { SPRING_PARAMETERS } from './easing/spring.js';

/**
 * A retargetable two-dimensional spring follower (Foundation `cc-follower`): a damped spring
 * integrated toward a moving target, used by Custom cursor to trail the pointer. Unlike the
 * closed-form spring curve in `easing/spring.ts`, which is a timing function from 0 to 1, this
 * keeps position and velocity between frames so that the target can move at any time.
 */
export interface SpringParameters {
  /** Spring stiffness, 1 through 1000. */
  readonly stiffness: number;
  /** Damping coefficient, 0 through 100. */
  readonly damping: number;
  /** Mass, 0.1 through 10. */
  readonly mass: number;
}

export interface SpringRest {
  /** Speed, in units per second, below which the follower may settle. */
  readonly restSpeed: number;
  /** Distance to the target below which the follower may settle. */
  readonly restDelta: number;
}

/** Near-critical damping: a visible trail without wobble. */
export const DEFAULT_FOLLOWER: SpringParameters = { stiffness: 170, damping: 26, mass: 1 };
export const DEFAULT_REST: SpringRest = { restSpeed: 1, restDelta: 0.1 };

/** Longest integration step; stiff springs take shorter steps so that ω·dt stays small. */
const SUB_STEP = 1 / 120;
const MAX_OMEGA_STEP = 0.25;
/** A backgrounded tab resumes with at most this much simulated time. */
const MAX_ELAPSED = 100;

const ranges = Object.fromEntries(
  SPRING_PARAMETERS.map((parameter) => [parameter.key, parameter]),
) as Record<string, { min: number; max: number }>;

export type SpringInput = Partial<Record<keyof SpringParameters, number | null | undefined>>;

/**
 * Resolves spring parameters from partial, possibly invalid input: a non-finite or missing value
 * keeps `base`, an out-of-range value is clamped. `report` is called once per key that was not
 * usable as given, with the value that was offered.
 */
export function clampSpring(
  input: SpringInput,
  base: SpringParameters = DEFAULT_FOLLOWER,
  report?: (key: keyof SpringParameters, value: unknown) => void,
): SpringParameters {
  const resolve = (key: keyof SpringParameters): number => {
    const offered = input[key];
    if (offered === undefined || offered === null) return base[key];
    const range = ranges[key]!;
    if (typeof offered !== 'number' || !Number.isFinite(offered)) {
      report?.(key, offered);
      return base[key];
    }
    if (offered < range.min || offered > range.max) {
      report?.(key, offered);
      return Math.min(range.max, Math.max(range.min, offered));
    }
    return offered;
  };
  return { stiffness: resolve('stiffness'), damping: resolve('damping'), mass: resolve('mass') };
}

export class SpringFollower2D {
  x = 0;
  y = 0;
  /** Velocity in units per second. */
  vx = 0;
  vy = 0;
  /** The target the follower moves toward. */
  tx = 0;
  ty = 0;
  /** True while the follower rests exactly on its target. */
  settled = true;
  #parameters: SpringParameters;
  #rest: SpringRest;

  constructor(parameters: SpringParameters = DEFAULT_FOLLOWER, rest: SpringRest = DEFAULT_REST) {
    this.#parameters = parameters;
    this.#rest = rest;
  }

  get parameters(): SpringParameters {
    return this.#parameters;
  }

  get rest(): SpringRest {
    return this.#rest;
  }

  /** Swaps the physics; position and velocity carry over. */
  setParameters(parameters: SpringParameters): void {
    this.#parameters = parameters;
  }

  setRest(rest: SpringRest): void {
    this.#rest = rest;
  }

  /** Moves the target; the follower wakes when the target left its rest distance. */
  setTarget(x: number, y: number): void {
    this.tx = x;
    this.ty = y;
    if (this.settled && Math.hypot(x - this.x, y - this.y) >= this.#rest.restDelta)
      this.settled = false;
  }

  /** Jumps to a point (the target by default) with no velocity, settled. */
  snap(x = this.tx, y = this.ty): void {
    this.tx = this.x = x;
    this.ty = this.y = y;
    this.vx = this.vy = 0;
    this.settled = true;
  }

  /**
   * Integrates `elapsed` milliseconds toward the target and reports whether the follower is
   * still moving. Semi-implicit Euler with the damping term taken implicitly, so that heavy
   * damping on a light mass cannot flip the velocity, in sub-steps short enough for the
   * stiffness in effect.
   */
  step(elapsed: number): boolean {
    if (this.settled) return false;
    let remaining = Math.min(Math.max(elapsed, 0), MAX_ELAPSED) / 1000;
    const { stiffness, damping, mass } = this.#parameters;
    const spring = -stiffness / mass;
    const drag = damping / mass;
    const limit = Math.min(SUB_STEP, MAX_OMEGA_STEP / Math.sqrt(stiffness / mass));
    while (remaining > 0) {
      const dt = Math.min(limit, remaining);
      remaining -= dt;
      const damp = 1 + drag * dt;
      this.vx = (this.vx + spring * (this.x - this.tx) * dt) / damp;
      this.vy = (this.vy + spring * (this.y - this.ty) * dt) / damp;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    if (
      Math.hypot(this.vx, this.vy) < this.#rest.restSpeed &&
      Math.hypot(this.x - this.tx, this.y - this.ty) < this.#rest.restDelta
    )
      this.snap();
    return !this.settled;
  }
}
