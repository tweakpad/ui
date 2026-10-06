import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement, TpFormElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueCommitEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { ComponentPartContract } from '../../foundation/part.js';
import {
  bindPart,
  componentHandlingPrevented,
  mergePartProperties,
} from '../../foundation/part.js';
import {
  moveSliderThumb,
  normalizeSliderBufferedRanges,
  normalizeSliderSegments,
  normalizeSliderValues,
  sameSliderValues,
  sliderBufferEnd,
  sliderConfigurationError,
  sliderPointerRatio,
  sliderRangeIndeterminate,
  sliderRatio,
  sliderRawValueFromRatio,
  sliderSegmentStates,
  sliderValueFromRatio,
} from '../../foundation/slider.js';
import { setPartComposition } from '../../presentation/controller.js';
import { createId } from '../../foundation/id.js';
import { CleanupScope, LocaleService, resolveLocale } from '../../foundation/services.js';
import { composedParent } from '../../foundation/focus.js';
import { CollectionRegistry } from '../../foundation/collection.js';
import type { TpSliderThumb } from './slider-thumb.js';
import { sliderStyles } from './styles.js';
import { sliderValueConverter } from './types.js';
import type {
  SliderBufferedRange,
  SliderPointerChangeDetail,
  SliderSegment,
  SliderValue,
  SliderThumbAlignment,
  SliderThumbCollisionBehavior,
  SliderThumbMetadata,
  SliderThumbState,
  SliderThumbOwner,
  SliderValueChangeCallback,
  SliderValueCommitCallback,
} from './types.js';

const valuesOf = (value: SliderValue | undefined): number[] =>
  value === undefined ? [] : Array.isArray(value) ? [...value] : [value];
const equal = (left: SliderValue | undefined, right: SliderValue | undefined): boolean =>
  Array.isArray(left) === Array.isArray(right) && sameSliderValues(valuesOf(left), valuesOf(right));
interface Proposal {
  values: number[];
  identities: string[];
  index: number;
  previous: SliderValue | undefined;
  reason: ChangeReason;
  source?: Event;
  immediate: boolean;
  eventSeen?: boolean;
  interaction?: Drag;
}
interface Drag {
  pointerId: number;
  identity: string;
  capture: HTMLElement;
  startX: number;
  startY: number;
  offset: number;
  previous: SliderValue | undefined;
  source: Event;
  changed: boolean;
}

