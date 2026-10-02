import { css, html, nothing } from 'lit';
import { setPartComposition } from '../presentation/controller.js';
import { chevronRightIcon } from '../icons/chevron-right.js';
import type { PropertyValues, TemplateResult } from 'lit';
import { createId } from '../foundation/id.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../foundation/events.js';
import {
  calendarGridDates,
  calendarSelectionProposal,
  calendarValueDates,
  gregorianCalendarAdapter,
  isCalendarRange,
  normalizeCalendarValue,
  sameCalendarValue,
} from '../foundation/calendar.js';
import type {
  CalendarAdapter,
  CalendarSelectionMode,
  CalendarValue,
} from '../foundation/calendar.js';
import {
  normalizeQuestionnaireAnswer,
  normalizeQuestionnaireAnswers,
  questionnaireAnswered,
  questionnaireDefaultAnswers,
  questionnaireQuestionKind,
  questionnaireRemovalFallback,
  questionnaireStatus,
  sameQuestionnaireAnswers,
} from '../foundation/questionnaire.js';
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswers,
  QuestionnaireChoiceMode,
  QuestionnaireFlow,
  QuestionnaireQuestion,
  QuestionnaireShortcutMode,
  QuestionnaireStatus,
} from '../foundation/questionnaire.js';
import {
  moveSliderThumb,
  normalizeSliderValues,
  sameSliderValues,
  sliderConfigurationError,
  sliderValueFromRatio,
} from '../foundation/slider.js';
import type { SliderCrossing } from '../foundation/slider.js';
import type { ChangeReason } from '../foundation/types.js';
import { ValidationRun } from '../foundation/validation.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

import { nativeValidityFlags as validityFlags } from './field/text-control.js';
export { TpInput } from './input/index.js';
export { TpTextArea } from './text-area/index.js';

type NativeSelectOption = {
  kind: 'option';
  value: string;
  label: string;
  disabled: boolean;
};

type NativeSelectGroup = {
  kind: 'group';
  label: string;
  disabled: boolean;
  options: NativeSelectOption[];
};

type NativeSelectItem = NativeSelectOption | NativeSelectGroup;

export class TpNativeSelect extends TpFormElement {
  static tagName = 'tp-native-select';
  static override properties = {
    ...TpFormElement.properties,
    defaultValue: { type: String, attribute: 'default-value' },
    placeholder: { type: String },
    label: { type: String },
    size: { type: String, reflect: true },
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
      }

      :host([size='sm']) select {
        min-height: var(--tp-control-height-sm);
      }

