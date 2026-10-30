import type { EasingFunction } from '../../foundation/motion-easing.js';

/** A length along the line: a percentage of the perimeter or pixels. */
export interface LineLength {
  readonly value: number;
  readonly unit: '%' | 'px';
}

/** One state of a segment: the stretch from `start` to `end` along the line. */
export type SegmentState = readonly [LineLength, LineLength];

/** A stretch of the line as fractions of the perimeter; it may reach below 0 or past 1. */
export interface Span {
  readonly start: number;
  readonly end: number;
}

const LENGTH = /^(-?(?:\d+\.?\d*|\.\d+))(%|px)?$/;

function parseLength(token: string): LineLength | null {
  const match = LENGTH.exec(token);
  if (!match) return null;
  // A bare number is a length in pixels.
  return { value: Number(match[1]), unit: match[2] === '%' ? '%' : 'px' };
}

/**
 * Reads a list of states: comma-separated, each `start end`, or a single `end` that starts at 0.
 * Returns null for an empty or invalid list.
 */
export function parseStates(text: string | null | undefined): SegmentState[] | null {
  const parts = (text ?? '').split(',').map((part) => part.trim());
  if (!parts.length || parts.every((part) => !part)) return null;
  const states: SegmentState[] = [];
  for (const part of parts) {
    const tokens = part.split(/\s+/).filter(Boolean);
    if (tokens.length < 1 || tokens.length > 2) return null;
    const lengths = tokens.map(parseLength);
    if (lengths.some((length) => length === null)) return null;
    const [first, second] = lengths as LineLength[];
    states.push(second ? [first!, second] : [{ value: 0, unit: '%' }, first!]);
  }
  return states;
}

export function toFraction(length: LineLength, perimeter: number): number {
  return length.unit === '%' ? length.value / 100 : length.value / Math.max(perimeter, 1e-6);
}

export function resolveState(state: SegmentState, perimeter: number): Span {
  return { start: toFraction(state[0], perimeter), end: toFraction(state[1], perimeter) };
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
 * The playback of one segment (CL Border `mbs-segments`): forward while its trigger is on; when it
 * turns off, its leave states from where it is, or backwards from where it is. Times are in
 * milliseconds; spans come from `states(perimeter)` so pixel lengths follow the size.
 */
export class SegmentRun {
  #mode: Mode = 'rest';
  #time = 0;
  #leaveTime = 0;
  #leaveFrom: Span = { start: 0, end: 0 };

  constructor(
    readonly states: readonly SegmentState[],
    readonly leave: readonly SegmentState[] | null,
    public timing: SegmentTiming,
  ) {}

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

  /** Turns the trigger on or off at the current time; `perimeter` resolves the leave's start. */
  set(on: boolean, perimeter: number): void {
    if (on) {
      // Coming back during an exit starts the run again from rest.
      if (this.#mode === 'leave' || this.#mode === 'rest') this.#time = 0;
      this.#mode = 'forward';
      return;
    }
    if (this.#mode === 'rest' || this.#mode === 'leave') return;
    if (this.leave && this.#time > 0) {
      this.#leaveFrom = this.span(perimeter);
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
  span(perimeter: number): Span {
    if (this.#mode === 'leave' && this.leave) {
      const states = [
        this.#leaveFrom,
        ...this.leave.map((state) => resolveState(state, perimeter)),
      ];
      const progress = this.timing.duration > 0 ? this.#leaveTime / this.timing.duration : 1;
      return sampleStates(states, progress, this.timing.easing);
    }
    return this.#forward(perimeter);
  }

  #forward(perimeter: number): Span {
    const states = this.states.map((state) => resolveState(state, perimeter));
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

  /** A forever-repeating segment rewinds only through its current cycle. */
  #fold(): void {
    const { delay, duration, alternate } = this.timing;
    const period = duration * (alternate ? 2 : 1);
    const elapsed = this.#time - delay;
    if (period > 0 && elapsed > period) this.#time = delay + (elapsed % period);
  }
}
