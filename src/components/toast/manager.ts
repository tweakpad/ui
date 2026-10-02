import { ObservableStore } from '../../foundation/store.js';
import { createId } from '../../foundation/id.js';
import type {
  ToastCause,
  ToastClock,
  ToastObject,
  ToastOptions,
  ToastPromiseState,
  ToastPromiseStates,
  ToastProviderOptions,
  ToastUpdateOptions,
} from './types.js';

interface Timer {
  handle: number | undefined;
  remaining: number;
  delay: number;
  started: number;
}
const defaultClock: ToastClock = {
  now: () => Date.now(),
  setTimeout: (callback, duration) =>
    globalThis.setTimeout(callback, duration) as unknown as number,
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};
const duration = (value: number) => (Number.isFinite(value) ? Math.max(0, value) : 0);
const limit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 3);

/** One queue owner shared by imperative adapters, the Provider, and every rendered Toast. */
export class ToastManager<Data extends object = Record<string, unknown>> {
  readonly #store = new ObservableStore<readonly ToastObject<Data>[]>(Object.freeze([]));
  readonly #timers = new Map<string, Timer>();
  readonly #paused = new Set<string>();
  readonly #queue: (() => void)[] = [];
  #publishing = false;
  #clock: ToastClock = defaultClock;
  #timeout = 5000;
  #limit = 3;
  #generation = 0;
  #destroyed = false;
  #diagnostic: ((code: string, message: string) => void) | undefined;