      .icon {
        position: absolute;
        inset-inline-end: var(--tp-space-3);
        top: 50%;
        translate: 0 -50%;
        pointer-events: none;
      }
    `,
  ];
  defaultValue = '';
  placeholder = '';
  label = 'Options';
  size: 'sm' | 'default' = 'default';
  #items: NativeSelectItem[] = [];
  protected override render() {
    const placeholder = this.placeholder
      ? html`<option value="" disabled>${this.placeholder}</option>`
      : nothing;
    return html`<span class="wrap" part="native-select"
      ><select
        class="control"
        part="native-select-control focusable"
        aria-label=${this.label}
        .name=${this.effectiveName}
        .value=${this.value}
        ?disabled=${this.effectiveDisabled}
        ?required=${this.required}
        @change=${this.#change}
      >
        ${placeholder}${this.#items.map((item) => this.#renderItem(item))}</select
      ><span class="icon" part="native-select-indicator" aria-hidden="true"
        ><tp-icon .icon=${chevronRightIcon} style="rotate:90deg"></tp-icon></span
      ><slot hidden @slotchange=${this.#readOptions}></slot
    ></span>`;
  }
  #renderItem(item: NativeSelectItem): TemplateResult {
    if (item.kind === 'group') {
      return html`
        <optgroup part="native-select-option-group" label=${item.label} ?disabled=${item.disabled}>
          ${item.options.map((option) => this.#renderItem(option))}
        </optgroup>
      `;
    }
    return html`
      <option part="native-select-option" .value=${item.value} ?disabled=${item.disabled}>
        ${item.label}
      </option>
    `;
  }
  #readOptions(event: Event): void {
    this.#items = assignedElements(
      event.currentTarget as HTMLSlotElement,
    ).flatMap<NativeSelectItem>((element) => {
      if (element instanceof HTMLOptionElement) return [this.#readOption(element)];
      if (!(element instanceof HTMLOptGroupElement)) return [];
      return [
        {
          kind: 'group' as const,
          label: element.label,
          disabled: element.disabled,
          options: [...element.querySelectorAll('option')].map((option) =>
            this.#readOption(option),
          ),
        },
      ];
    });
    this.requestUpdate();
  }
  #readOption(option: HTMLOptionElement): NativeSelectOption {
    return {
      kind: 'option',
      value: option.value,
      label: option.label || option.textContent || '',
      disabled: option.disabled,
    };
  }
  #change(event: Event): void {
    const select = event.currentTarget as HTMLSelectElement;
    const previous = this.value;
    if (this.readOnly) {
      select.value = previous;
      return;
    }
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
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value') || changed.has('disabled') || changed.has('required')) {
      const select = this.renderRoot.querySelector<HTMLSelectElement>('select');
      this.setFormValue(this.effectiveDisabled ? null : this.value);
      if (select)
        this.setValidity(
          select.validity.valid ? {} : validityFlags(select.validity),
          select.validationMessage,
          select,
        );
    }
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.setFormValue(this.value || null);
  }
}

export type SliderValue = number | number[];

const sliderValueConverter = {
  fromAttribute(value: string | null): SliderValue | undefined {
    if (value === null || !value.trim()) return undefined;
    const values = value
      .split(/[\s,]+/u)
      .map(Number)
      .filter(Number.isFinite);
    if (!values.length) return undefined;
    return values.length === 1 ? values[0] : values;
  },
  toAttribute(value: SliderValue | undefined): string | null {
    if (value === undefined) return null;
    return Array.isArray(value) ? value.join(' ') : String(value);
  },
};

type SliderMode = 'controlled' | 'uncontrolled' | 'invalid';
type PendingSliderCommit = {
  values: number[];
  identities: string[];
  previous: number[];
  reason: ChangeReason;
  sourceEvent: Event;
  activeThumbIndex: number;
  deferCommit: boolean;
};

export class TpSlider extends TpFormElement<SliderValue | undefined> {
  static tagName = 'tp-slider';
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: sliderValueConverter, noAccessor: true },
    min: { type: Number },
    max: { type: Number },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    minStepsBetweenValues: { type: Number, attribute: 'min-steps-between-values' },
    defaultValue: { converter: sliderValueConverter, attribute: 'default-value' },
    label: { type: String },
    locale: { type: String },
    thumbCrossing: { type: String, attribute: 'thumb-crossing', reflect: true },
    thumbAlignment: { type: String, attribute: 'thumb-alignment', reflect: true },
    getAccessibleLabel: { attribute: false },
    getAccessibleValueText: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
    activeThumbIndex: { type: Number, attribute: false },
    dragging: { type: Boolean, attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-grid;
        min-inline-size: 12rem;
      }

      .root {
        display: grid;
      }

      .header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--tp-space-4);
      }

      .control {
        --tp-slider-thumb-size: var(--tp-icon-size-md);
        --tp-slider-thumb-radius: calc(var(--tp-slider-thumb-size) / 2);

        position: relative;
        min-inline-size: 10rem;
        min-block-size: var(--tp-icon-size-lg);
        touch-action: none;
        user-select: none;
      }

      .track,
      .range {
        position: absolute;
        pointer-events: none;
      }

      :host([orientation='horizontal']) .track,
      :host(:not([orientation])) .track {
        inset: 50% 0 auto;
        block-size: var(--tp-space-2);
        translate: 0 -50%;
      }

      :host([orientation='horizontal']) .range,
      :host(:not([orientation])) .range {
        inset-block: 0;
        inset-inline-start: var(--tp-slider-range-start);
        inline-size: calc(var(--tp-slider-range-end) - var(--tp-slider-range-start));
      }

      :host([orientation='vertical']) {
        min-inline-size: var(--tp-space-12);
      }

      :host([orientation='vertical']) .control {
        min-inline-size: var(--tp-icon-size-lg);
        min-block-size: 10rem;
      }

      :host([orientation='vertical']) .track {
        inset: 0 auto 0 50%;
        inline-size: var(--tp-space-2);
        translate: -50% 0;
      }

      :host([orientation='vertical']) .range {
        inset-inline: 0;
        inset-block-end: var(--tp-slider-range-start);
        block-size: calc(var(--tp-slider-range-end) - var(--tp-slider-range-start));
      }

      :host([orientation='horizontal']) .control[data-thumb-alignment='edge'] .track,
      :host(:not([orientation])) .control[data-thumb-alignment='edge'] .track {
        inset-inline: var(--tp-slider-thumb-radius);
      }

      :host([orientation='vertical']) .control[data-thumb-alignment='edge'] .track {
        inset-block: var(--tp-slider-thumb-radius);
      }

      input[type='range'] {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        margin: 0;
        appearance: none;
        pointer-events: none;
      }

      input[type='range']::-webkit-slider-thumb {
        box-sizing: border-box;
        width: var(--tp-slider-thumb-size);
        height: var(--tp-slider-thumb-size);
        appearance: none;
      }

      input[type='range']::-moz-range-thumb {
        box-sizing: border-box;
        width: var(--tp-slider-thumb-size);
        height: var(--tp-slider-thumb-size);
      }

      :host([orientation='vertical']) input[type='range'] {
        writing-mode: vertical-lr;
        direction: rtl;
      }

      :host([orientation='horizontal']) .control[data-thumb-alignment='center'] input[type='range'],
      :host(:not([orientation])) .control[data-thumb-alignment='center'] input[type='range'] {
        inset-inline: calc(-1 * var(--tp-slider-thumb-radius));
        width: calc(100% + var(--tp-slider-thumb-size));
      }

      :host([orientation='vertical']) .control[data-thumb-alignment='center'] input[type='range'] {
        inset-block: calc(-1 * var(--tp-slider-thumb-radius));
        height: calc(100% + var(--tp-slider-thumb-size));
      }
    `,
  ];
  override get value(): SliderValue | undefined {
    const value = super.value;
    return value === ('' as unknown as SliderValue) ? undefined : value;
  }
  override set value(value: SliderValue | undefined) {
    super.value = value;
  }
  min = 0;
  max = 100;
  step = 1;
  largeStep = 10;
  minStepsBetweenValues = 0;
  defaultValue: SliderValue | undefined = undefined;
  label = 'Value';
  locale = '';
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  thumbCrossing: SliderCrossing = 'prevent';
  thumbAlignment: 'center' | 'edge' | 'delayed-edge' = 'center';
  getAccessibleLabel: ((index: number) => string) | undefined;
  getAccessibleValueText:
    ((formattedValue: string, value: number, index: number) => string) | undefined;
  onValueChange: ((event: TpValueChangeEvent<SliderValue>) => void) | undefined;
  onValueCommitted: ((event: TpValueCommitEvent<SliderValue>) => void) | undefined;
  activeThumbIndex = -1;
  dragging = false;

  #mode: SliderMode | null = null;
  #values: number[] = [];
  #defaultValues: number[] = [];
  #identities: string[] = [];
  #valueIsArray = false;
  #pendingCommit: PendingSliderCommit | null = null;
  #settledCommit: PendingSliderCommit | null = null;
  #fieldLabel = '';
  #pointerId: number | null = null;
  #pointerMoved = false;
  #gestureStart: number[] | null = null;
  #nativeInputStart: number[] | null = null;
  #lastDiagnostic = '';
  #hostActivated = false;
  #touched = false;

  get values(): readonly number[] {
    return [...this.#values];
  }

  get thumbMetadata(): readonly { index: number; inputId: string; value: number }[] {
    return this.#values.map((value, index) => ({
      index,
      inputId: this.#inputId(this.#identities[index]!),
      value,
    }));
  }

  override setFieldAssociation(association: {
    label?: string;
    description?: string;
    error?: string;
  }): void {
    if ('label' in association) this.#fieldLabel = association.label ?? '';
    super.setFieldAssociation({
      ...('description' in association ? { description: association.description } : {}),
      ...('error' in association ? { error: association.error } : {}),
    });
    this.requestUpdate();
  }

  setValue(value: SliderValue, sourceEvent?: Event): boolean {
    const raw = Array.isArray(value) ? value : [value];
    this.#valueIsArray = Array.isArray(value);
    const values = this.#normalize(raw);
    this.#ensureIdentities(values.length);
    return this.#requestValues(
      values,
      [...this.#identities],
      -1,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
      true,
    );
  }

  protected override render() {
    const configurationError = this.#configurationError();
    const unavailable = this.effectiveDisabled || this.readOnly || Boolean(configurationError);
    const focused = this.activeThumbIndex >= 0;
    const dirty = !sameSliderValues(this.#values, this.#defaultValues);
    const start = this.#values.length > 1 ? (this.#values[0] ?? this.min) : this.min;
    const end = this.#values.at(-1) ?? this.min;
    const orientationPart = `slider-orientation-${this.orientation}`;
    const state = {
      disabled: this.effectiveDisabled,
      dragging: this.dragging,
      focused,
      invalid: this.invalid,
      valid: !this.invalid,
      required: this.required,
      touched: this.#touched,
      dirty,
    };
    return html`<div
      class="root"
      part=${`slider ${orientationPart}`}
      data-orientation=${this.orientation}
      ?data-disabled=${state.disabled}
      ?data-dragging=${state.dragging}
      ?data-focused=${state.focused}
      ?data-invalid=${state.invalid}
      ?data-valid=${state.valid}
      ?data-required=${state.required}
      ?data-touched=${state.touched}
      ?data-dirty=${state.dirty}
    >
      <div class="header">
        ${
          this.#resolvedLabel()
            ? html`<span part=${`slider-label slider-label-orientation-${this.orientation}`}
                >${this.#resolvedLabel()}</span
              >`
            : nothing
        }
        <output
          part=${`slider-output slider-output-orientation-${this.orientation}`}
          data-orientation=${this.orientation}
          ?data-disabled=${state.disabled}
          ?data-dragging=${state.dragging}
          ?data-focused=${state.focused}
          ?data-invalid=${state.invalid}
          ?data-valid=${state.valid}
          ?data-required=${state.required}
          ?data-touched=${state.touched}
          ?data-dirty=${state.dirty}
          >${this.#values.map((value) => this.#formatValue(value)).join(' – ')}</output
        >
      </div>
      <div
        class="control"
        data-orientation=${this.orientation}
        data-thumb-alignment=${this.#resolvedThumbAlignment()}
        ?data-disabled=${state.disabled}
        ?data-dragging=${state.dragging}
        ?data-focused=${state.focused}
        ?data-invalid=${state.invalid}
        ?data-valid=${state.valid}
        ?data-required=${state.required}
        ?data-touched=${state.touched}
        ?data-dirty=${state.dirty}
        @pointerdown=${this.#pointerDown}
        @pointermove=${this.#pointerMove}
        @pointerup=${this.#pointerUp}
        @pointercancel=${this.#pointerCancel}
      >
        <span
          class="track"
          part=${`slider-track slider-track-orientation-${this.orientation}`}
          data-orientation=${this.orientation}
          ?data-disabled=${state.disabled}
          ?data-dragging=${state.dragging}
          ?data-focused=${state.focused}
          ?data-invalid=${state.invalid}
          ?data-valid=${state.valid}
          ?data-required=${state.required}
          ?data-touched=${state.touched}
          ?data-dirty=${state.dirty}
          ><span
            class="range"
            part=${`slider-range slider-range-orientation-${this.orientation}`}
            style=${`--tp-slider-range-start:${this.#percentage(start)}%;--tp-slider-range-end:${this.#percentage(end)}%`}
            data-orientation=${this.orientation}
            ?data-disabled=${state.disabled}
            ?data-dragging=${state.dragging}
            ?data-focused=${state.focused}
            ?data-invalid=${state.invalid}
            ?data-valid=${state.valid}
            ?data-required=${state.required}
            ?data-touched=${state.touched}
            ?data-dirty=${state.dirty}
          ></span
        ></span>
        ${this.#values.map((value, index) => {
          const formatted = this.#formatValue(value);
          const identity = this.#identities[index]!;
          const inputId = this.#inputId(identity);
          return html`<input
            id=${inputId}
            data-thumb-identity=${identity}
            data-index=${String(index)}
            data-orientation=${this.orientation}
            ?data-disabled=${state.disabled}
            ?data-dragging=${state.dragging}
            ?data-focused=${this.activeThumbIndex === index}
            ?data-invalid=${state.invalid}
            ?data-valid=${state.valid}
            ?data-required=${state.required}
            ?data-touched=${state.touched}
            ?data-dirty=${state.dirty}
            part=${`slider-thumb slider-thumb-orientation-${this.orientation} focusable`}
            type="range"
            .value=${String(value)}
            .min=${String(this.min)}
            .max=${String(this.max)}
            .step=${String(this.step)}
            ?disabled=${unavailable}
            aria-label=${this.#accessibleLabel(index)}
            aria-valuetext=${this.getAccessibleValueText?.(formatted, value, index) ?? formatted}
            aria-orientation=${this.orientation}
            aria-readonly=${String(this.readOnly)}
            style=${`--tp-slider-thumb-position:${this.#percentage(value)}%`}
            @keydown=${this.#keyDown}
            @input=${this.#nativeInput}
            @change=${this.#nativeChange}
            @focus=${this.#focusThumb}
            @blur=${this.#blurThumb}
          />`;
        })}
      </div>
    </div>`;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (this.#mode === null) {
      this.#initializeValueMode();
      return;
    }
    if (this.#mode === 'controlled' && changed.has('value')) this.#acceptControlledValue();
    else if (this.#mode === 'uncontrolled' && changed.has('value') && this.value !== undefined) {
      this.#diagnose('Slider cannot change from uncontrolled to controlled operation.');
    }
    if (
      changed.has('min') ||
      changed.has('max') ||
      changed.has('step') ||
      changed.has('minStepsBetweenValues')
    ) {
      this.#values = this.#normalize(this.#values);
    }
    this.#ensureIdentities(this.#values.length);
  }

  protected override firstUpdated(): void {
    this.#hostActivated = true;
    if (this.thumbAlignment === 'delayed-edge') this.requestUpdate();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncFormState();
    this.#syncFieldRelationships();
    const configurationError = this.#configurationError();
    if (configurationError) this.#diagnose(configurationError);
    if (this.#settledCommit) {
      const commit = this.#settledCommit;
      this.#settledCommit = null;
      this.#emitCommit(
        commit.values,
        commit.previous,
        commit.reason,
        commit.sourceEvent,
        commit.activeThumbIndex,
      );
    }
  }

  protected resetFormValue(): void {
    if (this.#mode !== 'uncontrolled') return;
    this.#requestValues(
      [...this.#defaultValues],
      [...this.#identities],
      -1,
      'form-reset',
      new Event('reset'),
      true,
    );
  }

  override disconnectedCallback(): void {
    this.#pointerId = null;
    this.#gestureStart = null;
    this.dragging = false;
    super.disconnectedCallback();
  }

  #initializeValueMode(): void {
    const hasValue = this.value !== undefined;
    const hasDefault = this.defaultValue !== undefined;
    if (hasValue === hasDefault) {
      this.#mode = 'invalid';
      this.#valueIsArray = Array.isArray(this.value ?? this.defaultValue);
      this.#values = this.#normalize(this.#rawValues(this.value ?? this.defaultValue));
      this.#defaultValues = [...this.#values];
      this.#ensureIdentities(this.#values.length);
      return;
    }
    this.#mode = hasValue ? 'controlled' : 'uncontrolled';
    const initial = hasValue ? this.value : this.defaultValue;
    this.#valueIsArray = Array.isArray(initial);
    this.#values = this.#normalize(this.#rawValues(initial));
    this.#defaultValues = this.#normalize(this.#rawValues(this.defaultValue ?? initial));
    this.#ensureIdentities(this.#values.length);
  }

  #acceptControlledValue(): void {
    if (this.value === undefined) {
      this.#diagnose('Slider cannot change from controlled to uncontrolled operation.');
      return;
    }
    this.#valueIsArray = Array.isArray(this.value);
    const values = this.#normalize(this.#rawValues(this.value));
    const pending = this.#pendingCommit;
    if (pending && sameSliderValues(values, pending.values)) {
      this.#identities = [...pending.identities];
      this.activeThumbIndex = pending.activeThumbIndex;
      if (!pending.deferCommit) this.#settledCommit = pending;
      this.#pendingCommit = null;
    } else if (pending && !sameSliderValues(values, pending.previous)) {
      this.#pendingCommit = null;
    }
    this.#values = values;
  }

  #configurationError(): string | null {
    if (this.#mode === 'invalid') {
      return this.value !== undefined && this.defaultValue !== undefined
        ? 'Slider value and defaultValue cannot both be supplied.'
        : 'Slider requires either value or defaultValue.';
    }
    return sliderConfigurationError(
      this.min,
      this.max,
      this.step,
      this.largeStep,
      this.minStepsBetweenValues,
      this.#values.length,
    );
  }

  #normalize(values: readonly number[]): number[] {
    return normalizeSliderValues(
      values.filter(Number.isFinite),
      this.min,
      this.max,
      this.step,
      this.minStepsBetweenValues,
    );
  }

  #rawValues(value: SliderValue | undefined): number[] {
    if (value === undefined) return [];
    return Array.isArray(value) ? [...value] : [value];
  }

  #ensureIdentities(count: number): void {
    this.#identities = this.#identities.slice(0, count);
    while (this.#identities.length < count) this.#identities.push(createId('tp-slider-thumb'));
    if (this.activeThumbIndex >= count) this.activeThumbIndex = -1;
  }

  #shape(values: readonly number[]): SliderValue {
    return this.#valueIsArray || values.length !== 1 ? [...values] : values[0]!;
  }

  #requestValues(
    values: number[],
    identities: string[],
    activeThumbIndex: number,
    reason: ChangeReason,
    sourceEvent: Event,
    commit: boolean,
  ): boolean {
    const previous = [...this.#values];
    if (sameSliderValues(values, previous)) return false;
    const detail = { metadata: { activeThumbIndex } };
    const event = new TpValueChangeEvent(
      this.#shape(values),
      this.#shape(previous),
      reason,
      sourceEvent,
      detail,
    );
    this.onValueChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) {
      this.requestUpdate();
      return false;
    }

    if (this.#mode === 'controlled') {
      this.#pendingCommit = {
        values,
        identities,
        previous,
        reason,
        sourceEvent,
        activeThumbIndex,
        deferCommit: !commit,
      };
      this.requestUpdate();
      return true;
    }
    if (this.#mode !== 'uncontrolled') return false;

    this.#values = values;
    this.#identities = identities;
    this.activeThumbIndex = activeThumbIndex;
    this.requestUpdate();
    if (commit) this.#emitCommit(values, previous, reason, sourceEvent, activeThumbIndex);
    return true;
  }

  #requestThumbValue(
    index: number,
    value: number,
    reason: ChangeReason,
    sourceEvent: Event,
    commit: boolean,
  ): boolean {
    const result = moveSliderThumb({
      values: this.#values,
      identities: this.#identities,
      index,
      proposedValue: value,
      minimum: this.min,
      maximum: this.max,
      step: this.step,
      minStepsBetweenValues: this.minStepsBetweenValues,
      crossing: this.thumbCrossing,
    });
    const accepted = this.#requestValues(
      result.values,
      result.identities,
      result.activeIndex,
      reason,
      sourceEvent,
      commit,
    );
    if (accepted && result.activeIndex !== index) {
      const identity = result.identities[result.activeIndex];
      if (identity) queueMicrotask(() => this.#thumbByIdentity(identity)?.focus());
    }
    return accepted;
  }

  #emitCommit(
    values: readonly number[],
    previous: readonly number[],
    reason: ChangeReason,
    sourceEvent: Event,
    activeThumbIndex: number,
  ): void {
    if (sameSliderValues(values, previous)) return;
    const event = new TpValueCommitEvent(
      this.#shape(values),
      this.#shape(previous),
      reason,
      sourceEvent,
      { metadata: { activeThumbIndex } },
    );
    this.onValueCommitted?.(event);
    this.dispatchEvent(event);
  }

  #keyDown = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || this.readOnly || this.#configurationError()) return;
    const input = event.currentTarget as HTMLInputElement;
    const index = Number(input.dataset.index);
    const current = this.#values[index];
    if (current === undefined) return;
    let next: number | null = null;
    const horizontalForward = this.direction === 'rtl' ? -1 : 1;
    if (event.key === 'ArrowRight') next = current + this.step * horizontalForward;
    else if (event.key === 'ArrowLeft') next = current - this.step * horizontalForward;
    else if (event.key === 'ArrowUp') next = current + this.step;
    else if (event.key === 'ArrowDown') next = current - this.step;
    else if (event.key === 'PageUp') next = current + this.largeStep;
    else if (event.key === 'PageDown') next = current - this.largeStep;
    else if (event.key === 'Home') next = this.min;
    else if (event.key === 'End') next = this.max;
    if (next === null) return;
    event.preventDefault();
    this.#touched = true;
    this.activeThumbIndex = index;
    this.#requestThumbValue(index, next, 'keyboard', event, true);
  };

  #nativeInput = (event: Event): void => {
    if (this.effectiveDisabled || this.readOnly || this.#configurationError()) return;
    const input = event.currentTarget as HTMLInputElement;
    const index = Number(input.dataset.index);
    this.#nativeInputStart ??= [...this.#values];
    this.#touched = true;
    this.#requestThumbValue(index, input.valueAsNumber, 'input', event, false);
  };

  #nativeChange = (event: Event): void => {
    const previous = this.#nativeInputStart;
    this.#nativeInputStart = null;
    if (previous) this.#emitCommit(this.#values, previous, 'input', event, this.activeThumbIndex);
  };

  #pointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      this.effectiveDisabled ||
      this.readOnly ||
      this.#configurationError() ||
      !this.#values.length
    )
      return;
    const control = event.currentTarget as HTMLElement;
    const value = this.#valueFromPointer(event, control);
    const index = this.#closestThumb(value);
    this.#pointerId = event.pointerId;
    this.#pointerMoved = false;
    this.#gestureStart = [...this.#values];
    this.dragging = true;
    this.#touched = true;
    this.activeThumbIndex = index;
    control.setPointerCapture?.(event.pointerId);
    event.preventDefault();
    this.#requestThumbValue(index, value, 'track-press', event, false);
  };

  #pointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const control = event.currentTarget as HTMLElement;
    this.#pointerMoved = true;
    this.#requestThumbValue(
      this.activeThumbIndex,
      this.#valueFromPointer(event, control),
      'drag',
      event,
      false,
    );
  };

  #pointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const control = event.currentTarget as HTMLElement;
    control.releasePointerCapture?.(event.pointerId);
    const previous = this.#gestureStart;
    const reason: ChangeReason = this.#pointerMoved ? 'drag' : 'track-press';
    this.#pointerId = null;
    this.#gestureStart = null;
    this.dragging = false;
    if (previous) this.#emitCommit(this.#values, previous, reason, event, this.activeThumbIndex);
    this.#thumbs()[this.activeThumbIndex]?.focus();
  };

  #pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointerId) return;
    const control = event.currentTarget as HTMLElement;
    control.releasePointerCapture?.(event.pointerId);
    this.#pointerId = null;
    this.#gestureStart = null;
    this.dragging = false;
    this.requestUpdate();
  };

  #focusThumb = (event: FocusEvent): void => {
    this.activeThumbIndex = Number((event.currentTarget as HTMLInputElement).dataset.index);
  };

  #blurThumb = (): void => {
    queueMicrotask(() => {
      if (!this.#thumbs().some((thumb) => thumb.matches(':focus'))) {
        this.activeThumbIndex = -1;
      }
    });
  };

  #valueFromPointer(event: PointerEvent, control: HTMLElement): number {
    const rect = control.getBoundingClientRect();
    const edgeInset =
      this.#resolvedThumbAlignment() === 'edge'
        ? Number.parseFloat(getComputedStyle(control).fontSize) * 0.625
        : 0;
    const horizontalLength = Math.max(1, rect.width - edgeInset * 2);
    const verticalLength = Math.max(1, rect.height - edgeInset * 2);
    let ratio =
      this.orientation === 'vertical'
        ? (rect.bottom - edgeInset - event.clientY) / verticalLength
        : (event.clientX - rect.left - edgeInset) / horizontalLength;
    if (this.orientation === 'horizontal' && this.direction === 'rtl') ratio = 1 - ratio;
    return sliderValueFromRatio(ratio, this.min, this.max, this.step);
  }

  #closestThumb(value: number): number {
    let closest = 0;
    for (let index = 1; index < this.#values.length; index += 1) {
      const candidate = this.#values[index];
      const current = this.#values[closest];
      if (
        candidate !== undefined &&
        current !== undefined &&
        Math.abs(candidate - value) < Math.abs(current - value)
      )
        closest = index;
    }
    return closest;
  }

  #syncFormState(): void {
    const error = this.#configurationError();
    const anchor = this.#thumbs()[0];
    if (error) this.setValidity({ customError: true }, error, anchor);
    else if (this.required && !this.#values.length)
      this.setValidity({ valueMissing: true }, 'A value is required.', anchor);
    else this.setValidity();

    if (this.effectiveDisabled || !this.name || !this.#values.length) {
      this.setFormValue(null);
      return;
    }
    if (this.#values.length === 1) {
      this.setFormValue(String(this.#values[0]));
      return;
    }
    const data = new FormData();
    for (const value of this.#values) data.append(this.name, String(value));
    this.setFormValue(data);
  }

  #syncFieldRelationships(): void {
    const [first, ...rest] = this.#thumbs();
    if (!first) return;
    for (const input of [first, ...rest]) {
      input.setAttribute('aria-label', this.#accessibleLabel(Number(input.dataset.index)));
    }
    for (const input of rest) {
      for (const attribute of ['aria-describedby', 'aria-errormessage', 'aria-invalid']) {
        const value = first.getAttribute(attribute);
        if (value === null) input.removeAttribute(attribute);
        else input.setAttribute(attribute, value);
      }
    }
  }

  #resolvedLabel(): string {
    return this.#fieldLabel || this.label;
  }

  #accessibleLabel(index: number): string {
    const supplied = this.getAccessibleLabel?.(index);
    if (supplied) return supplied;
    const label = this.#resolvedLabel() || 'Value';
    if (this.#values.length === 1) return label;
    if (this.#values.length === 2) return `${label} ${index === 0 ? 'minimum' : 'maximum'}`;
    return `${label} ${index + 1}`;
  }

  #formatValue(value: number): string {
    return new Intl.NumberFormat(this.locale || undefined, {
      maximumFractionDigits: 12,
    }).format(value);
  }

  #percentage(value: number): number {
    if (!(this.max > this.min)) return 0;
    return ((value - this.min) / (this.max - this.min)) * 100;
  }

  #resolvedThumbAlignment(): 'center' | 'edge' {
    return this.thumbAlignment === 'edge' ||
      (this.thumbAlignment === 'delayed-edge' && this.#hostActivated)
      ? 'edge'
      : 'center';
  }

  #inputId(identity: string): string {
    return `${identity}-input`;
  }

  #thumbs(): HTMLInputElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLInputElement>('input[data-thumb-identity]')];
  }

  #thumbByIdentity(identity: string): HTMLInputElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>(
      `input[data-thumb-identity="${CSS.escape(identity)}"]`,
    );
  }

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.emit('tp-diagnostic', {
        code: 'slider-invalid-configuration',
        message,
        severity: 'error' as const,
      }),
    );
  }
}

