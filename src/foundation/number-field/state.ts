import type { ReactiveControllerHost } from 'lit';
import { ControllableState } from '../controllable-state.js';
import { TpValueCommitEvent, type TpValueChangeEvent } from '../events.js';
import { LocaleService } from '../services.js';
import type { NumberLocale } from '../number-locale.js';
import type { ChangeReason } from '../types.js';
import {
  explicitNumberRounding,
  normalizeNumberFieldValue,
  numberFieldValidity,
  numberStepAmount,
  validateNumberFieldOptions,
  type NumberFieldNumericOptions,
} from './numeric.js';

export interface NumberFieldStateOptions extends NumberFieldNumericOptions {
  value?: number | null;
  defaultValue?: number | null;
  locale?: string | string[];
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  onValueChange?: (event: TpValueChangeEvent<number | null>) => void;
  onValueCommitted?: (event: TpValueCommitEvent<number | null>) => void;
}
export interface NumberFieldStatePorts {
  host: ReactiveControllerHost & EventTarget;
  onPublish?: (value: number | null, previous: number | null, reason: ChangeReason) => void;
  diagnostic?: (message: string) => void;
}

const assertValue = (value: number | null | undefined) => {
  if (
    value !== undefined &&
    value !== null &&
    (typeof value !== 'number' || !Number.isFinite(value))
  )
    throw new TypeError('NumberField value must be finite or null.');
};

/** One numeric proposal lane and its pending editable representation. No string value event lane. */
export class NumberFieldState {
  #options: NumberFieldStateOptions;
  readonly #state: ControllableState<number | null>;
  #locale: NumberLocale;
  #text: string;
  #editing = false;
  #touched = false;
  #requestDepth = 0;
  #initial: number | null;
  #lastCommit: number | null;
  #disposed = false;