  constructor(options: ToastProviderOptions = {}) {
    this.configure(options);
  }
  get toasts(): readonly ToastObject<Data>[] {
    return this.#store.value;
  }
  get timeout(): number {
    return this.#timeout;
  }
  get limit(): number {
    return this.#limit;
  }
  get paused(): boolean {
    return this.#paused.size > 0;
  }
  subscribe(
    listener: (toasts: readonly ToastObject<Data>[]) => void,
    emitCurrent = true,
  ): () => void {
    return this.#store.subscribe(({ value }) => this.#callback(() => listener(value)), emitCurrent);
  }
  configure(options: ToastProviderOptions): void {
    this.#run(() => {
      if (options.clock && options.clock !== this.#clock) {
        this.#clearTimers();
        this.#clock = options.clock;
      }
      if (options.timeout !== undefined) this.#timeout = duration(options.timeout);
      if (options.limit !== undefined) this.#limit = limit(options.limit);
      if (options.diagnostic) this.#diagnostic = options.diagnostic;
      this.#publish(this.toasts);
      for (const toast of this.toasts) {
        if (!this.#timers.has(toast.identifier)) this.#schedule(toast);
      }
    });
  }
  add(options: ToastOptions<Data>): string {
    const identifier = options.identifier || createId('tp-toast');
    this.#run(() => {
      if (this.#destroyed) return;
      const old = this.#find(identifier);
      if (old && old.transitionStatus !== 'ending') {
        this.#update(identifier, options, true);
        return;
      }
      // Reopening the same logical toast cancels pending removal without a stale onRemove.
      const toast: ToastObject<Data> = {
        ...options,
        identifier,
        transitionStatus: 'starting',
        updateKey: old ? old.updateKey + 1 : 0,
        limited: false,
        height: old?.height ?? 0,
        elementReference: old?.elementReference ?? null,
        cause: undefined,
        lifecycleKey: ++this.#generation,
      };
      this.#clearTimer(identifier);
      this.#publish([toast, ...this.toasts.filter((item) => item.identifier !== identifier)]);
      this.#schedule(toast);
    });
    return identifier;
  }
  update(identifier: string, options: ToastUpdateOptions<Data>): void {
    this.#run(() => this.#update(identifier, options, false));
  }
  close(identifier?: string, cause: ToastCause = 'programmatic'): void {
    this.#run(() => {
      const closing = this.toasts.filter(
        (toast) =>
          (!identifier || toast.identifier === identifier) && toast.transitionStatus !== 'ending',
      );
      if (!closing.length) return;
      const ids = new Set(closing.map((toast) => toast.identifier));
      for (const id of ids) this.#clearTimer(id);
      this.#publish(
        this.toasts.map((toast) =>
          ids.has(toast.identifier) ? { ...toast, transitionStatus: 'ending', cause } : toast,
        ),
      );
      for (const toast of closing) this.#callback(() => toast.onClose?.(cause));
    });
  }
  promise<Value>(
    pending: PromiseLike<Value>,
    states: ToastPromiseStates<Value, Data>,
  ): Promise<Value> {
    const loading = this.#resolveState(states.loading);
    const identifier = this.add({ ...loading, type: 'loading' } as ToastOptions<Data>);
    let generation: number | undefined;
    // A subscriber may create a promise while publication is in progress. Its add
    // commits before this queued capture, preserving the actual lifecycle identity.
    this.#run(() => {
      generation = this.#find(identifier)?.lifecycleKey;
    });
    return Promise.resolve(pending).then(
      (result) => {
        if (this.#canSettle(identifier, generation)) {
          const options = this.#resolveState(
            typeof states.success === 'function' ? states.success(result) : states.success,
          );
          this.update(identifier, {
            ...options,
            type: 'success',
            timeout: options.timeout ?? this.#timeout,
          });
        }
        return result;
      },
      (error: unknown) => {
        if (this.#canSettle(identifier, generation)) {
          const options = this.#resolveState(
            typeof states.error === 'function' ? states.error(error) : states.error,
          );
          this.update(identifier, {
            ...options,
            type: 'error',
            timeout: options.timeout ?? this.#timeout,
          });
        }
        throw error;
      },
    );
  }
  /** Provider interaction reasons compose, so a focus-out cannot resume a hovered stack. */
  pause(reason = 'manual'): void {
    if (this.#paused.has(reason)) return;
    const wasPaused = this.paused;
    this.#paused.add(reason);
    if (wasPaused) return;
    for (const timer of this.#timers.values()) {
      if (timer.handle !== undefined) {
        this.#clock.clearTimeout(timer.handle);
        timer.handle = undefined;
        timer.remaining = Math.max(0, timer.remaining - (this.#clock.now() - timer.started));
      }
    }
  }
  resume(reason = 'manual'): void {
    if (!this.#paused.delete(reason) || this.paused) return;
    for (const [id, timer] of this.#timers) {
      // A throttled background clock cannot synchronously mass-dismiss the queue.
      if (timer.remaining <= 0) timer.remaining = timer.delay;
      this.#startTimer(id, timer);
    }
  }
  /** Render bindings only; consumers do not mutate derived ToastObject fields. */
  measure(identifier: string, height: number, elementReference: HTMLElement | null): void {
    this.#run(() => {
      const toast = this.#find(identifier);
      if (!toast || toast.transitionStatus === 'ending') return;
      height = Math.max(0, height);
      if (Math.abs(toast.height - height) < 0.5 && toast.elementReference === elementReference)
        return;
      this.#publish(
        this.toasts.map((item) => (item === toast ? { ...item, height, elementReference } : item)),
      );
    });
  }
  completeEntrance(identifier: string, lifecycleKey: number): void {
    this.#run(() => {
      const toast = this.#find(identifier);
      if (toast?.lifecycleKey !== lifecycleKey || toast.transitionStatus !== 'starting') return;
      this.#publish(
        this.toasts.map((item) =>
          item === toast ? { ...item, transitionStatus: undefined } : item,
        ),
      );
    });
  }
  remove(identifier: string, lifecycleKey?: number): void {
    this.#run(() => {
      const toast = this.#find(identifier);
      if (!toast || (lifecycleKey !== undefined && toast.lifecycleKey !== lifecycleKey)) return;
      const cause = toast.cause ?? 'programmatic';
      this.#clearTimer(identifier);
      this.#publish(this.toasts.filter((item) => item !== toast));
      if (toast.transitionStatus !== 'ending') this.#callback(() => toast.onClose?.(cause));
      this.#callback(() => toast.onRemove?.(cause));
    });
  }
  destroy(): void {
    this.#run(() => {
      if (this.#destroyed) return;
      this.#destroyed = true;
      const toasts = this.toasts;
      this.#clearTimers();
      this.#paused.clear();
      this.#publish([]);
      for (const toast of toasts) {
        const cause = toast.cause ?? 'provider-destroyed';
        if (toast.transitionStatus !== 'ending') this.#callback(() => toast.onClose?.(cause));
        this.#callback(() => toast.onRemove?.(cause));
      }
    });
  }
  /** A new Provider lifetime may reuse its external manager after destruction. */
  reconnect(): void {
    this.#destroyed = false;
  }
  #find(identifier: string): ToastObject<Data> | undefined {
    return this.toasts.find((toast) => toast.identifier === identifier);
  }
  #update(identifier: string, options: ToastUpdateOptions<Data>, restart: boolean): void {
    if (this.#destroyed) return;
    const old = this.#find(identifier);
    if (!old) {
      this.#diagnostic?.(
        'missing-toast',
        `Toast ${identifier} cannot be updated because it is not in this queue.`,
      );
      return;
    }
    if (old.transitionStatus === 'ending') return;
    const { data, ...mutable } = options;
    const next: ToastObject<Data> = {
      ...old,
      ...mutable,
      identifier: old.identifier,
      ...(data ? { data: { ...old.data, ...data } as Data } : {}),
      updateKey: old.updateKey + 1,
    };
    this.#publish(this.toasts.map((item) => (item === old ? next : item)));
    if (
      restart ||
      Object.hasOwn(options, 'timeout') ||
      old.type === 'loading' ||
      next.type === 'loading'
    ) {
      this.#clearTimer(identifier);
      this.#schedule(next);
    }
  }
  #canSettle(identifier: string, generation: number | undefined): boolean {
    const toast = this.#find(identifier);
    return (
      !this.#destroyed && toast?.lifecycleKey === generation && toast?.transitionStatus !== 'ending'
    );
  }
  #resolveState(state: ToastPromiseState<Data>): ToastUpdateOptions<Data> {
    return typeof state === 'string' ? { title: state } : state;
  }
  #schedule(toast: ToastObject<Data>): void {
    const delay = duration(toast.timeout ?? this.#timeout);
    if (toast.transitionStatus === 'ending' || toast.type === 'loading' || delay <= 0) return;
    const timer: Timer = { handle: undefined, delay, remaining: delay, started: this.#clock.now() };
    this.#timers.set(toast.identifier, timer);
    if (!this.paused) this.#startTimer(toast.identifier, timer);
  }
  #startTimer(identifier: string, timer: Timer): void {
    timer.started = this.#clock.now();
    timer.handle = this.#clock.setTimeout(() => {
      this.#timers.delete(identifier);
      this.close(identifier, 'timeout');
    }, timer.remaining);
  }
  #clearTimer(identifier: string): void {
    const timer = this.#timers.get(identifier);
    if (timer?.handle !== undefined) this.#clock.clearTimeout(timer.handle);
    this.#timers.delete(identifier);
  }
  #clearTimers(): void {
    for (const identifier of this.#timers.keys()) this.#clearTimer(identifier);
  }
  #publish(toasts: readonly ToastObject<Data>[]): void {
    let active = 0;
    const next = toasts.map((toast) => {
      const limited = toast.transitionStatus === 'ending' ? toast.limited : active++ >= this.#limit;
      return Object.freeze(limited === toast.limited ? toast : { ...toast, limited });
    });
    if (
      next.length === this.toasts.length &&
      next.every((toast, index) => toast === this.toasts[index])
    )
      return;
    this.#store.set(Object.freeze(next));
  }
  #run(operation: () => void): void {
    if (this.#publishing) {
      this.#queue.push(operation);
      return;
    }
    this.#publishing = true;
    try {
      operation();
      while (this.#queue.length) this.#queue.shift()?.();
    } finally {
      this.#publishing = false;
    }
  }
  #callback(callback: () => void): void {
    try {
      callback();
    } catch (error) {
      this.#diagnostic?.(
        'toast-callback-error',
        `Toast lifecycle callback failed: ${String(error)}`,
      );
    }
  }
}

export function createToastManager<Data extends object = Record<string, unknown>>(
  options: ToastProviderOptions = {},
): ToastManager<Data> {
  return new ToastManager<Data>(options);
}
