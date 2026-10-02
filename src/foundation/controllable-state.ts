import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { TpValueChangeEvent } from './events.js';
import type { TpChangeEventOptions } from './events.js';
import type { ChangeReason } from './types.js';

export interface ControllableStateOptions<T> {
  host: ReactiveControllerHost & EventTarget;
  initialValue: T;
  readControlledValue?: () => T | undefined;
  readDefaultValue?: () => T | undefined;
  hasDefaultValue?: () => boolean;
  onChange?: (event: TpValueChangeEvent<T>) => void;
  onCommit?: (value: T, previousValue: T, reason: ChangeReason) => void;
  equals?: (a: T, b: T) => boolean;
  diagnostic?: (message: string) => void;
}

/** Ordered equality without coercing identifiers or mutating consumer arrays. */
export function orderedValuesEqual<T>(a: readonly T[], b: readonly T[]): boolean {
  return a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
}

/** Lifetime-stable commit owner; component policy normalizes proposals before set(). */
export class ControllableState<T> implements ReactiveController {
  #value: T;
  #initialized = false;
  #controlled = false;
  #lastRead: T | undefined;
  #publishing = false;
  #committing = false;
  #pendingExternal: { value: T } | undefined;
  #queue: Array<() => void> = [];
  #diagnostics = new Set<string>();
  readonly #equals: (a: T, b: T) => boolean;

  constructor(private readonly options: ControllableStateOptions<T>) {
    this.#value = options.initialValue;
    this.#equals = options.equals ?? Object.is;
    options.host.addController(this);
  }

  get value(): T {
    if (!this.#initialized) {
      const input = this.options.readControlledValue?.();
      return input === undefined ? this.#defaultValue() : input;
    }
    return this.#value;
  }

  get controlled(): boolean {
    return this.#initialized
      ? this.#controlled
      : this.options.readControlledValue?.() !== undefined;
  }

  initialize(): void {
    if (this.#initialized) return;
    this.#lastRead = this.options.readControlledValue?.();
    this.#controlled = this.#lastRead !== undefined;
    this.#value = this.#controlled ? this.#lastRead! : this.#defaultValue();
    this.#initialized = true;
    if (this.#controlled && this.options.hasDefaultValue?.())
      this.#diagnose('default', 'Supply either a controlled value or a default value, not both.');
  }

  /** Explicit owner publication; call after changing a controlled input property. */
  sync(): void {
    this.#sync(true);
  }

  #sync(explicit: boolean): void {
    this.initialize();
    const input = this.options.readControlledValue?.();
    if ((input !== undefined) !== this.#controlled) {
      this.#diagnose(
        'mode',
        'Keep the initial controlled or uncontrolled mode for this component lifetime.',
      );
      return;
    }
    if (!this.#controlled || input === undefined) return;
    const changed = this.#lastRead === undefined || !this.#equals(input, this.#lastRead);
    if (!explicit && !changed) return;
    this.#lastRead = input;
    if (this.#publishing && this.#committing) {
      this.#queue.push(() => this.#sync(true));
      return;
    }
    if (this.#publishing) {
      this.#pendingExternal = { value: input };
      return;
    }
    this.#publishing = true;
    try {
      this.#publish(input, 'programmatic');
    } finally {
      this.#publishing = false;
      this.#drain();
    }
  }

  set(
    value: T,
    reason: ChangeReason,
    sourceEvent?: Event,
    eventOptions?: TpChangeEventOptions,
  ): boolean {
    this.initialize();
    if (this.#publishing) {
      this.#queue.push(() => this.set(value, reason, sourceEvent, eventOptions));
      return false;
    }
    this.#sync(false);
    const previousValue = this.#value;
    if (this.#equals(previousValue, value)) return false;
    const event = new TpValueChangeEvent(value, previousValue, reason, sourceEvent, eventOptions);
    this.#publishing = true;
    this.#pendingExternal = undefined;
    let accepted: boolean;
    try {
      this.options.onChange?.(event);
      this.options.host.dispatchEvent(event);
      accepted = !event.defaultPrevented && !event.detail.cancelled;
      const ownerValue = this.options.readControlledValue?.();
      if (this.#controlled && ownerValue !== undefined) {
        // Consume canceled owner writes so automatic hostUpdate cannot replay them.
        if (this.#lastRead === undefined || !this.#equals(ownerValue, this.#lastRead))
          this.#pendingExternal = { value: ownerValue };
        this.#lastRead = ownerValue;
      }
      if (accepted) {
        if (!this.#controlled) this.#publish(value, reason);
        else if (this.#pendingExternal) this.#publish(this.#pendingExternal.value, reason);
      }
    } finally {
      this.#pendingExternal = undefined;
      this.#publishing = false;
      this.options.host.requestUpdate();
      this.#drain();
    }
    return accepted;
  }

  /** Native resets never fabricate a proposal for a controlled owner. */
  reset(sourceEvent?: Event): boolean {
    this.initialize();
    if (this.#controlled) return false;
    return this.set(this.#defaultValue(), 'form-reset', sourceEvent);
  }

  hostUpdate(): void {
    this.#sync(false);
  }

  #defaultValue(): T {
    const value = this.options.readDefaultValue?.();
    return value === undefined ? this.options.initialValue : value;
  }

  #publish(value: T, reason: ChangeReason): void {
    const previous = this.#value;
    if (this.#equals(previous, value)) return;
    this.#value = value;
    this.#committing = true;
    try {
      this.options.onCommit?.(value, previous, reason);
    } finally {
      this.#committing = false;
    }
    this.options.host.requestUpdate();
  }

  #drain(): void {
    while (!this.#publishing && this.#queue.length) this.#queue.shift()!();
  }

  #diagnose(key: string, message: string): void {
    if (this.#diagnostics.has(key)) return;
    this.#diagnostics.add(key);
    this.options.diagnostic?.(message);
  }
}
