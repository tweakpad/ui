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
  #hasBatchedChange = false;
  #batchedReason: ChangeReason = 'programmatic';
  #notifying = false;
  readonly #queue: Array<() => void> = [];

  constructor(initialValue: T) {
    this.#value = initialValue;
  }

  get value(): T {
    return this.#value;
  }

  set(value: T, reason: ChangeReason = 'programmatic'): boolean {
    if (this.#notifying) {
      this.#queue.push(() => this.set(value, reason));
      return !Object.is(value, this.#value);
    }
    if (Object.is(value, this.#value)) return false;
    const previousValue = this.#value;
    if (this.#batchDepth > 0 && !this.#hasBatchedChange) {
      this.#batchedPrevious = previousValue;
      this.#hasBatchedChange = true;
    }
    this.#value = value;
    this.#batchedReason = reason;
    if (this.#batchDepth === 0) this.#notify({ value, previousValue, reason });
    return true;
  }

  update(updater: (value: T) => T, reason: ChangeReason = 'programmatic'): boolean {
    if (this.#notifying) {
      this.#queue.push(() => this.update(updater, reason));
      return true;
    }
    return this.set(updater(this.#value), reason);
  }

  batch<R>(operation: () => R): R {
    if (this.#notifying) {
      const start = this.#queue.length;
      try {
        return operation();
      } finally {
        const writes = this.#queue.splice(start);
        if (writes.length)
          this.#queue.push(() =>
            this.batch(() => {
              for (const write of writes) write();
            }),
          );
      }
    }
    this.#batchDepth += 1;
    try {
      return operation();
    } finally {
      this.#batchDepth -= 1;
      if (this.#batchDepth === 0 && this.#hasBatchedChange) {
        const previousValue = this.#batchedPrevious as T;
        this.#hasBatchedChange = false;
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
    this.#notifying = true;
    try {
      for (const subscriber of [...this.#subscribers]) subscriber(change);
    } finally {
      this.#notifying = false;
      while (this.#queue.length && !this.#notifying) this.#queue.shift()!();
    }
  }
}