/** A single commit/form owner shared by generated and explicitly authored Thumbs. */
export class TpSlider extends TpFormElement<SliderValue | undefined> implements SliderThumbOwner {
  static tagName = 'tp-slider';
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: sliderValueConverter, noAccessor: true },
    defaultValue: { converter: sliderValueConverter, attribute: 'default-value' },
    minimum: { type: Number },
    maximum: { type: Number },
    min: { type: Number, noAccessor: true },
    max: { type: Number, noAccessor: true },
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    minStepsBetweenValues: { type: Number, attribute: 'min-steps-between-values' },
    thumbAlignment: { type: String, attribute: 'thumb-alignment' },
    thumbCollisionBehavior: {
      type: String,
      attribute: 'thumb-collision-behavior',
      noAccessor: true,
    },
    thumbCrossing: { type: String, attribute: 'thumb-crossing' },
    label: { type: String },
    locale: { type: String },
    format: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
    getAccessibleLabel: { attribute: false },
    getAccessibleValueText: { attribute: false },
    buffered: { attribute: false },
    segments: { attribute: false },
    indeterminateText: { type: String, attribute: 'indeterminate-text' },
    formAssociatedValue: {
      type: Boolean,
      attribute: 'form-associated-value',
      converter: { fromAttribute: (value: string | null) => value !== 'false' },
    },
  };
  static override styles = [TpElement.styles, sliderStyles];
  defaultValue: SliderValue | undefined;
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  minimum = 0;
  maximum = 100;
  get min(): number {
    return this.minimum;
  }
  set min(value: number) {
    this.minimum = value;
  }
  get max(): number {
    return this.maximum;
  }
  set max(value: number) {
    this.maximum = value;
  }
  step = 1;
  largeStep = 10;
  minStepsBetweenValues = 0;
  thumbAlignment: SliderThumbAlignment = 'center';
  #collisionBehavior: SliderThumbCollisionBehavior = 'push';
  #canonicalCollisionAuthored = false;
  get thumbCollisionBehavior(): SliderThumbCollisionBehavior {
    return this.#collisionBehavior;
  }
  set thumbCollisionBehavior(value: SliderThumbCollisionBehavior) {
    const previous = this.#collisionBehavior;
    this.#collisionBehavior = value;
    this.#canonicalCollisionAuthored = true;
    this.requestUpdate('thumbCollisionBehavior', previous);
  }
  thumbCrossing: 'prevent' | 'swap' | undefined;
  label = '';
  locale = '';
  format: Intl.NumberFormatOptions | undefined;
  onValueChange: SliderValueChangeCallback | undefined;
  onValueCommitted: SliderValueCommitCallback | undefined;
  getAccessibleLabel: ((index: number) => string) | undefined;
  getAccessibleValueText: ((formatted: string, value: number, index: number) => string) | undefined;
  /** Non-semantic `[start, end]` ranges in value units, such as buffered media. */
  buffered: readonly SliderBufferedRange[] = [];
  /** Non-semantic segments of the domain, such as media chapters. */
  segments: readonly SliderSegment[] = [];
  /** Accessible value text while the domain is indeterminate. */
  indeterminateText = '';
  /**
   * `false` opts the Slider out of form participation: it submits and restores no
   * value, reports no validity, ignores form reset and emits no `tp-field-value`.
   */
  formAssociatedValue = true;
  #pointerRatio: number | null = null;
  #lastPointerRatio = 0;
  #pendingPointer: { ratio: number | null } | undefined;
  #pointerFrame: { window: Window; id: number } | undefined;
  #provided: SliderValue | undefined;
  #collection = new CollectionRegistry();
  #collectionEntries = new Map<TpSliderThumb, () => void>();
  get #thumbs(): TpSliderThumb[] {
    return this.#collection.items.map((item) => item.element as TpSliderThumb);
  }
  #identities: string[] = [];
  #automaticIds: string[] = [];
  #explicit = false;
  #configurationError: string | null = null;
  #membershipError = false;
  #diagnostics = new Set<string>();
  #proposals: Proposal[] = [];
  #activeProposal: Proposal | undefined;
  #drag: Drag | null = null;
  #activeIdentity: string | null = null;
  #lastUsedIdentity: string | null = null;
  #dragging = false;
  #control: HTMLElement | null = null;
  #observer: MutationObserver | undefined;
  #environmentScope: CleanupScope | undefined;
  #environmentSignature = '';
  #resize: ResizeObserver | undefined;
  #measurements = new Map<string, number>();
  #activated = false;
  #touched = false;
  #initialValues: number[] | undefined;
  #scheduled = false;
  #registered = new Map<TpSliderThumb, { node: HTMLElement; cleanup: () => void }>();
  #memberSnapshots = new WeakMap<
    TpSliderThumb,
    { state: string; rootContracts: object; ownContracts: object }
  >();
  #memberComposition = new WeakMap<TpSliderThumb, object>();
  #association: { label?: string; description?: string; error?: string } = {};
  #fieldContext: Parameters<TpFormElement['setFieldContext']>[0] = {};
  readonly #labelId = createId('tp-slider-label');
  #controlReference = (node: HTMLElement | null): void => {
    if (node === this.#control) return;
    if (this.#drag) this.#cancelDrag();
    this.#control = node;
  };
  #state = new ControllableState<SliderValue | undefined>({
    host: this,
    initialValue: undefined,
    readControlledValue: () =>
      this.#provided === undefined ? undefined : this.#normalize(this.#provided),
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : this.#normalize(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: equal,
    onChange: (event) => {
      this.#activeProposal = this.#proposals.find(
        (candidate) =>
          !candidate.eventSeen && sameSliderValues(candidate.values, valuesOf(event.detail.value)),
      );
      if (this.#activeProposal) this.#activeProposal.eventSeen = true;
      this.onValueChange?.(event);
    },
    onCommit: (value, previous, reason) => this.#accepted(value, previous, reason),
    diagnostic: (message) => this.#diagnose('state', message),
  });
  override get value(): SliderValue | undefined {
    return this.#state.value;
  }
  override set value(value: SliderValue | undefined) {
    const previous = this.value;
    this.#provided = Array.isArray(value) ? [...value] : value;
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  get values(): readonly number[] {
    return valuesOf(this.value);
  }
  get thumbMetadata(): readonly SliderThumbMetadata[] {
    return this.values
      .map((_value, index) => this.#metadataAt(index))
      .filter((metadata): metadata is SliderThumbMetadata => !!metadata);
  }
  get activeThumbIndex(): number {
    return this.#activeIdentity === null ? -1 : this.#identities.indexOf(this.#activeIdentity);
  }
  get dragging(): boolean {
    return this.#dragging;
  }
  /** The domain is empty or non-finite: a declared, disabled, non-error state. */
  get indeterminate(): boolean {
    return sliderRangeIndeterminate(this.minimum, this.maximum);
  }
  /** Hovered 0–1 domain ratio while pointing over the track without dragging. */
  get pointerRatio(): number | null {
    return this.#pointerRatio;
  }
  /** Unsnapped hovered value while pointing over the track without dragging. */
  get pointerValue(): number | null {
    return this.#pointerRatio === null
      ? null
      : sliderRawValueFromRatio(this.#pointerRatio, this.minimum, this.maximum);
  }
  /** The pointer is over the track and no drag is in progress. */
  get pointing(): boolean {
    return this.#pointerRatio !== null;
  }
  get #focused(): boolean {
    return this.#thumbs.some((thumb) => thumb.inputElement?.matches(':focus'));
  }
  get controlled(): boolean {
    return this.#state.controlled;
  }
  override get inputElement(): HTMLInputElement | null {
    return (this.#orderedThumbs()[0]?.inputElement as HTMLInputElement | null) ?? null;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector('[part~="slider"]');
  }
  protected override focusTarget(): HTMLElement | null {
    const focused = this.#thumbs.find((thumb) => thumb.inputElement?.matches(':focus'));
    return (
      (focused ?? this.#orderedThumbs().find((thumb) => !this.thumbState(thumb).disabled))
        ?.inputElement ?? null
    );
  }
  override setFieldContext(context: Parameters<TpFormElement['setFieldContext']>[0]): void {
    this.#fieldContext = { ...context };
    super.setFieldContext(context);
    this.#syncThumbs();
  }
  override setFieldAssociation(association: {
    label?: string;
    description?: string;
    error?: string;
  }): void {
    this.#association = { ...this.#association, ...association };
    super.setFieldAssociation(association);
    this.#syncThumbs();
  }
  #normalize(value: SliderValue): SliderValue {
    const values = normalizeSliderValues(
      valuesOf(value),
      this.minimum,
      this.maximum,
      this.step,
      this.minStepsBetweenValues,
    );
    return Array.isArray(value) ? values : (values[0] ?? value);
  }
  #shape(values: number[]): SliderValue {
    return Array.isArray(this.value ?? this.defaultValue ?? this.#provided) ? values : values[0]!;
  }
  #collision(): SliderThumbCollisionBehavior {
    if (this.thumbCrossing !== undefined) {
      const authoredCanonical = this.#canonicalCollisionAuthored;
      if (!authoredCanonical) return this.thumbCrossing === 'swap' ? 'swap' : 'none';
      this.#diagnose(
        'collision-alias',
        'Use thumbCollisionBehavior or the legacy thumbCrossing alias; canonical policy takes precedence.',
      );
    }
    return this.thumbCollisionBehavior;
  }
  #accepted(
    value: SliderValue | undefined,
    previous: SliderValue | undefined,
    reason: ChangeReason,
  ): void {
    const values = valuesOf(value);
    const proposal =
      this.#activeProposal ??
      [...this.#proposals]
        .reverse()
        .find((candidate) => sameSliderValues(candidate.values, values));
    this.#activeProposal = undefined;
    if (proposal) {
      if (proposal.identities.length === values.length) this.#identities = [...proposal.identities];
      if (
        (!proposal.interaction || proposal.interaction === this.#drag) &&
        (proposal.index >= 0 || !this.#drag)
      ) {
        this.#activeIdentity = proposal.identities[proposal.index] ?? null;
        if (this.#activeIdentity) this.#lastUsedIdentity = this.#activeIdentity;
      }
      // An accepted publication supersedes older interactions. Preserve requests
      // queued reentrantly after this proposal with their own metadata.
      this.#proposals = this.#proposals.slice(this.#proposals.indexOf(proposal) + 1);
      if (proposal.interaction && proposal.interaction === this.#drag) this.#drag!.changed = true;
      else if (proposal.immediate)
        this.#emitCommit(
          value,
          proposal.previous,
          proposal.reason,
          proposal.source,
          proposal.index,
        );
    } else this.#proposals = [];
    if (this.formAssociatedValue)
      this.emit('tp-field-value', { value, previousValue: previous, reason });
    this.requestUpdate('value', previous);
    this.#syncThumbs();
    this.#syncForm();
  }
  #emitCommit(
    value: SliderValue | undefined,
    previous: SliderValue | undefined,
    reason: ChangeReason,
    source: Event | undefined,
    index: number,
  ): void {
    if (equal(value, previous)) return;
    const event = new TpValueCommitEvent(value, previous, reason, source, {
      metadata: { activeThumbIndex: index },
    });
    this.onValueCommitted?.(event);
    this.dispatchEvent(event);
  }
  setValue(value: SliderValue, source?: Event): boolean;
  setValue(value: SliderValue, reason?: ChangeReason, source?: Event): boolean;
  setValue(
    value: SliderValue,
    reasonOrSource: ChangeReason | Event = 'programmatic',
    source?: Event,
  ): boolean {
    const reason = typeof reasonOrSource === 'string' ? reasonOrSource : 'programmatic';
    const initiating = typeof reasonOrSource === 'string' ? source : reasonOrSource;
    const next = this.#normalize(value);
    const proposal: Proposal = {
      values: valuesOf(next),
      identities: [...this.#identities],
      index: -1,
      previous: this.value,
      reason,
      immediate: true,
      ...(initiating ? { source: initiating } : {}),
    };
    this.#proposals.push(proposal);
    const accepted = this.#state.set(next, reason, initiating, {
      metadata: { activeThumbIndex: -1 },
    });
    if (this.#activeProposal === proposal) this.#activeProposal = undefined;
    if ((!accepted && proposal.eventSeen) || !this.controlled)
      this.#proposals = this.#proposals.filter((candidate) => candidate !== proposal);
    this.#syncThumbs();
    return accepted;
  }
  #metadataAt(index: number): SliderThumbMetadata | null {
    const thumb = this.#orderedThumbs()[index];
    if (!thumb) return null;
    const state = this.thumbState(thumb);
    return {
      index,
      inputId: thumb.inputId,
      value: this.values[index],
      percentage: state.percentage,
      disabled: state.disabled,
    };
  }
  #orderedThumbs(): TpSliderThumb[] {
    const members = this.#thumbs;
    return this.#identities
      .map((identity) => members.find((thumb) => thumb.inputId === identity))
      .filter((thumb): thumb is TpSliderThumb => !!thumb);
  }
  thumbState(element: HTMLElement): SliderThumbState {
    const thumb = element as TpSliderThumb;
    const index = this.#identities.indexOf(thumb.inputId);
    const value = this.values[index] ?? this.minimum;
    const formatted = this.#format(value);
    const labelResolver = thumb.getAccessibleLabel ?? this.getAccessibleLabel;
    const valueTextResolver = thumb.getAccessibleValueText ?? this.getAccessibleValueText;
    const indeterminate = this.indeterminate;
    const label =
      labelResolver?.(index) ||
      this.#association.label ||
      this.label ||
      this.getAttribute('aria-label') ||
      '';
    return {
      index,
      value,
      percentage: sliderRatio(value, this.minimum, this.maximum) * 100,
      disabled:
        this.effectiveDisabled ||
        thumb.effectiveDisabled ||
        indeterminate ||
        !!this.#configurationError ||
        this.#membershipError ||
        index < 0 ||
        index >= this.values.length,
      readOnly: this.readOnly || thumb.readOnly,
      required: this.required || thumb.required,
      invalid: this.effectiveInvalid,
      dragging: this.#dragging,
      active: this.#activeIdentity === thumb.inputId,
      orientation: this.orientation,
      minimum: this.minimum,
      maximum: this.maximum,
      min: this.minimum,
      max: this.maximum,
      step: this.step,
      indeterminate,
      focused: this.#focused,
      touched: this.#touched,
      dirty: !sameSliderValues(this.values, this.#initialValues ?? this.values),
      label: this.values.length > 1 && !labelResolver ? `${label || 'Value'} ${index + 1}` : label,
      valueText:
        indeterminate && this.indeterminateText
          ? this.indeterminateText
          : (thumb.valueText ?? valueTextResolver?.(formatted, value, index) ?? formatted),
    };
  }
  thumbContract(element: HTMLElement): ComponentPartContract {
    const thumb = element as TpSliderThumb;
    const root = this.partContracts['slider-thumb'] ?? {};
    const own = thumb.partContracts['slider-thumb'] ?? {};
    return {
      ...root,
      ...own,
      hostProperties: mergePartProperties(root.hostProperties ?? {}, own.hostProperties ?? {}),
    };
  }
  thumbPosition(element: HTMLElement): Record<string, string> {
    const thumb = element as TpSliderThumb;
    const ratio = Math.max(0, Math.min(1, this.thumbState(thumb).percentage / 100));
    const inset = this.#inset(thumb);
    const offset = `${inset * (1 - 2 * ratio)}px`;
    const stacking =
      this.#activeIdentity === thumb.inputId
        ? '2'
        : this.#lastUsedIdentity === thumb.inputId
          ? '1'
          : '0';
    return this.orientation === 'vertical'
      ? {
          left: '50%',
          top: `calc(${(1 - ratio) * 100}% - ${offset})`,
          right: 'auto',
          bottom: 'auto',
          'z-index': stacking,
        }
      : {
          left: `calc(${(this.direction === 'rtl' ? 1 - ratio : ratio) * 100}% + ${this.direction === 'rtl' ? -inset * (1 - 2 * ratio) : inset * (1 - 2 * ratio)}px)`,
          top: '50%',
          right: 'auto',
          bottom: 'auto',
          'z-index': stacking,
        };
  }
  #inset(thumb: TpSliderThumb): number {
    return this.thumbAlignment === 'edge' ||
      (this.thumbAlignment === 'delayed-edge' && this.#activated)
      ? (this.#measurements.get(thumb.inputId) ?? 0) / 2
      : 0;
  }
  registerThumb(element: HTMLElement, node: HTMLElement | null): void {
    const thumb = element as TpSliderThumb;
    const previous = this.#registered.get(thumb);
    if (previous?.node === node) return;
    if (previous) {
      this.#resize?.unobserve(previous.node);
      previous.cleanup();
      this.#registered.delete(thumb);
    }
    if (node) {
      this.#registered.set(thumb, {
        node,
        cleanup: this.presentationController.registerPart('slider-thumb', node),
      });
      this.#resize?.observe(node);
      this.#measureThumb(thumb, node);
    } else this.#measurements.delete(thumb.inputId);
  }
  #measureThumb(thumb: TpSliderThumb, node: HTMLElement): void {
    const rect = node.getBoundingClientRect();
    const size =
      this.orientation === 'horizontal'
        ? node.offsetWidth || rect.width
        : node.offsetHeight || rect.height;
    if (this.#measurements.get(thumb.inputId) !== size) {
      this.#measurements.set(thumb.inputId, size);
      thumb.requestUpdate();
      this.requestUpdate();
    }
  }
  thumbFocus(element: HTMLElement, focused: boolean): void {
    if (focused) {
      this.#activeIdentity = (element as TpSliderThumb).inputId;
      this.#lastUsedIdentity = this.#activeIdentity;
      this.#activated = true;
    } else
      queueMicrotask(() => {
        if (
          this.isConnected &&
          !this.#drag &&
          !this.#thumbs.some((thumb) => thumb.inputElement?.matches(':focus'))
        ) {
          this.#activeIdentity = null;
          this.#touched = true;
          this.#syncThumbs();
          this.requestUpdate();
        }
      });
    this.#syncThumbs();
    this.requestUpdate();
  }
  requestThumbValue(
    element: HTMLElement,
    value: number,
    reason: 'keyboard' | 'input',
    source: Event,
  ): void {
    const thumb = element as TpSliderThumb;
    this.#move(thumb.inputId, value, reason, source, true);
  }
  #move(
    identity: string,
    value: number,
    reason: ChangeReason,
    source: Event,
    immediate: boolean,
  ): void {
    const index = this.#identities.indexOf(identity);
    const thumb = this.#thumbs.find((member) => member.inputId === identity);
    if (
      !thumb ||
      this.thumbState(thumb).disabled ||
      this.thumbState(thumb).readOnly ||
      componentHandlingPrevented(source)
    )
      return;
    const moved = moveSliderThumb({
      values: this.values,
      identities: this.#identities,
      index,
      proposedValue: value,
      minimum: this.minimum,
      maximum: this.maximum,
      step: this.step,
      minStepsBetweenValues: this.minStepsBetweenValues,
      collisionBehavior: this.#collision(),
      disabled: this.#orderedThumbs().map(
        (member) => this.thumbState(member).disabled || member.readOnly,
      ),
    });
    if (sameSliderValues(moved.values, this.values)) return;
    const proposal: Proposal = {
      values: moved.values,
      identities: moved.identities,
      index: moved.activeIndex,
      previous: this.value,
      reason,
      source,
      immediate,
      ...(!immediate && this.#drag ? { interaction: this.#drag } : {}),
    };
    this.#proposals.push(proposal);
    const accepted = this.#state.set(this.#shape(moved.values), reason, source, {
      metadata: { activeThumbIndex: moved.activeIndex },
    });
    if (this.#activeProposal === proposal) this.#activeProposal = undefined;
    if ((!accepted && proposal.eventSeen) || !this.#state.controlled)
      this.#proposals = this.#proposals.filter((candidate) => candidate !== proposal);
    this.#syncThumbs();
  }
  thumbKey(element: HTMLElement, event: KeyboardEvent): void {
    if (componentHandlingPrevented(event)) return;
    const thumb = element as TpSliderThumb;
    const state = this.thumbState(thumb);
    const large = event.shiftKey || event.metaKey || event.ctrlKey ? this.largeStep : this.step;
    let value: number;
    switch (event.key) {
      case 'ArrowRight':
        value = state.value + (this.direction === 'rtl' ? -large : large);
        break;
      case 'ArrowLeft':
        value = state.value + (this.direction === 'rtl' ? large : -large);
        break;
      case 'ArrowUp':
        value = state.value + large;
        break;
      case 'ArrowDown':
        value = state.value - large;
        break;
      case 'PageUp':
        value = state.value + this.largeStep;
        break;
      case 'PageDown':
        value = state.value - this.largeStep;
        break;
      case 'Home':
        value = this.minimum;
        break;
      case 'End':
        value = this.maximum;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.requestThumbValue(thumb, value, 'keyboard', event);
  }
  #pointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      this.#drag ||
      componentHandlingPrevented(event) ||
      !this.#control ||
      this.readOnly
    )
      return;
    const path = event.composedPath();
    if (!this.#ownsControlPath(path)) return;
    const pressed = this.#thumbs.find(
      (thumb) =>
        path.includes(thumb) || (!!thumb.visualElement && path.includes(thumb.visualElement)),
    );
    const eligible = this.#orderedThumbs().filter(
      (thumb) => !this.thumbState(thumb).disabled && !this.thumbState(thumb).readOnly,
    );
    // The topmost maximum Thumb must not trap a coincident range stack.
    // Select its first eligible logical member, matching the Control owner.
    const pressedTarget =
      pressed && eligible.includes(pressed) && this.thumbState(pressed).value === this.maximum
        ? (eligible.find((member) => this.thumbState(member).value === this.maximum) ?? pressed)
        : pressed;
    const coordinate = this.orientation === 'horizontal' ? event.clientX : event.clientY;
    const center = (thumb: TpSliderThumb): number => {
      const rect = thumb.visualElement?.getBoundingClientRect();
      return rect
        ? this.orientation === 'horizontal'
          ? rect.left + rect.width / 2
          : rect.top + rect.height / 2
        : coordinate;
    };
    const thumb =
      pressedTarget && eligible.includes(pressedTarget)
        ? pressedTarget
        : pressedTarget
          ? undefined
          : eligible.reduce<TpSliderThumb | undefined>(
              (closest, current) =>
                !closest ||
                Math.abs(center(current) - coordinate) < Math.abs(center(closest) - coordinate) ||
                (Math.abs(center(current) - coordinate) ===
                  Math.abs(center(closest) - coordinate) &&
                  !(
                    this.thumbState(current).value === this.maximum &&
                    this.thumbState(closest).value === this.maximum
                  ))
                  ? current
                  : closest,
              undefined,
            );
    if (!thumb) return;
    this.#setPointer(null, true);
    this.#activated = true;
    this.#activeIdentity = thumb.inputId;
    this.#lastUsedIdentity = thumb.inputId;
    const offset = pressed ? coordinate - center(thumb) : 0;
    this.#drag = {
      pointerId: event.pointerId,
      identity: thumb.inputId,
      capture: this.#control,
      startX: event.clientX,
      startY: event.clientY,
      offset,
      previous: this.value,
      source: event,
      changed: false,
    };
    try {
      this.#control.setPointerCapture(event.pointerId);
    } catch {
      /* Custom hosts can disappear before capture. */
    }
    event.preventDefault();
    thumb.focus();
    if (!pressed)
      this.#move(thumb.inputId, this.#pointerValue(event, thumb, 0), 'track-press', event, false);
    this.#syncThumbs();
    this.requestUpdate();
  };
  #ownsControlPath(path: readonly EventTarget[]): boolean {
    return (
      !!this.#control &&
      path.includes(this.#control) &&
      path.find(
        (node) =>
          node instanceof this.ownerDocument.defaultView!.Element && node.localName === 'tp-slider',
      ) === this
    );
  }
  /** Axis ratio under a pointer; `inset` follows the Thumb's measured edge alignment. */
  #ratioAt(event: PointerEvent, thumb: TpSliderThumb | undefined, offset: number): number | null {
    const control = this.#control;
    const rect = control?.getBoundingClientRect();
    if (!control || !rect) return null;
    const horizontal = this.orientation === 'horizontal';
    const cssLength = horizontal ? control.clientWidth : control.clientHeight;
    const inset =
      (thumb ? this.#inset(thumb) : 0) *
      (cssLength ? (horizontal ? rect.width : rect.height) / cssLength : 1);
    return sliderPointerRatio({
      clientX: event.clientX - (horizontal ? offset : 0),
      clientY: event.clientY - (horizontal ? 0 : offset),
      rect,
      orientation: this.orientation,
      direction: this.direction === 'rtl' ? 'rtl' : 'ltr',
      inset,
    });
  }
  #pointerValue(event: PointerEvent, thumb: TpSliderThumb, offset: number): number {
    const ratio = this.#ratioAt(event, thumb, offset);
    if (ratio === null) return this.thumbState(thumb).value;
    return sliderValueFromRatio(ratio, this.minimum, this.maximum, this.step);
  }
  /** Hover publication only; dragging, disabled and indeterminate sliders are not pointing. */
  #hover(event: PointerEvent): void {
    if (
      this.#dragging ||
      this.effectiveDisabled ||
      this.indeterminate ||
      !this.#ownsControlPath(event.composedPath())
    ) {
      this.#setPointer(null, true);
      return;
    }
    const ratio = this.#ratioAt(event, this.#orderedThumbs()[0], 0);
    this.#setPointer(ratio, ratio === null);
  }
  /** Pointer movement is coalesced to one publication per frame; clearing is immediate. */
  #setPointer(ratio: number | null, immediate: boolean): void {
    const window = this.ownerDocument.defaultView;
    if (immediate || !window?.requestAnimationFrame) {
      this.#cancelPointerFrame();
      this.#applyPointer(ratio);
      return;
    }
    this.#pendingPointer = { ratio };
    if (this.#pointerFrame) return;
    this.#pointerFrame = {
      window,
      id: window.requestAnimationFrame(() => {
        this.#pointerFrame = undefined;
        const pending = this.#pendingPointer;
        this.#pendingPointer = undefined;
        if (pending && this.isConnected) this.#applyPointer(pending.ratio);
      }),
    };
  }
  #cancelPointerFrame(): void {
    if (this.#pointerFrame) this.#pointerFrame.window.cancelAnimationFrame(this.#pointerFrame.id);
    this.#pointerFrame = undefined;
    this.#pendingPointer = undefined;
  }
  #applyPointer(ratio: number | null): void {
    if (Object.is(ratio, this.#pointerRatio)) return;
    this.#pointerRatio = ratio;
    if (ratio !== null) this.#lastPointerRatio = ratio;
    this.requestUpdate();
    this.emit<SliderPointerChangeDetail>('tp-slider-pointer-change', {
      value: this.pointerValue,
      ratio,
    });
  }
  #pointerLeave = (): void => {
    this.#setPointer(null, true);
  };
  #pointerMove = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag) {
      if (!componentHandlingPrevented(event)) this.#hover(event);
      return;
    }
    if (drag.pointerId !== event.pointerId || componentHandlingPrevented(event)) return;
    const thumb = this.#thumbs.find((member) => member.inputId === drag.identity);
    if (!thumb || this.thumbState(thumb).disabled || this.thumbState(thumb).readOnly) {
      this.#cancelDrag();
      return;
    }
    if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 2)
      this.#dragging = true;
    if (this.#dragging)
      this.#move(
        drag.identity,
        this.#pointerValue(event, thumb, drag.offset),
        'drag',
        event,
        false,
      );
    this.#syncThumbs();
    this.requestUpdate();
  };
  #pointerUp = (event: PointerEvent): void => {
    const drag = this.#drag;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const index = this.#identities.indexOf(drag.identity);
    const reason = this.#dragging ? 'drag' : 'track-press';
    this.#cancelDrag(false);
    if (drag.changed && !componentHandlingPrevented(event))
      this.#emitCommit(this.value, drag.previous, reason, event, index);
    for (const proposal of this.#proposals)
      if (proposal.interaction === drag) {
        proposal.immediate = !componentHandlingPrevented(event);
        proposal.previous = drag.previous;
        proposal.source = event;
        proposal.reason = reason;
      }
  };
  #pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.#drag?.pointerId) this.#cancelDrag();
  };
  #cancelDrag(cancelPending = true): void {
    const drag = this.#drag;
    if (!drag && !this.#dragging) return;
    this.#drag = null;
    this.#dragging = false;
    if (drag) this.#activeIdentity = null;
    if (drag && cancelPending) {
      this.#proposals = this.#proposals.filter((proposal) => proposal.interaction !== drag);
      if (this.#activeProposal?.interaction === drag) this.#activeProposal = undefined;
    }
    if (drag)
      try {
        if (drag.capture.hasPointerCapture(drag.pointerId))
          drag.capture.releasePointerCapture(drag.pointerId);
      } catch {
        /* Detached capture is already released. */
      }
    this.#syncThumbs();
    this.requestUpdate();
  }
  thumbChanged = (): void => {
    if (this.#scheduled || !this.isConnected) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.isConnected) {
        this.#refreshThumbs();
        this.requestUpdate();
      }
    });
  };
  #refreshThumbs(): void {
    const explicit = [...this.querySelectorAll<TpSliderThumb>('tp-slider-thumb')].filter((thumb) =>
      this.#ownsThumb(thumb),
    );
    if (explicit.length) this.#explicit = true;
    const thumbs = this.#explicit
      ? explicit
      : [...this.renderRoot.querySelectorAll<TpSliderThumb>('tp-slider-thumb')].filter((thumb) =>
          this.#ownsThumb(thumb),
        );
    const previous = this.#thumbs;
    for (const thumb of previous)
      if (!thumbs.includes(thumb)) {
        thumb.slider = null;
        setPartComposition(thumb, this);
        this.#memberSnapshots.delete(thumb);
        this.#memberComposition.delete(thumb);
        this.#collectionEntries.get(thumb)?.();
        this.#collectionEntries.delete(thumb);
      }
    for (const thumb of thumbs)
      if (!this.#collectionEntries.has(thumb))
        this.#collectionEntries.set(thumb, this.#collection.register({ element: thumb }));
    if (this.#explicit) {
      const indices = thumbs.map(
        (thumb, index) => thumb.index ?? (thumbs.length === 1 ? 0 : index),
      );
      this.#membershipError =
        indices.some(
          (index, position) =>
            !Number.isInteger(index) || index < 0 || indices.indexOf(index) !== position,
        ) ||
        thumbs.some((thumb) => thumbs.length > 1 && thumb.index === undefined) ||
        (this.controlled && thumbs.length !== this.values.length);
      if (this.#membershipError)
        this.#diagnose(
          'membership',
          'Multi-thumb Slider requires unique non-negative indices and one Thumb per controlled value.',
        );
      const ordered = [...thumbs].sort((left, right) => (left.index ?? 0) - (right.index ?? 0));
      const previousIds = this.#identities;
      const ids = ordered.map((thumb) => thumb.inputId);
      if (
        !previous.length ||
        ids.length !== previousIds.length ||
        ids.some((id) => !previousIds.includes(id))
      ) {
        if (previous.length && !this.controlled && ids.length < previousIds.length) {
          const retained = this.values.filter((_value, index) => ids.includes(previousIds[index]!));
          this.#identities = ids;
          this.#state.set(this.#shape(retained), 'programmatic', undefined, {
            cancelable: false,
            metadata: { activeThumbIndex: -1 },
          });
        } else this.#identities = ids;
      }
    } else {
      const ids = thumbs.map((thumb) => thumb.inputId);
      if (
        ids.length !== this.#identities.length ||
        ids.some((id) => !this.#identities.includes(id))
      )
        this.#identities = ids;
      this.#membershipError = false;
    }
    if (this.#drag && !thumbs.some((thumb) => thumb.inputId === this.#drag!.identity))
      this.#cancelDrag();
    for (const thumb of thumbs) {
      thumb.slider = this;
    }
    this.#syncThumbs();
    this.#syncForm();
  }
  #ownsThumb(thumb: TpSliderThumb): boolean {
    for (let node: Node | null = composedParent(thumb); node; node = composedParent(node))
      if (node.nodeType === 1 && (node as Element).localName === 'tp-slider') return node === this;
    return false;
  }
  #observeEnvironment(): void {
    this.#environmentScope?.dispose();
    const scope = (this.#environmentScope = new CleanupScope());
    const observer = new this.ownerDocument.defaultView!.MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'slot')) this.#observeEnvironment();
      else this.#environmentChanged();
    });
    scope.add(() => observer.disconnect());
    const roots = new Set<ShadowRoot>();
    const ancestors: Node[] = [this];
    for (let node = composedParent(this); node; node = composedParent(node)) ancestors.push(node);
    for (const node of ancestors) {
      if (node.nodeType !== 1) continue;
      const element = node as Element;
      observer.observe(element, {
        attributes: true,
        attributeFilter: ['dir', 'lang', 'class', 'style', 'slot'],
      });
      const root = element.getRootNode();
      if (root.nodeType === 11 && 'host' in root) roots.add(root as ShadowRoot);
      if (element.shadowRoot) roots.add(element.shadowRoot);
    }
    for (const root of roots) scope.listen(root, 'slotchange', () => this.#observeEnvironment());
    this.#environmentChanged();
  }
  #environmentChanged(): void {
    if (!this.isConnected) return;
    const signature = JSON.stringify([this.direction, this.locale || resolveLocale(this)]);
    if (signature === this.#environmentSignature) return;
    this.#environmentSignature = signature;
    this.#syncThumbs();
    this.requestUpdate();
  }
  #syncThumbs(): void {
    for (const thumb of this.#thumbs) {
      thumb.orientation = this.orientation;
      thumb.setFieldContext({
        ...this.#fieldContext,
        disabled: this.effectiveDisabled,
        invalid: this.effectiveInvalid,
      });
      const state = this.thumbState(thumb);
      thumb.setFieldAssociation({ ...this.#association, label: state.label });
      if (this.#memberComposition.get(thumb) !== this.partPresentation) {
        this.#memberComposition.set(thumb, this.partPresentation);
        setPartComposition(thumb, this, this.partPresentation);
      }
      const snapshot = JSON.stringify({ state, position: this.thumbPosition(thumb) });
      const previous = this.#memberSnapshots.get(thumb);
      if (
        previous?.state !== snapshot ||
        previous.rootContracts !== this.partContracts ||
        previous.ownContracts !== thumb.partContracts
      ) {
        this.#memberSnapshots.set(thumb, {
          state: snapshot,
          rootContracts: this.partContracts,
          ownContracts: thumb.partContracts,
        });
        thumb.requestUpdate();
      }
    }
  }
  #format(value: number): string {
    try {
      return new LocaleService(this.locale || resolveLocale(this)).number(value, this.format);
    } catch {
      this.#diagnose('format', 'Slider locale and format must be valid Intl.NumberFormat options.');
      return String(value);
    }
  }
  #syncForm(): void {
    if (!this.formAssociatedValue) {
      this.setFormValue(null, null);
      this.setValidity({}, '');
      return;
    }
    const data = new FormData();
    if (this.effectiveName && !this.#configurationError && !this.#membershipError)
      this.#orderedThumbs().forEach((thumb, index) => {
        if (!this.thumbState(thumb).disabled)
          data.append(this.effectiveName, String(this.values[index]));
      });
    this.setFormValue(this.effectiveDisabled ? null : data, JSON.stringify(this.value ?? null));
    const missing = this.required && !this.values.length && !this.indeterminate;
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select a value.' : '',
    );
  }
  protected resetFormValue(): void {
    if (!this.formAssociatedValue) return;
    this.#cancelDrag();
    this.#proposals = [];
    this.#state.reset();
    this.#activeIdentity = null;
    this.#touched = false;
    this.#syncThumbs();
    this.#syncForm();
  }
  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (this.controlled || !this.formAssociatedValue || typeof state !== 'string') return;
    try {
      const value: unknown = JSON.parse(state);
      if (
        typeof value === 'number' ||
        (Array.isArray(value) && value.every((item) => typeof item === 'number'))
      )
        this.#state.set(this.#normalize(value), 'programmatic', undefined, {
          cancelable: false,
          metadata: { activeThumbIndex: -1 },
        });
    } catch {
      this.#diagnose('restore', 'Slider form state must contain a number or number list.');
    }
  }
  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(`${code}:${message}`)) return;
    this.#diagnostics.add(`${code}:${message}`);
    this.emit('tp-diagnostic', { component: 'Slider', code, message });
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#initialValues ??= [...this.values];
    this.#configurationError = sliderConfigurationError(
      this.minimum,
      this.maximum,
      this.step,
      this.largeStep,
      this.minStepsBetweenValues,
      this.values.length,
    );
    if (!['push', 'swap', 'none'].includes(this.thumbCollisionBehavior))
      this.#configurationError = 'Slider thumbCollisionBehavior must be push, swap, or none.';
    if (!['center', 'edge', 'delayed-edge'].includes(this.thumbAlignment))
      this.#configurationError = 'Slider thumbAlignment must be center, edge, or delayed-edge.';
    if (this.thumbCrossing !== undefined && !['prevent', 'swap'].includes(this.thumbCrossing))
      this.#configurationError = 'Slider thumbCrossing must be prevent or swap.';
    if (this.#configurationError) this.#diagnose('configuration', this.#configurationError);
    const indeterminate = this.indeterminate;
    if (
      this.#drag &&
      (this.effectiveDisabled || this.readOnly || indeterminate || this.#configurationError)
    )
      this.#cancelDrag();
    if (this.#pointerRatio !== null && (this.effectiveDisabled || indeterminate))
      this.#setPointer(null, true);
    // Bounds are configuration, not a value proposal: reconcile without value events.
    if (
      !this.controlled &&
      !this.#configurationError &&
      !indeterminate &&
      ['minimum', 'maximum', 'step', 'minStepsBetweenValues'].some((key) =>
        changed.has(key as keyof TpSlider),
      )
    ) {
      if (this.value !== undefined) this.#state.reconcile(this.#normalize(this.value));
    }
    if (changed.has('formAssociatedValue' as keyof TpSlider)) this.#syncForm();
  }
  protected override render() {
    const values = this.values;
    const indeterminate = this.indeterminate;
    const buffered = normalizeSliderBufferedRanges(this.buffered, this.minimum, this.maximum);
    const bufferEnd = sliderBufferEnd(buffered, values.at(-1));
    const segments = sliderSegmentStates(
      normalizeSliderSegments(this.segments, this.minimum, this.maximum),
      {
        minimum: this.minimum,
        maximum: this.maximum,
        value: values.at(-1),
        pointerValue: this.pointerValue,
        bufferEnd,
      },
    );
    while (this.#automaticIds.length < values.length)
      this.#automaticIds.push(createId('tp-slider-thumb'));
    this.#automaticIds.length = values.length;
    const state = {
      values,
      value: this.value,
      activeThumbIndex: this.activeThumbIndex,
      dragging: this.dragging,
      disabled: this.effectiveDisabled || indeterminate,
      indeterminate,
      pointing: this.pointing,
      pointerValue: this.pointerValue,
      pointerRatio: this.pointerRatio,
      buffered,
      bufferEnd,
      segments,
      readOnly: this.readOnly,
      invalid: this.effectiveInvalid,
      minimum: this.minimum,
      maximum: this.maximum,
      min: this.minimum,
      max: this.maximum,
      step: this.step,
      minStepsBetweenValues: this.minStepsBetweenValues,
      orientation: this.orientation,
      formattedValues: values.map((value) => this.#format(value)),
      focused: this.#focused,
      touched: this.#touched,
      dirty: !sameSliderValues(values, this.#initialValues ?? values),
    };
    const markers = {
      'data-orientation': this.orientation,
      'data-dragging': this.dragging,
      'data-disabled': this.effectiveDisabled || indeterminate,
      'data-indeterminate': indeterminate,
      'data-pointing': this.pointing,
      'data-invalid': this.effectiveInvalid,
      'data-valid': !this.effectiveInvalid,
      'data-readonly': this.readOnly,
      'data-focused': state.focused,
      'data-touched': state.touched,
      'data-dirty': state.dirty,
    };
    const label =
      this.label || this.querySelector('[slot="label"]') || this.partContracts['slider-label'];
    const output = this.partContracts['slider-output'] || this.querySelector('[slot="value"]');
    const first = values.length > 1 ? values[0]! : this.minimum;
    const last = values.at(-1) ?? this.minimum;
    const ratio = (value: number): number => sliderRatio(value, this.minimum, this.maximum) * 100;
    const percent = (fraction: number): string => `${Number((fraction * 100).toFixed(4))}%`;
    const axis = (start: number, size: number): Record<string, string> =>
      this.orientation === 'horizontal'
        ? { 'inset-inline-start': percent(start), 'inline-size': percent(size) }
        : { bottom: percent(start), height: percent(size) };
    const ordered = this.#orderedThumbs();
    const startInset =
      values.length > 1 && ordered[0]
        ? this.#inset(ordered[0]) * (1 - (2 * ratio(first)) / 100)
        : 0;
    const endThumb = ordered.at(-1);
    const endInset = endThumb ? this.#inset(endThumb) * (1 - (2 * ratio(last)) / 100) : 0;
    const rangeStyle =
      this.orientation === 'horizontal'
        ? {
            'inset-inline-start': `calc(${ratio(first)}% + ${startInset}px)`,
            'inline-size': `calc(${ratio(last) - ratio(first)}% + ${endInset - startInset}px)`,
          }
        : {
            bottom: `calc(${ratio(first)}% + ${startInset}px)`,
            height: `calc(${ratio(last) - ratio(first)}% + ${endInset - startInset}px)`,
          };
    return this.renderPart('slider', state, {
      tag: 'div',
      properties: {
        class: 'root',
        part: `slider slider-orientation-${this.orientation}`,
        role: 'group',
        'aria-label':
          this.#association.label || this.label || this.getAttribute('aria-label') || undefined,
        'aria-disabled': indeterminate ? 'true' : undefined,
        style: {
          '--tp-slider-pointer': percent(this.#pointerRatio ?? this.#lastPointerRatio),
          '--tp-slider-buffer': percent(
            bufferEnd === null ? 0 : sliderRatio(bufferEnd, this.minimum, this.maximum),
          ),
        },
        ...markers,
        '@pointerdown': this.#pointerDown,
        '@pointermove': this.#pointerMove,
        '@pointerleave': this.#pointerLeave,
        '@pointerup': this.#pointerUp,
        '@pointercancel': this.#pointerCancel,
        '@lostpointercapture': this.#pointerCancel,
      },
      content: html`${
          label || output
            ? html`<div class="header">
                ${this.renderPart('slider-label', state, { tag: 'span', enabled: !!label, properties: { part: `slider-label slider-label-orientation-${this.orientation}`, id: this.#labelId, ...markers, '@click': () => this.activateFromLabel() }, content: html`<slot name="label">${this.label}</slot>` })}
                ${this.renderPart('slider-output', state, {
                  tag: 'output',
                  enabled: !!output,
                  properties: {
                    part: `slider-output slider-output-orientation-${this.orientation}`,
                    for: this.#orderedThumbs()
                      .map((thumb) => thumb.inputId)
                      .join(' '),
                    'aria-live': 'off',
                    ...markers,
                  },
                  content: html`<slot name="value">${state.formattedValues.join(' – ')}</slot>`,
                })}
              </div>`
            : ''
        }
        <div class="control" ${this.#controlBinding()}>
          ${this.renderPart('slider-track', state, {
            tag: 'div',
            properties: {
              part: `slider-track slider-track-orientation-${this.orientation}`,
              class: 'track',
              'aria-hidden': 'true',
              ...markers,
            },
            content: html`${repeat(
              buffered,
              ([start, end]) => `${start}:${end}`,
              ([start, end], index) =>
                this.renderPart(
                  'slider-buffer',
                  { ...state, index, start, end },
                  {
                    tag: 'span',
                    properties: {
                      part: `slider-buffer slider-buffer-orientation-${this.orientation}`,
                      class: 'buffer',
                      'data-orientation': this.orientation,
                      'data-index': index,
                      style: axis(ratio(start) / 100, (ratio(end) - ratio(start)) / 100),
                    },
                  },
                ),
            )}${this.renderPart('slider-range', state, { tag: 'span', properties: { part: `slider-range slider-range-orientation-${this.orientation}`, class: 'range', style: rangeStyle, ...markers } })}${repeat(
              segments,
              (segment) => `${segment.start}:${segment.end}`,
              (segment) =>
                this.renderPart(
                  'slider-chapter',
                  { ...state, ...segment },
                  {
                    tag: 'span',
                    properties: {
                      part: `slider-chapter slider-chapter-orientation-${this.orientation}`,
                      class: 'chapter',
                      'data-orientation': this.orientation,
                      'data-index': segment.index,
                      'data-active': segment.active,
                      'data-highlighted': segment.highlighted,
                      style: {
                        ...axis(segment.startRatio, segment.widthRatio),
                        '--tp-slider-segment-start': percent(segment.startRatio),
                        '--tp-slider-segment-width': percent(segment.widthRatio),
                        '--tp-slider-segment-fill': percent(segment.fillRatio),
                        '--tp-slider-segment-buffer': percent(segment.bufferRatio),
                      },
                    },
                  },
                ),
            )}`,
          })}
          ${
            this.#explicit
              ? html`<slot @slotchange=${this.thumbChanged}></slot>`
              : html`<slot @slotchange=${this.thumbChanged}></slot>${repeat(
                    this.#automaticIds,
                    (identity) => identity,
                    (_identity, index) => html`<tp-slider-thumb .index=${index}></tp-slider-thumb>`,
                  )}`
          }
        </div>`,
    });
  }
  #controlBinding() {
    // Control is structural anatomy, deliberately without a new public paint identity.
    return bindPart({}, [this.#controlReference]);
  }
  override connectedCallback(): void {
    super.connectedCallback();
    const window = this.ownerDocument.defaultView!;
    this.#observer = new window.MutationObserver((records) => {
      if (records.some((record) => record.attributeName === 'slot')) this.#observeEnvironment();
      this.thumbChanged();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['index', 'disabled', 'readonly', 'dir', 'lang', 'slot'],
    });
    this.#resize = new window.ResizeObserver((entries) => {
      for (const entry of entries)
        for (const [thumb, record] of this.#registered)
          if (record.node === entry.target) this.#measureThumb(thumb, record.node);
    });
    for (const record of this.#registered.values()) this.#resize.observe(record.node);
    this.#observeEnvironment();
    this.thumbChanged();
  }
  protected override updated(changed: PropertyValues<this>): void {
    this.#refreshThumbs();
    super.updated(changed);
    this.toggleAttribute('data-dragging', this.dragging);
    this.toggleAttribute('data-indeterminate', this.indeterminate);
    this.toggleAttribute('data-pointing', this.pointing);
    if (this.indeterminate) this.toggleAttribute('data-disabled', true);
    this.toggleAttribute('data-valid', !this.effectiveInvalid);
    this.toggleAttribute('data-focused', this.#focused);
    this.toggleAttribute('data-touched', this.#touched);
    this.toggleAttribute(
      'data-dirty',
      !sameSliderValues(this.values, this.#initialValues ?? this.values),
    );
    if (this.activeThumbIndex >= 0)
      this.setAttribute('data-active-thumb-index', String(this.activeThumbIndex));
    else this.removeAttribute('data-active-thumb-index');
  }
  override disconnectedCallback(): void {
    this.#cancelDrag();
    this.#cancelPointerFrame();
    this.#pointerRatio = null;
    this.#proposals = [];
    this.#observer?.disconnect();
    this.#environmentScope?.dispose();
    this.#environmentScope = undefined;
    this.#resize?.disconnect();
    this.#observer = undefined;
    this.#resize = undefined;
    for (const [thumb, record] of this.#registered) {
      record.cleanup();
      thumb.slider = null;
    }
    this.#registered.clear();
    for (const release of this.#collectionEntries.values()) release();
    this.#collectionEntries.clear();
    this.#memberSnapshots = new WeakMap();
    this.#memberComposition = new WeakMap();
    this.#measurements.clear();
    super.disconnectedCallback();
  }
}
