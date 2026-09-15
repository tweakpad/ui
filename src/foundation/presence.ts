import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PresenceState } from './types.js';

export class PresenceController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  #state: PresenceState = 'unmounted';
  #timer: number | undefined;

  constructor(host: ReactiveControllerHost) {
    this.#host = host;
    host.addController(this);
  }

  get state(): PresenceState {
    return this.#state;
  }

  get mounted(): boolean {
    return this.#state !== 'unmounted';
  }

  setPresent(present: boolean, duration = 0): void {
    if (this.#timer !== undefined) window.clearTimeout(this.#timer);
    if (present) {
      this.#state = 'entering';
      this.#host.requestUpdate();
      queueMicrotask(() => {
        if (this.#state === 'entering') {
          this.#state = 'present';
          this.#host.requestUpdate();
        }
      });
      return;
    }
    if (!this.mounted) return;
    this.#state = 'exiting';
    this.#host.requestUpdate();
    if (duration <= 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.completeExit();
    } else {
      this.#timer = window.setTimeout(() => this.completeExit(), duration);
    }
  }

  completeExit(): void {
    this.#state = 'unmounted';
    this.#timer = undefined;
    this.#host.requestUpdate();
  }

  hostDisconnected(): void {
    if (this.#timer !== undefined) window.clearTimeout(this.#timer);
  }
}
