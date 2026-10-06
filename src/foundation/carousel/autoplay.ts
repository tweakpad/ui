import { ReasonLeases } from '../reason-leases.js';
import { Scheduler } from '../services.js';
import type { CarouselNavigationResult } from './types.js';

export interface CarouselAutoplayAdapter {
  delay(): number;
  available(): boolean;
  advance(): Promise<CarouselNavigationResult>;
  changed(): void;
  owner?: Window;
}
/**
 * Every pause reason owns its lease on the shared {@link ReasonLeases} owner
 * (`sec-187-carousel` autoplay, `sec-1922-activity-and-idle` leases): one reason clearing
 * cannot resume another's pause, and the last lease clearing restarts a full interval.
 */
export class CarouselAutoplay {
  readonly #reasons = new ReasonLeases<string>();
  #scheduler: Scheduler;
  #cancel: (() => void) | undefined;
  #running = false;
  #generation = 0;
  #run = 0;
  #advancing = false;
  constructor(private readonly adapter: CarouselAutoplayAdapter) {
    this.#scheduler = new Scheduler(adapter.owner);
  }
  get running(): boolean {
    return this.#running;
  }
  get paused(): boolean {
    return this.#reasons.active;
  }
  /** Held pause reasons in first-acquired order. */
  get reasons(): readonly string[] {
    return this.#reasons.reasons;
  }
  start(): void {
    if (!this.#running) {
      this.#running = true;
      this.adapter.changed();
    }
    this.refresh();
  }
  stop(): void {
    this.#run++;
    this.#advancing = false;
    this.#generation++;
    this.#cancel?.();
    this.#cancel = undefined;
    if (this.#running) {
      this.#running = false;
      this.adapter.changed();
    }
  }
  pause(): void {
    this.setReason('explicit', true);
  }
  resume(): void {
    // Clearing only the unacknowledged lease still changes the observable paused state.
    if (this.#reasons.set('unacknowledged', false) && !this.#reasons.has('explicit')) {
      this.#generation++;
      this.adapter.changed();
    }
    this.setReason('explicit', false);
    this.refresh();
  }
  setReason(reason: string, active: boolean): void {
    // Each reason is a single switch-style lease; an unchanged switch is not a change.
    if (!this.#reasons.set(reason, active)) return;
    this.#generation++;
    this.#cancel?.();
    this.#cancel = undefined;
    this.adapter.changed();
    this.refresh();
  }
  refresh(): void {
    this.#cancel?.();
    this.#cancel = undefined;
    if (!this.#running || this.paused || this.#advancing || !this.adapter.available()) return;
    const delay = this.adapter.delay();
    if (!Number.isFinite(delay) || delay <= 0) return;
    const generation = ++this.#generation;
    this.#cancel = this.#scheduler.timeout(() => {
      this.#cancel = undefined;
      if (generation !== this.#generation || !this.#running || this.paused) return;
      this.#advancing = true;
      const run = this.#run;
      void Promise.resolve()
        .then(() => (run === this.#run ? this.adapter.advance() : undefined))
        .then((result) => {
          if (run !== this.#run || !result) return;
          if (result.status === 'rejected') this.setReason('unacknowledged', true);
          else if (result.status === 'unchanged') this.stop();
        })
        .catch(() => {
          if (run === this.#run) this.setReason('unacknowledged', true);
        })
        .finally(() => {
          if (run !== this.#run) return;
          this.#advancing = false;
          if (this.#running) this.refresh();
        });
    }, delay);
  }
  dispose(): void {
    this.stop();
    this.#scheduler.dispose();
    this.#reasons.clear();
  }
}

/** The autoplay Button names the action it performs: Pause while the timer runs,
 * Resume after a manual pause, an unacknowledged proposal or a timer stop. */
export function carouselAutoplayAction(
  autoplay: Pick<CarouselAutoplay, 'running' | 'reasons'>,
): 'pause' | 'resume' {
  return !autoplay.running ||
    autoplay.reasons.includes('explicit') ||
    autoplay.reasons.includes('unacknowledged')
    ? 'resume'
    : 'pause';
}
/** Performs the action named by {@link carouselAutoplayAction}; Resume restarts a stopped timer. */
export function toggleCarouselAutoplay(autoplay: CarouselAutoplay): void {
  if (carouselAutoplayAction(autoplay) === 'pause') {
    autoplay.pause();
    return;
  }
  autoplay.resume();
  if (!autoplay.running) autoplay.start();
}
