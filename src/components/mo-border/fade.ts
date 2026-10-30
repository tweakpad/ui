import type { EasingFunction } from '../../foundation/motion-easing.js';

export interface FadeTiming {
  /** Milliseconds for a whole fade from 0 to 1; a partial fade takes its share. */
  readonly duration: number;
  readonly easing: EasingFunction;
  /** Milliseconds to wait before fading out; fading in never waits. */
  readonly outDelay: number;
}

const linear: EasingFunction = (progress) => progress;

/**
 * The glow's fade (CL Border `mbx-fade`): on fades in at once, cancelling a pending fade-out;
 * off waits the out delay, then fades out. A reversed fade continues from its current value, at
 * the same pace.
 */
export class Fade {
  timing: FadeTiming = { duration: 0, easing: linear, outDelay: 0 };
  #from = 0;
  #to = 0;
  #start = 0;
  #span = 0;
  #value = 0;
  #pendingOff: number | null = null;

  /** The current level, 0 to 1, as of the last `step`. */
  get value(): number {
    return this.#value;
  }

  /** Whether it is on, or fading in. */
  get on(): boolean {
    return this.#to === 1;
  }

  /** Whether a fade or an out delay is still running. */
  get moving(): boolean {
    return this.#pendingOff !== null || this.#value !== this.#to;
  }

  set(on: boolean, now: number): void {
    if (on) {
      this.#pendingOff = null;
      if (this.#to !== 1) this.#begin(1, now);
      return;
    }
    if (this.#to === 0 || this.#pendingOff !== null) return;
    if (this.timing.outDelay > 0) this.#pendingOff = now + this.timing.outDelay;
    else this.#begin(0, now);
  }

  /** Jumps to a level with no fade. */
  snap(on: boolean): void {
    this.#pendingOff = null;
    this.#from = this.#to = this.#value = on ? 1 : 0;
    this.#span = 0;
  }

  /** Advances to `now` and returns the level. */
  step(now: number): number {
    if (this.#pendingOff !== null && now >= this.#pendingOff) {
      const start = this.#pendingOff;
      this.#pendingOff = null;
      this.#begin(0, start);
    }
    if (this.#span <= 0) this.#value = this.#to;
    else {
      const progress = Math.min(1, Math.max(0, (now - this.#start) / this.#span));
      this.#value = this.#from + (this.#to - this.#from) * this.timing.easing(progress);
      if (progress >= 1) this.#value = this.#to;
    }
    return this.#value;
  }

  #begin(to: number, now: number): void {
    this.step(now);
    this.#from = this.#value;
    this.#to = to;
    this.#start = now;
    this.#span = this.timing.duration * Math.abs(to - this.#from);
  }
}