export { TpRadioGroup, TpRadioGroupItem } from './radio-group/index.js';

export class TpOtpField extends TpFormElement {
  static tagName = 'tp-otp-field';
  static override properties = {
    ...TpFormElement.properties,
    length: { type: Number },
    inputMode: { type: String, attribute: 'inputmode' },
    defaultValue: { type: String, attribute: 'default-value' },
    validationType: { type: String, attribute: 'validation-type' },
    mask: { type: Boolean, reflect: true },
    autoComplete: { type: String, attribute: 'autocomplete' },
    autoSubmit: { type: Boolean, attribute: 'auto-submit' },
    label: { type: String },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .root {
        position: relative;
        display: inline-flex;
      }

      [part='group'] {
        display: flex;
      }

      .editor {
        position: absolute;
        z-index: 1;
        inset: 0;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        color: transparent;
        caret-color: transparent;
        background: transparent;
        opacity: 0.01;
      }

      .slot {
        display: grid;
        place-items: center;
        width: var(--tp-target-size-min);
        min-height: var(--tp-target-size-min);
        text-align: center;
      }
    `,
  ];
  length = 6;
  inputMode = 'numeric';
  defaultValue = '';
  validationType: 'numeric' | 'alphabetic' | 'alphanumeric' = 'numeric';
  mask = false;
  autoComplete = 'one-time-code';
  autoSubmit = false;
  label = 'One-time code';
  #selectionStart = 0;
  #selectionEnd = 0;
  #focused = false;
  #composing = false;
  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLInputElement>('input');
  }
  protected override render() {
    const chars = Array.from({ length: this.length }, (_, i) => this.value[i] ?? '');
    return html`<div class="root" part="root">
      <input
        class="editor"
        part="input focusable"
        .value=${this.value}
        aria-label=${this.label}
        inputmode=${this.inputMode}
        autocomplete=${this.autoComplete}
        maxlength=${String(this.length)}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
        ?required=${this.required}
        @beforeinput=${this.#beforeInput}
        @input=${this.#input}
        @select=${this.#selection}
        @keyup=${this.#selection}
        @click=${this.#selection}
        @focus=${this.#focus}
        @blur=${this.#blur}
        @compositionstart=${this.#compositionStart}
        @compositionend=${this.#compositionEnd}
      />
      <div part="group" aria-hidden="true">
        ${chars.map((char, index) => this.#renderSlot(char, index))}
      </div>
    </div>`;
  }
  #renderSlot(char: string, index: number) {
    const active = this.#focused && index === Math.min(this.#selectionStart, this.length - 1);
    return html`<span
      class="slot"
      part="slot"
      data-index=${String(index)}
      ?data-active=${active}
      ?data-filled=${Boolean(char)}
      >${char ? (this.mask ? '•' : char) : ''}</span
    >`;
  }
  #normalize(value: string): string {
    const compact = value.replace(/\s/g, '');
    const pattern =
      this.validationType === 'numeric'
        ? /[0-9]/u
        : this.validationType === 'alphabetic'
          ? /\p{L}/u
          : /[0-9\p{L}]/u;
    return [...compact]
      .filter((character) => pattern.test(character))
      .join('')
      .slice(0, this.length);
  }
  #commit(value: string, event: Event): void {
    const normalized = this.#normalize(value);
    const previous = this.value;
    if (normalized !== value) {
      this.emit('tp-invalid-input', {
        attemptedValue: value,
        reason: event.type === 'paste' ? 'paste' : 'input',
      });
    }
    if (this.dispatchEvent(new TpValueChangeEvent(normalized, previous, 'input', event))) {
      this.value = normalized;
      this.setFormValue(normalized || null);
      this.setValidity(
        this.required && normalized.length !== this.length ? { valueMissing: true } : {},
        this.required && normalized.length !== this.length ? 'Complete the code.' : '',
      );
      if (previous.length !== this.length && normalized.length === this.length) {
        this.emit('tp-complete', { value: normalized, sourceEvent: event });
        if (this.autoSubmit) this.form?.requestSubmit();
      }
    } else {
      const input = event.currentTarget as HTMLInputElement;
      input.value = previous;
      input.setSelectionRange(this.#selectionStart, this.#selectionEnd);
    }
  }
  #beforeInput = (event: InputEvent): void => {
    if (this.effectiveDisabled || this.readOnly) event.preventDefault();
  };
  #input = (event: Event): void => {
    if (this.#composing) return;
    const input = event.currentTarget as HTMLInputElement;
    this.#commit(input.value, event);
    queueMicrotask(() => this.#readSelection(input));
  };
  #selection = (event: Event): void => this.#readSelection(event.currentTarget as HTMLInputElement);
  #focus = (event: FocusEvent): void => {
    this.#focused = true;
    this.#readSelection(event.currentTarget as HTMLInputElement);
  };
  #blur = (): void => {
    this.#focused = false;
    this.requestUpdate();
  };
  #compositionStart = (): void => {
    this.#composing = true;
  };
  #compositionEnd = (event: CompositionEvent): void => {
    this.#composing = false;
    const input = event.currentTarget as HTMLInputElement;
    this.#commit(input.value, event);
    this.#readSelection(input);
  };
  #readSelection(input: HTMLInputElement): void {
    this.#selectionStart = input.selectionStart ?? this.value.length;
    this.#selectionEnd = input.selectionEnd ?? this.#selectionStart;
    this.requestUpdate();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('value') ||
      changed.has('disabled') ||
      changed.has('required') ||
      changed.has('length')
    ) {
      const complete = this.value.length === this.length;
      this.setFormValue(this.effectiveDisabled ? null : this.value || null);
      this.setValidity(
        this.required && !complete ? { valueMissing: true } : {},
        this.required && !complete ? 'Complete the code.' : '',
      );
    }
  }
  protected resetFormValue(): void {
    this.value = this.#normalize(this.defaultValue);
    this.setFormValue(this.value || null);
  }
}

import type { TpField } from './field/index.js';
import { fieldSubmission } from './field/field.js';
import { fieldValues } from './field/field-state.js';
export { TpField } from './field/index.js';

export class TpForm extends TpElement {
  static tagName = 'tp-form';
  static override properties = {
    ...TpElement.properties,
    onFormSubmit: { attribute: false },
    errors: { attribute: false, noAccessor: true },
  };
  #errors: Record<string, string | readonly string[]> = {};
  get errors(): Record<string, string | readonly string[]> {
    return this.#errors;
  }
  set errors(value: Record<string, string | readonly string[]>) {
    this.#errors = value ?? {};
    for (const field of this.querySelectorAll<TpField>('tp-field'))
      if (field.closest('tp-form') === this && !field.fieldSet) field.requestUpdate();
  }
  onFormSubmit:
    | ((
        values: Record<string, unknown>,
        details: {
          sourceEvent: SubmitEvent;
          form: HTMLFormElement;
          data: FormData;
          submitter: HTMLElement | null;
          validationRun: ValidationRun | null;
        },
      ) => void)
    | undefined;
  readonly actions = { validate: (name?: string) => this.validate(name) };
  get values(): Record<string, unknown> {
    return fieldValues(
      [...this.querySelectorAll<TpField>('tp-field')]
        .filter((field) => field.closest('tp-form') === this && !field.fieldSet)
        .map((field) => ({ name: field.effectiveName, value: field.value })),
    );
  }
  get validationMode(): 'on-submit' | 'on-blur' | 'on-change' {
    const value = this.getAttribute('validation-mode');
    return value === 'on-blur' || value === 'on-change'
      ? value
      : value === 'on-submit'
        ? 'on-submit'
        : this.validationTiming;
  }
  set validationMode(value: 'on-submit' | 'on-blur' | 'on-change') {
    this.setAttribute('validation-mode', value);
    for (const field of this.querySelectorAll<TpField>('tp-field')) field.requestUpdate();
  }
  #form: HTMLFormElement | null = null;
  #observer: MutationObserver | null = null;
  #submitter: HTMLElement | null = null;
  #invalidFocusScheduled = false;
  #validationGeneration = 0;
  #validationRun: ValidationRun | null = null;
  #submissionValidation = false;
  #prevalidated = false;
  get validationTiming(): 'on-submit' | 'on-blur' | 'on-change' {
    const value = this.getAttribute('validation-timing');
    return value === 'on-blur' || value === 'on-change' ? value : 'on-submit';
  }
  set validationTiming(value: 'on-submit' | 'on-blur' | 'on-change') {
    this.setAttribute('validation-timing', value);
  }
  get nativeValidation(): 'enabled' | 'suppressed' {
    return this.getAttribute('native-validation') === 'suppressed' ? 'suppressed' : 'enabled';
  }
  set nativeValidation(value: 'enabled' | 'suppressed') {
    this.setAttribute('native-validation', value);
    if (this.#form) this.#form.noValidate = value === 'suppressed' || this.novalidate;
  }
  get submissionPolicy(): 'always-enabled' | 'disable-while-invalid' | 'disable-while-pending' {
    const value = this.getAttribute('submission-policy');
    return value === 'disable-while-invalid' || value === 'disable-while-pending'
      ? value
      : 'always-enabled';
  }
  set submissionPolicy(
    value: 'always-enabled' | 'disable-while-invalid' | 'disable-while-pending',
  ) {
    this.setAttribute('submission-policy', value);
    this.#updateActions();
  }
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
      const form = this.ownerDocument.createElement('form');
      form.setAttribute('part', 'form');
      form.noValidate = this.novalidate || this.nativeValidation === 'suppressed';
      for (const node of existing) form.append(node);
      this.append(form);
      this.#form = form;
      form.addEventListener('submit', this.#submit);
      form.addEventListener('reset', this.#reset);
      form.addEventListener('invalid', this.#invalid, true);
      form.addEventListener('input', this.#updateActions);
      form.addEventListener('change', this.#updateActions);
    }
    const form = this.#form;
    for (const node of [...this.childNodes]) if (node !== form) form.append(node);
    this.#observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node !== form && node.parentNode === this) form.append(node);
      this.#updateActions();
    });
    this.#observer.observe(this, { childList: true });
    queueMicrotask(this.#updateActions);
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#validationRun?.cancel();
    super.disconnectedCallback();
  }
  requestSubmit(submitter?: HTMLElement): void {
    if (!this.#form) return;
    if (!this.#acceptSubmission(new Event('submit', { cancelable: true }))) return;
    this.#prevalidated = true;
    queueMicrotask(() => {
      this.#prevalidated = false;
    });
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      this.#form.requestSubmit(submitter);
      return;
    }
    if (!submitter) {
      this.#form.requestSubmit();
      return;
    }
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    const name = submitter.getAttribute('name');
    if (name) proxy.name = name;
    proxy.value = submitter.getAttribute('value') ?? '';
    this.#submitter = submitter;
    this.#form.append(proxy);
    this.#form.requestSubmit(proxy);
    proxy.remove();
    this.#submitter = null;
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
  validate(name?: string): ValidationRun {
    this.#validationRun?.cancel();
    const run = new ValidationRun(++this.#validationGeneration);
    this.#validationRun = run;
    const fields = [...this.querySelectorAll<TpField>('tp-field')].filter(
      (field) =>
        field.closest('tp-form') === this &&
        !field.fieldSet &&
        (!name || field.effectiveName === name),
    );
    void Promise.all(
      fields.map(
        (field) =>
          (this.#submissionValidation ? field[fieldSubmission]() : field.validate()).completion,
      ),
    ).then((snapshots) => {
      if (run.signal.aborted) return;
      const fieldResults = snapshots.flatMap((snapshot) => snapshot.fieldResults);
      const status = fieldResults.some((result) => result.status === 'failed')
        ? 'failed'
        : fieldResults.some((result) => !result.valid)
          ? 'invalid'
          : 'valid';
      run.settle(status, fieldResults);
    });
    return run;
  }
  #submit = (event: SubmitEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const accepted = this.#prevalidated || this.#acceptSubmission(event);
    this.#prevalidated = false;
    if (!accepted) {
      event.preventDefault();
      return;
    }
    const data = event.submitter
      ? new FormData(form, event.submitter as HTMLButtonElement | HTMLInputElement)
      : new FormData(form);
    if (
      !this.emit(
        'tp-submit',
        {
          form,
          data,
          submitter: this.#submitter ?? event.submitter,
          validationRun: this.#validationRun,
          values: this.values,
          reason: 'submit',
          sourceEvent: event,
        },
        { cancelable: true },
      )
    )
      event.preventDefault();
    if (this.onFormSubmit && !event.defaultPrevented) {
      event.preventDefault();
      this.onFormSubmit(this.values, {
        sourceEvent: event,
        form,
        data,
        submitter: this.#submitter ?? event.submitter,
        validationRun: this.#validationRun,
      });
    }
  };
  #acceptSubmission(sourceEvent: Event): boolean {
    const form = this.#form;
    if (!form) return true;
    this.#submissionValidation = true;
    let validationRun: ValidationRun;
    try {
      validationRun = this.validate();
    } finally {
      this.#submissionValidation = false;
    }
    const fields = [...this.querySelectorAll<TpField>('tp-field')].filter(
      (field) => field.closest('tp-form') === this && !field.fieldSet,
    );
    const invalid = fields.find(
      (field) => !field.effectiveDisabled && field.validityState.validity.valid === false,
    );
    if (!invalid && form.checkValidity()) return true;
    if (!sourceEvent.defaultPrevented) invalid?.control?.focus();
    this.emit('tp-invalid', { form, validationRun, reason: 'submit', sourceEvent });
    return false;
  }
  #invalid = (event: Event): void => {
    const control = event.target;
    if (!(control instanceof HTMLElement) || control.matches(':disabled, [disabled], [hidden]'))
      return;
    if (!this.#invalidFocusScheduled) {
      this.#invalidFocusScheduled = true;
      control.focus();
      queueMicrotask(() => {
        this.#invalidFocusScheduled = false;
      });
    }
    this.emit('tp-invalid', { form: this.#form, control, sourceEvent: event });
    this.#updateActions();
  };
  #reset = (event: Event): void => {
    queueMicrotask(() => {
      this.#updateActions();
      this.emit('tp-reset', { form: event.currentTarget, sourceEvent: event });
    });
  };
  #updateActions = (): void => {
    if (!this.#form) return;
    const disable =
      this.submissionPolicy === 'disable-while-invalid' && this.#form.matches(':invalid');
    const actions = this.#form.querySelectorAll<HTMLElement>(
      'tp-button[type="submit"], button[type="submit"], input[type="submit"]',
    );
    for (const action of actions) {
      if (disable) {
        if (!action.hasAttribute('disabled')) action.dataset.tpFormPolicyDisabled = '';
        action.toggleAttribute('disabled', true);
      } else if ('tpFormPolicyDisabled' in action.dataset) {
        action.removeAttribute('disabled');
        delete action.dataset.tpFormPolicyDisabled;
      }
    }
  };
}

export class TpInputGroup extends TpElement {
  static tagName = 'tp-input-group';
  static override properties = {
    ...TpElement.properties,
    addonPosition: { type: String, attribute: 'addon-position', reflect: true },
    actionSize: { type: String, attribute: 'action-size', reflect: true },
    actionVariant: { type: String, attribute: 'action-variant', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      [part='input-group'] {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto auto;
        align-items: stretch;
      }

      .editor {
        grid-column: 2;
        min-inline-size: 0;
        display: flex;
      }

      .actions {
        grid-column: 3;
        display: flex;
        align-items: center;
      }

      .addon {
        display: flex;
        align-items: center;
      }

      .prefix {
        grid-column: 1;
        grid-row: 1;
      }

      .suffix {
        grid-column: 4;
        grid-row: 1;
      }

      :host([addon-position='inline-end']) .prefix {
        grid-column: 4;
      }

      :host([addon-position='inline-end']) .suffix {
        grid-column: 5;
      }

      :host([addon-position='block-start']) .prefix {
        grid-column: 1 / -1;
        grid-row: 1;
      }

      :host([addon-position='block-start']) .editor,
      :host([addon-position='block-start']) .actions,
      :host([addon-position='block-start']) .suffix {
        grid-row: 2;
      }

      :host([addon-position='block-end']) .prefix {
        grid-column: 1 / -1;
        grid-row: 2;
      }

      .addon[hidden] {
        display: none;
      }

      ::slotted(tp-input),
      ::slotted(tp-text-area) {
        flex: 1;
        min-inline-size: 0;
      }
    `,
  ];
  addonPosition: 'inline-start' | 'inline-end' | 'block-start' | 'block-end' = 'inline-start';
  actionSize: 'xs' | 'sm' | 'icon-xs' | 'icon-sm' = 'xs';
  actionVariant: 'ghost' | 'default' | 'secondary' | 'destructive' | 'outline' | 'link' = 'ghost';
  #control: HTMLElement | null = null;
  #controlCleanup: (() => void) | undefined;
  #inherited = new Map<HTMLElement, Map<string, { original: string | null; applied: string }>>();
  #syncAddon = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    if (slot.parentElement)
      slot.parentElement.hidden = !slot
        .assignedNodes()
        .some((node) => node.nodeType !== Node.TEXT_NODE || node.textContent?.trim());
  };
  protected override render() {
    return html`<span part="input-group" @pointerdown=${this.#focusFromAddon}>
      <span class="addon prefix" part="input-group-addon input-group-text" hidden
        ><slot name="prefix" @slotchange=${this.#syncAddon}></slot
      ></span>
      <span class="editor"><slot @slotchange=${this.#readControl}></slot></span>
      <span class="actions"><slot name="action" @slotchange=${this.#syncActions}></slot></span>
      <span class="addon suffix" part="input-group-addon input-group-text" hidden
        ><slot name="suffix" @slotchange=${this.#syncAddon}></slot
      ></span>
    </span>`;
  }
  #readControl = (event?: Event): void => {
    this.#controlCleanup?.();
    if (this.#control instanceof TpElement) setPartComposition(this.#control, this);
    const slot =
      (event?.currentTarget as HTMLSlotElement | undefined) ??
      this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    const candidates = assignedElements(slot).filter((element) =>
      element.matches('tp-input, tp-text-area, input, textarea, [contenteditable="true"]'),
    );
    this.#control = candidates.length === 1 ? candidates[0]! : null;
    this.toggleAttribute('data-invalid-composition', candidates.length !== 1);
    if (candidates.length !== 1)
      this.emit('tp-composition-diagnostic', {
        component: 'Input group',
        expected: 'exactly one editor',
        actual: candidates.length,
      });
    const control = this.#control;
    if (control instanceof TpElement)
      setPartComposition(control, this, {
        [control.localName === 'tp-input' ? 'input' : 'text-area']: {
          styleHook: { border: '0', 'border-radius': '0', outline: '0' },
        },
      });
    else if (control)
      this.#controlCleanup = this.presentationController.registerPart(
        'input-group-control',
        control,
      );
  };
  #syncActions = (): void => {
    const actions = [...this.querySelectorAll<HTMLElement>(':scope > [slot="action"]')];
    for (const [action, inherited] of this.#inherited)
      if (!actions.includes(action)) {
        for (const [key, value] of inherited)
          if (action.getAttribute(key) === value.applied) {
            if (value.original === null) action.removeAttribute(key);
            else action.setAttribute(key, value.original);
          }
        this.#inherited.delete(action);
      }
    for (const action of actions) {
      const inherited =
        this.#inherited.get(action) ??
        new Map<string, { original: string | null; applied: string }>();
      for (const [key, next] of [
        ['size', this.actionSize],
        ['variant', this.actionVariant],
      ]) {
        const previous = inherited.get(key!);
        const authored =
          action instanceof TpElement
            ? action.authoredAttributes.has(key!)
            : action.hasAttribute(key!);
        const property = (action as unknown as Record<string, unknown>)[key!];
        const nonDefaultProperty =
          action.localName === 'tp-button' &&
          typeof property === 'string' &&
          property !== 'default';
        if (!previous && (authored || nonDefaultProperty)) continue;
        if (previous && action.getAttribute(key!) !== previous.applied) {
          inherited.delete(key!);
          if (action instanceof TpElement) action.authoredAttributes.add(key!);
          continue;
        }
        inherited.set(key!, {
          original: previous ? previous.original : action.getAttribute(key!),
          applied: next!,
        });
        action.setAttribute(key!, next!);
      }
      this.#inherited.set(action, inherited);
    }
  };
  #focusFromAddon = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (!path.some((target) => target instanceof HTMLElement && target.classList.contains('addon')))
      return;
    if (
      path.some(
        (target) =>
          target instanceof HTMLElement &&
          target.matches(
            'button, a[href], input, textarea, select, [contenteditable], [role="button"], tp-button, tp-toggle',
          ),
      )
    )
      return;
    this.#control?.focus();
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('actionSize') || changed.has('actionVariant')) this.#syncActions();
  }
  override disconnectedCallback(): void {
    this.#controlCleanup?.();
    if (this.#control instanceof TpElement) setPartComposition(this.#control, this);
    for (const [action, inherited] of this.#inherited)
      for (const [key, value] of inherited)
        if (action.getAttribute(key) === value.applied) {
          if (value.original === null) action.removeAttribute(key);
          else action.setAttribute(key, value.original);
        }
    this.#inherited.clear();
    super.disconnectedCallback();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.#readControl();
      this.#syncActions();
    }
  }
}

const calendarValueConverter = {
  fromAttribute(value: string | null): CalendarValue {
    if (value === null || !value.trim()) return undefined;
    if (value.includes('/')) {
      const [from, to] = value.split('/', 2);
      return from ? { from, ...(to ? { to } : {}) } : undefined;
    }
    const dates = value.split(/[\s,]+/u).filter(Boolean);
    return dates.length > 1 ? dates : dates[0];
  },
  toAttribute(value: CalendarValue): string | null {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
    if (value) return `${value.from}${value.to ? `/${value.to}` : ''}`;
    return null;
  },
};

function cloneCalendarValue(value: CalendarValue): CalendarValue {
  if (Array.isArray(value)) return [...value];
  if (isCalendarRange(value)) return { ...value };
  return value;
}

function localCalendarDate(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function moduloCalendar(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

type CalendarDateMatcher = ReadonlySet<string> | ((date: string) => boolean) | undefined;

export class TpCalendar extends TpFormElement<CalendarValue> {
  static tagName = 'tp-calendar';
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: calendarValueConverter },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    min: { type: String },
    max: { type: String },
    defaultValue: { converter: calendarValueConverter, attribute: 'default-value' },
    visibleMonths: { type: Number, attribute: 'visible-months' },
    displayedMonth: { type: String, attribute: 'displayed-month' },
    defaultDisplayedMonth: { type: String, attribute: 'default-displayed-month' },
    navigationStart: { type: String, attribute: 'navigation-start' },
    navigationEnd: { type: String, attribute: 'navigation-end' },
    minimumSelectionCount: { type: Number, attribute: 'minimum-selection-count' },
    maximumSelectionCount: { type: Number, attribute: 'maximum-selection-count' },
    minimumNights: { type: Number, attribute: 'minimum-nights' },
    maximumNights: { type: Number, attribute: 'maximum-nights' },
    rangeExclusion: { type: String, attribute: 'range-exclusion', reflect: true },
    pagedNavigation: { type: Boolean, attribute: 'paged-navigation' },
    disabledNavigation: { type: String, attribute: 'disabled-navigation', reflect: true },
    showOutsideDays: { type: Boolean, attribute: 'show-outside-days' },
    locale: { type: String },
    weekStartsOn: { type: Number, attribute: 'week-starts-on' },
    today: { type: String },
    label: { type: String },
    unavailableDates: { attribute: false },
    disabledDates: { attribute: false },
    hiddenDates: { attribute: false },
    calendarAdapter: { attribute: false },
    onValueChange: { attribute: false },
    onDisplayedMonthChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      .root {
        display: grid;
        min-inline-size: 17rem;
      }

      .header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
      }

      .caption {
        font-weight: var(--tp-font-semibold);
        text-align: center;
      }

      .navigation {
        display: grid;
        place-items: center;
        min-width: var(--tp-control-height-sm);
        min-height: var(--tp-control-height-sm);
        padding: var(--tp-space-1);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        border-radius: var(--tp-radius-sm);
        color: var(--tp-foreground);
        background: var(--tp-background);
      }

      .months {
        display: grid;
        grid-template-columns: repeat(var(--tp-calendar-visible-months), minmax(15rem, 1fr));
      }

      .month {
        display: grid;
        gap: var(--tp-space-2);
      }

      .month-caption {
        font-weight: var(--tp-font-semibold);
        text-align: center;
      }

      .weekdays,
      .week {
        display: grid;
        grid-template-columns: repeat(7, minmax(2rem, 1fr));
      }

      .weekday {
        padding: var(--tp-space-1);
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-xs);
        text-align: center;
      }

      .day-cell {
        display: grid;
        place-items: stretch;
        min-width: 0;
        min-height: var(--tp-target-size-min);
      }

      .day {
        min-width: var(--tp-target-size-min);
        min-height: var(--tp-target-size-min);
      }

      .day:focus-visible {
        position: relative;
        z-index: 1;
      }

      .day:disabled {
        cursor: not-allowed;
        opacity: var(--tp-opacity-disabled);
      }

      @media (width <= 42rem) {
        .months {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];
  override get value(): CalendarValue {
    const value = super.value;
    return value === ('' as unknown as CalendarValue) ? undefined : value;
  }
  override set value(value: CalendarValue) {
    super.value = value;
  }
  selectionMode: CalendarSelectionMode = 'single';
  min = '';
  max = '';
  defaultValue: CalendarValue = undefined;
  visibleMonths = 1;
  displayedMonth: string | undefined = undefined;
  defaultDisplayedMonth = '';
  navigationStart = '';
  navigationEnd = '';
  minimumSelectionCount = 0;
  maximumSelectionCount = Number.POSITIVE_INFINITY;
  minimumNights = 0;
  maximumNights = Number.POSITIVE_INFINITY;
  rangeExclusion: 'reject' | 'restart' = 'reject';
  pagedNavigation = false;
  disabledNavigation: 'disable' | 'hide' = 'disable';
  showOutsideDays = true;
  locale = '';
  weekStartsOn = -1;
  today = localCalendarDate();
  label = 'Date';
  unavailableDates: CalendarDateMatcher;
  disabledDates: CalendarDateMatcher;
  hiddenDates: CalendarDateMatcher;
  calendarAdapter: CalendarAdapter = gregorianCalendarAdapter;
  onValueChange: ((event: TpValueChangeEvent<CalendarValue>) => void) | undefined;
  onDisplayedMonthChange:
    | ((event: CustomEvent<{ value: string; previousValue: string; sourceEvent: Event }>) => void)
    | undefined;

  #initialized = false;
  #selectionControlled = false;
  #monthControlled = false;
  #selection: CalendarValue = undefined;
  #defaultSelection: CalendarValue = undefined;
  #displayed = '';
  #focusedDate = '';
  #pendingFocusDate = '';
  #focusGeneration = 0;
  #lastDiagnostic = '';
  readonly #calendarId = createId('tp-calendar');

  get selection(): CalendarValue {
    return cloneCalendarValue(this.#selection);
  }

  get displayedMonthValue(): string {
    return this.#displayed;
  }

  setValue(value: CalendarValue, sourceEvent?: Event): boolean {
    return this.#requestSelection(
      value,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  protected override associationTarget(): HTMLElement | null {
    return this.#dayButtons().find((button) => button.tabIndex === 0) ?? null;
  }

  protected override render() {
    const months = this.#visibleMonthStarts();
    const previousAvailable = this.#canNavigate(-this.#navigationStep());
    const nextAvailable = this.#canNavigate(this.#navigationStep());
    const hidePrevious = !previousAvailable && this.disabledNavigation === 'hide';
    const hideNext = !nextAvailable && this.disabledNavigation === 'hide';
    return html`<div
      class="root"
      part="calendar"
      role="group"
      aria-label=${this.label}
      style=${`--tp-calendar-visible-months:${this.visibleMonths}`}
      ?data-disabled=${this.effectiveDisabled}
      ?data-readonly=${this.readOnly}
      ?data-required=${this.required}
      ?data-invalid=${this.invalid}
    >
      <header class="header" part="calendar-header">
        ${
          hidePrevious
            ? nothing
            : html`<button
                class="navigation"
                part="calendar-previous focusable"
                type="button"
                aria-label=${this.#navigationLabel('previous')}
                ?disabled=${this.effectiveDisabled || !previousAvailable}
                @click=${this.#previousMonth}
              >
                ‹
              </button>`
        }
        <span class="caption" aria-live="polite">${this.#intervalCaption(months)}</span>
        ${
          hideNext
            ? nothing
            : html`<button
                class="navigation"
                part="calendar-next focusable"
                type="button"
                aria-label=${this.#navigationLabel('next')}
                ?disabled=${this.effectiveDisabled || !nextAvailable}
                @click=${this.#nextMonth}
              >
                ›
              </button>`
        }
      </header>
      <div class="months" part="calendar-month-grid">
        ${months.map((month, index) => this.#renderMonth(month, index))}
      </div>
    </div>`;
  }

  #renderMonth(month: string, monthIndex: number): TemplateResult {
    const caption = this.calendarAdapter.format(month, this.locale || undefined, 'month');
    const captionId = `${this.#calendarId}-month-${monthIndex}`;
    const weekStart = this.#resolvedWeekStart();
    const weekdays = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);
    const dates = calendarGridDates(month, weekStart, this.calendarAdapter);
    const rovingDate = this.#rovingDate();
    return html`<section class="month" data-month=${month}>
      <div id=${captionId} class="month-caption">${caption}</div>
      <div class="grid" role="grid" aria-labelledby=${captionId}>
        <div class="weekdays" role="row">
          ${weekdays.map(
            (day) =>
              html`<span class="weekday" role="columnheader"
                >${this.calendarAdapter.weekdayLabel(day, this.locale || undefined)}</span
              >`,
          )}
        </div>
        <div class="weeks" role="rowgroup">
          ${Array.from({ length: 6 }, (_, week) => {
            const weekDates = dates.slice(week * 7, week * 7 + 7);
            return html`<div class="week" role="row">
              ${weekDates.map((date) => this.#renderDay(date, month, rovingDate))}
            </div>`;
          })}
        </div>
      </div>
    </section>`;
  }

  #renderDay(date: string, month: string, rovingDate: string): TemplateResult {
    const outside = !this.#sameMonth(date, month);
    const hidden = this.#matches(this.hiddenDates, date) || (outside && !this.showOutsideDays);
    if (hidden)
      return html`<span class="day-cell" role="gridcell" data-date=${date} data-hidden></span>`;

    const unavailable = this.#matches(this.unavailableDates, date);
    const disabledDate =
      this.#matches(this.disabledDates, date) || !this.#withinSelectionBounds(date);
    const disabled = this.effectiveDisabled || unavailable || disabledDate;
    const selected = this.#isSelected(date);
    const range = isCalendarRange(this.#selection) ? this.#selection : undefined;
    const rangeStart = range?.from === date;
    const rangeEnd = range?.to === date;
    const rangeMiddle = Boolean(
      range?.to &&
      this.calendarAdapter.compare(date, range.from) > 0 &&
      this.calendarAdapter.compare(date, range.to) < 0,
    );
    const focused = this.#focusedDate === date;
    const today = this.calendarAdapter.normalize(this.today) === date;
    return html`<span
      class="day-cell"
      role="gridcell"
      aria-selected=${String(selected)}
      data-date=${date}
      ?data-selected=${selected}
      ?data-range-start=${rangeStart}
      ?data-range-middle=${rangeMiddle}
      ?data-range-end=${rangeEnd}
      ?data-outside=${outside}
      ?data-unavailable=${unavailable}
      ?data-disabled=${disabledDate}
      ?data-today=${today}
      ?data-focused=${focused}
    >
      <button
        class="day"
        part="calendar-day focusable"
        type="button"
        data-date=${date}
        aria-label=${this.calendarAdapter.format(date, this.locale || undefined, 'accessible')}
        aria-pressed=${String(selected)}
        tabindex=${date === rovingDate && !outside ? '0' : '-1'}
        ?disabled=${disabled}
        ?data-selected=${selected}
        ?data-range-start=${rangeStart}
        ?data-range-middle=${rangeMiddle}
        ?data-range-end=${rangeEnd}
        ?data-outside=${outside}
        ?data-unavailable=${unavailable}
        ?data-disabled=${disabledDate}
        ?data-today=${today}
        ?data-focused=${focused}
        @click=${this.#dayClick}
        @keydown=${this.#dayKeyDown}
        @focus=${this.#dayFocus}
      >
        ${this.calendarAdapter.format(date, this.locale || undefined, 'day')}
      </button>
    </span>`;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.#initialized) {
      this.#initialize();
      return;
    }
    if (changed.has('calendarAdapter') || changed.has('selectionMode')) {
      this.#selection = normalizeCalendarValue(
        this.selectionMode,
        this.#selection,
        this.calendarAdapter,
      );
      this.#defaultSelection = normalizeCalendarValue(
        this.selectionMode,
        this.defaultValue,
        this.calendarAdapter,
      );
    }
    if (this.#selectionControlled && changed.has('value')) {
      if (this.value === undefined)
        this.#diagnose('Calendar cannot change from controlled to uncontrolled selection.');
      else
        this.#selection = normalizeCalendarValue(
          this.selectionMode,
          this.value,
          this.calendarAdapter,
        );
    } else if (!this.#selectionControlled && changed.has('value') && this.value !== undefined) {
      this.#diagnose('Calendar cannot change from uncontrolled to controlled selection.');
    }
    if (!this.#selectionControlled && changed.has('defaultValue')) {
      this.#defaultSelection = normalizeCalendarValue(
        this.selectionMode,
        this.defaultValue,
        this.calendarAdapter,
      );
    }
    if (this.#monthControlled && changed.has('displayedMonth')) {
      if (!this.displayedMonth)
        this.#diagnose('Calendar cannot change from controlled to uncontrolled displayed month.');
      else this.#displayed = this.calendarAdapter.startOfMonth(this.displayedMonth);
    } else if (!this.#monthControlled && changed.has('displayedMonth') && this.displayedMonth) {
      this.#diagnose('Calendar cannot change from uncontrolled to controlled displayed month.');
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncFormState();
    const error = this.#configurationError();
    if (error) this.#diagnose(error);
    if (this.#pendingFocusDate) {
      const date = this.#pendingFocusDate;
      this.#pendingFocusDate = '';
      const generation = ++this.#focusGeneration;
      queueMicrotask(() => {
        if (generation !== this.#focusGeneration || !this.isConnected) return;
        this.#dayButton(date)?.focus();
      });
    }
  }

  protected resetFormValue(): void {
    if (this.#selectionControlled) return;
    this.#requestSelection(this.#defaultSelection, 'form-reset', new Event('reset'));
  }

  override disconnectedCallback(): void {
    this.#focusGeneration += 1;
    this.#pendingFocusDate = '';
    super.disconnectedCallback();
  }

  #initialize(): void {
    this.#initialized = true;
    this.#selectionControlled = this.value !== undefined;
    this.#selection = normalizeCalendarValue(
      this.selectionMode,
      this.#selectionControlled ? this.value : this.defaultValue,
      this.calendarAdapter,
    );
    this.#defaultSelection = normalizeCalendarValue(
      this.selectionMode,
      this.defaultValue,
      this.calendarAdapter,
    );
    this.#monthControlled = Boolean(this.displayedMonth);
    const firstSelection = calendarValueDates(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    )[0];
    const initialMonth =
      this.displayedMonth ||
      this.defaultDisplayedMonth ||
      firstSelection ||
      this.calendarAdapter.normalize(this.today);
    this.#displayed = initialMonth
      ? this.calendarAdapter.startOfMonth(initialMonth)
      : this.calendarAdapter.startOfMonth(localCalendarDate());
  }

  #requestSelection(value: CalendarValue, reason: ChangeReason, sourceEvent: Event): boolean {
    const next = normalizeCalendarValue(this.selectionMode, value, this.calendarAdapter);
    const error = this.#selectionError(next);
    if (error) {
      this.#diagnose(error);
      return false;
    }
    const previous = this.#selection;
    if (sameCalendarValue(this.selectionMode, next, previous, this.calendarAdapter)) return false;
    const event = new TpValueChangeEvent(next, previous, reason, sourceEvent);
    this.onValueChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) {
      this.requestUpdate();
      return false;
    }
    if (!this.#selectionControlled) this.#selection = next;
    this.requestUpdate();
    return true;
  }

  #activateDate(date: string, reason: ChangeReason, sourceEvent: Event): void {
    if (this.effectiveDisabled || this.readOnly || this.#configurationError()) return;
    const proposal = calendarSelectionProposal({
      mode: this.selectionMode,
      current: this.#selection,
      date,
      adapter: this.calendarAdapter,
      required: this.required,
      minimumSelectionCount: this.minimumSelectionCount,
      maximumSelectionCount: this.maximumSelectionCount,
      minimumNights: this.minimumNights,
      maximumNights: this.maximumNights,
      rangeExclusion: this.rangeExclusion,
      isExcluded: (candidate) => !this.#isDateSelectable(candidate),
    });
    if (!proposal.accepted) return;
    this.#requestSelection(proposal.value, reason, sourceEvent);
  }

  #dayClick = (event: MouseEvent): void => {
    const date = (event.currentTarget as HTMLButtonElement).dataset.date;
    if (date) this.#activateDate(date, event.detail === 0 ? 'keyboard' : 'pointer', event);
  };

  #dayKeyDown = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || this.#configurationError()) return;
    const current = (event.currentTarget as HTMLButtonElement).dataset.date;
    if (!current) return;
    let target: string | null = null;
    let direction = 1;
    const horizontal = this.direction === 'rtl' ? -1 : 1;
    if (event.key === 'ArrowRight') {
      direction = horizontal;
      target = this.calendarAdapter.addDays(current, horizontal);
    } else if (event.key === 'ArrowLeft') {
      direction = -horizontal;
      target = this.calendarAdapter.addDays(current, -horizontal);
    } else if (event.key === 'ArrowDown') {
      direction = 1;
      target = this.calendarAdapter.addDays(current, 7);
    } else if (event.key === 'ArrowUp') {
      direction = -1;
      target = this.calendarAdapter.addDays(current, -7);
    } else if (event.key === 'Home') {
      direction = -1;
      const offset = moduloCalendar(
        this.calendarAdapter.dayOfWeek(current) - this.#resolvedWeekStart(),
        7,
      );
      target = this.calendarAdapter.addDays(current, -offset);
    } else if (event.key === 'End') {
      direction = 1;
      const offset = moduloCalendar(
        this.calendarAdapter.dayOfWeek(current) - this.#resolvedWeekStart(),
        7,
      );
      target = this.calendarAdapter.addDays(current, 6 - offset);
    } else if (event.key === 'PageUp') {
      direction = -1;
      target = event.shiftKey
        ? this.calendarAdapter.addYears(current, -1)
        : this.calendarAdapter.addMonths(current, -1);
    } else if (event.key === 'PageDown') {
      direction = 1;
      target = event.shiftKey
        ? this.calendarAdapter.addYears(current, 1)
        : this.calendarAdapter.addMonths(current, 1);
    }
    if (!target) return;
    event.preventDefault();
    const focusable = this.#nextFocusableDate(target, direction);
    if (focusable) this.#revealAndFocus(focusable, event);
  };

  #dayFocus = (event: FocusEvent): void => {
    this.#focusedDate = (event.currentTarget as HTMLButtonElement).dataset.date ?? '';
    this.requestUpdate();
  };

  #previousMonth = (event: MouseEvent): void => {
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(this.#displayed, -this.#navigationStep()),
      event,
    );
  };

  #nextMonth = (event: MouseEvent): void => {
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(this.#displayed, this.#navigationStep()),
      event,
    );
  };

  #requestDisplayedMonth(value: string, sourceEvent: Event): boolean {
    const next = this.calendarAdapter.startOfMonth(value);
    if (!this.#canDisplay(next) || this.calendarAdapter.compare(next, this.#displayed) === 0)
      return false;
    const detail = { value: next, previousValue: this.#displayed, sourceEvent };
    const event = new CustomEvent('tp-displayed-month-change', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail,
    });
    this.onDisplayedMonthChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) return false;
    if (!this.#monthControlled) this.#displayed = next;
    this.requestUpdate();
    return true;
  }

  #revealAndFocus(date: string, sourceEvent: Event): void {
    const targetMonth = this.calendarAdapter.startOfMonth(date);
    const visibleMonths = this.#visibleMonthStarts();
    const first = visibleMonths[0];
    const last = visibleMonths.at(-1);
    if (!first || !last) return;
    let display = this.#displayed;
    if (this.calendarAdapter.compare(targetMonth, first) < 0) display = targetMonth;
    else if (this.calendarAdapter.compare(targetMonth, last) > 0)
      display = this.calendarAdapter.addMonths(targetMonth, -(this.visibleMonths - 1));
    if (!this.#canDisplay(display)) return;
    if (this.calendarAdapter.compare(display, this.#displayed) !== 0)
      this.#requestDisplayedMonth(display, sourceEvent);
    this.#focusedDate = date;
    this.#pendingFocusDate = date;
    this.requestUpdate();
  }

  #nextFocusableDate(start: string, direction: number): string | null {
    let date = start;
    for (let attempt = 0; attempt < 3660; attempt += 1) {
      if (this.#isDateFocusable(date) && this.#canReveal(date)) return date;
      date = this.calendarAdapter.addDays(date, direction < 0 ? -1 : 1);
    }
    return null;
  }

  #canReveal(date: string): boolean {
    const month = this.calendarAdapter.startOfMonth(date);
    const last = this.calendarAdapter.addMonths(month, this.visibleMonths - 1);
    if (this.navigationStart) {
      const lower = this.calendarAdapter.startOfMonth(this.navigationStart);
      if (this.calendarAdapter.compare(last, lower) < 0) return false;
    }
    if (this.navigationEnd) {
      const upper = this.calendarAdapter.startOfMonth(this.navigationEnd);
      if (this.calendarAdapter.compare(month, upper) > 0) return false;
    }
    return true;
  }

  #canNavigate(amount: number): boolean {
    return this.#canDisplay(this.calendarAdapter.addMonths(this.#displayed, amount));
  }

  #canDisplay(start: string): boolean {
    const normalized = this.calendarAdapter.startOfMonth(start);
    const last = this.calendarAdapter.addMonths(normalized, this.visibleMonths - 1);
    if (this.navigationStart) {
      const lower = this.calendarAdapter.startOfMonth(this.navigationStart);
      if (this.calendarAdapter.compare(normalized, lower) < 0) return false;
    }
    if (this.navigationEnd) {
      const upper = this.calendarAdapter.startOfMonth(this.navigationEnd);
      if (this.calendarAdapter.compare(last, upper) > 0) return false;
    }
    return true;
  }

  #navigationStep(): number {
    return this.pagedNavigation ? this.visibleMonths : 1;
  }

  #visibleMonthStarts(): string[] {
    return Array.from({ length: Math.max(0, this.visibleMonths) }, (_, index) =>
      this.calendarAdapter.addMonths(this.#displayed, index),
    );
  }

  #rovingDate(): string {
    const visible = this.#visibleMonthStarts();
    if (!visible.length) return '';
    const first = visible[0]!;
    const afterLast = this.calendarAdapter.addMonths(visible.at(-1)!, 1);
    const inInterval = (date: string) =>
      this.calendarAdapter.compare(date, first) >= 0 &&
      this.calendarAdapter.compare(date, afterLast) < 0;
    if (
      this.#focusedDate &&
      inInterval(this.#focusedDate) &&
      this.#isDateFocusable(this.#focusedDate)
    )
      return this.#focusedDate;
    const selected = calendarValueDates(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    ).find((date) => inInterval(date) && this.#isDateFocusable(date));
    if (selected) return selected;
    const today = this.calendarAdapter.normalize(this.today);
    if (today && inInterval(today) && this.#isDateFocusable(today)) return today;
    for (const month of visible) {
      const dates = calendarGridDates(month, this.#resolvedWeekStart(), this.calendarAdapter);
      const candidate = dates.find(
        (date) => this.#sameMonth(date, month) && this.#isDateFocusable(date),
      );
      if (candidate) return candidate;
    }
    return '';
  }

  #isSelected(date: string): boolean {
    const selection = normalizeCalendarValue(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    );
    if (typeof selection === 'string') return selection === date;
    if (Array.isArray(selection)) return selection.includes(date);
    if (!selection) return false;
    return (
      this.calendarAdapter.compare(date, selection.from) >= 0 &&
      this.calendarAdapter.compare(date, selection.to ?? selection.from) <= 0
    );
  }

  #isDateFocusable(date: string): boolean {
    return this.#isDateSelectable(date) && !this.effectiveDisabled;
  }

  #isDateSelectable(date: string): boolean {
    return (
      this.#withinSelectionBounds(date) &&
      !this.#matches(this.unavailableDates, date) &&
      !this.#matches(this.disabledDates, date) &&
      !this.#matches(this.hiddenDates, date)
    );
  }

  #withinSelectionBounds(date: string): boolean {
    if (this.min && this.calendarAdapter.compare(date, this.min) < 0) return false;
    if (this.max && this.calendarAdapter.compare(date, this.max) > 0) return false;
    return true;
  }

