import { css, html, nothing } from 'lit';
import { createId } from '../foundation/id.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { CollectionRegistry } from '../foundation/collection.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

abstract class TpTextControl extends TpFormElement {
  static override properties = {
    ...TpFormElement.properties,
    defaultValue: { type: String, attribute: 'default-value' },
    placeholder: { type: String },
    autocomplete: { type: String },
    minLength: { type: Number, attribute: 'minlength' },
    maxLength: { type: Number, attribute: 'maxlength' },
    pattern: { type: String },
    label: { type: String },
  };

  defaultValue = '';
  placeholder = '';
  autocomplete = '';
  minLength = -1;
  maxLength = -1;
  pattern = '';
  label = '';

  protected commitInput(input: HTMLInputElement | HTMLTextAreaElement, event: Event): void {
    const previous = this.value;
    const next = input.value;
    if (!this.dispatchEvent(new TpValueChangeEvent(next, previous, 'input', event))) {
      input.value = previous;
      return;
    }
    this.value = next;
    this.syncForm(input);
  }

  protected syncForm(input?: HTMLInputElement | HTMLTextAreaElement): void {
    this.setFormValue(this.disabled ? null : this.value);
    if (!input) return;
    this.setValidity(
      input.validity.valid ? {} : validityFlags(input.validity),
      input.validationMessage,
      input,
    );
  }

  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.setFormValue(this.value);
  }
}

function validityFlags(validity: ValidityState): ValidityStateFlags {
  return {
    badInput: validity.badInput,
    customError: validity.customError,
    patternMismatch: validity.patternMismatch,
    rangeOverflow: validity.rangeOverflow,
    rangeUnderflow: validity.rangeUnderflow,
    stepMismatch: validity.stepMismatch,
    tooLong: validity.tooLong,
    tooShort: validity.tooShort,
    typeMismatch: validity.typeMismatch,
    valueMissing: validity.valueMissing,
  };
}

export class TpInput extends TpTextControl {
  static tagName = 'tp-input';
  static override properties = {
    ...TpTextControl.properties,
    type: { type: String },
    min: { type: String },
    max: { type: String },
    step: { type: String },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      input {
        width: 100%;
      }
    `,
  ];
  type = 'text';
  min = '';
  max = '';
  step = '';

  protected override render() {
    return html`<input
      class="control"
      part="control focusable"
      .type=${this.type}
      .name=${this.name}
      .value=${this.value}
      .placeholder=${this.placeholder}
      .autocomplete=${this.autocomplete}
      .min=${this.min}
      .max=${this.max}
      .step=${this.step}
      .pattern=${this.pattern}
      minlength=${this.minLength >= 0 ? String(this.minLength) : nothing}
      maxlength=${this.maxLength >= 0 ? String(this.maxLength) : nothing}
      ?disabled=${this.disabled}
      ?readonly=${this.readOnly}
      ?required=${this.required}
      aria-invalid=${this.invalid ? 'true' : nothing}
      aria-label=${this.label || nothing}
      @input=${(event: Event) => this.commitInput(event.currentTarget as HTMLInputElement, event)}
    />`;
  }
}

export class TpTextArea extends TpTextControl {
  static tagName = 'tp-text-area';
  static override properties = {
    ...TpTextControl.properties,
    rows: { type: Number },
    resize: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      textarea {
        width: 100%;
        min-height: 4.5rem;
        resize: var(--tp-text-area-resize, vertical);
      }
    `,
  ];
  rows = 3;
  resize: 'none' | 'vertical' | 'horizontal' | 'both' = 'vertical';
  protected override render() {
    return html`<textarea
      class="control"
      part="control focusable"
      .name=${this.name}
      .value=${this.value}
      .placeholder=${this.placeholder}
      .autocomplete=${this.autocomplete}
      .rows=${this.rows}
      minlength=${this.minLength >= 0 ? String(this.minLength) : nothing}
      maxlength=${this.maxLength >= 0 ? String(this.maxLength) : nothing}
      ?disabled=${this.disabled}
      ?readonly=${this.readOnly}
      ?required=${this.required}
      aria-invalid=${this.invalid ? 'true' : nothing}
      aria-label=${this.label || nothing}
      style=${`--tp-text-area-resize:${this.resize}`}
      @input=${(event: Event) => this.commitInput(event.currentTarget as HTMLTextAreaElement, event)}
    ></textarea>`;
  }
}

