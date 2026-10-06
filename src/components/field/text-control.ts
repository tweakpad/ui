import { css, html, render } from 'lit';
import type { PropertyValues } from 'lit';
import { CompositeControlController } from '../../foundation/composite-control.js';
import { TpFormElement } from '../../foundation/form-element.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { renderPart } from '../../foundation/part.js';
import type { ComponentPartContract, HostProperties } from '../../foundation/part.js';
import { textEditingModel } from '../../foundation/text-editing.js';
import { createId } from '../../foundation/id.js';
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

/**
 * One native editing, value, form and Field integration owner for both text controls.
 *
 * As in Base UI, the native editor is a real element in the consumer's tree: it renders into the
 * host's light DOM (slotted into the shadow root) so it has the same form owner as the host.
 * Browsers and password managers classify, group and fill it like any native field, and it
 * submits natively. A semantic editing model (Number Field) keeps the native editor unnamed and
 * submits its raw value through the host instead, as Base UI pairs a visible input with a hidden
 * named one.
 */
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

      /* The light-DOM editor receives the base shadow rules it no longer inherits. */
      ::slotted([data-tp-editor]) {
        box-sizing: inherit;
        inline-size: 100%;
        min-inline-size: 0;
      }

      ::slotted([data-tp-editor]:focus-visible) {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: var(--tp-ring-offset);
      }

      :host([invalid]) ::slotted([data-tp-editor]),
      :host([data-invalid]) ::slotted([data-tp-editor]) {
        border-color: var(--tp-destructive);
      }

      :host([invalid]) ::slotted([data-tp-editor]:focus-visible),
      :host([data-invalid]) ::slotted([data-tp-editor]:focus-visible) {
        outline-color: var(--tp-destructive);
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
  #editor: unknown;
  #editorPart: { element: HTMLElement; release: () => void } | undefined;
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
      this.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        ':scope > input[data-tp-editor], :scope > textarea[data-tp-editor]',
      ) ?? null
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

  protected override update(changed: PropertyValues<this>): void {
    super.update(changed);
    render(this.#editor, this, { host: this });
    const editor = this.inputElement;
    if (editor !== this.#editorPart?.element) {
      this.#editorPart?.release();
      this.#editorPart = editor
        ? { element: editor, release: this.#registerEditor(editor) }
        : undefined;
    }
    // The native editor shares the host's form owner, including a form reached by `form` id.
    const form = this.form;
    if (editor && editor.form !== form) {
      if (form) {
        if (!form.id) form.id = createId('tp-form-owner');
        editor.setAttribute('form', form.id);
      } else editor.removeAttribute('form');
    }
  }
  #registerEditor(editor: HTMLElement): () => void {
    const parts = (editor.getAttribute('part') ?? '').split(/\s+/).filter(Boolean);
    const releases = parts.map((name) => this.presentationController.registerPart(name, editor));
    return () => releases.forEach((release) => release());
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
  override connectedCallback(): void {
    super.connectedCallback();
    if (this.#editorPart && !this.#editorPart.element.isConnected) this.#editorPart = undefined;
  }
  override disconnectedCallback(): void {
    textEditingModel(this)?.disconnected?.();
    this.#editorPart?.release();
    this.#editorPart = undefined;
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
    // The named native editor submits itself; the host keeps only restorable state.
    this.setFormValue(null, this.value);
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
        // The model submits its raw value through the host; the visible editor stays unnamed.
        '.name': '',
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
    this.#editor = renderPart(
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
        properties: { ...properties, 'data-tp-editor': '', '@keypress': this.#keyPress },
        onHandlerPrevented: {
          '@input': this.rollbackInput,
          '@compositionend': this.cancelComposition,
        },
      },
    );
    return html`<slot></slot>`;
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
  /**
   * Implicit submission at the native moment (Enter keypress, focus still on the editor), extended
   * to Tweakpad submit buttons the browser does not treat as default buttons. A keydown that a
   * Consumer cancels suppresses the keypress, and with it submission. Submitting here rather than
   * after keydown keeps a closing surface's focus restoration from receiving this keystroke.
   */
  #keyPress = (event: KeyboardEvent): void => {
    const input = event.currentTarget as HTMLElement;
    if (event.key !== 'Enter' || input.localName !== 'input') return;
    event.preventDefault();
    const form = this.form;
    if (!form || this.#composing || event.isComposing || this.effectiveDisabled) return;
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
  };
  protected inputKeyDown = (event: KeyboardEvent): void => {
    if (
      !this.#composing &&
      !event.isComposing &&
      !event.defaultPrevented &&
      !this.effectiveDisabled
    )
      textEditingModel(this)?.keyDown(event);
  };
  protected override resetFormValue(): void {
    // The native editor resets after its host in tree order; restore the owned value afterwards.
    queueMicrotask(() => this.rollbackInput());
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
