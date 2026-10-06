import type { ChangeReason } from './types.js';

export interface StoreChange<T> {
  value: T;
  previousValue: T;
  reason: ChangeReason;
}

export type StoreSubscriber<T> = (change: StoreChange<T>) => void;

/** Equality used by selected subscriptions to decide whether the selected value changed. */
export type StoreEquality<S> = (previous: S, next: S) => boolean;

/** Receives the selected value, plus the selected change and its reason. */
export type SelectedStoreSubscriber<S> = (selected: S, change: StoreChange<S>) => void;

export interface StoreSubscribeOptions {
  /** Immediately deliver the current value with the `programmatic` reason. */
  emitCurrent?: boolean;
}

export interface SelectedStoreSubscribeOptions<T, S> extends StoreSubscribeOptions {
  /** Derives the slice this subscriber depends on from each published value. */
  selector: (value: T) => S;
  /** Reports whether two selected values are equal; defaults to `Object.is`. */
  equality?: StoreEquality<S>;
}

const hasOwn = Object.prototype.hasOwnProperty;

/**
 * Shallowly compares two values: identical values, or plain objects/arrays whose own string and
 * symbol keys hold `Object.is`-equal values. Suitable as a selected-subscription equality.
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const keysA = Reflect.ownKeys(a);
  const keysB = Reflect.ownKeys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (
      !hasOwn.call(b, key) ||
      !Object.is((a as Record<PropertyKey, unknown>)[key], (b as Record<PropertyKey, unknown>)[key])
    )
      return false;
  }
  return true;
}

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

  /**
   * Observes published values and returns an unsubscribe operation. The second argument is either
   * the legacy `emitCurrent` flag or an options record. With a `selector`, the listener receives the
   * selected value and runs only when `equality` (default `Object.is`) reports that it changed.
   * The selected type is inferred from the selector's return type, so give an inline selector a
   * typed parameter (or pass the type argument) when the listener needs the selected type.
   */
  subscribe(subscriber: StoreSubscriber<T>, options?: boolean | StoreSubscribeOptions): () => void;
  subscribe<S>(
    subscriber: SelectedStoreSubscriber<NoInfer<S>>,
    options: SelectedStoreSubscribeOptions<T, S>,
  ): () => void;
  subscribe<S>(
    subscriber: StoreSubscriber<T> | SelectedStoreSubscriber<S>,
    options: boolean | StoreSubscribeOptions | SelectedStoreSubscribeOptions<T, S> = false,
  ): () => void {
    const emitCurrent = typeof options === 'boolean' ? options : Boolean(options.emitCurrent);
    const selection =
      typeof options === 'object' &&
      typeof (options as Partial<SelectedStoreSubscribeOptions<T, S>>).selector === 'function'
        ? (options as SelectedStoreSubscribeOptions<T, S>)
        : undefined;
    let entry: StoreSubscriber<T>;
    if (selection) {
      const { selector } = selection;
      const equality = selection.equality ?? Object.is;
      const listener = subscriber as SelectedStoreSubscriber<S>;
      let selected = selector(this.#value);
      entry = ({ value, reason }) => {
        const next = selector(value);
        if (equality(selected, next)) return;
        const previousValue = selected;
        selected = next;
        listener(next, { value: next, previousValue, reason });
      };
      this.#subscribers.add(entry);
      if (emitCurrent)
        listener(selected, { value: selected, previousValue: selected, reason: 'programmatic' });
    } else {
      entry = subscriber as StoreSubscriber<T>;
      this.#subscribers.add(entry);
      if (emitCurrent)
        entry({ value: this.#value, previousValue: this.#value, reason: 'programmatic' });
    }
    return () => this.#subscribers.delete(entry);
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
