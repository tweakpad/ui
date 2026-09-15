import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { TpValueChangeEvent } from './events.js';
import type { ChangeReason } from './types.js';

export interface ControllableStateOptions<T> {
  host: ReactiveControllerHost & EventTarget;
  initialValue: T;
  readControlledValue?: () => T | undefined;
  onCommit?: (value: T, previousValue: T, reason: ChangeReason) => void;
}

export class ControllableState<T> implements ReactiveController {
  readonly #host: ReactiveControllerHost & EventTarget;
  readonly #readControlledValue: (() => T | undefined) | undefined;
  readonly #onCommit: ((value: T, previousValue: T, reason: ChangeReason) => void) | undefined;
  #value: T;

  constructor(options: ControllableStateOptions<T>) {
    this.#host = options.host;
    this.#value = options.initialValue;
    this.#readControlledValue = options.readControlledValue;
    this.#onCommit = options.onCommit;
    options.host.addController(this);
  }

  get value(): T {
    return this.#readControlledValue?.() ?? this.#value;
  }

  set(value: T, reason: ChangeReason, sourceEvent?: Event): boolean {
    const previousValue = this.value;
    if (Object.is(previousValue, value)) return false;
    const event = new TpValueChangeEvent(value, previousValue, reason, sourceEvent);
    if (!this.#host.dispatchEvent(event)) return false;
    if (this.#readControlledValue?.() === undefined) this.#value = value;
    this.#onCommit?.(value, previousValue, reason);
    this.#host.requestUpdate();
    return true;
  }

  hostUpdate(): void {
    void this.value;
  }
}
