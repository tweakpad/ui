import type { TreeLoadStatus } from './model.js';

export interface TreeLoadState {
  status: TreeLoadStatus;
  error?: unknown;
}

export type TreeLoadRun<C> = (signal: AbortSignal) => Promise<C>;

/**
 * Per-item loading of children: one pending request per item, abortable, retryable. The owner
 * stores the results; this only tracks requests and their status.
 */
export class TreeLoader<C> {
  readonly #states = new Map<string, TreeLoadState>();
  readonly #pending = new Map<string, { controller: AbortController; promise: Promise<void> }>();
  readonly #onChange: (id: string, state: TreeLoadState) => void;
  readonly #onLoad: (id: string, children: C) => void;

  constructor(options: {
    onChange: (id: string, state: TreeLoadState) => void;
    onLoad: (id: string, children: C) => void;
  }) {
    this.#onChange = options.onChange;
    this.#onLoad = options.onLoad;
  }

  state(id: string): TreeLoadState {
    return this.#states.get(id) ?? { status: 'idle' };
  }

  status(id: string): TreeLoadStatus {
    return this.state(id).status;
  }

  get pending(): number {
    return this.#pending.size;
  }

  /** Resolves when every request pending now has settled. */
  async settled(): Promise<void> {
    await Promise.allSettled([...this.#pending.values()].map((pending) => pending.promise));
  }

  /** Starts a request unless one is pending; resolves when it settles. */
  load(id: string, run: TreeLoadRun<C>): Promise<void> {
    const current = this.#pending.get(id);
    if (current) return current.promise;
    const controller = new AbortController();
    this.#set(id, { status: 'loading' });
    const promise = Promise.resolve()
      .then(() => run(controller.signal))
      .then(
        (children) => {
          if (controller.signal.aborted || this.#pending.get(id)?.controller !== controller) return;
          this.#pending.delete(id);
          this.#onLoad(id, children);
          this.#set(id, { status: 'loaded' });
        },
        (error: unknown) => {
          if (controller.signal.aborted || this.#pending.get(id)?.controller !== controller) return;
          this.#pending.delete(id);
          this.#set(id, { status: 'error', error });
        },
      );
    this.#pending.set(id, { controller, promise });
    return promise;
  }

  /** Aborts a pending request and forgets the item's status. */
  abort(id: string): void {
    const pending = this.#pending.get(id);
    if (pending) {
      this.#pending.delete(id);
      pending.controller.abort();
    }
    if (this.#states.delete(id)) this.#onChange(id, { status: 'idle' });
  }

  /** Aborts every pending request whose item is no longer present. */
  retain(present: (id: string) => boolean): void {
    for (const id of [...this.#pending.keys()]) if (!present(id)) this.abort(id);
    for (const id of [...this.#states.keys()]) if (!present(id)) this.#states.delete(id);
  }

  /** Disconnect: abort everything pending; settled statuses survive for reconnection. */
  abortPending(): void {
    for (const [id, pending] of [...this.#pending]) {
      this.#pending.delete(id);
      pending.controller.abort();
      this.#set(id, { status: 'idle' });
    }
  }

  #set(id: string, state: TreeLoadState): void {
    this.#states.set(id, state);
    this.#onChange(id, state);
  }
}
