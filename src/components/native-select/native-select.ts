import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { renderPart } from '../../foundation/part.js';
import { nativeValidityFlags } from '../field/text-control.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import {
  nativeDefaultValue,
  nativeItems,
  normalizeNativeValue,
  nativeAttributes,
  sameNativeValue,
} from './options.js';
import type { NativeItem, NativeOption } from './options.js';
import type { NativeSelectValue, NativeSelectState, NativeSelectOptionState } from './types.js';
import { nativeSelectPresentation } from '../../presentation/families/native-select.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

interface ValueOwner {
  supplied: NativeSelectValue | undefined;
  controller: ControllableState<NativeSelectValue> | undefined;
}
const owners = new WeakMap<TpNativeSelect, ValueOwner>();
function owner(host: TpNativeSelect): ValueOwner {
  let value = owners.get(host);
  if (!value) owners.set(host, (value = { supplied: undefined, controller: undefined }));
  return value;
}

/** Native picker policy on the shared form, value-transaction and part owners. */
export class TpNativeSelect extends TpFormElement<NativeSelectValue> {
  static tagName = 'tp-native-select';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override presentation = nativeSelectPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { noAccessor: true },
    defaultValue: { attribute: 'default-value' },
    onValueChange: { attribute: false },
    hostProperties: { attribute: false },
    multiple: { type: Boolean, reflect: true },
    placeholder: { type: String },
    label: { type: String },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpFormElement.styles,
    css`
      :host {
        display: inline-block;
        min-inline-size: 0;
      }

      .wrap {
        position: relative;
        display: inline-flex;
        inline-size: 100%;
        min-inline-size: 0;
        align-items: center;
      }

      .control {
        inline-size: 100%;
        min-inline-size: 0;
      }

      .wrap:has([part~='native-select-indicator']) .control {
        appearance: none;
      }

      .indicator {
        position: absolute;
        inset-inline-end: var(--tp-space-2-5);
        inset-block-start: 50%;
        translate: 0 -50%;
        pointer-events: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .indicator tp-icon {
        rotate: 90deg;
      }

      .source {
        display: none;
      }
    `,
  ];
  defaultValue: NativeSelectValue | undefined;
  onValueChange: ((event: TpValueChangeEvent<NativeSelectValue>) => void) | undefined;
  hostProperties: Record<string, unknown> = {};
  multiple = false;
  placeholder = '';
  label = 'Options';
  size = 'default';
  #items: NativeItem[] = [];
  #observer: MutationObserver | null = null;
  #control: HTMLSelectElement | null = null;
  #customValidity = '';
  #optionSignature = '';
  #initialized = false;
  #renderedValue: NativeSelectValue = '';
  #nativeOptionSignature = '';
  #nativeObserver: MutationObserver | null = null;
  readonly #reference = (element: HTMLElement | null): void => {
    this.#nativeObserver?.disconnect();
    this.#control = element?.localName === 'select' ? (element as HTMLSelectElement) : null;
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (this.#control && Observer && this.isConnected) {
      this.#nativeObserver = new Observer(() => {
        if (this.#nativeSignature() !== this.#nativeOptionSignature) this.requestUpdate();
      });
      this.#nativeObserver.observe(this.#control, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['value', 'selected', 'disabled'],
      });
    }
  };
  override get inputElement(): HTMLSelectElement | null {
    return this.#control;
  }
  protected override focusTarget(): HTMLSelectElement | null {
    return this.effectiveDisabled ? null : this.#control;
  }
  override get value(): NativeSelectValue {
    const state = owner(this);
    return (
      state.controller?.value ??
      (state.supplied === undefined
        ? this.#default()
        : normalizeNativeValue(state.supplied, this.multiple))
    );
  }
  override set value(value: NativeSelectValue | undefined) {
    const state = owner(this);
    const previous = this.value;
    state.supplied = value === undefined ? undefined : Array.isArray(value) ? [...value] : value;
    if (this.#initialized) state.controller?.sync();
    this.requestUpdate('value', previous);
  }
  get controlled(): boolean {
    return owner(this).controller?.controlled ?? owner(this).supplied !== undefined;
  }
  get selectedOptions(): HTMLCollectionOf<HTMLOptionElement> | null {
    return this.#control?.selectedOptions ?? null;
  }
  get options(): HTMLOptionsCollection | null {
    return this.#control?.options ?? null;
  }
  get selectedIndex(): number {
    return this.#control?.selectedIndex ?? -1;
  }
  set selectedIndex(value: number) {
    if (!this.#control) return;
    this.#control.selectedIndex = value;
    this.#request(this.#readNative(), 'programmatic');
  }
  setValue(value: NativeSelectValue): boolean {
    return this.#request(value, 'programmatic');
  }
  setCustomValidity(message: string): void {
    this.#customValidity = message;
    this.#syncForm();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#observer = new Observer(this.#readOptions);
      this.#observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
      });
    }
    this.#readOptions();
    // Reconnection must republish native references and restart native observation
    // even when the authored option content has not changed.
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#nativeObserver?.disconnect();
    this.#observer?.disconnect();
    this.#observer = null;
    super.disconnectedCallback();
  }
  readonly #readOptions = (): void => {
    const items = nativeItems(this);
    const signature = JSON.stringify(
      items.map((item) =>
        item.kind === 'option'
          ? [
              item.value,
              item.text,
              item.label,
              item.disabled,
              item.defaultSelected,
              nativeAttributes(item.source),
            ]
          : [
              item.label,
              item.disabled,
              nativeAttributes(item.source),
              item.children.map((option) => [
                option.value,
                option.text,
                option.label,
                option.disabled,
                option.defaultSelected,
                nativeAttributes(option.source),
              ]),
            ],
      ),
    );
    const sources = (items: readonly NativeItem[]) =>
      items.flatMap<HTMLOptionElement | HTMLOptGroupElement>((item) =>
        item.kind === 'group'
          ? [item.source, ...item.children.map((option) => option.source)]
          : [item.source],
      );
    const previousSources = sources(this.#items);
    const nextSources = sources(items);
    if (
      signature === this.#optionSignature &&
      previousSources.length === nextSources.length &&
      previousSources.every((source, index) => source === nextSources[index])
    )
      return;
    this.#optionSignature = signature;
    this.#items = items;
    this.requestUpdate();
  };
  #default(): NativeSelectValue {
    if (this.defaultValue !== undefined)
      return normalizeNativeValue(this.defaultValue, this.multiple);
    return nativeDefaultValue(
      this.#control
        ? nativeItems(this.#control)
        : this.#items.length
          ? this.#items
          : nativeItems(this),
      this.multiple,
      this.placeholder,
    );
  }

  protected override updated(changed: PropertyValues<this>): void {
    const state = owner(this);
    if (!state.controller && this.#control) {
      state.controller = new ControllableState({
        host: this,
        initialValue: this.multiple ? [] : '',
        readControlledValue: () =>
          state.supplied === undefined
            ? undefined
            : normalizeNativeValue(state.supplied, this.multiple),
        readDefaultValue: () => this.#default(),
        hasDefaultValue: () => this.defaultValue !== undefined,
        equals: sameNativeValue,
        onChange: (event) => this.onValueChange?.(event),
        onCommit: (value, previousValue, reason) => {
          this.#syncNative();
          this.#syncForm();
          this.emit('tp-field-value', { value, previousValue, reason });
        },
        diagnostic: (message) =>
          this.emit('tp-diagnostic', {
            code: 'native-select-value-mode',
            message,
            severity: 'warning',
          }),
      });
    }
    const controller = state.controller;
    if (!this.#initialized && this.#control) {
      // Native content/delegates are now mounted. Freeze the shared value lane only
      // after its native defaults are available, without proposing a user change.
      controller?.initialize();
      this.#initialized = true;
      if (!sameNativeValue(this.#renderedValue, this.value)) {
        this.emit('tp-field-value', {
          value: this.value,
          previousValue: this.#renderedValue,
          reason: 'initial',
        });
        this.requestUpdate();
      }
    }
    // Normalize a multiplicity switch through the same shared commit owner.
    const normalized = normalizeNativeValue(this.value, this.multiple);
    if (!sameNativeValue(normalized, this.value)) {
      if (this.controlled) owner(this).controller?.sync();
      else owner(this).controller?.set(normalized, 'programmatic');
    }
    const signature = this.#nativeSignature();
    if (
      this.#control &&
      this.#initialized &&
      signature !== this.#nativeOptionSignature &&
      !this.controlled
    ) {
      const available = new Set([...this.#control.options].map((option) => option.value));
      const value = this.value;
      if (Array.isArray(value)) {
        controller?.set(
          value.filter((item) => available.has(item)),
          'programmatic',
        );
      } else if (value !== '' && !available.has(value as string)) {
        controller?.set(
          nativeDefaultValue(nativeItems(this.#control), false, this.placeholder),
          'programmatic',
        );
      }
    }
    this.#nativeOptionSignature = signature;
    this.#syncNative();
    this.#syncForm();
    this.toggleAttribute('data-filled', this.#filled());
    super.updated(changed);
  }
  #nativeSignature(): string {
    return JSON.stringify(
      [...(this.#control?.options ?? [])].map((option) => [
        option.value,
        option.defaultSelected,
        option.disabled,
        option.parentElement?.localName === 'optgroup' &&
          (option.parentElement as HTMLOptGroupElement).disabled,
      ]),
    );
  }
  #filled(): boolean {
    return Array.isArray(this.value) ? this.value.length > 0 : this.value !== '';
  }
  #readNative(): NativeSelectValue {
    return this.multiple
      ? [...(this.#control?.selectedOptions ?? [])].map((option) => option.value)
      : (this.#control?.value ?? '');
  }
  #syncNative(): void {
    if (!this.#control) return;
    const value = normalizeNativeValue(this.value, this.multiple);
    const selected = new Set(typeof value === 'string' ? [value] : value);
    let found = false;
    for (const option of this.#control.options) {
      const enabled: boolean = selected.has(option.value) && (this.multiple || !found);
      if (option.selected !== enabled) option.selected = enabled;
      found ||= enabled;
    }
    if (!found && !this.multiple) this.#control.selectedIndex = -1;
  }
  #syncForm(): void {
    const control = this.#control;
    if (!control) {
      this.setFormValue(null, JSON.stringify(this.value));
      this.setValidity({});
      return;
    }
    control.setCustomValidity(this.#customValidity);
    const data = new FormData();
    if (this.effectiveName && !this.effectiveDisabled)
      for (const option of control.selectedOptions) {
        if (
          option.disabled ||
          (option.parentElement?.localName === 'optgroup' &&
            (option.parentElement as HTMLOptGroupElement).disabled)
        )
          continue;
        data.append(this.effectiveName, option.value);
      }
    this.setFormValue(this.effectiveDisabled ? null : data, JSON.stringify(this.value));
    this.setValidity(
      control.validity.valid ? {} : nativeValidityFlags(control.validity),
      control.validationMessage,
      control,
    );
  }
  #request(value: NativeSelectValue, reason: ChangeReason, sourceEvent?: Event): boolean {
    const controller = owner(this).controller;
    if (!controller) return false;
    const accepted = controller.set(
      normalizeNativeValue(value, this.multiple),
      reason,
      sourceEvent,
    );
    this.#syncNative();
    this.#syncForm();
    return accepted;
  }
  readonly #change = (event: Event): void => {
    if (this.effectiveDisabled || this.readOnly) {
      this.#rollback();
      return;
    }
    this.#request(this.#readNative(), 'input', event);
  };
  readonly #rollback = (): void => {
    this.#syncNative();
    this.#syncForm();
  };
  readonly #guard = (event: Event): void => {
    if (!this.readOnly && !this.effectiveDisabled) return;
    if (
      event instanceof this.ownerDocument.defaultView!.KeyboardEvent &&
      ['Tab', 'Shift', 'Control', 'Alt', 'Meta', 'Escape'].includes(event.key)
    )
      return;
    event.preventDefault();
  };
  protected override resetFormValue(): void {
    owner(this).controller?.reset();
    this.#syncNative();
    this.#syncForm();
  }
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (state === null || this.controlled) return;
    let value: NativeSelectValue;
    if (typeof state === 'string') {
      try {
        const parsed: unknown = JSON.parse(state);
        value = Array.isArray(parsed) ? parsed.map(String) : String(parsed);
      } catch {
        value = state;
      }
    } else if (state instanceof this.ownerDocument.defaultView!.FormData)
      value = state.getAll(this.effectiveName).map(String);
    else return;
    this.#request(value, 'programmatic');
  }
  #state(): NativeSelectState {
    return Object.freeze({
      value: this.value,
      multiple: this.multiple,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      filled: this.#filled(),
      size: this.size,
    });
  }
  #markers(state: NativeSelectState): Record<string, unknown> {
    return {
      'data-disabled': state.disabled ? '' : nothing,
      'data-readonly': state.readOnly ? '' : nothing,
      'data-required': state.required ? '' : nothing,
      'data-invalid': state.invalid ? '' : nothing,
      'data-filled': state.filled ? '' : nothing,
      'data-size': state.size,
    };
  }
  #option(option: NativeOption, state: NativeSelectState): unknown {
    const selected = new Set(typeof state.value === 'string' ? [state.value] : state.value).has(
      option.value,
    );
    const optionState: NativeSelectOptionState = Object.freeze({
      ...state,
      source: option.source,
      optionValue: option.value,
      label: option.label,
      optionDisabled: option.disabled || option.groupDisabled,
      selected,
    });
    return this.renderPart('native-select-option', optionState, {
      tag: 'option',
      properties: {
        ...nativeAttributes(option.source),
        ...this.#markers(state),
        role: nothing,
        '.value': option.value,
        label: option.source.hasAttribute('label') ? option.label : nothing,
        '.disabled': option.disabled,
        '.defaultSelected': option.defaultSelected,
      },
      content: option.text,
      protectedProperties: ['defaultSelected'],
    });
  }
  protected override render(): unknown {
    const state = this.#state();
    this.#renderedValue = state.value;
    const content = repeat(
      this.#items,
      (item) => item.source,
      (item) =>
        item.kind === 'option'
          ? this.#option(item, state)
          : this.renderPart(
              'native-select-option-group',
              Object.freeze({
                ...state,
                source: item.source,
                label: item.label,
                optionValue: '',
                optionDisabled: item.disabled,
                selected: false,
              }),
              {
                tag: 'optgroup',
                properties: {
                  ...nativeAttributes(item.source),
                  ...this.#markers(state),
                  role: nothing,
                  '.label': item.label,
                  '.disabled': item.disabled,
                },
                content: repeat(
                  item.children,
                  (option) => option.source,
                  (option) => this.#option(option, state),
                ),
              },
            ),
    );
    const placeholder =
      this.placeholder && !this.multiple
        ? this.renderPart(
            'native-select-option',
            Object.freeze({
              ...state,
              optionValue: '',
              label: this.placeholder,
              optionDisabled: true,
              selected: this.value === '',
            }),
            {
              tag: 'option',
              properties: { ...this.#markers(state), '.value': '', '.disabled': true },
              content: this.placeholder,
            },
          )
        : nothing;
    const controlContract = this.partContracts['native-select-control'] ?? {};
    const nativeProperties = { ...this.hostProperties, ...controlContract.hostProperties };
    const control = renderPart(
      'native-select-control',
      state,
      {
        ...controlContract,
        hostProperties: nativeProperties,
      },
      {
        tag: 'select',
        reference: this.#reference,
        properties: {
          ...this.#markers(state),
          role: nothing,
          class: 'control',
          '.name': this.effectiveName,
          '.disabled': this.effectiveDisabled,
          '.required': this.required,
          '.multiple': this.multiple,
          'aria-label':
            nativeProperties['aria-label'] ??
            nativeProperties['.ariaLabel'] ??
            (this.label || nothing),
          'aria-invalid': this.effectiveInvalid ? 'true' : nothing,
          'aria-readonly': this.readOnly ? 'true' : nothing,
          '@change': this.#change,
          '@pointerdown': this.#guard,
          '@keydown': this.#guard,
        },
        content: html`${placeholder}${content}`,
        protectedProperties: ['multiple'],
        onHandlerPrevented: { '@change': this.#rollback },
      },
    );
    const indicator = this.renderPart('native-select-indicator', state, {
      tag: 'span',
      enabled: !this.multiple,
      properties: { ...this.#markers(state), class: 'indicator', 'aria-hidden': 'true' },
      content: html`<slot name="indicator"
        ><tp-icon .icon=${chevronRightIcon} size="100%"></tp-icon
      ></slot>`,
    });
    return html`${this.renderPart('native-select', state, { tag: 'div', properties: { ...this.#markers(state), class: 'wrap' }, content: html`${control}${indicator}` })}<slot
        class="source"
        @slotchange=${this.#readOptions}
      ></slot>`;
  }
}
