import { html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import type { ChangeReason, ValueChangeDetail } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { CleanupScope } from '../../foundation/services.js';
import { surfaceInteraction } from '../../foundation/surface-focus.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { NumberFieldController } from '../../foundation/number-field/controller.js';
import { setPartComposition } from '../../presentation/controller.js';
import { easingEditorPresentation } from '../../presentation/families/easing-editor.js';
import { TpSlider } from '../../components/slider/slider.js';
import type { SliderValue } from '../../components/slider/types.js';
import { TpInput } from '../../components/input/input.js';
import { TpInputGroup } from '../../components/input-group/input-group.js';
import { TpSelect } from '../../components/select/select.js';
import { TpButton } from '../../components/button/button.js';
import { TpBadge } from '../../components/badge/badge.js';
import { TpCopyButton } from '../../components/copy-button/copy-button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpLabel } from '../../components/label/label.js';
import { TpTabs } from '../../components/tabs/tabs.js';
import { TpToggleGroup } from '../../components/toggle-group/toggle-group.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import { TpScrollArea } from '../../components/scroll-area/scroll-area.js';
import { easeInOutControlPointsIcon } from '../../icons/ease-in-out-control-points.js';
import { replayIcon } from '../../icons/media.js';
import { plusIcon } from '../../icons/plus.js';
import { minusIcon } from '../../icons/minus.js';
import { easingFunction, normalizePoints } from '../../foundation/easing/evaluate.js';
import { convertEasingCurve } from '../../foundation/easing/convert.js';
import { normalizeEasingText, parseEasingCurve } from '../../foundation/easing/parse.js';
import { formatEasingNumber, serializeEasingCurve } from '../../foundation/easing/serialize.js';
import { DEFAULT_SPRING, springSettleTime } from '../../foundation/easing/spring.js';
import type {
  EasingCurve,
  EasingKind,
  EasingParameterDefinition,
  ProgressionRange,
} from '../../foundation/easing/types.js';
import { adapterContext, cssEasingAdapter, parseEasingExpression } from './adapters.js';
import {
  clampParameter,
  easingParameters,
  formatParameter,
  withEasingParameter,
  type EasingParameter,
} from './parameters.js';
import { builtinPresetGroups } from './presets.js';
import { resolveStrings } from './strings.js';
import { easingEditorStyles } from './styles.js';
import {
  TpEasingEditorExpression,
  type EasingExpressionChangeDetail,
} from './surfaces/expression.js';
import { TpEasingEditorFrames } from './surfaces/frames.js';
import {
  cancelMotions,
  prepareMotion,
  stateRole,
  type MotionHandle,
} from '../../foundation/motion.js';
import { curveRange } from './surfaces/geometry.js';
import { TpEasingEditorGraph, type EasingSurfaceChangeDetail } from './surfaces/graph.js';
import { renderPresetGroups } from './views/presets.js';
import {
  EASING_CATEGORIES,
  EASING_PREVIEW_CYCLE,
  type EasingAdapter,
  type EasingCategory,
  type EasingEditorChangeMetadata,
  type EasingEditorLayout,
  type EasingEditorSize,
  type EasingEditorStrings,
  type EasingEditorSurface,
  type EasingPreset,
  type EasingPresetGroup,
  type EasingPreviewMode,
} from './types.js';

export type EasingEditorValueChangeCallback = (event: TpValueChangeEvent<string>) => void;
export type EasingEditorValueCommitCallback = (event: TpValueCommitEvent<string>) => void;

interface DragSnapshot {
  readonly value: string;
}
interface ImmediateCommit {
  readonly reason: ChangeReason;
  readonly source: Event | undefined;
  readonly previous: string;
  readonly metadata: EasingEditorChangeMetadata;
}
interface NumberFieldBinding {
  readonly controller: NumberFieldController;
  readonly root: HTMLElement;
  readonly input: TpInput;
  readonly scope: CleanupScope;
  readonly key: string;
  definition: EasingParameterDefinition;
  previous: string | null;
}
interface ProposeOptions {
  readonly immediate?: boolean;
  readonly surface?: EasingEditorSurface;
  readonly parameter?: string;
  readonly handle?: number;
  readonly point?: number;
  readonly presetId?: string;
  readonly conversion?: boolean;
  readonly cancelable?: boolean;
}

const CATEGORY_STRING_KEYS: Readonly<Record<EasingCategory, keyof EasingEditorStrings>> = {
  ease: 'kindEase',
  spring: 'kindSpring',
};
const PREVIEW_MODE_STRING_KEYS: Readonly<Record<EasingPreviewMode, keyof EasingEditorStrings>> = {
  none: 'preview',
  scale: 'previewScale',
  'scale-x': 'previewScaleX',
  'scale-y': 'previewScaleY',
  rotation: 'previewRotation',
};
/** The curve an empty editor starts from when a category Tab is chosen. */
const DEFAULT_CURVES: Readonly<Record<EasingCategory, string>> = {
  ease: 'ease',
  spring: 'spring(1 100 10)',
};
/** The shown range eases to the re-quantized range once a drag settles (Widgets 6.2 Presentation). */
const RANGE_ROLE = stateRole('range');
const RANGE_TWEEN_MS = 200;
const easeOutCubic = (t: number): number => 1 - (1 - t) ** 3;
const sameRange = (a: ProgressionRange, b: ProgressionRange): boolean =>
  a.min === b.min && a.max === b.max;
/** Springs are their own category; every other kind is an ease. */
const categoryOf = (kind: EasingKind): EasingCategory => (kind === 'spring' ? 'spring' : 'ease');
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-duration-change',
  'tp-adapter-change',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-presence-complete',
] as const;
const NESTED_HOSTS =
  'tp-slider, tp-select, tp-input, tp-input-group, tp-button, tp-copy-button, tp-label, tp-tabs, tp-toggle-group, tp-toggle, tp-scroll-area';
const SURFACES = 'tp-easing-editor-graph, tp-easing-editor-frames, tp-easing-editor-expression';
const DEFAULT_ADAPTERS: readonly EasingAdapter[] = [cssEasingAdapter];
const isCategory = (value: unknown): value is EasingCategory =>
  typeof value === 'string' && (EASING_CATEGORIES as readonly string[]).includes(value);
const stop = (event: Event): void => event.stopPropagation();
const interactionReason = (source: Event | undefined): ChangeReason =>
  surfaceInteraction(source) === 'keyboard' ? 'keyboard' : 'item-press';

/**
 * Easing editor widget (UI Widgets Specification 6.2): one easing curve edited on a graph with
 * Bézier handles or custom points, parameter Sliders and fields for springs and parametric
 * families, a preset picker with thumbnails, an optional duration control, a background
 * preview, a frames bar and export adapters. Every constituent is a library component; only
 * the graph and the frames bar are widget-owned surfaces.
 */
