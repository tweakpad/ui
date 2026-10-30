import type { EasingFunction } from '../../foundation/motion-easing.js';

/** A length along the line: a percentage of the perimeter or pixels. */
export interface LineLength {
  readonly value: number;
  readonly unit: '%' | 'px';
}

/** The points of the box a position can name: its corners and the middles of its edges. */
export const BOX_POINTS = [
  'top-left',
  'top',
  'top-right',
  'right',
  'bottom-right',
  'bottom',
  'bottom-left',
  'left',
] as const;
export type BoxPoint = (typeof BOX_POINTS)[number];

/** A position on the line: a length from the segment's origin, or a point of the box. */
export type LinePosition = LineLength | { readonly point: BoxPoint };

/** One state of a segment: the stretch from `start` to `end` along the line. */
export type SegmentState = readonly [LinePosition, LinePosition];

/**
 * Where a segment is drawn: the line's length in pixels, and where each point of the box sits as
 * a fraction of the line from the segment's origin, in [0, 1).
 */
export interface Placement {
  readonly perimeter: number;
  point(point: BoxPoint): number;
}

/** A stretch of the line as fractions of the perimeter; it may reach below 0 or past 1. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

const LENGTH = /^(-?(?:\d+\.?\d*|\.\d+))(%|px)?$/;

function parsePosition(token: string): LinePosition | null {
  if ((BOX_POINTS as readonly string[]).includes(token)) return { point: token as BoxPoint };
  const match = LENGTH.exec(token);
  if (!match) return null;
  // A bare number is a length in pixels.
  return { value: Number(match[1]), unit: match[2] === '%' ? '%' : 'px' };
}

/**
 * Reads a list of states: comma-separated, each `start end`, or a single `end` that starts at 0.
 * A position is a percentage of the line, pixels, or a point of the box (`top-left`, `top`, …).
 * Returns null for an empty or invalid list.
 */
export function parseStates(text: string | null | undefined): SegmentState[] | null {
  const parts = (text ?? '').split(',').map((part) => part.trim());
  if (!parts.length || parts.every((part) => !part)) return null;
  const states: SegmentState[] = [];
  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens.length < 1 || tokens.length > 2) return null;
    const positions = tokens.map(parsePosition);
    if (positions.some((position) => position === null)) return null;
    const [first, second] = positions as LinePosition[];
    states.push(second ? [first!, second] : [{ value: 0, unit: '%' }, first!]);
  }
  return states;
}

export function toFraction(length: LineLength, perimeter: number): number {
  return length.unit === '%' ? length.value / 100 : length.value / Math.max(perimeter, 1e-6);
}

/**
 * The fraction a position stands for. A point of the box is taken the short way round from `near`
 * (a half turn exactly goes back, counterclockwise), so a point moves to it without circling.
 */
function resolvePosition(position: LinePosition, placement: Placement, near: number): number {
  if (!('point' in position)) return toFraction(position, placement.perimeter);
  const at = placement.point(position.point);
  return at + Math.ceil(near - at - 0.5);
}

/**
 * The spans of `states`, each taken from the one before (or from `from`): positions that name a
 * point of the box move the short way, and a stretch that ends at a point runs clockwise from its
 * start to that point.
 */
export function resolveStates(
  states: readonly SegmentState[],
  placement: Placement,
  from: Span | null = null,
): Span[] {
  const spans: Span[] = [];
  let previous = from;
  for (const [first, second] of states) {
    const start = resolvePosition(first, placement, previous?.start ?? 0);
    let end = resolvePosition(second, placement, previous?.end ?? start);
    if ('point' in second && end < start) end += Math.ceil(start - end);
    previous = { start, end };
    spans.push(previous);
  }
  return spans;
}

const mix = (a: Span, b: Span, t: number): Span => ({
  start: a.start + (b.start - a.start) * t,
  end: a.end + (b.end - a.end) * t,
});

/** The span `progress` (0 to 1) of the way through `states`, each step eased on its own. */
export function sampleStates(
  states: readonly Span[],
  progress: number,
  easing: EasingFunction,
): Span {
  if (states.length === 1) return states[0]!;
  const steps = states.length - 1;
  const position = Math.min(1, Math.max(0, progress)) * steps;
  const index = Math.min(steps - 1, Math.floor(position));
  return mix(states[index]!, states[index + 1]!, easing(position - index));
}

export interface SegmentTiming {
  /** Milliseconds for the whole run of states. */
  readonly duration: number;
  readonly delay: number;
  readonly easing: EasingFunction;
  /** Repeats after the first run; Infinity repeats forever. */
  readonly repeat: number;
  readonly alternate: boolean;
}

type Mode = 'rest' | 'forward' | 'reverse' | 'leave';

/**
 * The playback of one segment (CL Segment border `mbs-segments`): forward while its trigger is on; when it
 * turns off, its leave states from where it is, or backwards from where it is. Times are in
 * milliseconds; positions are resolved on the current box, so pixels and points of the box follow its size.
 */
