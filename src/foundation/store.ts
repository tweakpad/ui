import type { ChangeReason } from './types.js';

export interface StoreChange<T> {
  value: T;
  previousValue: T;
  reason: ChangeReason;
}

export type StoreSubscriber<T> = (change: StoreChange<T>) => void;

export class ObservableStore<T> {
  #value: T;
  readonly #subscribers = new Set<StoreSubscriber<T>>();
  #batchDepth = 0;
  #batchedPrevious: T | undefined;
  #batchedReason: ChangeReason = 'programmatic';

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get value(): T {
    return this.#value;
  }

  set(value: T, reason: ChangeReason = 'programmatic'): boolean {
    if (Object.is(value, this.#value)) return false;
    const previousValue = this.#value;
    if (this.#batchDepth > 0 && this.#batchedPrevious === undefined)
      this.#batchedPrevious = previousValue;
    this.#value = value;
    this.#batchedReason = reason;
    if (this.#batchDepth === 0) this.#notify({ value, previousValue, reason });
    return true;
  }

  update(updater: (value: T) => T, reason: ChangeReason = 'programmatic'): boolean {
    return this.set(updater(this.#value), reason);
  }

  batch<R>(operation: () => R): R {
    this.#batchDepth += 1;
    try {
      return operation();
    } finally {
      this.#batchDepth -= 1;
      if (this.#batchDepth === 0 && this.#batchedPrevious !== undefined) {
        const previousValue = this.#batchedPrevious;
        this.#batchedPrevious = undefined;
        this.#notify({ value: this.#value, previousValue, reason: this.#batchedReason });
      }
    }
  }

  subscribe(subscriber: StoreSubscriber<T>, emitCurrent = false): () => void {
    this.#subscribers.add(subscriber);
    if (emitCurrent)
      subscriber({ value: this.#value, previousValue: this.#value, reason: 'programmatic' });
    return () => this.#subscribers.delete(subscriber);
  }

  #notify(change: StoreChange<T>): void {
    for (const subscriber of [...this.#subscribers]) subscriber(change);
  }
}
