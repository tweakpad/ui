import type { EasingFunction } from '../motion-easing.js';

/**
 * Frame-sampled carousel motion with continuous velocity. A transition is a curve sampled per
 * frame instead of a fixed animation, so it can be retargeted, interrupted by a drag or carried
 * on from a release without a velocity jump.
 *
 * Positions are layout pixels, times are milliseconds and velocities are pixels per millisecond.
 */

/** Below this speed motion counts as at rest, so a navigation uses its plain easing. */
export const carouselRestingSpeed = 0.05;
/** Pointer and frame samples older than this do not contribute to velocity. */
const sampleWindow = 100;
/** A gesture that stopped this long before release carries no velocity. */
const staleSample = 60;
/** A momentum segment never runs shorter than this share of the base duration. */
const minimumShare = 0.35;
/** A retarget during flight ends no later than its predecessor, down to this share. */
const accelerateShare = 0.5;

export interface CarouselMotionTiming {
  readonly duration: number;
  readonly easing: EasingFunction;
}

export interface CarouselMotionSegment {
  readonly from: number;
  readonly to: number;
  readonly start: number;
  readonly duration: number;
  /** Position at normalized time 0..1. */
  readonly curve: (progress: number) => number;
  /** Velocity in pixels per millisecond at normalized time 0..1. */
  readonly slope: (progress: number) => number;
}

/**
 * Plan a segment from `from` to `to` that starts at `velocity`. At rest it is the plain eased
 * transition. With momentum it is a cubic Hermite curve that leaves at the current velocity and
 * arrives at rest, shortened so a fast release or flick keeps its speed instead of easing in again.
 */
export function carouselMotionSegment(
  from: number,
  to: number,
  velocity: number,
  start: number,
  timing: CarouselMotionTiming,
  remaining?: number,
): CarouselMotionSegment {
  const distance = to - from;
  const base = Math.max(0, timing.duration);
  if (Math.abs(velocity) < carouselRestingSpeed || base === 0) {
    const easing = timing.easing;
    const step = 1e-3;
    return {
      from,
      to,
      start,
      duration: base,
      curve: (progress) => from + distance * easing(progress),
      slope: (progress) => {
        if (base === 0) return 0;
        const low = Math.max(0, progress - step),
          high = Math.min(1, progress + step);
        return (distance * (easing(high) - easing(low))) / (high - low || 1) / base;
      },
    };
  }
  const toward = Math.sign(velocity) === Math.sign(distance) && distance !== 0;
  // Toward the target, a tangent of twice the distance decelerates evenly to rest.
  let duration = toward
    ? Math.min(base, Math.max(base * minimumShare, (2 * Math.abs(distance)) / Math.abs(velocity)))
    : base;
  // A retarget during flight keeps the earlier arrival time, so repeated requests accelerate.
  if (remaining !== undefined)
    duration = Math.min(duration, Math.max(base * accelerateShare, remaining));
  // Tangents within three times the distance never overshoot the target or reverse twice.
  const limit = 3 * Math.abs(distance);
  const tangent = Math.max(-limit, Math.min(limit, velocity * duration));
  return {
    from,
    to,
    start,
    duration,
    curve: (progress) => {
      const u = Math.min(1, Math.max(0, progress));
      return from + distance * u * u * (3 - 2 * u) + tangent * u * (1 - u) * (1 - u);
    },
    slope: (progress) => {
      const u = Math.min(1, Math.max(0, progress));
      return (distance * 6 * u * (1 - u) + tangent * (1 - u) * (1 - 3 * u)) / (duration || 1);
    },
  };
}

interface Momentum {
  readonly velocity: number;
  readonly time: number;
  /** Time left in the halted segment, when a transition rather than a drag was halted. */
  readonly remaining?: number;
}

/** Position, velocity and the active segment of one carousel presentation. */
export class CarouselKinetics {
  #position = 0;
  /** When the presented position was sampled; a halt resumes from that moment. */
  #presentedAt: number | undefined;
  #segment: CarouselMotionSegment | undefined;
  #samples: Array<readonly [number, number]> = [];
  #momentum: Momentum | undefined;