export class SegmentRun {
  #mode: Mode = 'rest';
  #time = 0;
  #leaveTime = 0;
  #leaveFrom: Span = { start: 0, end: 0 };
  #timing: SegmentTiming;

  constructor(
    readonly states: readonly SegmentState[],
    readonly leave: readonly SegmentState[] | null,
    timing: SegmentTiming,
  ) {
    this.#timing = timing;
  }

  get timing(): SegmentTiming {
    return this.#timing;
  }

  /**
   * New timing keeps the run's place rather than its milliseconds: the same share of the delay,
   * or the same point of the same run, at the new pace.
   */
  set timing(timing: SegmentTiming) {
    const from = this.#timing;
    this.#timing = timing;
    this.#time = this.#place(from, timing);
    if (from.duration > 0) this.#leaveTime *= timing.duration / from.duration;
  }

  get mode(): Mode {
    return this.#mode;
  }

  /** The end of the forward run; Infinity when it repeats forever. */
  get total(): number {
    const { delay, duration, repeat } = this.timing;
    return delay + duration * (repeat + 1);
  }

  /** Whether the segment still changes as time passes. */
  get moving(): boolean {
    switch (this.#mode) {
      case 'forward':
        return this.#time < this.total;
      case 'reverse':
        return this.#time > 0;
      case 'leave':
        return true;
      default:
        return false;
    }
  }

  /** Turns the trigger on or off at the current time; `placement` resolves the leave's start. */
  set(on: boolean, placement: Placement): void {
    if (on) {
      // Coming back during an exit starts the run again from rest.
      if (this.#mode === 'leave' || this.#mode === 'rest') this.#time = 0;
      this.#mode = 'forward';
      return;
    }
    if (this.#mode === 'rest' || this.#mode === 'leave') return;
    if (this.leave && this.#time > 0) {
      this.#leaveFrom = this.span(placement);
      this.#leaveTime = 0;
      this.#mode = 'leave';
      return;
    }
    if (!Number.isFinite(this.total)) this.#fold();
    this.#mode = 'reverse';
  }

  /** Jumps to the end of the first run (on) or to rest (off), with no motion. */
  jump(on: boolean): void {
    const { delay, duration, repeat } = this.timing;
    this.#mode = on ? 'forward' : 'rest';
    this.#time = on ? (Number.isFinite(repeat) ? this.total : delay + duration) : 0;
  }

  /** Advances by `elapsed` milliseconds. */
  step(elapsed: number): void {
    switch (this.#mode) {
      case 'forward':
        this.#time = Math.min(this.total, this.#time + elapsed);
        break;
      case 'reverse':
        this.#time = Math.max(0, this.#time - elapsed);
        if (this.#time === 0) this.#mode = 'rest';
        break;
      case 'leave':
        this.#leaveTime += elapsed;
        if (this.#leaveTime >= this.timing.duration) {
          this.#mode = 'rest';
          this.#time = 0;
        }
        break;
      default:
    }
  }

  /** The stretch of the line drawn now. */
  span(placement: Placement): Span {
    if (this.#mode === 'leave' && this.leave) {
      const states = [this.#leaveFrom, ...resolveStates(this.leave, placement, this.#leaveFrom)];
      const progress = this.timing.duration > 0 ? this.#leaveTime / this.timing.duration : 1;
      return sampleStates(states, progress, this.timing.easing);
    }
    return this.#forward(placement);
  }

  #forward(placement: Placement): Span {
    const states = resolveStates(this.states, placement);
    const { delay, duration, repeat, alternate, easing } = this.timing;
    const elapsed = this.#time - delay;
    // With no duration (reduced motion scales it to 0) the run is at its end once its delay passed.
    if (duration <= 0) {
      return this.#mode === 'forward' && elapsed >= 0 ? states[states.length - 1]! : states[0]!;
    }
    if (elapsed <= 0) return states[0]!;
    const runs = repeat + 1;
    let run = Math.floor(elapsed / duration);
    let local = elapsed / duration - run;
    if (run >= runs) {
      run = runs - 1;
      local = 1;
    }
    if (alternate && run % 2 === 1) local = 1 - local;
    return sampleStates(states, local, easing);
  }

  /** The time under `to` at the place the run has reached under `from`. */
  #place(from: SegmentTiming, to: SegmentTiming): number {
    const time = this.#time;
    // With no duration, a forward run past its delay is at its end, like a jump.
    const ended = from.duration <= 0 && this.#mode === 'forward' && time >= from.delay;
    if (!ended && time <= from.delay) return from.delay > 0 ? (time / from.delay) * to.delay : 0;
    const finite = Number.isFinite(to.repeat);
    const runs = ended
      ? finite
        ? to.repeat + 1
        : 1
      : Math.min((time - from.delay) / from.duration, to.repeat + 1);
    return to.delay + runs * to.duration;
  }

  /** A forever-repeating segment rewinds only through its current cycle. */
  #fold(): void {
    const { delay, duration, alternate } = this.timing;
    const period = duration * (alternate ? 2 : 1);
    const elapsed = this.#time - delay;
    if (period > 0 && elapsed > period) this.#time = delay + (elapsed % period);
  }
}