  #matches(matcher: CalendarDateMatcher, date: string): boolean {
    return typeof matcher === 'function' ? matcher(date) : Boolean(matcher?.has(date));
  }

  #sameMonth(left: string, right: string): boolean {
    return (
      this.calendarAdapter.compare(
        this.calendarAdapter.startOfMonth(left),
        this.calendarAdapter.startOfMonth(right),
      ) === 0
    );
  }

  #resolvedWeekStart(): number {
    if (Number.isInteger(this.weekStartsOn) && this.weekStartsOn >= 0 && this.weekStartsOn <= 6)
      return this.weekStartsOn;
    try {
      const locale = new Intl.Locale(this.locale || navigator.language);
      const weekInfo =
        (
          locale as Intl.Locale & {
            weekInfo?: { firstDay: number };
            getWeekInfo?: () => { firstDay: number };
          }
        ).weekInfo ??
        (
          locale as Intl.Locale & {
            getWeekInfo?: () => { firstDay: number };
          }
        ).getWeekInfo?.();
      return weekInfo ? weekInfo.firstDay % 7 : 0;
    } catch {
      return 0;
    }
  }

  #intervalCaption(months: readonly string[]): string {
    return months
      .map((month) => this.calendarAdapter.format(month, this.locale || undefined, 'month'))
      .join(' – ');
  }

  #navigationLabel(direction: 'previous' | 'next'): string {
    const target = this.calendarAdapter.addMonths(
      this.#displayed,
      direction === 'previous' ? -this.#navigationStep() : this.#navigationStep(),
    );
    return `${direction === 'previous' ? 'Previous' : 'Next'} ${this.calendarAdapter.format(target, this.locale || undefined, 'month')}`;
  }

  #configurationError(): string | null {
    if (!Number.isInteger(this.visibleMonths) || this.visibleMonths <= 0)
      return 'Calendar visibleMonths must be a positive integer.';
    if (
      !Number.isInteger(this.minimumSelectionCount) ||
      this.minimumSelectionCount < 0 ||
      this.maximumSelectionCount < this.minimumSelectionCount
    )
      return 'Calendar selection-count limits are invalid.';
    if (
      !Number.isInteger(this.minimumNights) ||
      this.minimumNights < 0 ||
      this.maximumNights < this.minimumNights
    )
      return 'Calendar night limits are invalid.';
    if (this.min && !this.calendarAdapter.normalize(this.min))
      return 'Calendar minimum selection date is invalid.';
    if (this.max && !this.calendarAdapter.normalize(this.max))
      return 'Calendar maximum selection date is invalid.';
    if (this.min && this.max && this.calendarAdapter.compare(this.min, this.max) > 0)
      return 'Calendar minimum selection date must not follow maximum.';
    if (this.navigationStart && !this.calendarAdapter.normalize(this.navigationStart))
      return 'Calendar navigation start is invalid.';
    if (this.navigationEnd && !this.calendarAdapter.normalize(this.navigationEnd))
      return 'Calendar navigation end is invalid.';
    if (
      this.navigationStart &&
      this.navigationEnd &&
      this.calendarAdapter.compare(this.navigationStart, this.navigationEnd) > 0
    )
      return 'Calendar navigation start must not follow navigation end.';
    return this.#selectionError(this.#selection);
  }

  #selectionError(value: CalendarValue): string | null {
    const dates = calendarValueDates(this.selectionMode, value, this.calendarAdapter);
    if (dates.some((date) => !this.#isDateSelectable(date)))
      return 'Calendar selection contains an excluded date.';
    if (this.selectionMode === 'multiple') {
      if (dates.length < this.minimumSelectionCount || dates.length > this.maximumSelectionCount)
        return 'Calendar selection violates its count limits.';
    }
    if (this.selectionMode === 'range' && isCalendarRange(value) && value.to) {
      const nights = this.calendarAdapter.differenceInDays(value.to, value.from);
      if (nights < this.minimumNights || nights > this.maximumNights)
        return 'Calendar range violates its night limits.';
    }
    return null;
  }

  #syncFormState(): void {
    const error = this.#configurationError();
    const anchor = this.associationTarget() ?? undefined;
    const dates = calendarValueDates(this.selectionMode, this.#selection, this.calendarAdapter);
    if (error) this.setValidity({ customError: true }, error, anchor);
    else if (this.required && !dates.length)
      this.setValidity({ valueMissing: true }, 'Select a date.', anchor);
    else this.setValidity();

    if (this.effectiveDisabled || !this.name || !dates.length) {
      this.setFormValue(null);
      return;
    }
    if (dates.length === 1) {
      this.setFormValue(dates[0]!);
      return;
    }
    const data = new FormData();
    for (const date of dates) data.append(this.name, date);
    this.setFormValue(data);
  }

  #dayButtons(): HTMLButtonElement[] {
    return [...this.renderRoot.querySelectorAll<HTMLButtonElement>('button.day')];
  }

  #dayButton(date: string): HTMLButtonElement | null {
    return (
      this.#dayButtons().find((button) => button.dataset.date === date && !button.disabled) ?? null
    );
  }

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.emit('tp-diagnostic', {
        code: 'calendar-invalid-configuration',
        message,
        severity: 'error' as const,
      }),
    );
  }
}

