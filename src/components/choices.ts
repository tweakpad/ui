import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpFormElement, TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { PresenceController } from '../foundation/presence.js';
import { FloatingDismissController } from '../foundation/floating-dismiss.js';
import { positionSurface, type PositioningHandle } from '../foundation/positioning.js';
import { TypeaheadController } from '../foundation/typeahead.js';

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
        display: flex;
        align-items: center;
        gap: var(--tp-space-2);
        text-align: start;
      }

      .editor {
        border: 0;
        outline: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        min-inline-size: 0;
        inline-size: 100%;
        padding: 0;
      }

      .control:focus-within {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: var(--tp-ring-offset);
      }

      .label {
        flex: 1;
      }

      tp-icon {
        rotate: 90deg;
        flex: none;
      }

      .listbox[hidden] {
        display: none;
      }

      .toggle {
        display: inline-flex;
        align-items: center;
        padding: 0;
        flex: none;
        border: 0;
        background: transparent;
        color: inherit;
      }

      .listbox {
        position: fixed;
        z-index: 1000;
        max-height: var(--tp-available-height, 18rem);
        overflow: auto;
      }

      .option {
        display: flex;
        padding: var(--tp-space-2) var(--tp-space-3);
        border-radius: var(--tp-radius-sm);
        cursor: pointer;
      }

      .option[data-active]:not([aria-disabled='true']) {
        background: color-mix(in oklab, var(--tp-input) 50%, var(--tp-background));
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: calc(-1 * var(--tp-ring-width));
      }

      .option[aria-selected='true'] {
        color: var(--tp-accent-foreground);
        background: var(--tp-accent);
      }

      .option[aria-disabled='true'] {
        opacity: var(--tp-opacity-disabled);
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
  #position: PositioningHandle | null = null;
  #typeahead = new TypeaheadController();
  readonly presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.listbox'),
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    outside: () => true,
    escape: () => true,
    dismiss: (event) => this.setOpen(false, 'dismiss', event),
  });

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
      ${
        this.searchable
          ? html`<div class="control">
              <input
                class="editor"
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
                aria-activedescendant=${this.open && this.activeIndex >= 0 ? `option-${this.activeIndex}` : nothing}
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
                <tp-icon .icon=${chevronRightIcon}></tp-icon>
              </button>
            </div>`
          : html`<button
              class="control"
              part="control focusable"
              type="button"
              role="combobox"
              aria-label=${this.label}
              aria-expanded=${String(this.open)}
              aria-controls="listbox"
              aria-haspopup="listbox"
              aria-activedescendant=${this.open && this.activeIndex >= 0 ? `option-${this.activeIndex}` : nothing}
              ?disabled=${this.disabled}
              @click=${this.#toggle}
              @keydown=${this.#key}
            >
              <span class="label">${selected?.label ?? this.placeholder}</span
              ><tp-icon .icon=${chevronRightIcon}></tp-icon>
            </button>`
      }
      <div
        id="listbox"
        class="surface listbox"
        part="listbox"
        role="listbox"
        aria-label=${`${this.label} options`}
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
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
      @pointermove=${() => {
        if (!option.disabled && this.activeIndex !== index) {
          this.activeIndex = index;
          this.requestUpdate();
        }
      }}
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
    if (!this.disabled && this.searchable) this.setOpen(true, 'input');
  };
  #input = (event: Event): void => {
    this.query = (event.currentTarget as HTMLInputElement).value;
    this.activeIndex = this.visibleOptions.findIndex((option) => !option.disabled);
    this.setOpen(true, 'input', event);
  };
  #toggle = (event: Event): void => this.setOpen(!this.open, eventReason(event), event);
  #key(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.keyCode === 229) return;
    const options = this.visibleOptions;
    const enabled = options.flatMap((option, index) => (option.disabled ? [] : [index]));
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const wasOpen = this.open;
      this.setOpen(true, 'keyboard', event);
      if (!this.open) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      this.activeIndex = !wasOpen
        ? ((delta > 0 ? enabled[0] : enabled.at(-1)) ?? -1)
        : (enabled[(enabled.indexOf(this.activeIndex) + delta + enabled.length) % enabled.length] ??
          -1);
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
      this.activeIndex = enabled[0] ?? -1;
      this.requestUpdate();
    } else if (event.key === 'End' && this.open) {
      event.preventDefault();
      this.activeIndex = enabled.at(-1) ?? -1;
      this.requestUpdate();
    } else if (event.key === 'Tab' && this.open) {
      this.setOpen(false, 'keyboard', event);
    } else if (event.key === ' ' && !this.searchable) {
      event.preventDefault();
      if (!this.open) this.setOpen(true, 'keyboard', event);
      else {
        const option = options[this.activeIndex];
        if (option) this.selectOption(option, event);
      }
    } else if (
      !this.searchable &&
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      const next = this.#typeahead.search(options, event.key, this.activeIndex);
      if (next >= 0 && !options[next]?.disabled) {
        event.preventDefault();
        this.setOpen(true, 'keyboard', event);
        this.activeIndex = next;
        this.requestUpdate();
      }
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
    if (this.open === open || (open && this.disabled)) return;
    if (this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, event))) {
      this.open = open;
      if (open)
        this.activeIndex = this.visibleOptions.findIndex(
          (option) => option.value === this.value && !option.disabled,
        );
      if (open && this.activeIndex < 0)
        this.activeIndex = this.visibleOptions.findIndex((option) => !option.disabled);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open')) {
      this.presence.setPresent(this.open);
      this.#position?.destroy();
      this.#position = null;
      if (this.open && this.localName !== 'tp-command-palette')
        void this.updateComplete.then(() => {
          if (!this.open || !this.isConnected) return;
          const anchor = this.renderRoot.querySelector<HTMLElement>('.control');
          const surface = this.renderRoot.querySelector<HTMLElement>('.listbox');
          if (anchor && surface)
            this.#position = positionSurface(anchor, surface, {
              strategy: 'fixed',
              placement: 'bottom-start',
              matchReferenceWidth: true,
            });
        });
    }
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
  override disconnectedCallback(): void {
    this.#typeahead.reset();
    this.#position?.destroy();
    this.#position = null;
    super.disconnectedCallback();
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
        margin-top: var(--tp-space-1);
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
