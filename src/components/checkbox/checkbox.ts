import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { CheckboxGroupController } from '../../foundation/checkbox-group.js';
import { nearestCheckboxGroup } from '../../foundation/checkbox-group.js';
import { PresenceController } from '../../foundation/presence.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { createId } from '../../foundation/id.js';
import type { ChangeReason } from '../../foundation/types.js';
import { checkIcon } from '../../icons/check.js';
import { minusIcon } from '../../icons/minus.js';

/** Checkbox state/form owner, also consumed by the Switch family. */
export class TpCheckbox extends TpFormElement {
  static tagName = 'tp-checkbox';
  static override properties = {
    ...TpFormElement.properties,
    checked: { type: Boolean, noAccessor: true },
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    onCheckedChange: { attribute: false },
    indeterminate: { type: Boolean, reflect: true, noAccessor: true },
    uncheckedValue: { type: String, attribute: 'unchecked-value' },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    parent: { type: Boolean, reflect: true },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    identifier: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      .root {
        display: inline-flex;
        align-items: center;
        position: relative;
        cursor: pointer;
      }

      .box {
        display: inline-grid;
        flex: none;
        place-items: center;
        inline-size: var(--tp-icon-size-md);
        block-size: var(--tp-icon-size-md);
      }

      .indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        inline-size: 100%;
        block-size: 100%;
      }

      .indicator[data-presence='retained'] {
        visibility: hidden;
      }