  /** Last presented position. */
  get position(): number {
    return this.#position;
  }
  get segment(): CarouselMotionSegment | undefined {
    return this.#segment;
  }
  /** Current velocity: the active segment's, a halted transition's, or recent direct samples. */
  velocity(time: number): number {
    const segment = this.#segment;
    if (segment) {
      const progress = segment.duration > 0 ? (time - segment.start) / segment.duration : 1;
      return progress >= 1 ? 0 : segment.slope(Math.max(0, progress));
    }
    const momentum = this.#momentum;
    if (momentum && time - momentum.time <= sampleWindow) return momentum.velocity;
    return this.#sampledVelocity(time);
  }
  /** Present a position directly. Tracked placements (drag frames) contribute to velocity. */
  place(position: number, time: number, tracked: boolean): void {
    this.#segment = undefined;
    this.#momentum = undefined;
    this.#position = position;
    this.#presentedAt = time;
    if (!tracked) {
      this.#samples = [];
      return;
    }
    this.#samples.push([time, position]);
    while (this.#samples.length > 2 && time - this.#samples[0]![0] > sampleWindow)
      this.#samples.shift();
  }
  /** Move to an equivalent position (loop compensation) without changing velocity. */
  shift(delta: number): void {
    if (!delta) return;
    this.#position += delta;
    this.#samples = this.#samples.map(([time, position]) => [time, position + delta] as const);
    const segment = this.#segment;
    if (segment) {
      const { curve, from, to } = segment;
      this.#segment = {
        ...segment,
        from: from + delta,
        to: to + delta,
        curve: (progress) => curve(progress) + delta,
      };
    }
  }
  /** Start a segment toward `to`, continuing the current velocity. */
  plan(to: number, time: number, timing: CarouselMotionTiming): CarouselMotionSegment {
    const velocity = this.velocity(time);
    const active = this.#segment;
    const halted = this.#momentum;
    const remaining = active
      ? Math.max(0, active.start + active.duration - time)
      : halted && time - halted.time <= sampleWindow
        ? halted.remaining
        : undefined;
    // A retarget starts when the previous motion halted, so the frames spent rendering the new
    // destination are caught up instead of pausing the movement.
    const start = !active && halted && time - halted.time <= sampleWindow ? halted.time : time;
    this.#samples = [];
    this.#momentum = undefined;
    this.#segment = carouselMotionSegment(this.#position, to, velocity, start, timing, remaining);
    return this.#segment;
  }
  /** Sample the active segment; returns true once it has arrived. */
  sample(time: number): boolean {
    const segment = this.#segment;
    if (!segment) return true;
    const progress = segment.duration > 0 ? (time - segment.start) / segment.duration : 1;
    this.#presentedAt = time;
    if (progress >= 1) {
      this.#position = segment.to;
      this.#segment = undefined;
      return true;
    }
    this.#position = segment.curve(Math.max(0, progress));
    return false;
  }
  /** Stop at the presented position, remembering the velocity for an immediate retarget. */
  halt(now: number): void {
    const segment = this.#segment;
    // Halting again keeps the first halt's momentum, start time and remaining duration.
    if (!segment && this.#momentum && now - this.#momentum.time <= sampleWindow) return;
    // The presented position belongs to the last sampled frame, not to the halt request.
    // A segment that has not sampled yet still presents its start.
    const time = segment ? Math.max(segment.start, this.#presentedAt ?? segment.start) : now;
    const velocity = this.velocity(time);
    this.#momentum =
      Math.abs(velocity) >= carouselRestingSpeed
        ? {
            velocity,
            time,
            ...(segment ? { remaining: Math.max(0, segment.start + segment.duration - time) } : {}),
          }
        : undefined;
    // Drag samples survive a halt: every drag frame halts before it places the next sample.
    if (segment) this.#samples = [];
    this.#segment = undefined;
  }
  #sampledVelocity(time: number): number {
    const samples = this.#samples.filter(([sampled]) => time - sampled <= sampleWindow);
    const last = samples.at(-1),
      first = samples[0];
    if (!last || !first || last === first || time - last[0] > staleSample) return 0;
    const elapsed = last[0] - first[0];
    return elapsed >= 8 ? (last[1] - first[1]) / elapsed : 0;
  }
}