export class TpEasingEditor extends TpFormElement<string> {
  static tagName = 'tp-easing-editor';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpEasingEditorGraph,
      TpEasingEditorFrames,
      TpEasingEditorExpression,
      TpBadge,
      TpSlider,
      TpInput,
      TpInputGroup,
      TpSelect,
      TpButton,
      TpCopyButton,
      TpIcon,
      TpLabel,
      TpTabs,
      TpToggleGroup,
      TpToggle,
      TpScrollArea,
    ];
  }
  static override presentation = easingEditorPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    duration: { type: Number, noAccessor: true },
    defaultDuration: { type: Number, attribute: 'default-duration' },
    durationMin: { type: Number, attribute: 'duration-min' },
    durationMax: { type: Number, attribute: 'duration-max' },
    durationStep: { type: Number, attribute: 'duration-step' },
    timing: { type: Boolean, converter: defaultTrue },
    adapter: { type: String, noAccessor: true },
    defaultAdapter: { type: String, attribute: 'default-adapter' },
    adapters: { attribute: false },
    presets: { attribute: false },
    presetPicker: { type: Boolean, attribute: 'preset-picker', converter: defaultTrue },
    layout: { type: String, reflect: true },
    presetsOpen: { type: Boolean, attribute: 'presets-open', noAccessor: true },
    defaultPresetsOpen: { type: Boolean, attribute: 'default-presets-open' },
    size: { type: String, reflect: true },
    preview: { type: String, reflect: true },
    previewControls: { type: Boolean, attribute: 'preview-controls', converter: defaultTrue },
    frames: { type: Boolean, converter: defaultTrue },
    label: { type: String },
    locale: { type: String },
    strings: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [TpElement.styles, easingEditorStyles];

  defaultValue: string | undefined;
  defaultDuration: number | undefined;
  durationMin = 0;
  durationMax = 3;
  durationStep = 0.01;
  timing = true;
  defaultAdapter: string | undefined;
  adapters: readonly EasingAdapter[] = DEFAULT_ADAPTERS;
  presets: readonly EasingPresetGroup[] = [];
  presetPicker = true;
  layout: EasingEditorLayout = 'extended';
  defaultPresetsOpen = false;
  size: EasingEditorSize = 'default';
  preview: EasingPreviewMode = 'scale';
  previewControls = true;
  frames = true;
  label = '';
  locale = '';
  strings: Partial<EasingEditorStrings> = {};
  onValueChange: EasingEditorValueChangeCallback | undefined;
  onValueCommitted: EasingEditorValueCommitCallback | undefined;

  #provided: string | undefined;
  #providedDuration: number | undefined;
  #providedAdapter: string | undefined;
  #providedPresetsOpen: boolean | undefined;
  #curve: EasingCurve | null = null;
  #curveText = '';
  #pending: { curve: EasingCurve; text: string } | null = null;
  #immediate: ImmediateCommit | undefined;
  #dragSnapshot: DragSnapshot | undefined;
  #frozenRange: ProgressionRange | undefined;
  #displayRange: ProgressionRange | undefined;
  #rangeTarget: ProgressionRange | undefined;
  #rangeMotion: MotionHandle | undefined;
  #dragging = false;
  #playing = false;
  #suppressedSlider: TpSlider | null = null;
  #sliderReason: 'track-press' | 'drag' | undefined;
  #numberFields = new Map<string, NumberFieldBinding>();
  #registeredParts = new Map<Element, () => void>();
  #composed = new WeakSet<Element>();
  #composition: object | undefined;
  #strings: EasingEditorStrings = resolveStrings();
  #builtinPresets:
    { strings: EasingEditorStrings; groups: readonly EasingPresetGroup[] } | undefined;
  #presetTexts = new Map<string, string>();

  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () =>
      this.#provided === undefined ? undefined : normalizeEasingText(this.#provided),
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : normalizeEasingText(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: (a, b) => a === b,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#committed(value, previous, reason),
    diagnostic: (message) => this.diagnose('easing-editor-state', message),
  });
  readonly #durationState = new ControllableState<number>({
    host: this,
    initialValue: 0.7,
    readControlledValue: () =>
      this.#providedDuration === undefined
        ? undefined
        : this.#clampDuration(this.#providedDuration),
    readDefaultValue: () =>
      this.defaultDuration === undefined ? undefined : this.#clampDuration(this.defaultDuration),
    hasDefaultValue: () => this.defaultDuration !== undefined,
    equals: (a, b) => a === b,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-duration-change'),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnose('easing-editor-duration', message),
  });
  readonly #adapterState = new ControllableState<string>({
    host: this,
    initialValue: 'css',
    readControlledValue: () => this.#providedAdapter,
    readDefaultValue: () => this.defaultAdapter,
    hasDefaultValue: () => this.defaultAdapter !== undefined,
    equals: (a, b) => a === b,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-adapter-change'),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnose('easing-editor-adapter', message),
  });
  readonly #presetsOpenState = new ControllableState<boolean>({
    host: this,
    initialValue: false,
    readControlledValue: () => this.#providedPresetsOpen,
    readDefaultValue: () => this.defaultPresetsOpen,
    hasDefaultValue: () => this.defaultPresetsOpen,
    equals: (a, b) => a === b,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-open-change'),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnose('easing-editor-presets', message),
  });

  // ---- public lanes --------------------------------------------------------------------------

  override get value(): string {
    return this.#state.value;
  }
  override set value(value: string) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : String(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  /** Duration in seconds within the duration range. */
  get duration(): number {
    return this.#durationState.value;
  }
  set duration(value: number | undefined) {
    const previous = this.duration;
    const next =
      value === undefined || value === null || !Number.isFinite(value) ? undefined : Number(value);
    if (!this.hasUpdated || this.#durationState.controlled) {
      this.#providedDuration = next;
      if (this.hasUpdated) this.#durationState.sync();
    } else if (next !== undefined)
      this.#durationState.set(this.#clampDuration(next), 'programmatic');
    this.requestUpdate('duration', previous);
  }
  get adapter(): string {
    return this.#adapterState.value;
  }
  set adapter(value: string | undefined) {
    const previous = this.adapter;
    const next = value === undefined || value === null ? undefined : String(value);
    if (!this.hasUpdated || this.#adapterState.controlled) {
      this.#providedAdapter = next;
      if (this.hasUpdated) this.#adapterState.sync();
    } else if (next) this.#adapterState.set(next, 'programmatic');
    this.requestUpdate('adapter', previous);
  }
  /** Presence of the presets overlay in the compact layout. */
  get presetsOpen(): boolean {
    return this.#presetsOpenState.value;
  }
  set presetsOpen(value: boolean | undefined) {
    const previous = this.presetsOpen;
    const next = value === undefined || value === null ? undefined : Boolean(value);
    if (!this.hasUpdated || this.#presetsOpenState.controlled) {
      this.#providedPresetsOpen = next;
      if (this.hasUpdated) this.#presetsOpenState.sync();
    } else if (next !== undefined) this.#presetsOpenState.set(next, 'programmatic');
    this.requestUpdate('presetsOpen', previous);
  }

  /** The parsed record, or null when empty. */
  get curve(): EasingCurve | null {
    return this.#curve;
  }
  get kind(): EasingKind | null {
    return this.#curve?.kind ?? null;
  }
  /** `spring` for springs, `ease` for every other kind; null when empty. */
  get category(): EasingCategory | null {
    const kind = this.kind;
    return kind ? categoryOf(kind) : null;
  }
  /** The progression function of the current record (identity when empty). */
  get easingFunction(): (progress: number) => number {
    return this.#curve ? easingFunction(this.#curve) : (progress) => progress;
  }
  /** The active adapter's text for the current record. */
  get output(): string {
    const curve = this.#curve;
    const adapter = this.#activeAdapter();
    if (!curve || !adapter) return '';
    return adapter.format(curve, adapterContext(curve, this.timing ? this.duration : null));
  }
  /** The id of the preset whose canonical value equals the value, or null. */
  get presetId(): string | null {
    const text = this.value;
    if (!text) return null;
    for (const group of this.#presetGroups())
      for (const preset of group.presets) if (this.#presetText(preset) === text) return preset.id;
    return null;
  }
  get controlled(): boolean {
    return this.#state.controlled;
  }
  get dragging(): boolean {
    return this.#dragging;
  }
  get playing(): boolean {
    return this.#playing;
  }

  /** Proposes and commits an easing; returns whether the proposal was accepted. */
  setValue(
    value: string | EasingCurve,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    const parsed = typeof value === 'string' ? parseEasingCurve(value) : value;
    if (!parsed) return this.#proposeText('', reason, sourceEvent, {});
    return this.#proposeCurve(parsed, reason, sourceEvent, { immediate: true });
  }

  /** Replays the preview; resolves when it finishes. */
  play(): Promise<void> {
    return this.#graph?.play() ?? Promise.resolve();
  }

  /** Opens or closes the presets overlay (compact layout); returns whether it was accepted. */
  setPresetsOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    return this.#presetsOpenState.set(open, reason, event);
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker (Field's selector list is closed).
    this.setAttribute('data-field-control', '');
    // Safety net: no constituent lane event leaves this shadow root (Widgets 6.2 Events).
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.addEventListener(type, this.#containNested);
  }

  override disconnectedCallback(): void {
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.removeEventListener(type, this.#containNested);
    this.#dragSnapshot = undefined;
    this.#suppressedSlider = null;
    for (const binding of this.#numberFields.values()) this.#disposeField(binding);
    this.#numberFields.clear();
    for (const release of this.#registeredParts.values()) release();
    this.#registeredParts.clear();
    cancelMotions(this);
    this.#rangeMotion = undefined;
    this.#rangeTarget = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('strings')) this.#strings = resolveStrings(this.strings);
    this.#state.initialize();
    this.#durationState.initialize();
    this.#adapterState.initialize();
    this.#presetsOpenState.initialize();
    if (this.#curveText !== this.value) this.#adoptText(this.value);
    if (
      (changed.has('durationMin') || changed.has('durationMax') || changed.has('durationStep')) &&
      this.hasUpdated
    ) {
      const clamped = this.#clampDuration(this.duration);
      if (clamped !== this.duration) this.#durationState.reconcile(clamped);
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const curve = this.#curve;
    this.toggleAttribute('data-empty', !curve);
    this.toggleAttribute('data-dragging', this.#dragging);
    this.toggleAttribute('data-playing', this.#playing);
    this.setAttribute('data-kind', curve?.kind ?? 'empty');
    this.setAttribute('data-layout', this.layout);
    this.toggleAttribute('data-timing', this.timing);
    this.setAttribute('data-preview', this.preview);
    this.toggleAttribute('data-presets-open', this.layout === 'compact' && this.presetsOpen);
    this.setFormValue(this.value || null, this.value);
    this.setRequiredValidity(this.required && !this.value, this.#strings.valueMissing);
    this.#syncNumberFields();
    this.#syncComposition();
    void this.#registerNestedParts();
    this.#syncRange();
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.#state.set(normalizeEasingText(state), 'programmatic', undefined, { cancelable: false });
  }

  override get inputElement(): HTMLElement | null {
    return this.#graphInput();
  }

  protected override focusTarget(): HTMLElement | null {
    return this.#graphInput() ?? this.#firstControl() ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="easing-editor"]');
  }

  // ---- model helpers -------------------------------------------------------------------------

  #clampDuration(value: number): number {
    const min = Math.max(0, Math.min(this.durationMin, this.durationMax));
    const max = Math.max(min, this.durationMax);
    const step = this.durationStep > 0 ? this.durationStep : 0.01;
    const clamped = Math.min(max, Math.max(min, value));
    const stepped = min + Math.round((clamped - min) / step) * step;
    return Number(Math.min(max, stepped).toFixed(4));
  }

  #adoptText(text: string): void {
    this.#curveText = text;
    if (this.#pending && this.#pending.text === text) this.#curve = this.#pending.curve;
    else this.#curve = text ? parseEasingCurve(text) : null;
    this.#pending = null;
  }

  #committed(value: string, previous: string, reason: ChangeReason): void {
    this.#adoptText(value);
    this.emit('tp-field-value', { value, previousValue: previous, reason });
    const immediate = this.#immediate;
    if (immediate) {
      this.#immediate = undefined;
      this.#emitCommit(
        value,
        immediate.previous,
        immediate.reason,
        immediate.source,
        immediate.metadata,
      );
    }
    this.requestUpdate('value', previous);
  }

  #metadata(extra: Partial<EasingEditorChangeMetadata> = {}): EasingEditorChangeMetadata {
    const curve = this.#pending?.curve ?? this.#curve;
    return { curve, kind: curve?.kind ?? null, ...extra };
  }

  #proposeText(
    text: string,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    extra: Partial<EasingEditorChangeMetadata>,
  ): boolean {
    const previous = this.value;
    this.#pending = null;
    this.#immediate = { reason, source: sourceEvent, previous, metadata: this.#metadata(extra) };
    const accepted = this.#state.set(text, reason, sourceEvent, {
      metadata: this.#metadata(extra),
    });
    if (!accepted || !this.controlled) this.#immediate = undefined;
    return accepted;
  }

  /**
   * Proposes a record on the value lane. `immediate` commits once the proposal publishes
   * (keyboard, fields, presets, tabs); drags commit on release instead.
   */
  #proposeCurve(
    next: EasingCurve,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    options: ProposeOptions = {},
  ): boolean {
    const text = serializeEasingCurve(next);
    this.#pending = { curve: next, text };
    const metadata = this.#metadata({
      ...(options.surface ? { surface: options.surface } : {}),
      ...(options.parameter ? { parameter: options.parameter } : {}),
      ...(options.handle !== undefined ? { handle: options.handle } : {}),
      ...(options.point !== undefined ? { point: options.point } : {}),
      ...(options.presetId ? { presetId: options.presetId } : {}),
      ...(options.conversion ? { conversion: true } : {}),
    });
    const previous = this.value;
    this.#immediate = options.immediate
      ? { reason, source: sourceEvent, previous, metadata }
      : undefined;
    const accepted = this.#state.set(text, reason, sourceEvent, {
      metadata,
      ...(options.cancelable === false ? { cancelable: false } : {}),
    });
    if (!accepted) {
      this.#pending = null;
      this.#immediate = undefined;
    } else if (!this.controlled) this.#immediate = undefined;
    return accepted;
  }

  #emitCommit(
    value: string,
    previous: string,
    reason: ChangeReason,
    source: Event | undefined,
    metadata: EasingEditorChangeMetadata,
  ): void {
    if (value === previous) return;
    const event = new TpValueCommitEvent<string>(value, previous, reason, source, { metadata });
    this.onValueCommitted?.(event);
    this.dispatchEvent(event);
    // Every settled adjustment replays the preview (Widgets 6.2 Anatomy, preview layer). The
    // commit can arrive before the value lane requests its render, so request it here: the
    // replay must follow the render that hands the committed curve to the graph.
    this.requestUpdate();
    void this.updateComplete.then(() => this.#graph?.play());
  }

  #beginDrag(): void {
    if (this.#dragSnapshot) return;
    this.#dragSnapshot = { value: this.value };
    // The drag holds whatever range is shown, mid-ease included.
    this.#rangeMotion?.cancel();
    this.#rangeMotion = undefined;
    this.#rangeTarget = undefined;
    this.#frozenRange = this.#shownRange();
    this.#dragging = true;
    this.requestUpdate();
  }

  #endDrag(
    reason: ChangeReason,
    sourceEvent: Event,
    extra: Partial<EasingEditorChangeMetadata>,
  ): void {
    const snapshot = this.#dragSnapshot;
    this.#dragSnapshot = undefined;
    this.#dragging = false;
    this.#displayRange = this.#frozenRange ?? this.#displayRange;
    this.#frozenRange = undefined;
    this.#sliderReason = undefined;
    if (snapshot)
      this.#emitCommit(this.value, snapshot.value, reason, sourceEvent, this.#metadata(extra));
    this.requestUpdate();
  }

  #restoreDrag(reason: ChangeReason, sourceEvent: Event): void {
    const snapshot = this.#dragSnapshot;
    this.#dragSnapshot = undefined;
    this.#dragging = false;
    this.#displayRange = this.#frozenRange ?? this.#displayRange;
    this.#frozenRange = undefined;
    this.#sliderReason = undefined;
    if (!snapshot) return;
    this.#pending = null;
    this.#immediate = undefined;
    if (snapshot.value !== this.value)
      this.#state.set(snapshot.value, reason, sourceEvent, {
        cancelable: false,
        metadata: this.#metadata(),
      });
    this.requestUpdate();
  }

  /** Nested constituent events stop at this shadow root; the widget republishes its own lanes. */
  #containNested = (event: Event): void => {
    if (event.target !== this) event.stopPropagation();
  };

  #activeAdapter(): EasingAdapter | undefined {
    const adapters = this.adapters.length ? this.adapters : DEFAULT_ADAPTERS;
    return adapters.find((adapter) => adapter.id === this.adapter) ?? adapters[0];
  }

  #presetGroups(): readonly EasingPresetGroup[] {
    if (this.presets.length) return this.presets;
    if (this.#builtinPresets?.strings !== this.#strings)
      this.#builtinPresets = { strings: this.#strings, groups: builtinPresetGroups(this.#strings) };
    return this.#builtinPresets.groups;
  }

  #presetText(preset: EasingPreset): string {
    let text = this.#presetTexts.get(preset.value);
    if (text === undefined) {
      text = normalizeEasingText(preset.value);
      this.#presetTexts.set(preset.value, text);
    }
    return text;
  }

  #presetById(id: string): EasingPreset | undefined {
    for (const group of this.#presetGroups())
      for (const preset of group.presets) if (preset.id === id) return preset;
    return undefined;
  }

  /** The graph's progression range: held while a drag is in progress, eased otherwise. */
  #shownRange(): ProgressionRange {
    if (this.#dragging && this.#frozenRange) return this.#frozenRange;
    return this.#displayRange ?? curveRange(this.#curve);
  }

  /** Eases the shown range toward the curve's range; instant on first render and under reduced motion. */
  #syncRange(): void {
    if (this.#dragging) return;
    const target = curveRange(this.#curve);
    const shown = this.#displayRange;
    if (!shown) {
      this.#displayRange = target;
      return;
    }
    if (sameRange(shown, target) || (this.#rangeTarget && sameRange(this.#rangeTarget, target)))
      return;
    const from = { ...shown };
    const graph = this.#graph;
    if (!graph) {
      this.#displayRange = target;
      return;
    }
    this.#rangeTarget = target;
    const handle = prepareMotion(
      this,
      graph,
      RANGE_ROLE,
      {
        phase: 'change',
        context: { from: `${from.min} ${from.max}`, to: `${target.min} ${target.max}` },
      },
      {
        play: () => {
          let frame = 0;
          let cancelled = false;
          const start = performance.now();
          const finished = new Promise<void>((resolve) => {
            const step = (now: number) => {
              if (cancelled) return;
              const progress = easeOutCubic(Math.min(1, (now - start) / RANGE_TWEEN_MS));
              this.#displayRange = {
                min: from.min + (target.min - from.min) * progress,
                max: from.max + (target.max - from.max) * progress,
              };
              this.requestUpdate();
              if (progress < 1) frame = requestAnimationFrame(step);
              else resolve();
            };
            frame = requestAnimationFrame(step);
          });
          return {
            finished,
            cancel: () => {
              cancelled = true;
              cancelAnimationFrame(frame);
            },
          };
        },
      },
    );
    this.#rangeMotion = handle;
    handle.start();
    void handle.finished.then(
      () => this.#settleRange(handle, target),
      () => this.#settleRange(handle, target),
    );
  }

  #settleRange(handle: MotionHandle, target: ProgressionRange): void {
    if (this.#rangeMotion !== handle) return;
    this.#rangeMotion = undefined;
    this.#rangeTarget = undefined;
    this.#displayRange = target;
    this.requestUpdate();
  }

  get #graph(): TpEasingEditorGraph | null {
    return this.renderRoot?.querySelector?.<TpEasingEditorGraph>('tp-easing-editor-graph') ?? null;
  }

  // ---- surfaces ------------------------------------------------------------------------------

  #surfaceChange = (event: CustomEvent<EasingSurfaceChangeDetail>): void => {
    event.stopPropagation();
    const detail = event.detail;
    if (detail.phase === 'restore') {
      this.#restoreDrag(detail.reason, detail.sourceEvent);
      return;
    }
    if (detail.phase === 'press') this.#beginDrag();
    const immediate = detail.phase === 'commit' && !this.#dragSnapshot;
    const extra = {
      surface: 'graph' as const,
      ...(detail.handle !== undefined ? { handle: detail.handle } : {}),
      ...(detail.point !== undefined ? { point: detail.point } : {}),
      ...(detail.conversion ? { conversion: true } : {}),
    };
    this.#proposeCurve(detail.curve, detail.reason, detail.sourceEvent, { immediate, ...extra });
    if (detail.phase === 'commit' && this.#dragSnapshot)
      this.#endDrag(detail.reason, detail.sourceEvent, extra);
  };

  /** The expression field offers its text: the time prefix sets the duration, the rest the curve. */
  #expressionChange = (event: CustomEvent<EasingExpressionChangeDetail>): void => {
    event.stopPropagation();
    if (this.readOnly || this.effectiveDisabled) {
      event.preventDefault();
      return;
    }
    const { text, reason, sourceEvent } = event.detail;
    const parsed = parseEasingExpression(text);
    if (!parsed) {
      event.preventDefault();
      return;
    }
    if (parsed.duration !== undefined && this.timing)
      this.#durationState.set(this.#clampDuration(parsed.duration), reason, sourceEvent);
    const accepted = this.#proposeCurve(parsed.curve, reason, sourceEvent, {
      immediate: true,
      surface: 'expression',
    });
    if (!accepted) event.preventDefault();
  };

  #previewChange = (event: CustomEvent<{ playing: boolean }>): void => {
    event.stopPropagation();
    this.#playing = event.detail.playing;
    this.requestUpdate();
  };

  // ---- composed sliders ----------------------------------------------------------------------

  #sliderChange(
    parameter: EasingParameter,
    event: TpValueChangeEvent<SliderValue | undefined>,
  ): void {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const slider = event.currentTarget as TpSlider;
    const { value, reason, sourceEvent } = event.detail;
    const curve = this.#curve;
    if (typeof value !== 'number' || !curve || this.readOnly || this.effectiveDisabled) {
      event.preventDefault();
      return;
    }
    if (this.#suppressedSlider === slider) {
      event.preventDefault();
      return;
    }
    if (reason === 'track-press' || reason === 'drag') {
      this.#beginDrag();
      this.#sliderReason = reason;
    }
    const immediate = reason !== 'track-press' && reason !== 'drag';
    const accepted = this.#proposeCurve(
      withEasingParameter(
        curve,
        parameter.definition.key,
        clampParameter(parameter.definition, value),
      ),
      reason,
      sourceEvent,
      { immediate, surface: 'slider', parameter: parameter.definition.key },
    );
    if (!accepted) event.preventDefault();
  }

  #sliderCommit = (event: TpValueCommitEvent<SliderValue | undefined>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const { reason, sourceEvent } = event.detail;
    if (this.#suppressedSlider === event.currentTarget) return;
    if (reason === 'drag' || reason === 'track-press')
      this.#endDrag(reason, sourceEvent, { surface: 'slider' });
  };

  #sliderKeyDown = (event: KeyboardEvent): void => {
    const slider = event.currentTarget as TpSlider;
    if (event.key !== 'Escape' || !slider.dragging || !this.#dragSnapshot) return;
    event.preventDefault();
    event.stopPropagation();
    this.#restoreDrag('escape-key', event);
    this.#suppressedSlider = slider;
    const release = () => {
      if (this.#suppressedSlider === slider) this.#suppressedSlider = null;
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
        slider.removeEventListener(type, release);
    };
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const)
      slider.addEventListener(type, release);
  };

  /** Pointer cancellation restores the pre-drag value (Widgets 6.2 Keyboard and pointer). */
  #sliderPointerCancel = (event: PointerEvent): void => {
    const slider = event.currentTarget as TpSlider;
    if (this.#dragSnapshot && this.#suppressedSlider !== slider)
      this.#restoreDrag('pointer', event);
  };

  /** A release the Slider did not commit still ends the widget's drag with the gesture's reason. */
  #sliderRelease = (event: PointerEvent): void => {
    const slider = event.currentTarget as TpSlider;
    if (!this.#dragSnapshot || this.#suppressedSlider === slider) return;
    this.#endDrag(this.#sliderReason ?? (slider.dragging ? 'drag' : 'track-press'), event, {
      surface: 'slider',
    });
  };

  // ---- duration lane -------------------------------------------------------------------------

  #durationSliderChange = (event: TpValueChangeEvent<SliderValue | undefined>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const { value, reason, sourceEvent } = event.detail;
    if (typeof value !== 'number' || this.readOnly || this.effectiveDisabled) {
      event.preventDefault();
      return;
    }
    const next = this.#clampDuration(value);
    const accepted = this.#durationState.set(next, reason, sourceEvent);
    if (!accepted && this.duration !== next) event.preventDefault();
    else (event.currentTarget as TpSlider).value = this.duration;
  };

  // ---- fields --------------------------------------------------------------------------------

  #fieldChange(binding: NumberFieldBinding, event: TpValueChangeEvent<number | null>): void {
    if (event.target !== binding.input) return;
    event.stopPropagation();
    const { value, reason, sourceEvent } = event.detail;
    if (value === null) return;
    const clamped = clampParameter(binding.definition, value);
    if (binding.key === 'duration') {
      const next = this.#clampDuration(clamped);
      const accepted = this.#durationState.set(next, reason, sourceEvent);
      if (!accepted && this.duration !== next) {
        event.preventDefault();
        return;
      }
      binding.controller.update({ value: this.duration });
      return;
    }
    const curve = this.#curve;
    if (!curve) return;
    if (binding.previous === null) binding.previous = this.value;
    const accepted = this.#proposeCurve(
      withEasingParameter(curve, binding.definition.key, clamped),
      reason,
      sourceEvent,
      { surface: 'field', parameter: binding.definition.key },
    );
    if (!accepted) {
      event.preventDefault();
      return;
    }
    // Accept the controlled field proposal synchronously so the NumberField keeps editing.
    binding.controller.update({ value: clamped });
  }

  #fieldCommit(binding: NumberFieldBinding, event: TpValueCommitEvent<number | null>): void {
    if (event.target !== binding.input) return;
    event.stopPropagation();
    if (binding.key === 'duration') return;
    const previous = binding.previous ?? this.value;
    binding.previous = null;
    this.#emitCommit(
      this.value,
      previous,
      event.detail.reason,
      event.detail.sourceEvent,
      this.#metadata({ surface: 'field', parameter: binding.definition.key }),
    );
  }

  #fieldOptions(definition: EasingParameterDefinition, current: number) {
    // The Number field's step is its validity grid: never coarser than the display precision.
    const step = Math.min(definition.step, 10 ** -definition.precision);
    return {
      value: Number(formatParameter(definition, current)),
      minimum: definition.min,
      maximum: definition.max,
      step,
      smallStep: Math.min(definition.smallStep, step),
      largeStep: definition.largeStep,
      format: { maximumFractionDigits: definition.precision, useGrouping: false },
      ...(this.locale ? { locale: this.locale } : {}),
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
    };
  }

  #durationDefinition(): EasingParameterDefinition {
    const precision = Math.max(0, Math.min(4, Math.ceil(-Math.log10(this.durationStep || 0.01))));
    return {
      key: 'duration',
      min: Math.max(0, Math.min(this.durationMin, this.durationMax)),
      max: Math.max(this.durationMin, this.durationMax),
      step: this.durationStep > 0 ? this.durationStep : 0.01,
      smallStep: (this.durationStep > 0 ? this.durationStep : 0.01) / 10,
      largeStep: (this.durationStep > 0 ? this.durationStep : 0.01) * 10,
      precision,
      default: 0.7,
    };
  }

  #definitionByKey(key: string): [EasingParameterDefinition, number] | undefined {
    if (key === 'duration') return [this.#durationDefinition(), this.duration];
    // Field keys are scoped (`param:x1`) so the duration field never collides with a parameter.
    const bare = key.startsWith('param:') ? key.slice('param:'.length) : key;
    const parameter = easingParameters(this.#curve).find((entry) => entry.definition.key === bare);
    return parameter ? [parameter.definition, parameter.value] : undefined;
  }

  #syncNumberFields(): void {
    for (const [key, binding] of this.#numberFields)
      if (
        !binding.input.isConnected ||
        binding.root.dataset.numberField !== key ||
        binding.root.querySelector('tp-input') !== binding.input
      ) {
        this.#disposeField(binding);
        this.#numberFields.delete(key);
      }
    for (const root of this.renderRoot.querySelectorAll<HTMLElement>('[data-number-field]')) {
      const key = root.dataset.numberField!;
      const resolved = this.#definitionByKey(key);
      const input = root.querySelector<TpInput>('tp-input');
      if (!resolved || !input) continue;
      const [definition, current] = resolved;
      const binding = this.#numberFields.get(key);
      if (binding) {
        binding.definition = definition;
        const { value, ...options } = this.#fieldOptions(definition, current);
        binding.controller.update(
          Object.is(binding.controller.value, value) ? options : { ...options, value },
        );
        continue;
      }
      if (!input.hasUpdated) {
        void input.updateComplete.then(() => this.requestUpdate());
        continue;
      }
      const scope = new CleanupScope();
      const controller = new NumberFieldController(
        root,
        input,
        this.#fieldOptions(definition, current),
      );
      const created: NumberFieldBinding = {
        controller,
        root,
        input,
        scope,
        key,
        definition,
        previous: null,
      };
      const group =
        root.localName === 'tp-input-group'
          ? root
          : root.querySelector<HTMLElement>('tp-input-group');
      if (group) scope.add(controller.registerGroup(group).dispose);
      scope.listen(input, 'tp-value-change' as keyof GlobalEventHandlersEventMap, (event) =>
        this.#fieldChange(created, event as unknown as TpValueChangeEvent<number | null>),
      );
      scope.listen(input, 'tp-value-commit' as keyof GlobalEventHandlersEventMap, (event) =>
        this.#fieldCommit(created, event as unknown as TpValueCommitEvent<number | null>),
      );
      scope.listen(input, 'tp-field-value' as keyof GlobalEventHandlersEventMap, (event) =>
        event.stopPropagation(),
      );
      this.#numberFields.set(key, created);
    }
  }

  #disposeField(binding: NumberFieldBinding): void {
    binding.scope.dispose();
    binding.controller.dispose();
  }

  // ---- kinds, presets, selectors -------------------------------------------------------------

  #tabsChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = event.detail.value;
    if (!isCategory(next) || next === this.category) return;
    if (this.readOnly || this.effectiveDisabled) {
      event.preventDefault();
      return;
    }
    const current = this.#curve;
    const converted = current
      ? convertEasingCurve(current, next === 'spring' ? 'spring' : 'bezier')
      : parseEasingCurve(DEFAULT_CURVES[next])!;
    const accepted = this.#proposeCurve(
      converted,
      interactionReason(event.detail.sourceEvent),
      event.detail.sourceEvent,
      {
        immediate: true,
        surface: 'tabs',
        conversion: current !== null,
      },
    );
    if (!accepted && event.cancelable) event.preventDefault();
  };

  #presetChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    // The widget's value lane owns the selection; the group never adopts on its own.
    event.preventDefault();
    if (this.readOnly || this.effectiveDisabled) return;
    const id = event.detail.value[0];
    if (!id) {
      // Re-pressing the current tile deselects nothing; the press still restarts the preview.
      if (this.presetId) void this.#graph?.play();
      return;
    }
    const preset = this.#presetById(id);
    const parsed = preset ? parseEasingCurve(preset.value) : null;
    if (!parsed) return;
    const source = event.detail.sourceEvent;
    const before = this.value;
    this.#proposeCurve(parsed, interactionReason(source), source, {
      immediate: true,
      surface: 'preset',
      presetId: id,
    });
    // An unchanged value commits nothing, so the press restarts the preview itself.
    if (this.value === before) void this.updateComplete.then(() => this.#graph?.play());
    if (this.layout === 'compact' && this.presetsOpen) {
      this.#presetsOpenState.set(false, 'item-press', source);
      void this.updateComplete.then(() => this.#presetsToggle()?.focus());
    }
  };

  #presetsToggleChange = (event: TpValueChangeEvent<boolean>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = Boolean(event.detail.value);
    const accepted = this.#presetsOpenState.set(next, 'trigger-press', event.detail.sourceEvent);
    if (!accepted && this.presetsOpen !== next) event.preventDefault();
    else (event.currentTarget as TpToggle).pressed = this.presetsOpen;
  };

  #presetsKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || this.layout !== 'compact' || !this.presetsOpen) return;
    event.preventDefault();
    event.stopPropagation();
    if (this.#presetsOpenState.set(false, 'escape-key', event))
      void this.updateComplete.then(() => this.#presetsToggle()?.focus());
  };

  #addPoint = (event: Event): void => {
    const current = this.#curve;
    if (current?.kind !== 'custom' || this.readOnly || this.effectiveDisabled) return;
    const points = [...normalizePoints(current.points)];
    const focused = this.#graph?.focusedPoint;
    const after = Math.min(points.length - 2, Math.max(0, focused ?? points.length - 2));
    const a = points[after]!;
    const b = points[after + 1]!;
    points.splice(after + 1, 0, {
      input: (a.input + b.input) / 2,
      output: (a.output + b.output) / 2,
    });
    if (
      this.#proposeCurve({ kind: 'custom', points }, interactionReason(event), event, {
        immediate: true,
        surface: 'point',
        point: after + 1,
      })
    )
      void this.updateComplete.then(() => this.#graph?.focusInput('point', after + 1));
  };

  #removePoint = (event: Event): void => {
    const current = this.#curve;
    if (current?.kind !== 'custom' || this.readOnly || this.effectiveDisabled) return;
    const points = normalizePoints(current.points);
    if (points.length <= 2) return;
    const focused = this.#graph?.focusedPoint;
    const index =
      focused !== null && focused !== undefined && focused > 0 && focused < points.length - 1
        ? focused
        : points.length - 2;
    const next = points.filter((_, position) => position !== index);
    if (
      this.#proposeCurve({ kind: 'custom', points: next }, interactionReason(event), event, {
        immediate: true,
        surface: 'point',
        point: index,
      })
    )
      void this.updateComplete.then(() => this.#graph?.focusInput('point', Math.max(0, index - 1)));
  };

  #adapterChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = event.detail.value;
    if (typeof next !== 'string') return;
    const accepted = this.#adapterState.set(next, 'item-press', event.detail.sourceEvent);
    if (!accepted && this.adapter !== next) event.preventDefault();
    else (event.currentTarget as TpSelect).value = this.adapter;
  };

  /** The header Button cycles the preview mode and replays it so the change is visible. */
  #cyclePreview = (): void => {
    if (this.effectiveDisabled) return;
    const index = EASING_PREVIEW_CYCLE.indexOf(this.preview);
    this.preview = EASING_PREVIEW_CYCLE[(index + 1) % EASING_PREVIEW_CYCLE.length]!;
    void this.updateComplete.then(() => this.#graph?.play());
  };

  // ---- presentation plumbing -----------------------------------------------------------------

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    for (const nested of this.renderRoot.querySelectorAll<
      HTMLElement & { partPresentation?: unknown }
    >(`${NESTED_HOSTS}, ${SURFACES}`)) {
      if (!changed && this.#composed.has(nested)) continue;
      this.#composed.add(nested);
      setPartComposition(
        nested as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
  }

  async #registerNestedParts(): Promise<void> {
    for (const slider of this.renderRoot.querySelectorAll<TpSlider>('tp-slider')) {
      await slider.updateComplete;
      if (!slider.isConnected) continue;
      const root = slider.shadowRoot;
      if (!root) continue;
      this.#registerOnce(
        root.querySelector<HTMLElement>('[part~="slider-track"]'),
        'easing-editor-slider-track',
      );
      this.#registerOnce(
        root.querySelector<HTMLElement>('[part~="slider-range"]'),
        'easing-editor-slider-range',
      );
      for (const thumb of root.querySelectorAll<
        HTMLElement & { visualElement: HTMLElement | null; updateComplete: Promise<unknown> }
      >('tp-slider-thumb')) {
        await thumb.updateComplete;
        this.#registerOnce(thumb.visualElement, 'easing-editor-slider-thumb');
      }
    }
    for (const group of this.renderRoot.querySelectorAll<TpToggleGroup>(
      'tp-toggle-group.presets',
    )) {
      await group.updateComplete;
      if (!group.isConnected) continue;
      this.#registerOnce(
        group.shadowRoot?.querySelector<HTMLElement>('[part~="toggle-group"]') ?? null,
        'easing-editor-preset-grid',
      );
      for (const toggle of group.querySelectorAll<TpToggle>('tp-toggle')) {
        await toggle.updateComplete;
        this.#registerOnce(
          toggle.shadowRoot?.querySelector<HTMLElement>('[part~="toggle"]') ?? null,
          'easing-editor-preset-item',
        );
      }
    }
    const presetsToggle = this.renderRoot.querySelector<TpToggle>('tp-toggle.presets-toggle');
    if (presetsToggle) {
      await presetsToggle.updateComplete;
      this.#registerOnce(
        presetsToggle.shadowRoot?.querySelector<HTMLElement>('[part~="toggle"]') ?? null,
        'easing-editor-presets-toggle',
      );
    }
    for (const [element, release] of this.#registeredParts)
      if (!element.isConnected) {
        release();
        this.#registeredParts.delete(element);
      }
  }

  #registerOnce(element: HTMLElement | null, name: string): void {
    if (!element || this.#registeredParts.has(element)) return;
    this.#registeredParts.set(element, this.presentationController.registerPart(name, element));
  }

  #graphInput(): HTMLElement | null {
    const graph = this.#graph;
    return graph?.renderRoot?.querySelector<HTMLElement>('input') ?? null;
  }

  #firstControl(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(NESTED_HOSTS);
  }

  #presetsToggle(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('tp-toggle.presets-toggle');
  }

  // ---- render --------------------------------------------------------------------------------

  protected override render() {
    const strings = this.#strings;
    const curve = this.#curve;
    const compact = this.layout === 'compact';
    const beside = !compact && this.presetPicker;
    const state = {
      value: this.value,
      kind: curve?.kind ?? null,
      layout: this.layout,
      size: this.size,
      timing: this.timing,
      preview: this.preview,
      empty: !curve,
      dragging: this.#dragging,
      playing: this.#playing,
      presetsOpen: compact && this.presetsOpen,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
    };
    const label = this.label
      ? this.renderPart('easing-editor-label', state, {
          tag: 'span',
          properties: {
            part: 'easing-editor-label',
            class: 'label',
            '@click': () => this.activateFromLabel(),
          },
          content: this.label,
        })
      : nothing;
    const presets = beside
      ? html`<div class="column presets-column">${this.#renderPresets(false)}</div>`
      : nothing;
    const body = html`<div class="body" ?data-presets-beside=${beside}>
      ${presets}
      <div class="column">
        <div class="graph-box">
          ${this.#renderGraph()}${this.#renderBadge()}${compact && this.presetPicker && this.presetsOpen ? this.#renderPresets(true) : nothing}
        </div>
        ${this.#renderFrames()}${this.#renderControls()}${this.#renderDuration()}${this.#renderFooterRow()}
      </div>
    </div>`;
    return this.renderPart('easing-editor', state, {
      tag: 'div',
      properties: {
        part: 'easing-editor',
        class: 'root',
        role: 'group',
        'aria-label': this.label || this.getAttribute('aria-label') || strings.label,
        'data-kind': curve?.kind ?? 'empty',
        'data-layout': this.layout,
        'data-timing': this.timing,
        'data-preview': this.preview,
        'data-empty': !curve,
        'data-dragging': this.#dragging,
        'data-playing': this.#playing,
        'data-presets-open': state.presetsOpen,
        'data-disabled': this.effectiveDisabled,
        'data-readonly': this.readOnly,
        ...this.#panelListeners(),
      },
      content: html`${label}${this.#renderHeader()}${body}${this.renderPart(
        'easing-editor-footer',
        state,
        {
          tag: 'div',
          properties: { part: 'easing-editor-footer', class: 'footer' },
          content: html`<slot name="footer"></slot>`,
        },
      )}`,
    });
  }

  /** Listeners that keep every nested lane event inside the widget. */
  #panelListeners(): Record<string, unknown> {
    const listeners: Record<string, unknown> = {};
    for (const type of NESTED_EVENT_TYPES) listeners[`@${type}`] = this.#containNested;
    return listeners;
  }

  #title(): string {
    const strings = this.#strings;
    const curve = this.#curve;
    if (!curve) return strings.empty;
    const id = this.presetId;
    const preset = id ? this.#presetById(id) : undefined;
    return preset ? preset.label : strings.kindCustom;
  }

  /** The matching preset's name (or the kind) floats over the graph's bottom-right corner. */
  #renderBadge() {
    return this.renderPart(
      'easing-editor-badge',
      { title: this.#title() },
      {
        tag: 'tp-badge',
        properties: { part: 'easing-editor-badge', class: 'badge', variant: 'secondary' },
        content: this.#title(),
      },
    );
  }

  #renderHeader() {
    const strings = this.#strings;
    const compact = this.layout === 'compact';
    const tabs = html`<tp-tabs
      class="kinds"
      variant="enclosed"
      activation="automatic"
      label=${strings.categories}
      ?disabled=${this.effectiveDisabled}
      .value=${this.category ?? 'ease'}
      @tp-value-change=${this.#tabsChange}
      @tp-presence-complete=${stop}
      >${EASING_CATEGORIES.map(
        (category) =>
          html`<button slot="tab" value=${category}>
            ${strings[CATEGORY_STRING_KEYS[category]]}
          </button>`,
      )}</tp-tabs
    >`;
    const play =
      this.preview === 'none'
        ? nothing
        : html`<tp-button
            class="play"
            part="easing-editor-play"
            variant="outline"
            size="icon-sm"
            .icon=${replayIcon}
            aria-label=${this.#dimensionLabel(strings.play)}
            ?disabled=${this.effectiveDisabled || !this.#curve}
            @click=${() => void this.play()}
          ></tp-button>`;
    const modeLabel = strings[PREVIEW_MODE_STRING_KEYS[this.preview]];
    const mode =
      this.previewControls && this.preview !== 'none'
        ? html`<tp-button
            class="preview-mode"
            part="easing-editor-preview-mode"
            variant="outline"
            size="sm"
            aria-label=${this.#dimensionLabel(`${strings.previewMode}: ${modeLabel}`)}
            ?disabled=${this.effectiveDisabled}
            @click=${this.#cyclePreview}
            >${modeLabel}</tp-button
          >`
        : nothing;
    const presetsToggle =
      compact && this.presetPicker
        ? html`<tp-toggle
            class="presets-toggle"
            part="easing-editor-presets-toggle"
            variant="outline"
            size="sm"
            aria-label=${this.#dimensionLabel(strings.showPresets)}
            .pressed=${this.presetsOpen}
            ?disabled=${this.effectiveDisabled}
            @tp-value-change=${this.#presetsToggleChange}
            @tp-field-value=${stop}
            ><tp-icon .icon=${easeInOutControlPointsIcon} aria-hidden="true"></tp-icon
          ></tp-toggle>`
        : nothing;
    return this.renderPart(
      'easing-editor-header',
      { kind: this.kind, layout: this.layout },
      {
        tag: 'div',
        properties: { part: 'easing-editor-header', class: 'header' },
        content: html`${tabs}${play}${mode}${presetsToggle}`,
      },
    );
  }

  #renderPresets(overlay: boolean) {
    const strings = this.#strings;
    const groups = renderPresetGroups(this.#presetGroups(), {
      selected: this.presetId,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      onChange: this.#presetChange,
    });
    return this.renderPart(
      'easing-editor-presets',
      { overlay, open: overlay ? this.presetsOpen : true },
      {
        tag: 'div',
        properties: {
          part: 'easing-editor-presets',
          class: 'presets-panel',
          role: 'group',
          'aria-label': this.#dimensionLabel(strings.presets),
          'data-overlay': overlay,
          '@keydown': this.#presetsKeyDown,
        },
        content: html`<tp-scroll-area
          axis="y"
          scrollbar-visibility="on-hover"
          label=${this.#dimensionLabel(strings.presets)}
          ><div class="presets-list">${groups}</div></tp-scroll-area
        >`,
      },
    );
  }

  #renderGraph() {
    return html`<tp-easing-editor-graph
      exportparts="easing-editor-graph, easing-editor-graph-grid, easing-editor-graph-curve, easing-editor-graph-handle, easing-editor-graph-handle-line, easing-editor-graph-point, easing-editor-graph-preview"
      .curve=${this.#curve}
      .label=${this.label}
      .strings=${this.#strings}
      .preview=${this.preview}
      .heldRange=${this.#shownRange()}
      .duration=${this.duration}
      ?disabled=${this.effectiveDisabled}
      ?readonly=${this.readOnly}
      @easing-surface-change=${this.#surfaceChange}
      @easing-preview-change=${this.#previewChange}
    ></tp-easing-editor-graph>`;
  }

  #renderControls() {
    const strings = this.#strings;
    const curve = this.#curve;
    if (!curve) return nothing;
    // Bézier control points have no rows: the graph and the expression field edit them.
    const parameters = curve.kind === 'bezier' ? [] : easingParameters(curve);
    let selectors: unknown = nothing;
    if (curve.kind === 'custom') {
      const points = normalizePoints(curve.points).length;
      selectors = html`<div class="selectors">
        <tp-button
          class="add-point"
          variant="outline"
          size="sm"
          .icon=${plusIcon}
          ?disabled=${this.effectiveDisabled || this.readOnly}
          @click=${this.#addPoint}
          >${strings.addPoint}</tp-button
        ><tp-button
          class="remove-point"
          variant="outline"
          size="sm"
          .icon=${minusIcon}
          ?disabled=${this.effectiveDisabled || this.readOnly || points <= 2}
          @click=${this.#removePoint}
          >${strings.removePoint}</tp-button
        >
      </div>`;
    }
    const settle =
      curve.kind === 'spring'
        ? html`<span class="settle"
            >${strings.settle}
            ${formatEasingNumber(springSettleTime(curve), 2)}${strings.seconds}</span
          >`
        : nothing;
    return this.renderPart(
      'easing-editor-controls',
      { kind: curve.kind, count: parameters.length },
      {
        tag: 'div',
        properties: { part: 'easing-editor-controls', class: 'controls', 'data-kind': curve.kind },
        content: html`${selectors}${parameters.map((parameter) => this.#renderParameter(parameter))}${settle}`,
      },
    );
  }

  #renderParameter(parameter: EasingParameter) {
    const strings = this.#strings;
    const name = strings[parameter.name];
    const { definition, value } = parameter;
    return this.renderPart(
      'easing-editor-parameter',
      { parameter: definition.key, value },
      {
        tag: 'div',
        properties: {
          part: 'easing-editor-parameter',
          class: 'parameter',
          'data-parameter': definition.key,
        },
        content: html`${this.#renderSlider(definition, value, name, (event) =>
          this.#sliderChange(parameter, event),
        )}${this.#renderField(`param:${definition.key}`, name)}`,
      },
    );
  }

  #renderSlider(
    definition: EasingParameterDefinition,
    current: number,
    name: string,
    onChange: (event: TpValueChangeEvent<SliderValue | undefined>) => void,
    extra: Record<string, unknown> = {},
  ) {
    const label = this.#dimensionLabel(name);
    return html`<tp-slider
      class=${`parameter-slider ${definition.key}`}
      exportparts="slider-track: easing-editor-slider-track, slider-range: easing-editor-slider-range, slider-thumb: easing-editor-slider-thumb"
      label=${name}
      thumb-alignment="edge"
      .minimum=${definition.min}
      .maximum=${definition.max}
      .step=${definition.step}
      .largeStep=${definition.largeStep}
      .formAssociatedValue=${false}
      .value=${Number(formatParameter(definition, current))}
      .getAccessibleLabel=${() => label}
      .getAccessibleValueText=${(_formatted: string, value: number) => formatParameter(definition, value)}
      ?disabled=${this.effectiveDisabled}
      ?readonly=${this.readOnly}
      @tp-value-change=${onChange}
      @tp-value-commit=${extra['@tp-value-commit'] ?? this.#sliderCommit}
      @tp-field-value=${stop}
      @keydown=${this.#sliderKeyDown}
      @pointercancel=${this.#sliderPointerCancel}
      @pointerup=${this.#sliderRelease}
      @lostpointercapture=${this.#sliderRelease}
    ></tp-slider>`;
  }

  /** One editor: the Input group host is the field part and the NumberField root. */
  #renderField(key: string, name: string, suffix?: string) {
    return html`<tp-input-group class="field" part="easing-editor-field" data-number-field=${key}
      ><tp-input
        label=${this.#dimensionLabel(name)}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
      ></tp-input
      >${suffix ? html`<span slot="suffix">${suffix}</span>` : nothing}</tp-input-group
    >`;
  }

  #renderDuration() {
    if (!this.timing) return nothing;
    const strings = this.#strings;
    const definition = this.#durationDefinition();
    return this.renderPart(
      'easing-editor-duration',
      { duration: this.duration },
      {
        tag: 'div',
        properties: {
          part: 'easing-editor-duration',
          class: 'duration parameter',
          'data-parameter': 'duration',
        },
        content: html`${this.#renderSlider(
          definition,
          this.duration,
          strings.duration,
          this.#durationSliderChange,
          {
            '@tp-value-commit': stop,
          },
        )}${this.#renderField('duration', strings.duration, strings.seconds)}`,
      },
    );
  }

  #renderFrames() {
    if (!this.frames) return nothing;
    return html`<tp-easing-editor-frames
      exportparts="easing-editor-frames, easing-editor-frames-tick"
      .curve=${this.#curve}
      .heldRange=${this.#shownRange()}
      .label=${this.label}
      .strings=${this.#strings}
      ?disabled=${this.effectiveDisabled}
    ></tp-easing-editor-frames>`;
  }

  #renderFooterRow() {
    const strings = this.#strings;
    const adapters = this.adapters.length ? this.adapters : DEFAULT_ADAPTERS;
    const output = this.output;
    const select =
      adapters.length > 1
        ? html`<tp-select
            class="adapter"
            label=${strings.export}
            .items=${adapters.map((adapter) => ({ value: adapter.id, label: adapter.label }))}
            .value=${this.#activeAdapter()?.id ?? this.adapter}
            ?disabled=${this.effectiveDisabled}
            @tp-value-change=${this.#adapterChange}
            @tp-field-value=${stop}
          ></tp-select>`
        : nothing;
    // The output is an Input group: the format as its leading addon, the Copy button trailing.
    return html`<div class="footer-row" ?data-adapters=${adapters.length > 1}>
      ${select}<tp-input-group class="output-group" part="easing-editor-output-group"
        ><span slot="prefix" class="format">${this.#activeAdapter()?.label ?? ''}</span
        ><tp-easing-editor-expression
          class="output"
          exportparts="easing-editor-output, easing-editor-output-token"
          .text=${output}
          .label=${this.label}
          .strings=${strings}
          ?disabled=${this.effectiveDisabled}
          ?readonly=${this.readOnly}
          @easing-expression-change=${this.#expressionChange}
        ></tp-easing-editor-expression
        ><tp-copy-button
          slot="suffix"
          class="copy"
          part="easing-editor-copy"
          size="sm"
          .value=${output}
          label=${this.#dimensionLabel(strings.copy)}
          ?disabled=${this.effectiveDisabled || !output}
        ></tp-copy-button
      ></tp-input-group>
    </div>`;
  }

  #dimensionLabel(name: string): string {
    return this.label ? `${this.label}: ${name}` : name;
  }
}

/** Re-exported so consumers can type the commit detail. */
export type EasingEditorChangeDetail = ValueChangeDetail<string> & {
  metadata?: EasingEditorChangeMetadata;
};

declare global {
  interface HTMLElementTagNameMap {
    'tp-easing-editor': TpEasingEditor;
  }
}

export { DEFAULT_SPRING };