export class TpNativeSelect extends TpFormElement {
  static tagName = 'tp-native-select';
  static override properties = {
    ...TpFormElement.properties,
    defaultValue: { type: String, attribute: 'default-value' },
    placeholder: { type: String },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .wrap {
        position: relative;
      }

      select {
        width: 100%;
        padding-right: 2rem;
      }

      .icon {
        position: absolute;
        right: 0.6rem;
        top: 50%;
        translate: 0 -50%;
        pointer-events: none;
      }
    `,
  ];
  defaultValue = '';
  placeholder = '';
  label = 'Options';
  #options: Array<{ value: string; label: string; disabled: boolean }> = [];
  protected override render() {
    const placeholder = this.placeholder
      ? html`<option value="" disabled>${this.placeholder}</option>`
      : nothing;
    return html`<span class="wrap" part="root"
      ><select
        class="control"
        part="control focusable"
        aria-label=${this.label}
        .name=${this.name}
        .value=${this.value}
        ?disabled=${this.disabled}
        ?required=${this.required}
        @change=${this.#change}
      >
        ${placeholder}${this.#options.map(
          (option) => html`
            <option .value=${option.value} ?disabled=${option.disabled}>${option.label}</option>
          `,
        )}</select
      ><span class="icon" part="icon" aria-hidden="true">⌄</span
      ><slot hidden @slotchange=${this.#readOptions}></slot
    ></span>`;
  }
  #readOptions(event: Event): void {
    this.#options = assignedElements(event.currentTarget as HTMLSlotElement)
      .filter((el): el is HTMLOptionElement => el instanceof HTMLOptionElement)
      .map((el) => ({
        value: el.value,
        label: el.label || el.textContent || '',
        disabled: el.disabled,
      }));
    this.requestUpdate();
  }
  #change(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const previous = this.value;
    if (!this.dispatchEvent(new TpValueChangeEvent(select.value, previous, 'selection', event))) {
      select.value = previous;
      return;
    }
    this.value = select.value;
    this.setFormValue(this.value || null);
    this.setValidity(
      select.validity.valid ? {} : validityFlags(select.validity),
      select.validationMessage,
      select,
    );
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.setFormValue(this.value || null);
  }
}

export class TpSlider extends TpFormElement {
  static tagName = 'tp-slider';
  static override properties = {
    ...TpFormElement.properties,
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    defaultValue: { type: String, attribute: 'default-value' },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      input {
        accent-color: var(--tp-color-accent);
        width: 100%;
      }
    `,
  ];
  min = 0;
  max = 100;
  step = 1;
  defaultValue = '0';
  label = 'Value';
  protected override render() {
    return html`<input
      part="control focusable"
      type="range"
      aria-label=${this.label}
      .name=${this.name}
      .value=${this.value || String(this.min)}
      .min=${String(this.min)}
      .max=${String(this.max)}
      .step=${String(this.step)}
      ?disabled=${this.disabled}
      aria-orientation=${this.orientation}
      @input=${this.#input}
    />`;
  }
  #input(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const previous = this.value;
    if (!this.dispatchEvent(new TpValueChangeEvent(input.value, previous, 'input', event))) {
      input.value = previous;
      return;
    }
    this.value = input.value;
    this.setFormValue(this.value);
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue || String(this.min);
    this.setFormValue(this.value);
  }
}

export class TpRadioGroup extends TpFormElement {
  static tagName = 'tp-radio-group';
  static override properties = {
    ...TpFormElement.properties,
    defaultValue: { type: String, attribute: 'default-value' },
  };
  defaultValue = '';
  #items: HTMLElement[] = [];
  #registry = new CollectionRegistry();
  protected override render() {
    return html`<div
      part="root"
      role="radiogroup"
      aria-orientation=${this.orientation}
      aria-required=${String(this.required)}
      @click=${this.#click}
      @keydown=${this.#key}
    >
      <slot @slotchange=${this.#sync}></slot>
    </div>`;
  }
  #sync = (event?: Event): void => {
    if (event) this.#items = assignedElements(event.currentTarget as HTMLSlotElement);
    this.#registry = new CollectionRegistry();
    for (const item of this.#items) {
      const selected = (item.getAttribute('value') ?? '') === this.value;
      item.setAttribute('role', 'radio');
      item.setAttribute('aria-checked', String(selected));
      item.tabIndex =
        selected || (!this.value && item === this.#items.find((x) => !x.hasAttribute('disabled')))
          ? 0
          : -1;
      this.#registry.register({ element: item, disabled: item.hasAttribute('disabled') });
    }
    this.setFormValue(this.value || null);
    this.setValidity(
      this.required && !this.value ? { valueMissing: true } : {},
      this.required && !this.value ? 'Please select an option.' : '',
    );
  };
  #click(event: Event): void {
    const item = (event.target as Element).closest<HTMLElement>('[value]');
    if (!item || this.disabled || this.readOnly || item.hasAttribute('disabled')) return;
    this.#select(item, event);
  }
  #select(item: HTMLElement, event: Event): void {
    const next = item.getAttribute('value') ?? '',
      previous = this.value;
    if (next === previous) return;
    if (this.dispatchEvent(new TpValueChangeEvent(next, previous, eventReason(event), event))) {
      this.value = next;
      this.#sync();
    }
  }
  #key(event: KeyboardEvent): void {
    const next = this.#registry.handleArrowKey(
      event,
      event.target instanceof HTMLElement ? event.target : null,
      this.orientation,
      this.direction,
    );
    if (next) this.#select(next, event);
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.#sync();
  }
}

