import { css, html } from 'lit';
import type { PropertyValues, PropertyDeclarations } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { CheckboxGroupController } from '../../foundation/checkbox-group.js';
import { nearestCheckboxGroup } from '../../foundation/checkbox-group.js';
import { PresenceController } from '../../foundation/presence.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import type { HostProperties } from '../../foundation/part.js';
import { createId } from '../../foundation/id.js';
import type { ChangeReason } from '../../foundation/types.js';
import { checkIcon } from '../../icons/check.js';
import { minusIcon } from '../../icons/minus.js';
import { checkboxPresentation } from '../../presentation/families/checkbox.js';
import { TpIcon } from '../icon.js';
import { selectionBoxStyles } from '../shared/control-styles.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** One committed Boolean snapshot shared by Checkbox and Switch render bindings. */
export interface BooleanControlState extends Readonly<Record<string, unknown>> {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  valid: boolean | null;
  focusVisible: boolean;
  touched: boolean;
  dirty: boolean;
  filled: boolean;
  focused: boolean;
}

/** Checkbox state/form owner, also consumed by the Switch family. */
export class TpCheckbox extends TpFormElement {
  static tagName = 'tp-checkbox';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override presentation = checkboxPresentation;
  static override properties: PropertyDeclarations = {
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
    selectionBoxStyles,
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
  #nativeLabelText = '';
  #nativeLabelObserver: MutationObserver | null = null;
  #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('[part~="checkbox-indicator"]'),
    keepMounted: () => this.keepMounted,
  });
  protected get supportsIndeterminate(): boolean {
    return true;
  }
  protected get supportsCheckboxGroup(): boolean {
    return true;
  }
  protected get activatesOnEnter(): boolean {
    return false;
  }
  protected get usesIndicatorPresence(): boolean {
    return true;
  }
  protected get checkboxParent(): boolean {
    return this.supportsCheckboxGroup && this.parent;
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.usesIndicatorPresence) this.#presence.setPresent(this.checked || this.indeterminate);
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
    return (
      this.supportsIndeterminate &&
      (this.#group && this.checkboxParent ? this.#group.isIndeterminate(this) : this.#indeterminate)
    );
  }
  set indeterminate(value: boolean) {
    const previous = this.indeterminate;
    if (!this.supportsIndeterminate && value) {
      this.emit('tp-diagnostic', {
        code: 'switch-indeterminate',
        message: 'Switch has binary checked state and does not support indeterminate.',
      });
    }
    this.#indeterminate = this.supportsIndeterminate && Boolean(value);
    this.requestUpdate('indeterminate', previous);
  }
  get checkboxGroup(): CheckboxGroupController | null {
    return this.#group;
  }
  set checkboxGroup(value: CheckboxGroupController | null) {
    if (!this.supportsCheckboxGroup) value = null;
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
    const state = this.booleanControlState();
    const { checked, indeterminate: mixed } = state;
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
    return this.renderBooleanControl(
      state,
      html`<span class="box" aria-hidden="true">${indicator}</span><span><slot></slot></span>`,
    );
  }
  protected get booleanControlIdentifier(): string {
    return this.identifier || this.#identifier;
  }
  protected booleanControlState(): BooleanControlState {
    return Object.freeze({
      checked: this.checked,
      indeterminate: this.indeterminate,
      disabled: this.checkboxDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      valid: this.effectiveInvalid ? false : this.fieldStateMarkers.valid ? true : null,
      focusVisible: this.#focusVisible,
      touched: Boolean(this.fieldStateMarkers.touched),
      dirty: Boolean(this.fieldStateMarkers.dirty),
      filled: this.checked,
      focused: Boolean(this.fieldStateMarkers.focused),
    });
  }
  /** Common semantic/action/native binding; sibling policies supply only role and content. */
  protected renderBooleanControl(
    state: BooleanControlState,
    content: unknown,
    part = 'checkbox',
    role = 'checkbox',
    properties: HostProperties = {},
  ): unknown {
    const { checked, indeterminate: mixed, disabled } = state;
    return html`${this.renderPart(part, state, {
        tag: this.nativeAction ? 'button' : 'span',
        protectedProperties: ['.ariaControlsElements'],
        reference: this.#reference,
        onHandlerPrevented: {
          '@keydown': () => {
            this.#space = false;
            this.#syncFocusVisible();
          },
          '@keyup': () => {
            this.#space = false;
            this.#syncFocusVisible();
          },
        },
        properties: {
          class: 'root',
          part: `${part} focusable`,
          id: this.booleanControlIdentifier,
          role,
          type: this.nativeAction ? 'button' : undefined,
          '.disabled': this.nativeAction ? disabled : undefined,
          tabindex: disabled ? -1 : 0,
          'aria-checked': mixed ? 'mixed' : String(checked),
          'aria-disabled': disabled ? 'true' : undefined,
          'aria-readonly': this.readOnly ? 'true' : undefined,
          'aria-required': this.required ? 'true' : undefined,
          'aria-invalid': this.effectiveInvalid ? 'true' : undefined,
          '.ariaControlsElements': this.checkboxParent
            ? (this.#group?.controlledElements() ?? [])
            : [],
          'data-checked': checked,
          'data-unchecked': !checked,
          'data-indeterminate': mixed,
          'data-disabled': disabled,
          'data-read-only': this.readOnly,
          'data-required': this.required,
          'data-focus-visible': this.#focusVisible,
          'data-invalid': this.effectiveInvalid,
          'data-valid': state.valid === true,
          'data-parent': this.checkboxParent,
          'data-touched': state.touched,
          'data-dirty': state.dirty,
          'data-filled': state.filled,
          'data-focused': state.focused,
          'data-readonly': this.readOnly,
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
          ...properties,
          ...(this.#nativeLabelText ? { 'aria-label': this.#nativeLabelText } : {}),
        },
        content,
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
  // A native label activates its FACE owner host, outside the internal semantic part.
  #hostClick = (event: Event): void => {
    if (event.composedPath()[0] !== this) return;
    if (!this.checkboxDisabled && !this.readOnly) this.focus();
    this.#click(event);
  };
  #syncNativeLabels = (): void => {
    const text = [...(this.labels ?? [])]
      .map((label) => label.textContent?.trim() ?? '')
      .filter(Boolean)
      .join(' ');
    if (text === this.#nativeLabelText) return;
    this.#nativeLabelText = text;
    this.requestUpdate();
  };
  #click = (event: Event): void => {
    this.#syncFocusVisible();
    queueMicrotask(() => {
      if (this.isConnected && !componentHandlingPrevented(event)) this.#request(event);
    });
  };
  #keyDown = (event: KeyboardEvent): void => {
    this.#syncFocusVisible();
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.activatesOnEnter && !event.repeat && !componentHandlingPrevented(event))
        this.#request(event);
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
    this.#syncFocusVisible();
    if (event.key !== ' ' || !this.#space) return;
    this.#space = false;
    if (componentHandlingPrevented(event)) return;
    event.preventDefault();
    this.#request(event);
  };
  #syncFocusVisible(): void {
    const visible = this.controlElement?.matches(':focus-visible') ?? false;
    if (visible === this.#focusVisible) return;
    this.#focusVisible = visible;
    this.requestUpdate();
  }
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
    if (
      !this.checkboxDisabled &&
      !this.readOnly &&
      !event.defaultPrevented &&
      !componentHandlingPrevented(event)
    ) {
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
      this.checkboxDisabled || this.checkboxParent
        ? null
        : this.checked
          ? this.value
          : (this.uncheckedValue ?? null),
      String(this.checked),
    );
    const missing =
      !this.checkboxDisabled && !this.checkboxParent && this.required && !this.checked;
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select this option.' : '',
      this.controlElement ?? undefined,
    );
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.#hostClick);
    this.#syncNativeLabels();
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#nativeLabelObserver = new Observer((records) => {
        this.#syncNativeLabels();
        if (
          records.some((record) => record.target === this && record.attributeName === 'aria-label')
        )
          this.requestUpdate();
      });
      this.#nativeLabelObserver.observe(this.getRootNode(), {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['for', 'id', 'aria-label'],
      });
    }
    // Switch reuses Boolean/form behavior, but is not a CheckboxGroup constituent.
    this.checkboxGroup =
      this.supportsCheckboxGroup && this.localName === 'tp-checkbox'
        ? nearestCheckboxGroup(this)
        : null;
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
    this.removeEventListener('click', this.#hostClick);
    this.#nativeLabelObserver?.disconnect();
    this.#nativeLabelObserver = null;
    const owner = this.#group;
    this.checkboxGroup = null;
    this.#space = false;
    owner?.refresh();
    super.disconnectedCallback();
  }
}
