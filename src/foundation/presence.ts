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
  #frameWindow: Window | undefined;
  #timer: number | undefined;
  #timerWindow: Window | undefined;
  #pendingCompletion: boolean | null = null;
  #completionStartedFor = -1;
  #destroyed = false;
  #connected = true;
  #completedGeneration = -1;
  #trackedCompletions = new Set<PromiseLike<void>>();

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

  setPresent(present: boolean): void {
    if (this.#destroyed) return;
    if (present === this.#requested) {
      if (!present && this.#state === 'absent' && this.#options.keepMounted?.()) {
        this.#setState('retained');
      } else if (!present && this.#state === 'retained' && !this.#options.keepMounted?.()) {
        this.#setState('absent');
      }
      return;
    }
    this.#requested = present;
    this.#fallbackDuration = 0;
    this.#generation += 1;
    this.#cancelWait();
    this.#trackedCompletions.clear();
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

  trackCompletion(completion: PromiseLike<void>): void {
    this.#trackedCompletions.add(completion);
  }

  hostUpdated(): void {
    if (this.#destroyed) return;
    const generation = this.#generation;
    if (this.#state === 'starting' && this.#frame === undefined) {
      this.#scheduleFrame(() => {
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

  hostConnected(): void {
    this.#connected = true;
    const requested = this.#requested;
    this.#requested = false;
    this.setPresent(requested);
  }

  hostDisconnected(): void {
    this.#connected = false;
    this.#generation += 1;
    this.#cancelWait();
    this.#state = 'absent';
  }

  releaseRetained(): void {
    if (!this.#requested && this.#state === 'retained') this.#setState('absent');
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
    this.#scheduleFrame(() => {
      if (generation !== this.#generation || present !== this.#requested) return;
      const surface = this.#options.surface?.();
      const animations = surface
        ? surface
            .getAnimations({ subtree: true })
            .filter(
              (animation) => animation.playState !== 'finished' && animation.playState !== 'idle',
            )
        : [];
      const completions = [...this.#trackedCompletions];
      if (!animations.length && !completions.length) {
        queueMicrotask(() => this.#finish(present, generation));
        return;
      }
      const renderedDuration = animations.reduce((maximum, animation) => {
        const endTime = Number(animation.effect?.getComputedTiming().endTime);
        return Number.isFinite(endTime) ? Math.max(maximum, endTime) : maximum;
      }, 0);
      const fallback = Math.min(
        10_000,
        Math.max(this.#fallbackDuration, renderedDuration + 100, completions.length ? 10_000 : 0),
      );
      this.#timerWindow = this.#ownerWindow();
      this.#timer = this.#timerWindow?.setTimeout(
        () => this.#finish(present, generation),
        fallback,
      );
      void Promise.allSettled([
        ...animations.map((animation) => animation.finished),
        ...completions.map((completion) => Promise.resolve(completion)),
      ]).then(() => this.#finish(present, generation));
    });
  }

  #ownerWindow(): Window | undefined {
    const document =
      this.#options.surface?.()?.ownerDocument ??
      (this.#host as ReactiveControllerHost & { ownerDocument?: Document }).ownerDocument;
    if (document) return document.defaultView ?? undefined;
    // Non-DOM controller hosts are supported by the pure lifecycle tests.
    return typeof window === 'undefined' ? undefined : window;
  }

  #scheduleFrame(callback: FrameRequestCallback): void {
    if (this.#frame !== undefined) this.#frameWindow?.cancelAnimationFrame(this.#frame);
    this.#frameWindow = this.#ownerWindow();
    if (!this.#frameWindow) return;
    this.#frame = this.#frameWindow.requestAnimationFrame((time) => {
      this.#frame = undefined;
      this.#frameWindow = undefined;
      callback(time);
    });
  }

  #finish(present: boolean, generation: number): void {
    if (
      !this.#connected ||
      generation !== this.#generation ||
      present !== this.#requested ||
      this.#completedGeneration === generation
    )
      return;
    this.#completedGeneration = generation;
    this.#cancelWait();
    if (!present) this.#setState(this.#options.keepMounted?.() ? 'retained' : 'absent');
    this.#options.onComplete?.(present);
  }

  #cancelWait(): void {
    this.#pendingCompletion = null;
    this.#trackedCompletions.clear();
    this.#completionStartedFor = -1;
    if (this.#frame !== undefined) {
      this.#frameWindow?.cancelAnimationFrame(this.#frame);
      this.#frame = undefined;
    }
    this.#frameWindow = undefined;
    if (this.#timer !== undefined) {
      this.#timerWindow?.clearTimeout(this.#timer);
      this.#timer = undefined;
    }
    this.#timerWindow = undefined;
  }
}
