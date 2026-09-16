import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { PresenceState } from './types.js';

export interface PresenceControllerOptions {
  surface?: () => Element | null;
  keepMounted?: () => boolean;
  onStateChange?: (state: PresenceState) => void;
  onComplete?: (present: boolean) => void;
}

export class PresenceController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: PresenceControllerOptions;
  #state: PresenceState = 'absent';
  #requested = false;
  #generation = 0;
  #fallbackDuration = 0;
  #frame: number | undefined;
  #timer: number | undefined;
  #pendingCompletion: boolean | null = null;
  #completionStartedFor = -1;
  #destroyed = false;

  constructor(host: ReactiveControllerHost, options: PresenceControllerOptions = {}) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  get state(): PresenceState {
    return this.#state;
  }

  get mounted(): boolean {
    return this.#state !== 'absent';
  }

  setPresent(present: boolean, fallbackDuration = 0): void {
    if (this.#destroyed) return;
    if (present === this.#requested) {
      if (!present && this.#state === 'absent' && this.#options.keepMounted?.()) {
        this.#setState('retained');
      }
      return;
    }
    this.#requested = present;
    this.#fallbackDuration = Math.max(0, fallbackDuration);
    this.#generation += 1;
    this.#cancelWait();
    if (present) {
      this.#setState('starting');
      return;
    }
    if (!this.mounted) return;
    this.#setState('ending');
  }

  completeExit(): void {
    if (this.#requested) return;
    this.#generation += 1;
    this.#cancelWait();
    this.#finish(false, this.#generation);
  }

  hostUpdated(): void {
    if (this.#destroyed) return;
    const generation = this.#generation;
    if (this.#state === 'starting' && this.#frame === undefined) {
      this.#frame = requestAnimationFrame(() => {
        this.#frame = undefined;
        if (generation !== this.#generation || !this.#requested || this.#state !== 'starting')
          return;
        this.#pendingCompletion = true;
        this.#setState('open');
      });
      return;
    }
    if (
      this.#state === 'ending' &&
      this.#pendingCompletion === null &&
      this.#completionStartedFor !== generation
    ) {
      this.#pendingCompletion = false;
    }
    if (this.#pendingCompletion !== null) {
      const present = this.#pendingCompletion;
      this.#pendingCompletion = null;
      this.#completionStartedFor = generation;
      this.#waitForRenderedTransition(present, generation);
    }
  }

  hostDisconnected(): void {
    this.#cancelWait();
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#cancelWait();
    this.#host.removeController(this);
  }

  #setState(state: PresenceState): void {
    if (state === this.#state) return;
    this.#state = state;
    this.#options.onStateChange?.(state);
    this.#host.requestUpdate();
  }

  #waitForRenderedTransition(present: boolean, generation: number): void {
    if (this.#frame !== undefined) cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => {
      this.#frame = undefined;
      if (generation !== this.#generation || present !== this.#requested) return;
      const surface = this.#options.surface?.();
      const animations = surface
        ? surface
            .getAnimations({ subtree: true })
            .filter(
              (animation) => animation.playState !== 'finished' && animation.playState !== 'idle',
            )
        : [];
      if (!animations.length) {
        queueMicrotask(() => this.#finish(present, generation));
        return;
      }
      const renderedDuration = animations.reduce((maximum, animation) => {
        const endTime = Number(animation.effect?.getComputedTiming().endTime);
        return Number.isFinite(endTime) ? Math.max(maximum, endTime) : maximum;
      }, 0);
      const fallback = Math.min(10_000, Math.max(this.#fallbackDuration, renderedDuration + 100));
      this.#timer = window.setTimeout(() => this.#finish(present, generation), fallback);
      void Promise.allSettled(animations.map((animation) => animation.finished)).then(() =>
        this.#finish(present, generation),
      );
    });
  }

  #finish(present: boolean, generation: number): void {
    if (generation !== this.#generation || present !== this.#requested) return;
    this.#cancelWait();
    if (!present) this.#setState(this.#options.keepMounted?.() ? 'retained' : 'absent');
    this.#options.onComplete?.(present);
  }

  #cancelWait(): void {
    this.#pendingCompletion = null;
    this.#completionStartedFor = -1;
    if (this.#frame !== undefined) {
      cancelAnimationFrame(this.#frame);
      this.#frame = undefined;
    }
    if (this.#timer !== undefined) {
      window.clearTimeout(this.#timer);
      this.#timer = undefined;
    }
  }
}
