/** Outcome of one transfer reported by the queue. */
export type UploadOutcome =
  | { readonly status: 'complete'; readonly response: unknown }
  | { readonly status: 'error'; readonly error: unknown }
  | { readonly status: 'aborted' };

export interface UploadQueueOptions {
  /** Transfers in flight at once; read on every scheduling step. */
  readonly concurrency: () => number;
  /** Starts one transfer. Progress is a percentage, or `null` while unknown. */
  readonly run: (
    id: string,
    signal: AbortSignal,
    progress: (percentage: number | null) => void,
  ) => Promise<unknown>;
  readonly started: (id: string) => void;
  readonly progressed: (id: string, percentage: number | null) => void;
  readonly settled: (id: string, outcome: UploadOutcome) => void;
}

/**
 * First-in, first-out transfer queue for the upload adapter (Foundation File upload
 * `fup-upload`). It owns scheduling and cancellation only; item state belongs to the caller.
 */
export class UploadQueue {
  readonly #options: UploadQueueOptions;
  readonly #waiting: string[] = [];
  readonly #active = new Map<string, AbortController>();

  constructor(options: UploadQueueOptions) {
    this.#options = options;
  }

  get busy(): boolean {
    return this.#active.size > 0 || this.#waiting.length > 0;
  }

  has(id: string): boolean {
    return this.#active.has(id) || this.#waiting.includes(id);
  }

  isActive(id: string): boolean {
    return this.#active.has(id);
  }

  enqueue(id: string): void {
    if (this.has(id)) return;
    this.#waiting.push(id);
    this.#pump();
  }

  /** Aborts an active transfer or drops a waiting one. Returns whether anything was cancelled. */
  cancel(id: string): boolean {
    const waiting = this.#waiting.indexOf(id);
    if (waiting >= 0) {
      this.#waiting.splice(waiting, 1);
      return true;
    }
    const controller = this.#active.get(id);
    if (!controller) return false;
    this.#active.delete(id);
    controller.abort(new DOMException('The upload was cancelled.', 'AbortError'));
    this.#options.settled(id, { status: 'aborted' });
    this.#pump();
    return true;
  }

  cancelAll(): void {
    this.#waiting.length = 0;
    for (const id of [...this.#active.keys()]) this.cancel(id);
  }

  /** Starts waiting transfers after a concurrency increase. */
  pump(): void {
    this.#pump();
  }

  #pump(): void {
    const limit = Math.max(1, Math.floor(this.#options.concurrency()) || 1);
    while (this.#active.size < limit && this.#waiting.length) {
      const id = this.#waiting.shift()!;
      const controller = new AbortController();
      this.#active.set(id, controller);
      this.#options.started(id);
      let promise: Promise<unknown>;
      try {
        promise = Promise.resolve(
          this.#options.run(id, controller.signal, (percentage) => {
            if (this.#active.get(id) === controller) this.#options.progressed(id, percentage);
          }),
        );
      } catch (error) {
        promise = Promise.reject(error);
      }
      promise.then(
        (response) => this.#finish(id, controller, { status: 'complete', response }),
        (error: unknown) => this.#finish(id, controller, { status: 'error', error }),
      );
    }
  }

  #finish(id: string, controller: AbortController, outcome: UploadOutcome): void {
    if (this.#active.get(id) !== controller) return;
    this.#active.delete(id);
    this.#options.settled(id, controller.signal.aborted ? { status: 'aborted' } : outcome);
    this.#pump();
  }
}

/** Converts adapter progress (bytes or a percentage) to a clamped percentage. */
export function progressPercentage(loaded: number, total?: number): number | null {
  const value = total === undefined ? loaded : total > 0 ? (loaded / total) * 100 : Number.NaN;
  if (!Number.isFinite(value)) return null;
  return Math.min(100, Math.max(0, value));
}
