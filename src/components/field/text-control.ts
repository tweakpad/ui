import { css } from 'lit';
import type { PropertyValues } from 'lit';
import { CompositeControlController } from '../../foundation/composite-control.js';
import { TpFormElement } from '../../foundation/form-element.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { renderPart } from '../../foundation/part.js';
import type { ComponentPartContract, HostProperties } from '../../foundation/part.js';
import { textEditingModel } from '../../foundation/text-editing.js';
const textValue = (value: unknown): string =>
  value == null ? '' : Array.isArray(value) ? value.join(',') : String(value);
interface TextState {
  input: string | undefined;
  controller: ControllableState<string> | undefined;
}

const values = new WeakMap<TpTextControl, TextState>();
function state(host: TpTextControl): TextState {
  let value = values.get(host);
  if (!value) values.set(host, (value = { input: undefined, controller: undefined }));
  return value;
}

/** One native editing, value, form and Field integration owner for both text controls. */
export abstract class TpTextControl extends TpFormElement {
  static override properties = {
    ...TpFormElement.properties,
    value: { noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    onValueChange: { attribute: false },
    hostProperties: { attribute: false },
    placeholder: { type: String },
    autocomplete: { type: String },
    noAutofill: { type: Boolean, attribute: 'no-autofill', reflect: true },
    minLength: { type: Number, attribute: 'minlength' },
    maxLength: { type: Number, attribute: 'maxlength' },
    label: { type: String },
  };
  static override styles = [
    TpFormElement.styles,
    css`
      :host {
        display: inline-block;
        inline-size: 100%;
        min-inline-size: 0;
      }

      .control {
        inline-size: 100%;
        min-inline-size: 0;
      }
    `,
  ];

  defaultValue: string | number | readonly string[] | undefined;
  onValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  hostProperties: Record<string, unknown> = {};
  placeholder = '';
  autocomplete = '';
  /** Opts the native editor out of host and extension autofill. */
  noAutofill = false;
  minLength = -1;
  maxLength = -1;
  label = '';
  #composite = new CompositeControlController(
    this,
    () => this.inputElement,
    () => super.effectiveDisabled,
  );
  override get effectiveDisabled(): boolean {
    return this.inheritedDisabled || !!textEditingModel(this)?.disabled;
  }
  /** Disabled context before an optional semantic editing model contributes its policy. */
  get inheritedDisabled(): boolean {
    return super.effectiveDisabled || !!this.#composite.state?.disabled;
  }
  get effectiveNoAutofill(): boolean {
    return this.noAutofill || this.inheritedNoAutofill;
  }
  get effectiveReadOnly(): boolean {
    return this.readOnly || !!textEditingModel(this)?.readOnly;
  }
  get effectiveRequired(): boolean {
    return this.required || !!textEditingModel(this)?.required;
  }
  get fieldValue(): unknown {
    const model = textEditingModel(this);
    return model ? model.fieldValue : this.value;
  }
  #composing = false;
  #paste: ClipboardEvent | undefined;
  #customValidity = '';
  #files: FileList | null = null;

  override get value(): string {
    const model = textEditingModel(this);
    if (model) return model.text;
    const value = state(this);
    return value.controller?.value ?? value.input ?? textValue(this.defaultValue);
  }
  override set value(value: string | number | readonly string[] | undefined) {
    if (textEditingModel(this)) {
      this.#request(textValue(value), 'programmatic');
      return;
    }
    const owner = state(this);
    const previous = this.value;
    owner.input = value == null ? undefined : textValue(value);
    owner.controller?.sync();
    this.requestUpdate('value', previous);
  }

  get controlled(): boolean {
    return (
      textEditingModel(this)?.controlled ??
      state(this).controller?.controlled ??
      state(this).input !== undefined
    );
  }
  override get inputElement(): HTMLInputElement | HTMLTextAreaElement | null {
    return (
      this.renderRoot?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input,textarea') ??
      null
    );
  }
  get selectionStart(): number | null {
    return this.inputElement?.selectionStart ?? null;
  }
  set selectionStart(value: number | null) {
    if (this.inputElement) this.inputElement.selectionStart = value;
  }
  get selectionEnd(): number | null {
    return this.inputElement?.selectionEnd ?? null;
  }
  set selectionEnd(value: number | null) {
    if (this.inputElement) this.inputElement.selectionEnd = value;
  }
  get selectionDirection(): 'forward' | 'backward' | 'none' | null {
    return this.inputElement?.selectionDirection ?? null;
  }
  set selectionDirection(value: 'forward' | 'backward' | 'none' | null) {
    if (this.inputElement) this.inputElement.selectionDirection = value;
  }
  select(): void {
    this.inputElement?.select();
  }
  setSelectionRange(start: number, end: number, direction?: 'forward' | 'backward' | 'none'): void {
    this.inputElement?.setSelectionRange(start, end, direction);
  }
  setRangeText(replacement: string, start?: number, end?: number, mode?: SelectionMode): void {
    const input = this.inputElement;
    if (!input) return;
    if (start === undefined || end === undefined) input.setRangeText(replacement);
    else input.setRangeText(replacement, start, end, mode);
    this.#request(input.value, 'programmatic');
  }
  setValue(value: string | number | readonly string[]): boolean {
    return this.#request(textValue(value), 'programmatic');
  }
  clear(sourceEvent?: Event): boolean {
    if (this.effectiveDisabled || this.effectiveReadOnly) return false;
    return this.#request('', 'input-clear', sourceEvent);
  }
  setCustomValidity(message: string): void {
    this.#customValidity = message;
    this.inputElement?.setCustomValidity(message);
    this.syncForm();
  }

