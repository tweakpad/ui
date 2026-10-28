import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { PresenceController } from '../../foundation/presence.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { radioGroupPresentation } from '../../presentation/families/radio-group.js';
import { selectionBoxStyles } from '../shared/control-styles.js';

export interface RadioSelectionOwner {
  isChecked(member: HTMLElement): boolean;
  isDisabled(member: HTMLElement): boolean;
  tabStop(member: HTMLElement): number;
  readonly readOnly: boolean;
  readonly required: boolean;
  readonly effectiveInvalid: boolean;
  requestSelection(member: HTMLElement, event: Event, reason?: 'item-press'): void;
  memberChanged(): void;
}

/**
 * One option of a Radio group: a radio with its label, whose checked state is read from the group's
 * value.
 *
 * @slot - The option's label; a press on it selects the option.
 */
export class TpRadioGroupItem extends TpFormElement<unknown> {
  static tagName = 'tp-radio-group-item';
  // Constituent of its group's family; presented with the group's definition and axes.
  static override presentation = radioGroupPresentation;
  /** The Radio group whose presentation settings this item follows. */
  get presentationOwner(): HTMLElement | null {
    return this.closest('tp-radio-group');
  }
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
  };
  static override styles = [
    TpElement.styles,
    selectionBoxStyles,
    css`
      :host {
        display: inline-flex;
        min-inline-size: 0;
      }

      .item {
        display: inline-flex;
        align-items: center;
        position: relative;
        cursor: pointer;
        min-inline-size: 0;
      }

      .indicator {
        display: inline-block;
        inline-size: calc(var(--tp-icon-size-md) / 2);
        block-size: calc(var(--tp-icon-size-md) / 2);
      }

      .indicator[data-presence='retained'] {
        visibility: hidden;
      }
    `,
  ];
  #itemValue: unknown;
  override get value(): unknown {
    return this.#itemValue;
  }
  override set value(value: unknown) {
    const previous = this.#itemValue;
    this.#itemValue = value;
    this.requestUpdate('value', previous);
  }
  /** Renders the radio as a native button instead of a span, for a form layout that expects one. */
  nativeAction = false;
  /** Keeps the hidden dot in the tree while unselected, so a custom style can transition it out. */
  keepMounted = false;
  #owner: RadioSelectionOwner | null = null;
  #control: HTMLElement | null = null;
  #reference = (element: HTMLElement | null): void => {
    this.#control = element;
  };
  #space = false;
  #focusVisible = false;
  #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('[part~="radio-group-indicator"]'),
    keepMounted: () => this.keepMounted,
  });
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#presence.setPresent(this.checked);
  }
  /** The group that owns this item's selection; set by the group itself. */
  get radioGroup(): RadioSelectionOwner | null {
    return this.#owner;
  }
  set radioGroup(owner: RadioSelectionOwner | null) {
    if (owner !== this.#owner) {
      this.#owner = owner;
      this.requestUpdate();
    }
  }
  /** Whether this item holds the group's value. */
  get checked(): boolean {
    return this.#owner?.isChecked(this) ?? false;
  }
  /**
   * Whether the item is disabled, by itself or by its group; an item outside a group is always
   * disabled.
   */
  get radioDisabled(): boolean {
    return this.effectiveDisabled || (this.#owner?.isDisabled(this) ?? true);
  }
  /** Whether the item ignores presses because it or its group is read-only. */
  get radioReadOnly(): boolean {
    return this.readOnly || !!this.#owner?.readOnly;
  }
  /** The inner element that carries the radio role and receives focus. */
  get controlElement(): HTMLElement | null {
    return this.#control;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.#control;
  }
  protected override focusTarget(): HTMLElement | null {
    return this.#control;
  }
  protected override render() {
    const checked = this.checked,
      disabled = this.radioDisabled,
      required = this.required || !!this.#owner?.required;
    const invalid = this.effectiveInvalid || !!this.#owner?.effectiveInvalid;
    const state = {
      checked,
      disabled,
      readOnly: this.radioReadOnly,
      required,
      invalid,
      valid: !invalid,
      focusVisible: this.#focusVisible,
    };
    const indicator = this.renderPart('radio-group-indicator', state, {
      tag: 'span',
      enabled: this.#presence.mounted,
      properties: {
        class: 'indicator',
        'aria-hidden': 'true',
        'data-starting-style': this.#presence.state === 'starting',
        'data-ending-style': this.#presence.state === 'ending',
        'data-presence': this.#presence.state,
        'data-checked': checked,
        'data-unchecked': !checked,
      },
    });
    return html`${this.renderPart('radio-group-item', state, {
        tag: this.nativeAction ? 'button' : 'span',
        reference: this.#reference,
        onHandlerPrevented: {
          '@keydown': () => {
            this.#space = false;
          },
          '@keyup': () => {
            this.#space = false;
          },
        },
        properties: {
          part: 'radio-group-item focusable',
          class: 'item',
          role: 'radio',
          type: this.nativeAction ? 'button' : undefined,
          '.disabled': this.nativeAction ? disabled : undefined,
          tabindex: disabled ? -1 : (this.#owner?.tabStop(this) ?? -1),
          'aria-checked': String(checked),
          'aria-disabled': disabled ? 'true' : undefined,
          'aria-invalid': invalid ? 'true' : undefined,
          ...stateMarkers(state, [
            'checked',
            'disabled',
            'readOnly',
            'required',
            'focusVisible',
            'invalid',
            'valid',
          ]),
          '@click': this.#click,
          '@keydown': this.#keyDown,
          '@keyup': this.#keyUp,
          '@focus': () => {
            this.#focusVisible = this.controlElement?.matches(':focus-visible') ?? false;
            this.requestUpdate();
          },
          '@blur': () => {
            this.#space = false;
            this.#focusVisible = false;
            this.requestUpdate();
          },
        },
        content: html`<span class="box" aria-hidden="true">${indicator}</span
          ><span><slot></slot></span>`,
      })}<input
        type="radio"
        class="visually-hidden"
        aria-hidden="true"
        tabindex="-1"
        .checked=${checked}
        .disabled=${disabled}
        .required=${required}
        .value=${String(this.value ?? '')}
        @change=${(event: Event) => {
          this.#request(event);
          (event.currentTarget as HTMLInputElement).checked = this.checked;
        }}
      />`;
  }
  #request(event: Event): void {
    if (!this.radioDisabled && !this.radioReadOnly) this.#owner?.requestSelection(this, event);
  }
  #click = (event: Event): void => {
    queueMicrotask(() => {
      if (this.isConnected && !componentHandlingPrevented(event)) this.#request(event);
    });
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (
      event.key !== ' ' ||
      componentHandlingPrevented(event) ||
      this.radioDisabled ||
      this.radioReadOnly
    )
      return;
    event.preventDefault();
    this.#space = true;
  };
  #keyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#space) return;
    this.#space = false;
    if (componentHandlingPrevented(event)) return;
    event.preventDefault();
    this.#request(event);
  };
  override activateFromLabel(): void {
    if (!this.radioDisabled) {
      this.focus();
      this.#control?.click();
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.setFormValue(null);
    this.toggleAttribute('data-checked', this.checked);
    this.toggleAttribute('data-disabled', this.radioDisabled);
    if (changed.has('value') || changed.has('disabled') || changed.has('readOnly'))
      this.#owner?.memberChanged();
  }
  protected resetFormValue(): void {
    /* Group owns the reset transaction. */
  }
  override connectedCallback(): void {
    super.connectedCallback();
    queueMicrotask(() => {
      if (this.isConnected && !this.closest('tp-radio-group'))
        this.diagnose(
          'radio-group-required',
          'A Radio Group Item requires a nearest Radio Group owner.',
        );
    });
  }
  override disconnectedCallback(): void {
    const group = this.#owner;
    this.radioGroup = null;
    this.#space = false;
    group?.memberChanged();
    super.disconnectedCallback();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-radio-group-item': TpRadioGroupItem;
  }
}
