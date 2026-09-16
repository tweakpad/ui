import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpFormElement, TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

interface ChoiceOption {
  element: HTMLElement;
  value: string;
  label: string;
  disabled: boolean;
}

export class TpCombobox extends TpFormElement {
  static tagName = 'tp-combobox';
  static override properties = {
    ...TpFormElement.properties,
    open: { type: Boolean, reflect: true },
    placeholder: { type: String },
    query: { type: String },
    defaultValue: { type: String, attribute: 'default-value' },
    searchable: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
        position: relative;
        min-width: 12rem;
      }

      .root {
        position: relative;
      }

      .control {
        width: 100%;
        padding-right: 2rem;
      }

      .toggle {
        position: absolute;
        right: 0.25rem;
        top: 50%;
        translate: 0 -50%;
        border: 0;
        background: transparent;
        color: inherit;
      }

      .listbox {
        position: absolute;
        z-index: 1000;
        inset-inline: 0;
        top: calc(100% + 0.25rem);
        max-height: var(--tp-available-height, 18rem);
        overflow: auto;
      }

      .option {
        display: flex;
        padding: 0.45rem 0.6rem;
        border-radius: 0.25rem;
        cursor: pointer;
      }

      .option[data-active] {
        outline: 2px solid var(--tp-color-accent);
        outline-offset: -2px;
      }

      .option[aria-selected='true'] {
        color: var(--tp-color-accent-contrast);
        background: var(--tp-color-accent);
      }

      .option[aria-disabled='true'] {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ];

  open = false;
  placeholder = '';
  query = '';
  defaultValue = '';
  searchable = true;
  label = 'Options';
  protected options: ChoiceOption[] = [];
  protected activeIndex = -1;

  protected get visibleOptions(): ChoiceOption[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.options.filter(
      (option) => !query || option.label.toLocaleLowerCase().includes(query),
    );
  }

  protected override render() {
    const selected = this.options.find((option) => option.value === this.value);
    const display = this.searchable && this.open ? this.query : (selected?.label ?? '');
    const visible = this.visibleOptions;
    return html`<div class="root" part="root">
      <input
        class="control"
        part="control focusable"
        role="combobox"
        aria-label=${this.label}
        .value=${display}
        .placeholder=${this.placeholder}
        ?disabled=${this.disabled}
        ?readonly=${!this.searchable || this.readOnly}
        aria-expanded=${String(this.open)}
        aria-controls="listbox"
        aria-autocomplete=${this.searchable ? 'list' : 'none'}
        aria-activedescendant=${this.activeIndex >= 0 ? `option-${this.activeIndex}` : nothing}
        @focus=${this.#focus}
        @input=${this.#input}
        @keydown=${this.#key}
      />
      <button
        class="toggle"
        part="toggle"
        type="button"
        tabindex="-1"
        ?disabled=${this.disabled}
        aria-label="Toggle options"
        @click=${this.#toggle}
      >
        ⌄
      </button>
      <div
        id="listbox"
        class="surface listbox"
        part="listbox"
        role="listbox"
        aria-label=${`${this.label} options`}
        ?hidden=${!this.open}
      >
        ${
          visible.length
            ? visible.map((option, index) => this.renderOption(option, index))
            : html`<div part="empty"><slot name="empty">No options</slot></div>`
        }
      </div>
      <slot hidden @slotchange=${this.#readOptions}></slot>
    </div>`;
  }

  protected renderOption(option: ChoiceOption, index: number) {
    return html`<div
      id=${`option-${index}`}
      class="option"
      part="option"
      role="option"
      tabindex="-1"
      aria-selected=${String(option.value === this.value)}
      aria-disabled=${String(option.disabled)}
      ?data-active=${index === this.activeIndex}
      @pointerdown=${(event: PointerEvent) => event.preventDefault()}
      @click=${(event: Event) => this.selectOption(option, event)}
      @keydown=${(event: KeyboardEvent) => this.#optionKey(option, event)}
    >
      ${option.label}
    </div>`;
  }

