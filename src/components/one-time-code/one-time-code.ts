import { css, html, nothing, type PropertyValues } from 'lit';
import { autofillHint } from '../../foundation/autofill.js';
import { live } from 'lit/directives/live.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { minusIcon } from '../../icons/minus.js';
import { normalizeCode, codeOffset, type CodeValidation } from './normalize.js';
import { otpFieldPresentation } from '../../presentation/families/otp-field.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export interface CodeCompleteDetail {
  value: string;
  sourceEvent: Event;
}
export interface CodeInvalidDetail {
  attemptedValue: string;
  reason: 'input' | 'paste';
  sourceEvent: Event;
}

/** One native editor, one common value owner; visible positions never own editing state. */
export class TpOtpField extends TpFormElement {
  static tagName = 'tp-otp-field';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override presentation = otpFieldPresentation;
  static override properties = {
    ...TpFormElement.properties,
    length: { type: Number },
    inputMode: { type: String, attribute: 'inputmode', noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    validationType: { type: String, attribute: 'validation-type' },
    characterPredicate: { attribute: false },
    normalizeValue: { attribute: false },
    groupLengths: { type: Array, attribute: 'group-lengths' },
    mask: { type: Boolean, reflect: true },
    autoComplete: { type: String, attribute: 'autocomplete' },
    noAutofill: { type: Boolean, attribute: 'no-autofill', reflect: true },
    autoSubmit: { type: Boolean, attribute: 'auto-submit' },
    label: { type: String },
    placeholder: { type: String },
    onValueChange: { attribute: false },
    onValueComplete: { attribute: false },
    onValueInvalid: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
        min-inline-size: 0;
      }

      .root {
        position: relative;
        display: inline-flex;
        align-items: center;
        max-inline-size: 100%;
      }

      .group {
        display: flex;
        min-inline-size: 0;
      }

      .editor {
        position: absolute;
        z-index: 2;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        padding: 0;
        border: 0;
        outline: 0;
        color: transparent;
        caret-color: transparent;
        background: transparent;
        opacity: 0.01;
      }

      .slot {
        position: relative;
        display: grid;
        place-items: center;
        flex: 0 1 auto;
        min-inline-size: 0;
      }

      .slot[data-active] {
        z-index: 1;
      }

      .separator {
        display: flex;
        align-items: center;
      }
    `,
  ];
  length: number | undefined;
  defaultValue: string | undefined;
  validationType: CodeValidation = 'alphanumeric';
  characterPredicate: ((character: string) => boolean) | undefined;
  normalizeValue: ((value: string) => string) | undefined;
  groupLengths: readonly number[] = [];
  mask = false;
  autoComplete = 'one-time-code';
  /** Opts the code editor out of host and extension autofill. */
  noAutofill = false;
  get effectiveNoAutofill(): boolean {
    return this.noAutofill || this.inheritedNoAutofill;
  }
  autoSubmit = false;
  label = 'One-time code';
  placeholder = '';
  onValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  onValueComplete: ((detail: CodeCompleteDetail) => void) | undefined;
  onValueInvalid: ((detail: CodeInvalidDetail) => void) | undefined;
  #providedValue: string | undefined;
  #inputMode: string | undefined;
  #selectionStart = 0;
  #selectionEnd = 0;
  #beforeSelection: [number, number] = [0, 0];
  #focused = false;
  #composing = false;
  #compositionInput: string | undefined;
  #diagnosed = '';
  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () =>
      this.#providedValue === undefined ? undefined : this.#normalize(this.#providedValue),
    readDefaultValue: () => this.#normalize(this.defaultValue ?? ''),
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: () => {
      this.#syncForm();
      this.dispatchEvent(new Event('tp-field-value', { bubbles: true, composed: true }));
    },
    diagnostic: (message) =>
      this.emit('tp-diagnostic', { component: 'One-time code field', message }),
  });
  override get value(): string {
    return this.#normalize(this.#state.value);
  }
  override set value(value: string | undefined) {
    const previous = this.#providedValue;
    this.#providedValue = value;
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#state.sync();
  }
  get inputMode(): string {
    return this.#inputMode ?? (this.validationType === 'numeric' ? 'numeric' : 'text');
  }
  set inputMode(value: string | undefined) {
    const previous = this.#inputMode;
    this.#inputMode = value || undefined;
    this.requestUpdate('inputMode', previous);
  }
  get complete(): boolean {
    return this.#validComposition && [...this.value].length === this.#capacity;
  }
  get #capacity(): number {
    return Number.isInteger(this.length) && this.length! > 0 ? this.length! : 0;
  }
  get #validComposition(): boolean {
    return (
      this.#capacity > 0 &&
      (!this.groupLengths.length ||
        (this.groupLengths.every((n) => Number.isInteger(n) && n > 0) &&
          this.groupLengths.reduce((sum, n) => sum + n, 0) === this.#capacity)) &&
      (this.validationType !== 'predicate' || typeof this.characterPredicate === 'function')
    );
  }
  #normalize(value: string): string {
    return normalizeCode(value, {
      length: this.#capacity,
      validationType: this.validationType,
      characterPredicate: this.characterPredicate,
      normalizeValue: this.normalizeValue,
    });
  }
  protected override associationTarget(): HTMLElement | null {
    return this.inputElement;
  }
  #slotState(index: number) {
    const chars = [...this.value],
      position = [...this.value.slice(0, this.#selectionStart)].length;
    return {
      index,
      active: this.#focused && index === Math.min(position, this.#capacity - 1),
      focused: this.#focused,
      selected:
        this.#focused &&
        index >= position &&
        index < [...this.value.slice(0, this.#selectionEnd)].length,
      filled: !!chars[index],
      complete: this.complete,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      ...this.fieldStateMarkers,
    };
  }
  #renderSlot(index: number) {
    const state = this.#slotState(index),
      char = [...this.value][index];
    return this.renderPart('one-time-code-field-slot', state, {
      tag: 'span',
      properties: {
        class: 'slot',
        'data-index': index,
        'data-active': state.active,
        'data-focused': state.focused,
        'data-selected': state.selected,
        'data-filled': state.filled,
        'data-empty': !state.filled,
        'data-complete': state.complete,
        'data-disabled': state.disabled,
        'data-readonly': state.readOnly,
        'data-required': state.required,
        'data-invalid': state.invalid,
        'data-caret': state.active && !char,
      },
      content: char ? (this.mask ? '•' : char) : this.placeholder,
    });
  }
  protected override render() {
    const groups =
      this.#validComposition && this.groupLengths.length ? this.groupLengths : [this.#capacity];
    let offset = 0;
    return this.renderPart(
      'one-time-code-field',
      { complete: this.complete, filled: !!this.value, disabled: this.effectiveDisabled },
      {
        tag: 'div',
        properties: {
          class: 'root',
          'data-complete': this.complete,
          'data-filled': !!this.value,
          'data-invalid': this.effectiveInvalid,
          'data-disabled': this.effectiveDisabled,
        },
        content: html` <input
            class="editor"
            part="input focusable"
            .value=${live(this.value)}
            aria-label=${this.label || nothing}
            inputmode=${this.inputMode}
            autocomplete=${this.effectiveNoAutofill ? 'off' : this.autoComplete}
            data-bwignore=${autofillHint(this.effectiveNoAutofill, 'data-bwignore')}
            data-1p-ignore=${autofillHint(this.effectiveNoAutofill, 'data-1p-ignore')}
            data-lpignore=${autofillHint(this.effectiveNoAutofill, 'data-lpignore')}
            data-form-type=${autofillHint(this.effectiveNoAutofill, 'data-form-type')}
            spellcheck="false"
            autocapitalize="off"
            ?disabled=${this.effectiveDisabled || !this.#capacity}
            ?readonly=${this.readOnly}
            ?required=${this.required}
            @beforeinput=${this.#beforeInput}
            @input=${this.#input}
            @paste=${this.#paste}
            @select=${this.#selection}
            @keyup=${this.#selection}
            @click=${this.#click}
            @focus=${this.#focus}
            @blur=${this.#blur}
            @compositionstart=${this.#compositionStart}
            @compositionend=${this.#compositionEnd}
          />
          ${groups.map((size, groupIndex) => {
            const start = offset;
            offset += size;
            return html`${groupIndex ? this.renderPart('one-time-code-field-separator', {}, { tag: 'span', properties: { class: 'separator', 'aria-hidden': 'true' }, content: html`<tp-icon .icon=${minusIcon}></tp-icon>` }) : nothing}${this.renderPart('one-time-code-field-group', {}, { tag: 'div', properties: { class: 'group', 'aria-hidden': 'true' }, content: Array.from({ length: size }, (_, i) => this.#renderSlot(start + i)) })}`;
          })}`,
      },
    );
  }
  #restore(input: HTMLInputElement, selection: readonly [number, number]): void {
    input.value = this.value;
    input.setSelectionRange(
      Math.min(selection[0], input.value.length),
      Math.min(selection[1], input.value.length),
    );
    this.#readSelection(input);
  }
  #commit(attempt: string, event: Event, nextSelection: number, pasted = false): void {
    const input = this.inputElement as HTMLInputElement,
      previous = this.value,
      normalized = this.#normalize(attempt);
    if (attempt !== normalized) {
      const detail: CodeInvalidDetail = {
        attemptedValue: attempt,
        reason: pasted ? 'paste' : 'input',
        sourceEvent: event,
      };
      this.onValueInvalid?.(detail);
      this.emit('tp-invalid-input', detail);
    }
    if (this.effectiveDisabled || this.readOnly || !this.#validComposition) {
      this.#restore(input, this.#beforeSelection);
      return;
    }
    const changed = normalized !== previous;
    const accepted =
      !changed || this.#state.set(normalized, pasted ? 'input-paste' : 'input', event);
    const committed = accepted && this.value === normalized;
    if (!committed) {
      this.#restore(input, this.#beforeSelection);
      return;
    }
    const caret = this.#normalize(attempt.slice(0, nextSelection)).length;
    this.#restore(input, [caret, caret]);
    this.#syncForm();
    if (this.complete && (pasted || [...previous].length !== this.#capacity)) {
      const detail = { value: this.value, sourceEvent: event };
      this.onValueComplete?.(detail);
      this.emit('tp-complete', detail);
      if (this.autoSubmit) this.form?.requestSubmit();
    }
  }
  #beforeInput = (event: InputEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    if (this.effectiveDisabled || this.readOnly) {
      event.preventDefault();
      return;
    }
    if (!this.#composing) this.#rememberSelection(event.currentTarget as HTMLInputElement);
  };
  #input = (event: InputEvent): void => {
    if (this.#composing || componentHandlingPrevented(event)) return;
    const input = event.currentTarget as HTMLInputElement;
    if (this.#compositionInput === input.value) {
      this.#compositionInput = undefined;
      return;
    }
    this.#compositionInput = undefined;
    this.#commit(
      input.value,
      event,
      input.selectionStart ?? input.value.length,
      event.inputType === 'insertFromPaste',
    );
  };
  #paste = (event: ClipboardEvent): void => {
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      this.effectiveDisabled ||
      this.readOnly
    )
      return;
    const text = event.clipboardData?.getData('text');
    if (text === undefined) return;
    event.preventDefault();
    const input = event.currentTarget as HTMLInputElement;
    this.#rememberSelection(input);
    const [start, end] = this.#beforeSelection;
    this.#commit(
      input.value.slice(0, start) + text + input.value.slice(end),
      event,
      start + text.length,
      true,
    );
  };
  #rememberSelection(input: HTMLInputElement): void {
    this.#beforeSelection = [input.selectionStart ?? 0, input.selectionEnd ?? 0];
  }
  #selection = (event: Event): void => this.#readSelection(event.currentTarget as HTMLInputElement);
  #click = (event: MouseEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (event.detail === 1 && input.selectionStart === input.selectionEnd && !event.shiftKey) {
      const slots = [...this.renderRoot.querySelectorAll<HTMLElement>('.slot')];
      const closest = slots.reduce<HTMLElement | null>((best, slot) => {
        const rect = slot.getBoundingClientRect(),
          b = best?.getBoundingClientRect();
        return !b ||
          Math.abs(event.clientX - (rect.x + rect.width / 2)) <
            Math.abs(event.clientX - (b.x + b.width / 2))
          ? slot
          : best;
      }, null);
      if (closest) {
        const position = codeOffset(this.value, Number(closest.dataset.index));
        input.setSelectionRange(position, position);
      }
    }
    this.#readSelection(input);
  };
  #focus = (event: FocusEvent): void => {
    this.#focused = true;
    this.#readSelection(event.currentTarget as HTMLInputElement);
  };
  #blur = (): void => {
    this.#focused = false;
    this.requestUpdate();
  };
  #compositionStart = (event: CompositionEvent): void => {
    this.#rememberSelection(event.currentTarget as HTMLInputElement);
    this.#compositionInput = undefined;
    this.#composing = true;
  };
  #compositionEnd = (event: CompositionEvent): void => {
    this.#composing = false;
    const input = event.currentTarget as HTMLInputElement;
    this.#commit(input.value, event, input.selectionStart ?? input.value.length);
    this.#compositionInput = input.value;
  };
  #readSelection(input: HTMLInputElement): void {
    this.#selectionStart = input.selectionStart ?? this.value.length;
    this.#selectionEnd = input.selectionEnd ?? this.#selectionStart;
    this.requestUpdate();
  }
  #syncForm(): void {
    const value = this.value;
    this.setFormValue(this.effectiveDisabled ? null : value || null);
    this.setValidity(
      this.required && !this.complete ? { valueMissing: true } : {},
      this.required && !this.complete ? 'Complete the code.' : '',
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncForm();
    const issue = !this.#validComposition
      ? 'Supply a positive integer length, matching positive group lengths, and a characterPredicate for predicate validation.'
      : '';
    this.toggleAttribute('data-invalid-composition', !!issue);
    if (issue && issue !== this.#diagnosed)
      this.emit('tp-composition-diagnostic', { component: 'One-time code field', message: issue });
    this.#diagnosed = issue;
  }
  protected resetFormValue(): void {
    this.#state.reset();
    const input = this.inputElement as HTMLInputElement | null;
    if (input) this.#restore(input, [0, 0]);
    this.#syncForm();
  }
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string' && !this.#state.controlled) {
      this.#state.set(this.#normalize(state), 'programmatic');
      this.#syncForm();
    }
  }
  override disconnectedCallback(): void {
    this.#composing = false;
    this.#compositionInput = undefined;
    this.#focused = false;
    super.disconnectedCallback();
  }
}