export class TpOtpField extends TpFormElement {
  static tagName = 'tp-otp-field';
  static override properties = {
    ...TpFormElement.properties,
    length: { type: Number },
    inputMode: { type: String, attribute: 'inputmode' },
    defaultValue: { type: String, attribute: 'default-value' },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .root {
        display: flex;
        gap: 0.4rem;
      }

      input {
        width: 2.5rem;
        text-align: center;
        padding: 0.4rem;
      }
    `,
  ];
  length = 6;
  inputMode = 'numeric';
  defaultValue = '';
  protected override render() {
    const chars = Array.from({ length: this.length }, (_, i) => this.value[i] ?? '');
    return html`<div class="root" part="root" role="group">
      ${chars.map((char, index) => this.#renderInput(char, index))}
    </div>`;
  }
  #renderInput(char: string, index: number) {
    return html`
      <input
        class="control"
        part="input focusable"
        aria-label=${`Character ${index + 1} of ${this.length}`}
        .value=${char}
        inputmode=${this.inputMode}
        maxlength="1"
        ?disabled=${this.disabled}
        ?readonly=${this.readOnly}
        @input=${(event: Event) => this.#input(index, event)}
        @keydown=${(event: KeyboardEvent) => this.#key(index, event)}
        @paste=${this.#paste}
      />
    `;
  }
  #commit(value: string, event: Event): void {
    const previous = this.value;
    if (this.dispatchEvent(new TpValueChangeEvent(value, previous, 'input', event))) {
      this.value = value;
      this.setFormValue(value || null);
      this.setValidity(
        this.required && value.length !== this.length ? { valueMissing: true } : {},
        this.required && value.length !== this.length ? 'Complete the code.' : '',
      );
    }
  }
  #input(index: number, event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const char = input.value.slice(-1);
    const chars = this.value.padEnd(this.length).split('');
    chars[index] = char;
    this.#commit(chars.join('').trimEnd(), event);
    if (char) (input.nextElementSibling as HTMLElement | null)?.focus();
  }
  #key(index: number, event: KeyboardEvent): void {
    const current = event.currentTarget as HTMLElement;
    const previous = current.previousElementSibling;
    const next = current.nextElementSibling;
    if ((event.key === 'Backspace' && !this.value[index]) || event.key === 'ArrowLeft') {
      if (previous instanceof HTMLElement) previous.focus();
    }
    if (event.key === 'ArrowRight' && next instanceof HTMLElement) next.focus();
  }
  #paste = (event: ClipboardEvent): void => {
    const text =
      event.clipboardData?.getData('text').replace(/\s/g, '').slice(0, this.length) ?? '';
    if (!text) return;
    event.preventDefault();
    this.#commit(text, event);
  };
  protected resetFormValue(): void {
    this.value = this.defaultValue.slice(0, this.length);
    this.setFormValue(this.value || null);
  }
}

export class TpField extends TpElement {
  static tagName = 'tp-field';
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    description: { type: String },
    error: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: grid;
        gap: 0.35rem;
      }

      [part='label'] {
        font-weight: 600;
      }

      [part='description'] {
        color: var(--tp-color-muted);
        font-size: 0.875em;
      }

      [part='error'] {
        color: var(--tp-color-danger);
        font-size: 0.875em;
      }
    `,
  ];
  label = '';
  description = '';
  error = '';
  readonly #labelId = createId('tp-label');
  readonly #descriptionId = createId('tp-description');
  readonly #errorId = createId('tp-error');
  protected override render() {
    const description = this.description
      ? html`
          <div id=${this.#descriptionId} part="description">
            <slot name="description">${this.description}</slot>
          </div>
        `
      : nothing;
    const error = this.error
      ? html`
          <div id=${this.#errorId} part="error" role="alert">
            <slot name="error">${this.error}</slot>
          </div>
        `
      : nothing;
    return html`<label id=${this.#labelId} part="label"
        ><slot name="label">${this.label}</slot></label
      ><slot @slotchange=${this.#associate}></slot>${description}${error}`;
  }
  #associate = (event: Event): void => {
    for (const control of assignedElements(event.currentTarget as HTMLSlotElement)) {
      control.setAttribute('aria-labelledby', this.#labelId);
      if ('label' in control) (control as HTMLElement & { label: string }).label = this.label;
      else control.setAttribute('aria-label', this.label);
      const described = [this.description && this.#descriptionId, this.error && this.#errorId]
        .filter(Boolean)
        .join(' ');
      if (described) control.setAttribute('aria-describedby', described);
      control.toggleAttribute('invalid', Boolean(this.error));
    }
  };
}

export class TpForm extends TpElement {
  static tagName = 'tp-form';
  #form: HTMLFormElement | null = null;
  #observer: MutationObserver | null = null;
  get novalidate(): boolean {
    return this.hasAttribute('novalidate');
  }
  set novalidate(value: boolean) {
    this.toggleAttribute('novalidate', value);
    if (this.#form) this.#form.noValidate = value;
  }
  get form(): HTMLFormElement | null {
    return this.#form;
  }
  protected override createRenderRoot(): HTMLElement {
    return this;
  }
  protected override shouldUpdate(): boolean {
    return false;
  }
  override connectedCallback(): void {
    const existing = [...this.childNodes];
    super.connectedCallback();
    if (!this.#form) {
      const form = document.createElement('form');
      form.setAttribute('part', 'form');
      form.noValidate = this.novalidate;
      for (const node of existing) form.append(node);
      this.append(form);
      this.#form = form;
      form.addEventListener('submit', this.#submit);
      form.addEventListener('reset', this.#reset);
      this.#observer = new MutationObserver((records) => {
        for (const record of records)
          for (const node of record.addedNodes)
            if (node !== form && node.parentNode === this) form.append(node);
      });
      this.#observer.observe(this, { childList: true });
    }
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    super.disconnectedCallback();
  }
  requestSubmit(submitter?: HTMLElement): void {
    this.#form?.requestSubmit(submitter as HTMLButtonElement | HTMLInputElement | undefined);
  }
  reset(): void {
    this.#form?.reset();
  }
  checkValidity(): boolean {
    return this.#form?.checkValidity() ?? true;
  }
  reportValidity(): boolean {
    return this.#form?.reportValidity() ?? true;
  }
  #submit = (event: SubmitEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    if (!form.checkValidity()) {
      event.preventDefault();
      this.emit('tp-invalid', { form, sourceEvent: event });
      return;
    }
    this.emit('tp-submit', {
      form,
      data: new FormData(form),
      submitter: event.submitter,
      sourceEvent: event,
    });
  };
  #reset = (event: Event): void => {
    queueMicrotask(() => this.emit('tp-reset', { form: event.currentTarget, sourceEvent: event }));
  };
}

export class TpInputGroup extends TpElement {
  static tagName = 'tp-input-group';
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-flex;
        border: 1px solid var(--tp-color-border);
        border-radius: var(--tp-radius-sm);
        overflow: hidden;
        align-items: stretch;
      }

      ::slotted(*) {
        border: 0 !important;
        border-radius: 0 !important;
      }

      [part='prefix'],
      [part='suffix'] {
        display: flex;
        align-items: center;
        padding: 0 0.6rem;
        background: var(--tp-color-surface-raised);
      }
    `,
  ];
  protected override render() {
    return html`<span part="prefix"><slot name="prefix"></slot></span><slot></slot
      ><span part="suffix"><slot name="suffix"></slot></span>`;
  }
}

export class TpCalendar extends TpFormElement {
  static tagName = 'tp-calendar';
  static override properties = {
    ...TpFormElement.properties,
    min: { type: String },
    max: { type: String },
    defaultValue: { type: String, attribute: 'default-value' },
    label: { type: String },
  };
  static override styles = [TpElement.styles, controlStyles];
  min = '';
  max = '';
  defaultValue = '';
  label = 'Date';
  protected override render() {
    return html`<input
      class="control"
      part="control focusable"
      type="date"
      aria-label=${this.label}
      .name=${this.name}
      .value=${this.value}
      .min=${this.min}
      .max=${this.max}
      ?disabled=${this.disabled}
      ?required=${this.required}
      @change=${this.#change}
    />`;
  }
  #change(event: Event): void {
    const input = event.currentTarget as HTMLInputElement,
      previous = this.value;
    if (this.dispatchEvent(new TpValueChangeEvent(input.value, previous, 'selection', event))) {
      this.value = input.value;
      this.setFormValue(this.value || null);
      this.setValidity(
        input.validity.valid ? {} : validityFlags(input.validity),
        input.validationMessage,
        input,
      );
    } else input.value = previous;
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.setFormValue(this.value || null);
  }
}

export class TpQuestionnaire extends TpElement {
  static tagName = 'tp-questionnaire';
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: grid;
        gap: 1rem;
      }
    `,
  ];
  protected override render() {
    return html`<section part="root">
      <header part="header"><slot name="title"></slot><slot name="description"></slot></header>
      <div part="questions"><slot></slot></div>
      <footer part="actions"><slot name="actions"></slot></footer>
    </section>`;
  }
}
