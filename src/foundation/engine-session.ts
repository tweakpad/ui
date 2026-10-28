/**
 * The engine mount session of a host that mounts an engine instance (Map, the text editor):
 * one mount at a time, superseded through an `AbortController` per mount, a `live()` guard for
 * the engine's callbacks, ready reported once and only after the result arrived, a superseded
 * result destroyed on arrival, failure and teardown. Status publication and the settling of
 * pending requests stay with the host.
 */

export interface EngineMountHooks<I> {
  /** The current mount's result arrived and is the session's instance from now on. */
  attached(instance: I): void;
  /** The engine reported ready: once per mount, never before `attached`. */
  ready(instance: I): void;
  /** The session is about to destroy its instance (teardown or failure): detach from it first. */
  detaching?(instance: I): void;
  /** The mount threw or rejected, or the engine reported a fatal error; the instance is destroyed. */
  failed(error: unknown): void;
}

/** What one mount hands its engine. */
export interface EngineMountControl {
  /** Aborted when the mount ends: teardown, supersession or failure. */
  readonly signal: AbortSignal;
  /** Whether the mount is still current: `false` once superseded, failed or torn down. */
  live(): boolean;
  /** The engine's ready notification; only the first call of a live mount counts. */
  ready(): void;
  /** The engine's fatal error; ends a live mount. */
  fail(error: unknown): void;
}

interface Mount<I> {
  readonly controller: AbortController;
  instance: I | null;
  readyReported: boolean;
}

export class EngineMountSession<I extends { destroy(): void }> {
  readonly #hooks: EngineMountHooks<I>;
  #current: Mount<I> | null = null;

  constructor(hooks: EngineMountHooks<I>) {
    this.#hooks = hooks;
  }

  /** The current mount's attached instance, or `null`. */
  get instance(): I | null {
    return this.#current?.instance ?? null;
  }

  /** Whether a mount has started and its result has not arrived yet. */
  get mounting(): boolean {
    return this.#current !== null && this.#current.instance === null;
  }

  /**
   * Starts a mount, superseding the current one as `teardown()` does. `mount` runs synchronously
   * with the mount's control; its result attaches a microtask later, so a synchronous instance
   * and a promise take the same path.
   */
  start(mount: (control: EngineMountControl) => I | Promise<I>): void {
    this.teardown();
    const current: Mount<I> = {
      controller: new AbortController(),
      instance: null,
      readyReported: false,
    };
    this.#current = current;
    const live = () => this.#current === current;
    const control: EngineMountControl = {
      signal: current.controller.signal,
      live,
      ready: () => {
        if (!live() || current.readyReported) return;
        current.readyReported = true;
        if (current.instance) this.#hooks.ready(current.instance);
      },
      fail: (error) => {
        if (live()) this.#fail(current, error);
      },
    };
    let result: I | Promise<I>;
    try {
      result = mount(control);
    } catch (error) {
      if (live()) this.#fail(current, error);
      return;
    }
    void Promise.resolve(result).then(
      (instance) => {
        if (!live()) {
          // Superseded, failed or torn down while mounting.
          instance.destroy();
          return;
        }
        current.instance = instance;
        this.#hooks.attached(instance);
        if (current.readyReported && live()) this.#hooks.ready(instance);
      },
      (error: unknown) => {
        if (live()) this.#fail(current, error);
      },
    );
  }

  /**
   * Ends the current mount: aborts its signal and destroys its instance; a pending result is
   * destroyed when it arrives. Returns the destroyed instance, if any.
   */
  teardown(): I | null {
    const current = this.#current;
    if (!current) return null;
    const instance = this.#end(current);
    instance?.destroy();
    return instance;
  }

  #fail(current: Mount<I>, error: unknown): void {
    const instance = this.#end(current);
    try {
      instance?.destroy();
    } catch {
      // The engine already failed.
    }
    this.#hooks.failed(error);
  }

  #end(current: Mount<I>): I | null {
    this.#current = null;
    current.controller.abort();
    const { instance } = current;
    // The engine may keep its control; it must not keep the destroyed instance reachable.
    current.instance = null;
    if (instance) this.#hooks.detaching?.(instance);
    return instance;
  }
}