  protected get editingValue(): string {
    return this.#composing ? (this.inputElement?.value ?? this.value) : this.value;
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const value = state(this);
    if (!value.controller) {
      value.controller = new ControllableState({
        host: this,
        initialValue: '',
        readControlledValue: () => value.input,
        readDefaultValue: () => textValue(this.defaultValue),
        hasDefaultValue: () => this.defaultValue !== undefined,
        onChange: (event) => this.onValueChange?.(event),
        onCommit: (next, previous, reason) => {
          this.syncForm();
          this.emit('tp-field-value', { value: next, previousValue: previous, reason });
        },
      });
      value.controller.initialize();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    const input = this.inputElement;
    if (input) {
      this.syncForm();
      this.toggleAttribute('data-filled', this.value !== '');
    }
    super.updated(changed);
    this.toggleAttribute('data-readonly', this.effectiveReadOnly);
    textEditingModel(this)?.updated?.();
  }
  override disconnectedCallback(): void {
    textEditingModel(this)?.disconnected?.();
    super.disconnectedCallback();
  }
  protected syncForm(): void {
    const input = this.inputElement;
    if (!input) return;
    input.setCustomValidity(this.#customValidity);
    const model = textEditingModel(this);
    if (model) {
      this.setFormValue(this.effectiveDisabled ? null : model.formValue, model.formValue);
      const flags = { ...model.validity, ...(this.#customValidity ? { customError: true } : {}) };
      this.setValidity(flags, this.#customValidity || model.validationMessage, input);
      return;
    }
    if (input.localName === 'input' && (input as HTMLInputElement).type === 'file') {
      const data = new FormData();
      if (this.effectiveName) {
        const files = [...((input as HTMLInputElement).files ?? [])];
        if (!files.length) files.push(new File([], '', { type: 'application/octet-stream' }));
        for (const file of files) data.append(this.effectiveName, file);
      }
      this.setFormValue(this.effectiveDisabled ? null : data);
    } else this.setFormValue(this.effectiveDisabled ? null : input.value, this.value);
    this.setValidity(
      input.validity.valid ? {} : nativeValidityFlags(input.validity),
      input.validationMessage,
      input,
    );
  }
  /** Composable native part contract, retaining both legacy and per-part host properties. */
  protected controlPartContract(part: string): ComponentPartContract {
    const contract = this.partContracts[part] ?? {};
    return { ...contract, hostProperties: { ...this.hostProperties, ...contract.hostProperties } };
  }
  protected renderControl(part: string, tag: string, properties: HostProperties): unknown {
    const model = textEditingModel(this);
    if (model)
      properties = {
        ...properties,
        ...model.properties,
        '.value': this.editingValue,
        '.disabled': this.effectiveDisabled,
        '.readOnly': this.effectiveReadOnly,
        '.required': this.effectiveRequired,
      };
    const composite = this.#composite.state;
    if (composite)
      properties = {
        ...properties,
        '.disabled': this.effectiveDisabled && !composite.focusableWhenDisabled,
        '.readOnly': this.effectiveReadOnly || this.effectiveDisabled,
        'aria-disabled': this.effectiveDisabled ? 'true' : null,
        'data-disabled': this.effectiveDisabled,
        tabindex: composite.tabIndex,
      };
    return renderPart(
      part,
      {
        value: this.value,
        disabled: this.effectiveDisabled,
        readOnly: this.effectiveReadOnly,
        required: this.effectiveRequired,
        invalid: this.effectiveInvalid,
        filled: this.value !== '',
      },
      this.controlPartContract(part),
      {
        tag,
        properties,
        onHandlerPrevented: {
          '@input': this.rollbackInput,
          '@compositionend': this.cancelComposition,
        },
      },
    );
  }
  #request(value: string, reason: ChangeReason, sourceEvent?: Event): boolean {
    const model = textEditingModel(this);
    const owner = model
      ? {
          get value() {
            return model.text;
          },
          set: (next: string, why: ChangeReason, event?: Event) => model.input(next, why, event),
        }
      : state(this).controller;
    if (!owner) return false;
    const previous = owner.value;
    const input = this.inputElement;
    const selection =
      input?.selectionStart == null
        ? null
        : ([input.selectionStart, input.selectionEnd, input.selectionDirection] as const);
    const accepted = owner.set(value, reason, sourceEvent);
    if (input?.localName === 'input' && (input as HTMLInputElement).type === 'file') {
      const fileInput = input as HTMLInputElement;
      if (owner.value === '') {
        fileInput.value = '';
        this.#files = null;
      } else if (owner.value !== previous) this.#files = fileInput.files;
      else if (fileInput.files !== this.#files) {
        if (this.#files) fileInput.files = this.#files;
        else fileInput.value = '';
      }
    }
    if (
      input &&
      input.value !== owner.value &&
      !(input.localName === 'input' && (input as HTMLInputElement).type === 'file')
    ) {
      input.value = owner.value;
      if (selection)
        input.setSelectionRange(
          Math.min(selection[0], owner.value.length),
          Math.min(selection[1] ?? selection[0], owner.value.length),
          selection[2] ?? 'none',
        );
    }
    if (owner.value !== previous) {
      this.requestUpdate('value', previous);
      this.syncForm();
    }
    return accepted;
  }
  protected inputChanged = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement | HTMLTextAreaElement;
    if (this.effectiveDisabled || this.effectiveReadOnly) {
      input.value = this.value;
      return;
    }
    if (this.#composing || (event as InputEvent).isComposing) return;
    const paste = this.#paste;
    this.#paste = undefined;
    this.#request(
      input.value,
      paste ? 'input-paste' : input.value === '' ? 'input-clear' : 'input',
      paste ?? event,
    );
  };
  protected rollbackInput = (): void => {
    const input = this.inputElement;
    if (!input) return;
    const start = input.selectionStart,
      end = input.selectionEnd,
      direction = input.selectionDirection;
    if (input.localName === 'input' && (input as HTMLInputElement).type === 'file') {
      if (this.#files) (input as HTMLInputElement).files = this.#files;
      else input.value = '';
    } else if (input.value !== this.value) {
      input.value = this.value;
      if (start !== null)
        input.setSelectionRange(
          Math.min(start, this.value.length),
          Math.min(end ?? start, this.value.length),
          direction ?? 'none',
        );
    }
    this.syncForm();
  };
  protected cancelComposition = (): void => {
    this.#composing = false;
    this.rollbackInput();
  };
  protected pasted = (event: ClipboardEvent): void => {
    this.#paste = event;
    queueMicrotask(() => {
      if (this.#paste === event) this.#paste = undefined;
    });
  };
  protected compositionStarted = (): void => {
    this.#composing = true;
  };
  protected compositionEnded = (event: CompositionEvent): void => {
    this.#composing = false;
    this.inputChanged(event);
  };
  protected inputFocused = (): void => {
    this.toggleAttribute('data-focused', true);
  };
  protected inputBlurred = (event: FocusEvent): void => {
    this.toggleAttribute('data-focused', false);
    this.toggleAttribute('data-touched', true);
    const model = textEditingModel(this);
    if (model) {
      model.blur(event);
      this.rollbackInput();
    }
  };
  protected inputKeyDown = (event: KeyboardEvent): void => {
    if (
      !this.#composing &&
      !event.isComposing &&
      !event.defaultPrevented &&
      !this.effectiveDisabled
    )
      textEditingModel(this)?.keyDown(event);
    if (
      event.key !== 'Enter' ||
      this.#composing ||
      event.isComposing ||
      event.defaultPrevented ||
      this.effectiveDisabled ||
      (event.currentTarget as HTMLElement)?.localName !== 'input'
    )
      return;
    const form = this.form;
    if (!form) return;
    queueMicrotask(() => {
      if (event.defaultPrevented || !this.isConnected) return;
      const submitter = [
        ...form.querySelectorAll<HTMLElement>(
          'button,input[type="submit"],input[type="image"],tp-button[type="submit"]',
        ),
      ].find(
        (el) =>
          !el.matches(':disabled,[disabled]') &&
          (el instanceof HTMLButtonElement ? el.type === 'submit' : true),
      );
      if (submitter) submitter.click();
      else form.requestSubmit();
    });
  };
  protected override resetFormValue(): void {
    const model = textEditingModel(this);
    if (model) {
      model.reset();
      this.rollbackInput();
      this.removeAttribute('data-touched');
      return;
    }
    if (this.controlled) {
      this.requestUpdate();
      return;
    }
    state(this).controller?.reset();
    const input = this.inputElement;
    if (input) input.value = this.value;
    this.#files = null;
    this.syncForm();
    this.removeAttribute('data-touched');
  }
  override formStateRestoreCallback(value: string | File | FormData | null): void {
    const model = textEditingModel(this);
    if (model) {
      if (!model.controlled && typeof value === 'string') model.restore(value);
      this.rollbackInput();
      return;
    }
    if (!this.controlled && typeof value === 'string') this.#request(value, 'programmatic');
  }
}

export function nativeValidityFlags(validity: ValidityState): ValidityStateFlags {
  return Object.fromEntries(
    [
      'badInput',
      'customError',
      'patternMismatch',
      'rangeOverflow',
      'rangeUnderflow',
      'stepMismatch',
      'tooLong',
      'tooShort',
      'typeMismatch',
      'valueMissing',
    ].map((key) => [key, validity[key as keyof ValidityState]]),
  );
}