export interface QuestionnaireItemChangeDetail {
  value: string;
  previousValue: string;
  reason: ChangeReason;
  sourceEvent: Event;
}

export interface QuestionnaireSubmitDetail {
  form: HTMLFormElement;
  data: FormData;
  answers: QuestionnaireAnswers;
  reason: 'submit';
  sourceEvent: SubmitEvent;
}

function cloneQuestionnaireAnswers(answers: Readonly<QuestionnaireAnswers>): QuestionnaireAnswers {
  return Object.fromEntries(
    Object.entries(answers).map(([name, answer]) => [
      name,
      Array.isArray(answer) ? [...answer] : answer,
    ]),
  );
}

function questionnaireInteractionReason(event: Event): ChangeReason {
  if (event instanceof MouseEvent && event.detail === 0) return 'keyboard';
  return eventReason(event);
}

export class TpQuestionnaire extends TpElement {
  static tagName = 'tp-questionnaire';
  static override properties = {
    ...TpElement.properties,
    questions: { attribute: false },
    flow: { type: String, reflect: true },
    choiceMode: { type: String, attribute: 'choice-mode', reflect: true },
    skippable: { type: Boolean },
    value: { attribute: false },
    defaultValue: { attribute: false },
    item: { type: String },
    defaultItem: { type: String, attribute: 'default-item' },
    shortcutMode: { type: String, attribute: 'shortcut-mode', reflect: true },
    nativeValidation: { type: String, attribute: 'native-validation', reflect: true },
    label: { type: String },
    onValueChange: { attribute: false },
    onItemChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: block;
      }