  constructor(
    readonly ports: NumberFieldStatePorts,
    options: NumberFieldStateOptions = {},
  ) {
    validateNumberFieldOptions(options);
    assertValue(options.value);
    assertValue(options.defaultValue);
    this.#locale = new LocaleService(options.locale).numberLocale(options.format);
    this.#options = { ...options };
    this.#state = new ControllableState({
      host: ports.host,
      initialValue: null,
      readControlledValue: () => this.#options.value,
      readDefaultValue: () => this.#options.defaultValue,
      hasDefaultValue: () => this.#options.defaultValue !== undefined,
      onChange: (event) => this.#options.onValueChange?.(event),
      onCommit: (value, previous, reason) => this.ports.onPublish?.(value, previous, reason),
      ...(ports.diagnostic ? { diagnostic: ports.diagnostic } : {}),
    });
    this.#state.initialize();
    this.#initial = this.#lastCommit = this.value;
    this.#text = this.#format();
  }

  get value(): number | null {
    return this.#state.value;
  }
  get text(): string {
    return this.#text;
  }
  get controlled(): boolean {
    return this.#state.controlled;
  }
  get editing(): boolean {
    return this.#editing;
  }
  get dirty(): boolean {
    return !Object.is(this.value, this.#initial);
  }
  get touched(): boolean {
    return this.#touched;
  }
  get options(): Readonly<NumberFieldStateOptions> {
    return this.#options;
  }
  get disabled(): boolean {
    return this.#options.disabled ?? false;
  }
  get readOnly(): boolean {
    return this.#options.readOnly ?? false;
  }
  get validity(): ValidityStateFlags {
    const parsed = this.#locale.parse(this.#text, true);
    return numberFieldValidity(this.value, {
      ...this.#options,
      badInput: parsed.kind === 'invalid',
    });
  }
  get formattedValue(): string {
    return this.#format();
  }

  update(options: Partial<NumberFieldStateOptions>): void {
    if (this.#disposed) return;
    const next = { ...this.#options, ...options };
    validateNumberFieldOptions(next);
    assertValue(next.value);
    assertValue(next.defaultValue);
    const locale = new LocaleService(next.locale).numberLocale(next.format);
    const formattingChanged =
      JSON.stringify([next.locale, next.format]) !==
      JSON.stringify([this.#options.locale, this.#options.format]);
    this.#options = next;
    this.#locale = locale;
    // Only an explicit value publication may replay a previously vetoed owner value.
    if ('value' in options) this.#state.sync();
    if (!this.#requestDepth) {
      if ('value' in options || formattingChanged || !this.#editing) this.#canonical();
      if ('value' in options) this.#lastCommit = this.value;
    }
    this.ports.host.requestUpdate();
  }

  allowsCharacter(char: string): boolean {
    return this.#locale.allowsCharacter(
      char,
      (this.#options.minimum ?? -Infinity) < 0 || !!this.#options.allowOutOfRange,
    );
  }

  input(text: string, reason: ChangeReason = 'input', event?: Event): boolean {
    if (this.#disposed || this.disabled || this.readOnly) return false;
    const previousText = this.#text;
    const previousEditing = this.#editing;
    const parsed = this.#locale.parse(text);
    this.#text = text;
    this.#editing = true;
    let accepted = true;
    this.#requestDepth++;
    try {
      if (parsed.kind === 'empty')
        accepted = this.#request(null, reason === 'input-paste' ? reason : 'input-clear', event);
      else if (parsed.kind === 'number')
        accepted = this.#request(
          normalizeNumberFieldValue(parsed.value, this.#options),
          reason,
          event,
        );
    } finally {
      this.#requestDepth--;
    }
    if (!accepted) {
      this.#text = previousText;
      this.#editing = previousEditing;
    }
    this.ports.host.requestUpdate();
    return accepted;
  }

  blur(event?: Event): void {
    if (this.#disposed) return;
    this.#touched = true;
    if (this.disabled || this.readOnly) {
      this.#canonical();
      return;
    }
    const parsed = this.#locale.parse(this.#text, true);
    let value = this.value;
    if (this.#editing) {
      if (parsed.kind === 'number') value = parsed.value;
      else if (parsed.kind === 'empty') value = null;
    }
    if (this.#editing || explicitNumberRounding(this.#options.format))
      value = normalizeNumberFieldValue(value, this.#options);
    const accepted = this.#request(value, 'input-blur', event);
    if (accepted) {
      this.#canonical();
      this.commit('input-blur', event);
    }
  }

  step(
    direction: 1 | -1,
    reason: ChangeReason = direction > 0 ? 'increment' : 'decrement',
    event?: Event & { altKey?: boolean; shiftKey?: boolean },
    units = 1,
  ): boolean {
    if (this.#disposed || this.disabled || this.readOnly || !Number.isFinite(units) || units <= 0)
      return false;
    const parsed = this.#editing ? this.#locale.parse(this.#text, true) : null;
    const current = parsed?.kind === 'number' ? parsed.value : this.value;
    const amount = numberStepAmount(this.#options, event);
    const next =
      current === null
        ? normalizeNumberFieldValue(0, {
            ...this.#options,
            allowOutOfRange: false,
            snapOnStep: false,
          })
        : normalizeNumberFieldValue(current + amount * direction * units, this.#options, {
            amount,
            direction,
            small: !!event?.altKey,
          });
    const previous = this.value;
    const accepted = this.#request(next, reason, event);
    if (accepted) this.#canonical();
    return accepted && !Object.is(previous, this.value);
  }

  setValue(value: number | null, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    if (this.#disposed) return false;
    assertValue(value);
    const previous = this.value;
    const accepted = this.#request(normalizeNumberFieldValue(value, this.#options), reason, event);
    if (accepted) this.#canonical();
    return accepted && !Object.is(previous, this.value);
  }

  keyDown(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || this.disabled || this.readOnly) return;
    if (event.ctrlKey || event.metaKey) return;
    const direction = event.key === 'ArrowUp' ? 1 : event.key === 'ArrowDown' ? -1 : null;
    if (event.altKey && !direction) return;
    const boundary =
      event.key === 'Home'
        ? this.#options.minimum
        : event.key === 'End'
          ? this.#options.maximum
          : undefined;
    if (direction || boundary !== undefined) {
      event.preventDefault();
      event.stopPropagation();
      const changed = direction
        ? this.step(direction, 'keyboard', event)
        : this.setValue(boundary!, 'keyboard', event);
      if (changed) this.commit('keyboard', event);
    } else if (event.key.length === 1 && !event.altKey && !this.allowsCharacter(event.key))
      event.preventDefault();
  }

  commit(reason: ChangeReason, event?: Event): boolean {
    if (this.#disposed || Object.is(this.value, this.#lastCommit)) return false;
    const committed = new TpValueCommitEvent(this.value, this.#lastCommit, reason, event);
    this.#lastCommit = this.value;
    this.#options.onValueCommitted?.(committed);
    this.ports.host.dispatchEvent(committed);
    return true;
  }

  reset(event?: Event): void {
    if (this.#disposed) return;
    this.#state.reset(event);
    this.#initial = this.#lastCommit = this.value;
    this.#touched = false;
    this.#canonical();
  }

  dispose(): void {
    this.#disposed = true;
    this.ports.host.removeController(this.#state);
  }

  #request(value: number | null, reason: ChangeReason, event?: Event): boolean {
    this.#requestDepth++;
    try {
      return Object.is(value, this.value) || this.#state.set(value, reason, event);
    } finally {
      this.#requestDepth--;
    }
  }
  #format(): string {
    return this.value === null ? '' : this.#locale.formatter.format(this.value);
  }
  #canonical(): void {
    this.#editing = false;
    this.#text = this.#format();
    this.ports.host.requestUpdate();
  }
}