  #optionKey(option: ChoiceOption, event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.selectOption(option, event);
  }

  #readOptions(event: Event): void {
    this.options = assignedElements(event.currentTarget as HTMLSlotElement)
      .filter((element) => element.hasAttribute('value'))
      .map((element) => ({
        element,
        value: element.getAttribute('value') ?? '',
        label: element.getAttribute('label') ?? element.textContent?.trim() ?? '',
        disabled: element.hasAttribute('disabled'),
      }));
    this.requestUpdate();
  }

  #focus = (): void => {
    if (!this.readOnly && this.searchable) this.setOpen(true, 'input');
  };
  #input = (event: Event): void => {
    this.query = (event.currentTarget as HTMLInputElement).value;
    this.activeIndex = 0;
    this.setOpen(true, 'input', event);
  };
  #toggle = (event: Event): void => this.setOpen(!this.open, eventReason(event), event);
  #key(event: KeyboardEvent): void {
    const options = this.visibleOptions.filter((option) => !option.disabled);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.setOpen(true, 'keyboard', event);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex = (this.activeIndex + delta + options.length) % Math.max(1, options.length);
      this.requestUpdate();
    } else if (event.key === 'Enter' && this.open && this.activeIndex >= 0) {
      event.preventDefault();
      const option = options[this.activeIndex];
      if (option) this.selectOption(option, event);
    } else if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.setOpen(false, 'dismiss', event);
    } else if (event.key === 'Home' && this.open) {
      event.preventDefault();
      this.activeIndex = 0;
      this.requestUpdate();
    } else if (event.key === 'End' && this.open) {
      event.preventDefault();
      this.activeIndex = Math.max(0, options.length - 1);
      this.requestUpdate();
    }
  }

  protected selectOption(option: ChoiceOption, event: Event): void {
    if (option.disabled || this.disabled || this.readOnly) return;
    const previous = this.value;
    if (this.dispatchEvent(new TpValueChangeEvent(option.value, previous, 'selection', event))) {
      this.value = option.value;
      this.query = '';
      this.setFormValue(this.value || null);
      this.setValidity({});
      this.setOpen(false, eventReason(event), event);
    }
  }

  protected setOpen(
    open: boolean,
    reason: 'keyboard' | 'pointer' | 'input' | 'dismiss',
    event?: Event,
  ): void {
    if (this.open === open) return;
    if (this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, event))) {
      this.open = open;
      if (open)
        this.activeIndex = Math.max(
          0,
          this.visibleOptions.findIndex((option) => option.value === this.value),
        );
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('required') || changed.has('value') || changed.has('disabled')) {
      this.setFormValue(this.disabled ? null : this.value || null);
      this.setValidity(
        this.required && !this.value ? { valueMissing: true } : {},
        this.required && !this.value ? 'Please select an option.' : '',
      );
    }
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.query = '';
    this.setFormValue(this.value || null);
  }
}

export class TpSelect extends TpCombobox {
  static tagName = 'tp-select';
  constructor() {
    super();
    this.searchable = false;
  }
  protected override render() {
    return super.render();
  }
}

export class TpCommandPalette extends TpCombobox {
  static tagName = 'tp-command-palette';
  static override properties = {
    ...TpCombobox.properties,
    loopNavigation: { type: Boolean, attribute: 'loop-navigation' },
  };
  static override styles = [
    TpCombobox.styles,
    css`
      :host {
        position: fixed;
        z-index: 1200;
        inset: 15vh auto auto 50%;
        translate: -50% 0;
        width: min(36rem, calc(100vw - 2rem));
        display: none;
      }

      :host([open]) {
        display: block;
      }

      .listbox {
        position: static;
        margin-top: 0.35rem;
      }
    `,
  ];
  loopNavigation = false;
  protected override selectOption(option: ChoiceOption, event: Event): void {
    if (option.disabled || this.disabled) return;
    this.emit('tp-execute', { commandId: option.value, sourceEvent: event });
    this.setOpen(false, eventReason(event), event);
  }
}