      form {
        display: grid;
        min-width: 0;
      }

      fieldset {
        display: grid;
        min-width: 0;
        margin: 0;
      }

      [part='questionnaire-choices'] {
        display: grid;
      }

      [part='questionnaire-choice'] {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        align-items: start;
      }

      .choice-copy {
        display: grid;
        gap: var(--tp-space-1);
      }

      .choice-description {
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-sm);
      }

      .shortcut {
        min-width: var(--tp-icon-size-lg);
        padding: 0 var(--tp-space-1);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        border-radius: var(--tp-radius-sm);
        color: var(--tp-muted-foreground);
        font-family: var(--tp-font-mono);
        font-size: var(--tp-text-xs);
        text-align: center;
      }

      [part='questionnaire-input-region'] input {
        width: 100%;
      }

      [part='questionnaire-actions'] {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
      }

      [part='questionnaire-actions'] button {
        min-height: var(--tp-control-height-md);
        padding: var(--tp-space-2) var(--tp-space-3);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        border-radius: var(--tp-radius-sm);
        color: var(--tp-foreground);
        background: var(--tp-background);
        font: inherit;
      }

      [part='questionnaire-actions'] button.primary {
        border-color: var(--tp-primary);
        color: var(--tp-primary-foreground);
        background: var(--tp-primary);
      }
    `,
  ];

  questions: readonly QuestionnaireQuestion[] = [];
  flow: QuestionnaireFlow = 'linear';
  choiceMode: QuestionnaireChoiceMode = 'single';
  skippable = false;
  value: QuestionnaireAnswers | undefined;
  defaultValue: QuestionnaireAnswers = {};
  item: string | undefined;
  defaultItem = '';
  shortcutMode: QuestionnaireShortcutMode = 'none';
  nativeValidation: 'enabled' | 'suppressed' = 'enabled';
  label = 'Questionnaire';
  onValueChange: ((event: TpValueChangeEvent<QuestionnaireAnswers>) => void) | undefined;
  onItemChange: ((event: CustomEvent<QuestionnaireItemChangeDetail>) => void) | undefined;

  #initialized = false;
  #answersControlled = false;
  #itemControlled = false;
  #answers: QuestionnaireAnswers = {};
  #defaultAnswers: QuestionnaireAnswers = {};
  #active = '';
  #defaultActive = '';
  #order: string[] = [];
  #skipped = new Set<string>();
  #attempted = new Set<string>();
  #reachedIndex = 0;
  #pendingFocus = '';
  #pendingReportValidity = false;
  #focusGeneration = 0;
  #lastDiagnostic = '';
  readonly #questionnaireId = createId('tp-questionnaire');

  get answers(): QuestionnaireAnswers {
    return cloneQuestionnaireAnswers(this.#answers);
  }

  get currentItem(): string {
    return this.#active;
  }

  get current(): number {
    const index = this.#logicalQuestions().findIndex((question) => question.name === this.#active);
    return index < 0 ? 0 : index + 1;
  }

  get total(): number {
    return this.#logicalQuestions().length;
  }

  get first(): boolean {
    return this.current > 0 && this.current === 1;
  }

  get last(): boolean {
    return this.current > 0 && this.current === this.total;
  }

  get status(): QuestionnaireStatus | undefined {
    const question = this.#activeQuestion();
    return question ? this.#questionStatus(question) : undefined;
  }

  setAnswer(name: string, answer: QuestionnaireAnswer, sourceEvent?: Event): boolean {
    const question = this.questions.find((candidate) => candidate.name === name);
    if (!question || question.disabled) return false;
    return this.#requestAnswer(
      question,
      answer,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  setItem(name: string, sourceEvent?: Event): boolean {
    const questions = this.#logicalQuestions();
    const targetIndex = questions.findIndex((question) => question.name === name);
    if (targetIndex < 0) return false;
    if (this.flow === 'linear' && targetIndex > this.#reachedIndex + 1) return false;
    return this.#requestItem(
      name,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  requestSubmit(): void {
    this.#form()?.requestSubmit();
  }

  reset(): void {
    this.#form()?.reset();
  }

  protected override render() {
    const questions = this.#logicalQuestions();
    const active = questions.find((question) => question.name === this.#active);
    const index = active ? questions.indexOf(active) : -1;
    const current = index + 1;
    const total = questions.length;
    const completed = questions.filter((question) => {
      const status = this.#questionStatus(question);
      return status === 'answered' || status === 'skipped';
    }).length;
    const error = active && this.#attempted.has(active.name) ? this.#leaveError(active) : null;
    const titleId = `${this.#questionnaireId}-title`;
    const descriptionId = `${this.#questionnaireId}-description`;
    const errorId = `${this.#questionnaireId}-error`;
    return html`<form
      part="questionnaire"
      aria-label=${this.label}
      novalidate
      data-native-validation=${this.nativeValidation}
      @submit=${this.#submit}
      @reset=${this.#reset}
      @keydown=${this.#keyDown}
    >
      <div
        part="questionnaire-progress"
        role="status"
        aria-live="polite"
        data-current=${String(current)}
        data-total=${String(total)}
        ?data-first=${current === 1 && total > 0}
        ?data-last=${current === total && total > 0}
      >
        ${total ? `Question ${current} of ${total} · ${completed} completed` : '0 of 0'}
      </div>
      ${this.#renderHiddenAnswers(active?.name ?? '')}
      ${
        active
          ? html`<fieldset
              part="questionnaire-question"
              data-name=${active.name}
              data-status=${this.#questionStatus(active)}
              tabindex="-1"
              aria-describedby=${
                [active.description && descriptionId, error && errorId].filter(Boolean).join(' ') ||
                nothing
              }
              ?disabled=${this.disabled}
            >
              <legend id=${titleId} part="questionnaire-title">${active.title}</legend>
              ${
                active.description
                  ? html`<div id=${descriptionId} part="questionnaire-description">
                      ${active.description}
                    </div>`
                  : nothing
              }
              ${
                questionnaireQuestionKind(active, this.choiceMode) === 'text'
                  ? this.#renderTextQuestion(active, descriptionId, errorId, Boolean(error))
                  : this.#renderChoiceQuestion(active, descriptionId, errorId, Boolean(error))
              }
              ${
                error
                  ? html`<div id=${errorId} part="questionnaire-error" role="alert">${error}</div>`
                  : nothing
              }
            </fieldset>`
          : nothing
      }
      ${this.#renderActions(active, index, total)}
    </form>`;
  }

  #renderTextQuestion(
    question: QuestionnaireQuestion,
    descriptionId: string,
    errorId: string,
    invalid: boolean,
  ): TemplateResult {
    const answer = this.#answers[question.name];
    const value = typeof answer === 'string' ? answer : '';
    return html`<div part="questionnaire-input-region">
      <input
        class="control free-answer"
        data-answer-control
        .type=${question.inputType ?? 'text'}
        .name=${question.name}
        .value=${value}
        .placeholder=${question.placeholder ?? ''}
        pattern=${question.pattern || nothing}
        minlength=${question.minLength === undefined ? nothing : String(question.minLength)}
        maxlength=${question.maxLength === undefined ? nothing : String(question.maxLength)}
        ?required=${question.required}
        ?disabled=${this.disabled}
        ?readonly=${this.readOnly}
        aria-describedby=${
          [question.description && descriptionId, invalid && errorId].filter(Boolean).join(' ') ||
          nothing
        }
        aria-invalid=${invalid ? 'true' : nothing}
        @input=${this.#textInput}
      />
    </div>`;
  }

  #renderChoiceQuestion(
    question: QuestionnaireQuestion,
    descriptionId: string,
    errorId: string,
    invalid: boolean,
  ): TemplateResult {
    const kind = questionnaireQuestionKind(question, this.choiceMode);
    const answer = this.#answers[question.name];
    const selected = new Set(Array.isArray(answer) ? answer : answer ? [answer] : []);
    const shortcuts = this.#choiceShortcuts(question);
    return html`<div part="questionnaire-choices">
      ${(question.choices ?? []).map((choice, index) => {
        const shortcut = shortcuts[index] ?? '';
        return html`<label
          part="questionnaire-choice"
          ?data-disabled=${choice.disabled}
          ?data-selected=${selected.has(choice.value)}
        >
          <input
            data-answer-control
            data-choice-value=${choice.value}
            type=${kind === 'multiple' ? 'checkbox' : 'radio'}
            .name=${question.name}
            .value=${choice.value}
            .checked=${selected.has(choice.value)}
            ?required=${kind === 'single' && question.required}
            ?disabled=${this.disabled || choice.disabled}
            aria-readonly=${this.readOnly ? 'true' : nothing}
            aria-keyshortcuts=${shortcut || nothing}
            aria-describedby=${
              [question.description && descriptionId, invalid && errorId]
                .filter(Boolean)
                .join(' ') || nothing
            }
            aria-invalid=${invalid ? 'true' : nothing}
            @change=${this.#choiceChange}
          />
          <span class="choice-copy">
            <span>${choice.label}</span>
            ${
              choice.description
                ? html`<span class="choice-description">${choice.description}</span>`
                : nothing
            }
          </span>
          ${shortcut ? html`<span class="shortcut" aria-hidden="true">${shortcut}</span>` : nothing}
        </label>`;
      })}
    </div>`;
  }

  #renderHiddenAnswers(activeName: string): TemplateResult {
    const logicalNames = new Set(this.#logicalQuestions().map((question) => question.name));
    return html`<div class="visually-hidden" aria-hidden="true">
      ${Object.entries(this.#answers).flatMap(([name, answer]) => {
        if (name === activeName || this.#skipped.has(name) || !logicalNames.has(name)) return [];
        const values = Array.isArray(answer) ? answer : [answer];
        return values.map(
          (value) => html`<input type="hidden" name=${name} .value=${value} tabindex="-1" />`,
        );
      })}
    </div>`;
  }

  #renderActions(
    active: QuestionnaireQuestion | undefined,
    index: number,
    total: number,
  ): TemplateResult {
    const status = active ? this.#questionStatus(active) : 'unanswered';
    const canSkip = Boolean(active && !active.required && (active.skippable ?? this.skippable));
    return html`<div part="questionnaire-actions">
      <button
        type="button"
        data-action="previous"
        data-status=${status}
        aria-keyshortcuts="ArrowLeft"
        ?hidden=${index <= 0}
        ?disabled=${this.disabled || index <= 0}
        @click=${this.#previous}
      >
        Previous
      </button>
      <button
        type="button"
        data-action="skip"
        data-status=${status}
        ?hidden=${!canSkip}
        ?disabled=${this.disabled || !canSkip}
        @click=${this.#skip}
      >
        Skip
      </button>
      <button
        class="primary"
        type="button"
        data-action="next"
        data-status=${status}
        aria-keyshortcuts="ArrowRight"
        ?hidden=${index < 0 || index >= total - 1}
        ?disabled=${this.disabled || index < 0 || index >= total - 1}
        @click=${this.#next}
      >
        Next
      </button>
      <button
        class="primary"
        type="submit"
        data-action="submit"
        data-status=${status}
        aria-keyshortcuts="Enter"
        ?hidden=${index < 0 || index !== total - 1}
        ?disabled=${this.disabled || index < 0 || index !== total - 1}
      >
        Submit
      </button>
    </div>`;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.#initialized) {
      this.#initialize();
      return;
    }

    if (changed.has('questions') || changed.has('choiceMode')) {
      const previousOrder = this.#order;
      const nextQuestions = this.#logicalQuestions();
      const nextOrder = nextQuestions.map((question) => question.name);
      this.#defaultAnswers = questionnaireDefaultAnswers(
        nextQuestions,
        this.defaultValue,
        this.choiceMode,
      );
      this.#answers = normalizeQuestionnaireAnswers(
        nextQuestions,
        this.#answersControlled ? this.value : this.#answers,
        this.choiceMode,
      );
      const fallback = questionnaireRemovalFallback(previousOrder, nextOrder, this.#active);
      if (fallback !== this.#active) {
        this.#active = fallback;
        this.#pendingFocus = fallback;
      }
      this.#order = nextOrder;
      this.#reachedIndex = Math.min(
        Math.max(this.#reachedIndex, Math.max(0, nextOrder.indexOf(this.#active))),
        Math.max(0, nextOrder.length - 1),
      );
      for (const name of [...this.#skipped])
        if (!nextOrder.includes(name)) this.#skipped.delete(name);
      for (const name of [...this.#attempted])
        if (!nextOrder.includes(name)) this.#attempted.delete(name);
    }

    if (this.#answersControlled && changed.has('value')) {
      if (this.value === undefined)
        this.#diagnose('Questionnaire cannot change from controlled to uncontrolled answers.');
      else
        this.#answers = normalizeQuestionnaireAnswers(
          this.#logicalQuestions(),
          this.value,
          this.choiceMode,
        );
    } else if (!this.#answersControlled && changed.has('value') && this.value !== undefined) {
      this.#diagnose('Questionnaire cannot change from uncontrolled to controlled answers.');
    }

    if (!this.#answersControlled && changed.has('defaultValue')) {
      this.#defaultAnswers = questionnaireDefaultAnswers(
        this.#logicalQuestions(),
        this.defaultValue,
        this.choiceMode,
      );
    }

    if (this.#itemControlled && changed.has('item')) {
      if (this.item === undefined)
        this.#diagnose('Questionnaire cannot change from controlled to uncontrolled item state.');
      else if (this.#order.includes(this.item)) this.#active = this.item;
      else this.#diagnose(`Questionnaire item "${this.item}" is not enabled.`);
    } else if (!this.#itemControlled && changed.has('item') && this.item !== undefined) {
      this.#diagnose('Questionnaire cannot change from uncontrolled to controlled item state.');
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncNativeAnswerState();
    const error = this.#configurationError();
    if (error) this.#diagnose(error);
    if (this.#pendingFocus) {
      const item = this.#pendingFocus;
      const reportValidity = this.#pendingReportValidity;
      this.#pendingFocus = '';
      this.#pendingReportValidity = false;
      const generation = ++this.#focusGeneration;
      queueMicrotask(() => {
        if (generation !== this.#focusGeneration || !this.isConnected) return;
        this.#focusQuestion(item, reportValidity);
      });
    }
  }

  override disconnectedCallback(): void {
    this.#focusGeneration += 1;
    this.#pendingFocus = '';
    super.disconnectedCallback();
  }

  #initialize(): void {
    this.#initialized = true;
    const questions = this.#logicalQuestions();
    this.#order = questions.map((question) => question.name);
    this.#defaultAnswers = questionnaireDefaultAnswers(
      questions,
      this.defaultValue,
      this.choiceMode,
    );
    this.#answersControlled = this.value !== undefined;
    this.#answers = normalizeQuestionnaireAnswers(
      questions,
      this.#answersControlled ? this.value : this.#defaultAnswers,
      this.choiceMode,
    );
    this.#defaultActive = this.#order.includes(this.defaultItem)
      ? this.defaultItem
      : (this.#order[0] ?? '');
    this.#itemControlled = this.item !== undefined;
    this.#active =
      this.#itemControlled && this.item && this.#order.includes(this.item)
        ? this.item
        : this.#defaultActive;
    this.#reachedIndex = Math.max(0, this.#order.indexOf(this.#active));
  }

  #requestAnswer(
    question: QuestionnaireQuestion,
    answer: QuestionnaireAnswer,
    reason: ChangeReason,
    sourceEvent: Event,
  ): boolean {
    if (this.disabled || this.readOnly || question.disabled) return false;
    const normalized = normalizeQuestionnaireAnswer(question, answer, this.choiceMode);
    if (normalized === undefined) return false;
    const next = cloneQuestionnaireAnswers(this.#answers);
    next[question.name] = normalized;
    if (sameQuestionnaireAnswers(next, this.#answers)) {
      this.requestUpdate();
      return false;
    }
    const event = new TpValueChangeEvent(next, this.answers, reason, sourceEvent);
    this.onValueChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) {
      this.requestUpdate();
      return false;
    }
    if (!this.#answersControlled) this.#answers = next;
    this.#skipped.delete(question.name);
    this.requestUpdate();
    return true;
  }

  #requestItem(name: string, reason: ChangeReason, sourceEvent: Event): boolean {
    if (!this.#order.includes(name) || name === this.#active) return false;
    const event = this.#itemEvent(name, reason, sourceEvent);
    this.onItemChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) return false;
    if (!this.#itemControlled) this.#active = name;
    this.#reachedIndex = Math.max(this.#reachedIndex, this.#order.indexOf(name));
    this.#pendingFocus = name;
    this.requestUpdate();
    return true;
  }

  #itemEvent(
    value: string,
    reason: ChangeReason,
    sourceEvent: Event,
  ): CustomEvent<QuestionnaireItemChangeDetail> {
    return new CustomEvent('tp-item-change', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { value, previousValue: this.#active, reason, sourceEvent },
    });
  }

  #textInput = (event: InputEvent): void => {
    const question = this.#activeQuestion();
    if (!question) return;
    const input = event.currentTarget as HTMLInputElement;
    if (this.#requestAnswer(question, input.value, 'input', event)) return;
    const committed = this.#answers[question.name];
    input.value = typeof committed === 'string' ? committed : '';
  };

  #choiceChange = (event: Event): void => {
    const question = this.#activeQuestion();
    if (!question) return;
    const input = event.currentTarget as HTMLInputElement;
    if (this.readOnly) {
      this.requestUpdate();
      return;
    }
    const kind = questionnaireQuestionKind(question, this.choiceMode);
    let answer: QuestionnaireAnswer = input.value;
    if (kind === 'multiple') {
      const current = this.#answers[question.name];
      const values = new Set(Array.isArray(current) ? current : []);
      if (input.checked) values.add(input.value);
      else values.delete(input.value);
      answer = [...values];
    }
    this.#requestAnswer(question, answer, 'selection', event);
  };

  #previous = (event: MouseEvent): void => {
    const index = this.#order.indexOf(this.#active);
    const previous = this.#order[index - 1];
    if (previous) this.#requestItem(previous, questionnaireInteractionReason(event), event);
  };

  #next = (event: MouseEvent): void => {
    this.#advance(questionnaireInteractionReason(event), event);
  };

  #advance(reason: ChangeReason, sourceEvent: Event): boolean {
    const question = this.#activeQuestion();
    if (!question) return false;
    const error = this.#leaveError(question);
    this.#attempted.add(question.name);
    if (error) {
      this.#pendingFocus = question.name;
      this.#pendingReportValidity = true;
      this.requestUpdate();
      return false;
    }
    const index = this.#order.indexOf(question.name);
    const next = this.#order[index + 1];
    if (!next) {
      this.#form()?.requestSubmit();
      return true;
    }
    return this.#requestItem(next, reason, sourceEvent);
  }

  #skip = (event: MouseEvent): void => {
    const question = this.#activeQuestion();
    if (!question || question.required || !(question.skippable ?? this.skippable)) return;
    const nextAnswers = cloneQuestionnaireAnswers(this.#answers);
    const hadAnswer = question.name in nextAnswers;
    delete nextAnswers[question.name];
    const index = this.#order.indexOf(question.name);
    const nextItem = this.#order[index + 1] ?? '';
    const reason = questionnaireInteractionReason(event);
    const answerEvent = hadAnswer
      ? new TpValueChangeEvent(nextAnswers, this.answers, reason, event)
      : null;
    const itemEvent = nextItem ? this.#itemEvent(nextItem, reason, event) : null;

    if (answerEvent) this.onValueChange?.(answerEvent);
    if (itemEvent) this.onItemChange?.(itemEvent);
    const answerAccepted =
      !answerEvent || (!answerEvent.defaultPrevented && this.dispatchEvent(answerEvent));
    const itemAccepted =
      !itemEvent || (!itemEvent.defaultPrevented && this.dispatchEvent(itemEvent));
    if (!answerAccepted || !itemAccepted) {
      this.requestUpdate();
      return;
    }

    if (answerEvent && !this.#answersControlled) this.#answers = nextAnswers;
    this.#skipped.add(question.name);
    this.#attempted.delete(question.name);
    if (nextItem) {
      if (!this.#itemControlled) this.#active = nextItem;
      this.#reachedIndex = Math.max(this.#reachedIndex, index + 1);
      this.#pendingFocus = nextItem;
      this.requestUpdate();
    } else {
      this.requestUpdate();
      queueMicrotask(() => this.#form()?.requestSubmit());
    }
  };

  #submit = (event: SubmitEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    const questions = this.#logicalQuestions();
    const invalid = questions.find((question) => this.#validationError(question));
    if (invalid) {
      event.preventDefault();
      this.#attempted.add(invalid.name);
      const reason: ChangeReason = 'submit';
      if (invalid.name !== this.#active) this.#requestItem(invalid.name, reason, event);
      this.#pendingFocus = invalid.name;
      this.#pendingReportValidity = true;
      this.requestUpdate();
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const accepted = this.emit<QuestionnaireSubmitDetail>(
      'tp-submit',
      {
        form,
        data: new FormData(form),
        answers: this.answers,
        reason: 'submit',
        sourceEvent: event,
      },
      { cancelable: true },
    );
    if (!accepted) event.preventDefault();
  };

  #reset = (event: Event): void => {
    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      const nextAnswers = cloneQuestionnaireAnswers(this.#defaultAnswers);
      const valueEvent = new TpValueChangeEvent(nextAnswers, this.answers, 'form-reset', event);
      const itemEvent =
        this.#defaultActive && this.#defaultActive !== this.#active
          ? this.#itemEvent(this.#defaultActive, 'form-reset', event)
          : null;
      this.onValueChange?.(valueEvent);
      if (itemEvent) this.onItemChange?.(itemEvent);
      const valueAccepted = !valueEvent.defaultPrevented && this.dispatchEvent(valueEvent);
      const itemAccepted =
        !itemEvent || (!itemEvent.defaultPrevented && this.dispatchEvent(itemEvent));
      if (!valueAccepted || !itemAccepted) {
        this.requestUpdate();
        return;
      }
      if (!this.#answersControlled) this.#answers = nextAnswers;
      if (!this.#itemControlled) this.#active = this.#defaultActive;
      this.#skipped.clear();
      this.#attempted.clear();
      this.#reachedIndex = Math.max(0, this.#order.indexOf(this.#defaultActive));
      this.#pendingFocus = this.#defaultActive;
      this.requestUpdate();
    });
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.isComposing || event.repeat || this.disabled) return;
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLElement)) return;
    const textEntry = target.matches(
      'input:not([type]), input[type="text"], input[type="email"], input[type="search"], input[type="url"], input[type="tel"], input[type="password"], textarea, [contenteditable="true"]',
    );
    const radio = target instanceof HTMLInputElement && target.type === 'radio';

    if (!textEntry && !radio && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const controls = this.#answerControls();
      const index = controls.indexOf(target as HTMLInputElement);
      if (index >= 0 && controls.length) {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        controls[moduloCalendar(index + direction, controls.length)]?.focus();
      }
      return;
    }

    if (!textEntry && !radio && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.#previousFromKeyboard(event);
      return;
    }
    if (!textEntry && !radio && event.key === 'ArrowRight') {
      event.preventDefault();
      const question = this.#activeQuestion();
      if (question && questionnaireAnswered(this.#answers[question.name]))
        this.#advance('keyboard', event);
      return;
    }
    if (
      event.key === 'Enter' &&
      (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || this.#activeAnswered())
    ) {
      event.preventDefault();
      this.#advance('keyboard', event);
      return;
    }
    if (textEntry || event.altKey || event.ctrlKey || event.metaKey) return;
    const question = this.#activeQuestion();
    if (!question) return;
    const shortcuts = this.#choiceShortcuts(question);
    const shortcutIndex = shortcuts.findIndex(
      (shortcut) => shortcut.toLocaleLowerCase() === event.key.toLocaleLowerCase(),
    );
    const control = this.#answerControls()[shortcutIndex];
    if (shortcutIndex >= 0 && control) {
      event.preventDefault();
      control.focus();
      control.click();
    }
  };

  #previousFromKeyboard(event: KeyboardEvent): void {
    const index = this.#order.indexOf(this.#active);
    const previous = this.#order[index - 1];
    if (previous) this.#requestItem(previous, 'keyboard', event);
  }

  #activeAnswered(): boolean {
    const question = this.#activeQuestion();
    return Boolean(question && questionnaireAnswered(this.#answers[question.name]));
  }

  #activeQuestion(): QuestionnaireQuestion | undefined {
    return this.#logicalQuestions().find((question) => question.name === this.#active);
  }

  #logicalQuestions(): QuestionnaireQuestion[] {
    const names = new Set<string>();
    return this.questions.filter((question) => {
      if (question.disabled || !question.name || names.has(question.name)) return false;
      names.add(question.name);
      return true;
    });
  }

  #questionStatus(question: QuestionnaireQuestion): QuestionnaireStatus {
    return questionnaireStatus(this.#answers[question.name], this.#skipped.has(question.name));
  }

  #leaveError(question: QuestionnaireQuestion): string | null {
    const status = this.#questionStatus(question);
    if (status === 'skipped') return null;
    if (status === 'unanswered')
      return question.required ? 'Answer this question.' : 'Answer or skip this question.';
    return this.#validationError(question);
  }

  #validationError(question: QuestionnaireQuestion): string | null {
    const answer = this.#answers[question.name];
    if (!questionnaireAnswered(answer)) return question.required ? 'Answer this question.' : null;
    const customError = question.validate?.(answer);
    if (customError) return customError;
    if (questionnaireQuestionKind(question, this.choiceMode) !== 'text') return null;
    const value = typeof answer === 'string' ? answer : '';
    if (question.minLength !== undefined && value.length < question.minLength)
      return `Use at least ${question.minLength} characters.`;
    if (question.maxLength !== undefined && value.length > question.maxLength)
      return `Use no more than ${question.maxLength} characters.`;
    if (question.pattern) {
      try {
        if (!new RegExp(`^(?:${question.pattern})$`, 'u').test(value))
          return 'Match the requested format.';
      } catch {
        return 'The question pattern is invalid.';
      }
    }
    const input = document.createElement('input');
    input.type = question.inputType ?? 'text';
    input.value = value;
    if (!input.checkValidity()) return input.validationMessage || 'Enter a valid answer.';
    return null;
  }

  #choiceShortcuts(question: QuestionnaireQuestion): string[] {
    if (this.shortcutMode === 'none') return [];
    const used = new Set<string>();
    return (question.choices ?? []).map((choice, index) => {
      if (choice.disabled) return '';
      const fallback =
        this.shortcutMode === 'letters'
          ? index < 26
            ? String.fromCharCode(65 + index)
            : ''
          : index < 9
            ? String(index + 1)
            : '';
      const shortcut = (choice.shortcut ?? fallback).trim();
      const key = shortcut.toLocaleLowerCase();
      if (!shortcut || used.has(key)) return '';
      used.add(key);
      return shortcut;
    });
  }

  #answerControls(): HTMLInputElement[] {
    return [
      ...this.renderRoot.querySelectorAll<HTMLInputElement>('[data-answer-control]:not(:disabled)'),
    ];
  }

  #syncNativeAnswerState(): void {
    const question = this.#activeQuestion();
    if (!question) return;
    const answer = this.#answers[question.name];
    const kind = questionnaireQuestionKind(question, this.choiceMode);
    if (kind === 'text') {
      const input = this.renderRoot.querySelector<HTMLInputElement>('input.free-answer');
      if (input) input.value = typeof answer === 'string' ? answer : '';
      return;
    }
    const selected = new Set(Array.isArray(answer) ? answer : answer ? [answer] : []);
    for (const input of this.#answerControls()) input.checked = selected.has(input.value);
  }

  #focusQuestion(name: string, reportValidity: boolean): void {
    if (name !== this.#active) return;
    const controls = this.#answerControls();
    const filled = controls.find((control) =>
      control.type === 'checkbox' || control.type === 'radio'
        ? control.checked
        : Boolean(control.value.trim()),
    );
    const target = filled ?? controls[0] ?? this.renderRoot.querySelector<HTMLElement>('fieldset');
    target?.focus();
    if (
      reportValidity &&
      this.nativeValidation === 'enabled' &&
      target instanceof HTMLInputElement &&
      !target.checkValidity()
    )
      target.reportValidity();
  }

  #form(): HTMLFormElement | null {
    return this.renderRoot.querySelector('form');
  }

  #configurationError(): string | null {
    const names = new Set<string>();
    for (const question of this.questions) {
      if (!question.name) return 'Questionnaire questions require non-empty names.';
      if (names.has(question.name))
        return `Questionnaire question names must be unique: "${question.name}".`;
      names.add(question.name);
      const kind = questionnaireQuestionKind(question, this.choiceMode);
      if (kind !== 'text' && !question.choices?.length)
        return `Questionnaire choice question "${question.name}" requires choices.`;
      const values = new Set<string>();
      for (const choice of question.choices ?? []) {
        if (!choice.value) return `Questionnaire choices require non-empty values.`;
        if (values.has(choice.value))
          return `Questionnaire choice values must be unique in "${question.name}".`;
        values.add(choice.value);
      }
    }
    return null;
  }

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.emit('tp-diagnostic', {
        code: 'questionnaire-invalid-configuration',
        message,
        severity: 'error' as const,
      }),
    );
  }
}
