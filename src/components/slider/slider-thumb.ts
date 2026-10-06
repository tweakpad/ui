import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { bindPart, mergePartProperties, renderPart } from '../../foundation/part.js';
import { createId } from '../../foundation/id.js';
import { sliderThumbStyles } from './styles.js';
import type { SliderThumbOwner, SliderThumbState, SliderVariant } from './types.js';
import { sliderPresentation } from '../../presentation/families/slider.js';

/** Native input/Field binding only. The containing Slider owns all value/form transactions. */
export class TpSliderThumb extends TpFormElement<number | undefined> {
  static tagName = 'tp-slider-thumb';
  // Constituent of its group's family; presented with the group's definition.
  static override presentation = sliderPresentation;
  static override properties = {
    ...TpFormElement.properties,
    index: { type: Number },
    valueText: { type: String, attribute: 'value-text' },
    getAccessibleLabel: { attribute: false },
    getAccessibleValueText: { attribute: false },
    tabIndex: { type: Number, attribute: false, noAccessor: true },
  };
  static override styles = [TpElement.styles, sliderThumbStyles];
  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'tabindex'];
  }
  #consumingTabIndex = false;
  override attributeChangedCallback(
    name: string,
    previous: string | null,
    value: string | null,
  ): void {
    if (name === 'tabindex') {
      if (value !== null && !this.#consumingTabIndex) {
        this.tabIndex = Number(value);
        this.#consumingTabIndex = true;
        this.removeAttribute(name);
        this.#consumingTabIndex = false;
      }
      return;
    }
    super.attributeChangedCallback(name, previous, value);
  }
  index: number | undefined;
  valueText: string | undefined;
  getAccessibleLabel: ((index: number) => string) | undefined;
  getAccessibleValueText: ((formatted: string, value: number, index: number) => string) | undefined;
  readonly inputId = createId('tp-slider-input');
  #tabIndex = 0;
  override get tabIndex(): number {
    return this.#tabIndex;
  }
  override set tabIndex(value: number) {
    const previous = this.#tabIndex;
    this.#tabIndex = value;
    this.requestUpdate('tabIndex', previous);
  }
  #owner: SliderThumbOwner | null = null;
  #canceledAdjustmentKey: string | undefined;
  #canceledAdjustmentTimer: number | undefined;
  #canceledAdjustmentWindow: Window | undefined;
  #visual: HTMLElement | null = null;
  #reference = (node: HTMLElement | null): void => {
    this.#visual = node;
    this.#owner?.registerThumb(this, node);
  };
  get slider(): SliderThumbOwner | null {
    return this.#owner;
  }
  /** The owning Slider's variant, so the Thumb resolves the same presentation axis. */
  get variant(): SliderVariant {
    return this.#owner?.variant ?? 'default';
  }
  set slider(owner: SliderThumbOwner | null) {
    if (owner === this.#owner) return;
    this.#owner?.registerThumb(this, null);
    this.#owner = owner;
    if (this.#visual) owner?.registerThumb(this, this.#visual);
    this.requestUpdate();
  }
  override get value(): number | undefined {
    return this.#owner?.thumbState(this).value;
  }
  override set value(_value: number | undefined) {
    /* Root is the sole value owner. */
  }
  get visualElement(): HTMLElement | null {
    return this.#visual;
  }
  protected override render() {
    const state = this.#owner?.thumbState(this);
    if (!state) return html``;
    const contract = this.#owner?.thumbContract(this) ?? this.partContracts['slider-thumb'];
    const nativeProperties: Record<string, unknown> = {};
    const visualProperties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(contract?.hostProperties ?? {})) {
      if (
        [
          '@focus',
          '@blur',
          '@keydown',
          '@input',
          '@change',
          'tabindex',
          'tabIndex',
          '.tabIndex',
        ].includes(key)
      )
        nativeProperties[key] = value;
      else visualProperties[key] = value;
    }
    // An indeterminate domain stays describable: finite native bounds, no NaN ARIA values.
    const finite = (value: number): string | undefined =>
      Number.isFinite(value) ? String(value) : undefined;
    const nativeMinimum = finite(state.minimum) ?? finite(state.maximum) ?? '0';
    const inputProperties = mergePartProperties(
      {
        id: this.inputId,
        type: 'range',
        part: 'focusable',
        '.min': nativeMinimum,
        '.max': finite(state.maximum) ?? nativeMinimum,
        '.step': String(state.step),
        '.value': finite(state.value) ?? nativeMinimum,
        '.disabled': state.disabled,
        '.required': state.required,
        tabindex: state.disabled ? -1 : this.tabIndex,
        'aria-label': state.label || undefined,
        'aria-valuetext': state.valueText,
        'aria-valuenow': finite(state.value),
        'aria-valuemin': finite(state.minimum),
        'aria-valuemax': finite(state.maximum),
        'aria-disabled': state.indeterminate ? 'true' : undefined,
        'aria-orientation': state.orientation,
        'aria-readonly': state.readOnly ? 'true' : undefined,
        'aria-required': state.required ? 'true' : undefined,
        'aria-invalid': state.invalid ? 'true' : undefined,
        '@input': (event: Event) => {
          if (!this.#canceledAdjustmentKey)
            this.#owner?.requestThumbValue(
              this,
              Number((event.currentTarget as HTMLInputElement).value),
              'input',
              event,
            );
          this.#restoreInput();
        },
        '@keydown': (event: KeyboardEvent) => {
          this.#clearCanceledAdjustment();
          this.#owner?.thumbKey(this, event);
        },
        '@keyup': (event: KeyboardEvent) => {
          if (event.key === this.#canceledAdjustmentKey) this.#clearCanceledAdjustment();
        },
        '@focus': () => this.#owner?.thumbFocus(this, true),
        '@blur': () => {
          this.#clearCanceledAdjustment();
          this.#owner?.thumbFocus(this, false);
        },
      },
      nativeProperties,
      ['min', 'max', 'step', 'id'],
      {
        '@input': () => this.#restoreInput(),
        '@keydown': (event) => this.#cancelAdjustmentInput(event as KeyboardEvent),
        '@blur': () => this.#clearCanceledAdjustment(),
      },
    );
    // tabIndex is an authored host property in the upstream Thumb contract.
    const authoredTabIndex =
      nativeProperties.tabindex ?? nativeProperties.tabIndex ?? nativeProperties['.tabIndex'];
    if (!state.disabled && authoredTabIndex !== undefined)
      inputProperties.tabindex = Number(authoredTabIndex);
    const customContent =
      typeof contract?.content === 'function' ? contract.content(state) : contract?.content;
    const content = html`${customContent}<input ${bindPart(inputProperties, [])} />`;
    const visualContract = contract ? { ...contract, hostProperties: visualProperties } : undefined;
    if (visualContract) delete visualContract.content;
    return renderPart('slider-thumb', state, visualContract, {
      tag: 'span',
      reference: this.#reference,
      properties: {
        part: `slider-thumb slider-thumb-orientation-${state.orientation}`,
        class: 'thumb',
        'aria-hidden': undefined,
        ...this.#markers(state),
      },
      content,
    });
  }
  #markers(state: SliderThumbState): Record<string, unknown> {
    return {
      'data-index': state.index,
      'data-orientation': state.orientation,
      'data-disabled': state.disabled,
      'data-indeterminate': state.indeterminate,
      'data-dragging': state.dragging,
      'data-active': state.active,
      'data-invalid': state.invalid,
      'data-valid': !state.invalid,
      'data-readonly': state.readOnly,
      'data-focused': state.focused,
      'data-touched': state.touched,
      'data-dirty': state.dirty,
    };
  }
  #cancelAdjustmentInput(event: KeyboardEvent): void {
    // A canceled component key still has its independent native default. Ignore
    // that key's range-input default update rather than publishing a new proposal.
    if (
      [
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'PageUp',
        'PageDown',
        'Home',
        'End',
      ].includes(event.key)
    ) {
      this.#clearCanceledAdjustment();
      this.#canceledAdjustmentKey = event.key;
      const window = this.ownerDocument.defaultView!;
      this.#canceledAdjustmentWindow = window;
      this.#canceledAdjustmentTimer = window.setTimeout(() => this.#clearCanceledAdjustment(), 0);
    }
    this.#restoreInput();
  }
  #clearCanceledAdjustment(): void {
    if (this.#canceledAdjustmentTimer !== undefined)
      this.#canceledAdjustmentWindow?.clearTimeout(this.#canceledAdjustmentTimer);
    this.#canceledAdjustmentKey = undefined;
    this.#canceledAdjustmentTimer = undefined;
    this.#canceledAdjustmentWindow = undefined;
  }
  #restoreInput(): void {
    const input = this.inputElement as HTMLInputElement | null;
    if (input) input.value = String(this.value ?? 0);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.setFormValue(null);
    if (this.#owner) {
      const state = this.#owner.thumbState(this);
      for (const [key, value] of Object.entries(this.#markers(state))) {
        if (value === false || value === undefined) this.removeAttribute(key);
        else this.setAttribute(key, value === true ? '' : String(value));
      }
      for (const [key, value] of Object.entries(this.#owner.thumbPosition(this)))
        this.style.setProperty(key, value);
    }
    if (
      ['index', 'disabled', 'valueText', 'getAccessibleLabel', 'getAccessibleValueText'].some(
        (key) => changed.has(key as keyof TpSliderThumb),
      )
    )
      this.#owner?.thumbChanged();
  }
  protected resetFormValue(): void {
    /* Root owns reset. */
  }
  override formStateRestoreCallback(): void {
    /* Root owns restoration. */
  }
  override disconnectedCallback(): void {
    this.#clearCanceledAdjustment();
    this.#owner?.registerThumb(this, null);
    super.disconnectedCallback();
  }
}