      .indicator tp-icon {
        inline-size: 100%;
        block-size: 100%;
      }
    `,
  ];
  constructor() {
    super();
    this.value = 'on';
  }
  #provided: boolean | undefined;
  #indeterminate = false;
  #group: CheckboxGroupController | null = null;
  #control: HTMLElement | null = null;
  #reference = (element: HTMLElement | null): void => {
    this.#control = element;
  };
  #space = false;
  #lastChecked: boolean | undefined;
  #focusVisible = false;
  #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('[part~="checkbox-indicator"]'),
    keepMounted: () => this.keepMounted,
  });
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#presence.setPresent(this.checked || this.indeterminate);
  }
  #identifier = createId('tp-checkbox');
  defaultChecked: boolean | undefined;
  onCheckedChange: ((event: TpValueChangeEvent<boolean>) => void) | undefined;
  uncheckedValue: string | undefined;
  nativeAction = false;
  parent = false;
  keepMounted = false;
  identifier = '';
  #state = new ControllableState({
    host: this,
    initialValue: false,
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultChecked,
    hasDefaultValue: () => this.defaultChecked !== undefined,
    onChange: (event) => this.onCheckedChange?.(event),
    onCommit: (value, previous, reason) => {
      this.#lastChecked = value;
      this.emit('tp-field-value', { value, previousValue: previous, reason });
      this.requestUpdate('checked', previous);
      this.syncCheckboxForm();
    },
    diagnostic: (message) => this.emit('tp-diagnostic', { code: 'checkbox-state', message }),
  });
  get checked(): boolean {
    return this.#group?.isChecked(this) ?? this.#state.value;
  }
  set checked(value: boolean | undefined) {
    const previous = this.checked;
    this.#provided = value === undefined ? undefined : Boolean(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('checked', previous);
  }
  get indeterminate(): boolean {
    return this.#group && this.parent ? this.#group.isIndeterminate(this) : this.#indeterminate;
  }
  set indeterminate(value: boolean) {
    const previous = this.indeterminate;
    this.#indeterminate = Boolean(value);
    this.requestUpdate('indeterminate', previous);
  }
  get checkboxGroup(): CheckboxGroupController | null {
    return this.#group;
  }
  set checkboxGroup(value: CheckboxGroupController | null) {
    if (this.#group === value) return;
    this.#group = value;
    this.requestUpdate();
  }
  get checkboxDisabled(): boolean {
    return this.effectiveDisabled || (this.#group?.isDisabled(this) ?? false);
  }
  get controlElement(): HTMLElement | null {
    return this.#control ?? this.renderRoot.querySelector<HTMLElement>('input');
  }
  protected override focusTarget(): HTMLElement | null {
    return this.controlElement;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.controlElement;
  }
  protected override render() {
    const checked = this.checked,
      mixed = this.indeterminate,
      disabled = this.checkboxDisabled;
    const state = {
      checked,
      indeterminate: mixed,
      disabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
    };
    const indicator = this.renderPart('checkbox-indicator', state, {
      tag: 'span',
      enabled: this.#presence.mounted,
      properties: {
        class: 'indicator',
        'aria-hidden': 'true',
        'data-starting-style': this.#presence.state === 'starting',
        'data-ending-style': this.#presence.state === 'ending',
        'data-presence': this.#presence.state,
        'data-checked': checked,
        'data-unchecked': !checked && !mixed,
        'data-indeterminate': mixed,
      },
      content: html`<tp-icon .icon=${mixed ? minusIcon : checkIcon}></tp-icon>`,
    });
    return html`${this.renderPart('checkbox', state, {
        tag: this.nativeAction ? 'button' : 'span',
        protectedProperties: ['.ariaControlsElements'],
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
          class: 'root',
          part: 'checkbox focusable',
          id: this.identifier || this.#identifier,
          role: 'checkbox',
          type: this.nativeAction ? 'button' : undefined,
          '.disabled': this.nativeAction ? disabled : undefined,
          tabindex: disabled ? -1 : 0,
          'aria-checked': mixed ? 'mixed' : String(checked),
          'aria-disabled': disabled ? 'true' : undefined,
          'aria-readonly': this.readOnly ? 'true' : undefined,
          'aria-required': this.required ? 'true' : undefined,
          'aria-invalid': this.effectiveInvalid ? 'true' : undefined,
          '.ariaControlsElements': this.parent ? (this.#group?.controlledElements() ?? []) : [],
          'data-checked': checked,
          'data-unchecked': !checked,
          'data-indeterminate': mixed,
          'data-disabled': disabled,
          'data-read-only': this.readOnly,
          'data-required': this.required,
          'data-focus-visible': this.#focusVisible,
          'data-invalid': this.effectiveInvalid,
          'data-valid': !this.effectiveInvalid,
          'data-parent': this.parent,
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
        class="visually-hidden"
        type="checkbox"
        aria-hidden="true"
        tabindex="-1"
        .checked=${checked}
        .indeterminate=${mixed}
        .disabled=${disabled}
        .required=${this.required}
        .value=${this.value}
        @change=${this.handleChange}
      />`;
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
      this.checkboxDisabled ||
      this.readOnly
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
  #request(source: Event): void {
    if (this.checkboxDisabled || this.readOnly) return;
    const next = this.indeterminate ? true : !this.checked;
    if (this.#group) this.#group.request(this, next, source);
    else this.#state.set(next, 'trigger-press', source);
    this.#syncNative();
  }
  /** Protected compatibility lane consumed by Switch's native checkbox. */
  protected handleChange = (event: Event): void => {
    const input = event.currentTarget as HTMLInputElement;
    if (!this.checkboxDisabled && !this.readOnly) {
      const next = this.indeterminate ? true : input.checked;
      if (this.#group) this.#group.request(this, next, event);
      else this.#state.set(next, 'trigger-press', event);
    }
    input.checked = this.checked;
    input.indeterminate = this.indeterminate;
    this.syncCheckboxForm();
  };
  setChecked(value: boolean, reason: ChangeReason = 'programmatic', source?: Event): void {
    if (this.#group) return;
    this.#state.set(value, reason, source);
    this.#syncNative();
  }
  override activateFromLabel(): void {
    if (!this.checkboxDisabled && !this.readOnly) {
      this.focus();
      this.controlElement?.click();
    }
  }
  #syncNative(): void {
    const input = this.inputElement as HTMLInputElement | null;
    if (input) {
      input.checked = this.checked;
      input.indeterminate = this.indeterminate;
    }
    this.syncCheckboxForm();
  }
  protected syncCheckboxForm(): void {
    this.setFormValue(
      this.checkboxDisabled || this.parent
        ? null
        : this.checked
          ? this.value
          : (this.uncheckedValue ?? null),
      String(this.checked),
    );
    const missing = !this.checkboxDisabled && !this.parent && this.required && !this.checked;
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select this option.' : '',
      this.controlElement ?? undefined,
    );
  }
  override connectedCallback(): void {
    super.connectedCallback();
    // Switch reuses Boolean/form behavior, but is not a CheckboxGroup constituent.
    this.checkboxGroup = this.localName === 'tp-checkbox' ? nearestCheckboxGroup(this) : null;
    this.#group?.refresh();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.#lastChecked !== undefined && this.#lastChecked !== this.checked)
      this.emit('tp-field-value', {
        value: this.checked,
        previousValue: this.#lastChecked,
        reason: 'programmatic',
      });
    this.#lastChecked = this.checked;
    this.syncCheckboxForm();
    this.toggleAttribute('data-checked', this.checked);
    this.toggleAttribute('data-unchecked', !this.checked);
    this.toggleAttribute('data-indeterminate', this.indeterminate);
    this.toggleAttribute('data-disabled', this.checkboxDisabled);
    if (
      changed.has('value') ||
      changed.has('disabled') ||
      changed.has('parent') ||
      changed.has('identifier')
    )
      this.#group?.refresh();
  }
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (!this.#group && !this.#state.controlled && typeof state === 'string')
      this.#state.set(state === 'true', 'programmatic');
  }
  protected resetFormValue(): void {
    if (!this.#group) {
      this.#state.reset();
      this.#syncNative();
    }
  }
  override disconnectedCallback(): void {
    const owner = this.#group;
    this.checkboxGroup = null;
    this.#space = false;
    owner?.refresh();
    super.disconnectedCallback();
  }
}
