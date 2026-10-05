import { Scheduler } from '../services.js';
import type { CarouselNavigationResult } from './types.js';

export interface CarouselAutoplayAdapter {
  delay(): number;
  available(): boolean;
  advance(): Promise<CarouselNavigationResult>;
  changed(): void;
  owner?: Window;
}
/** Every pause reason owns its lease; one reason clearing cannot resume another's pause. */
export class CarouselAutoplay {
  readonly #reasons = new Set<string>();
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
    return this.#reasons.size > 0;
  }
  get reasons(): readonly string[] {
    return Object.freeze([...this.#reasons]);
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
    this.#reasons.delete('unacknowledged');
    this.setReason('explicit', false);
    this.refresh();
  }
  setReason(reason: string, active: boolean): void {
    const changed = active ? !this.#reasons.has(reason) : this.#reasons.has(reason);
    if (!changed) return;
    if (active) this.#reasons.add(reason);
    else this.#reasons.delete(reason);
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
