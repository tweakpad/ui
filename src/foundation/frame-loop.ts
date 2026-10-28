/**
 * One animation-frame loop per window, shared by every subscriber that is still moving
 * (Foundation `cc-follower`: followers of one document share one frame loop and no loop runs
 * while everything is settled). A subscriber wakes itself; each frame it reports whether it
 * still needs the next one.
 */
export interface FrameSource {
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  now(): number;
}

export interface FrameSubscription {
  /** Requests frames until the callback reports rest; idempotent while pending. */
  wake(): void;
  /** Stops frames for this subscriber; later `wake` calls are ignored. */
  release(): void;
}

export type FrameCallback = (elapsed: number, now: number) => boolean;

interface Subscriber {
  readonly callback: FrameCallback;
  last: number;
  released: boolean;
}

export class FrameLoop {
  readonly #source: FrameSource;
  readonly #pending = new Set<Subscriber>();
  #handle: number | undefined;

  constructor(source: FrameSource) {
    this.#source = source;
  }

  /** Whether a frame is scheduled. */
  get active(): boolean {
    return this.#handle !== undefined;
  }

  subscribe(callback: FrameCallback): FrameSubscription {
    const subscriber: Subscriber = { callback, last: 0, released: false };
    return {
      wake: () => {
        if (subscriber.released || this.#pending.has(subscriber)) return;
        subscriber.last = this.#source.now();
        this.#pending.add(subscriber);
        this.#schedule();
      },
      release: () => {
        subscriber.released = true;
        this.#pending.delete(subscriber);
        if (!this.#pending.size) this.#cancel();
      },
    };
  }

  #schedule(): void {
    if (this.#handle !== undefined) return;
    this.#handle = this.#source.requestAnimationFrame(this.#frame);
  }

  #cancel(): void {
    if (this.#handle === undefined) return;
    this.#source.cancelAnimationFrame(this.#handle);
    this.#handle = undefined;
  }

  readonly #frame = (time: number): void => {
    this.#handle = undefined;
    for (const subscriber of [...this.#pending]) {
      if (subscriber.released || !this.#pending.has(subscriber)) continue;
      const elapsed = Math.max(0, time - subscriber.last);
      subscriber.last = time;
      let moving = false;
      try {
        moving = subscriber.callback(elapsed, time);
      } catch (error) {
        // One failing subscriber must not stop the others; surface it outside the frame.
        queueMicrotask(() => {
          throw error;
        });
      }
      if (!moving) this.#pending.delete(subscriber);
    }
    if (this.#pending.size) this.#schedule();
  };
}

const sources = new WeakMap<Window, FrameSource>();

/** The animation frames of a window as a frame source: one frozen object per window. */
export function windowFrames(view: Window): FrameSource {
  let source = sources.get(view);
  if (!source) {
    source = Object.freeze({
      requestAnimationFrame: (callback: (time: number) => void) =>
        view.requestAnimationFrame(callback),
      cancelAnimationFrame: (handle: number) => view.cancelAnimationFrame(handle),
      now: () => view.performance.now(),
    });
    sources.set(view, source);
  }
  return source;
}

const loops = new WeakMap<Window, FrameLoop>();

/** The shared frame loop of a window. */
export function frameLoopFor(view: Window): FrameLoop {
  let loop = loops.get(view);
  if (!loop) {
    loop = new FrameLoop(windowFrames(view));
    loops.set(view, loop);
  }
  return loop;
}
