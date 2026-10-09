import { html, nothing, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import {
  TpOpenChangeEvent,
  TpValueChangeEvent,
  TpValueCommitEvent,
} from '../../foundation/events.js';
import type { ChangeReason, ValueChangeDetail } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { bindPart, preventComponentHandling } from '../../foundation/part.js';
import { CleanupScope } from '../../foundation/services.js';
import { surfaceInteraction } from '../../foundation/surface-focus.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { NumberFieldController } from '../../foundation/number-field/controller.js';
import { setPartComposition } from '../../presentation/controller.js';
import { colorPickerPresentation } from '../../presentation/families/color-picker.js';
import { TpSlider } from '../../components/slider/slider.js';
import type { SliderValue } from '../../components/slider/types.js';
import { TpInput } from '../../components/input/input.js';
import { TpInputGroup } from '../../components/input-group/input-group.js';
import { TpSelect } from '../../components/select/select.js';
import { TpButton } from '../../components/button/button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpLabel } from '../../components/label/label.js';
import { TpTabs } from '../../components/tabs/tabs.js';
import { TpToggleGroup } from '../../components/toggle-group/toggle-group.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import { TpPopover } from '../../components/popover/popover.js';
import { pipetteIcon } from '../../icons/pipette.js';
import { wandSparklesIcon } from '../../icons/wand-sparkles.js';
import {
  ALPHA_CHANNEL,
  channelDefinitions,
  clampChannel,
  formatChannelValue,
  type ChannelDefinition,
} from './color/channels.js';
import {
  HARMONY_RULES,
  harmonyBaseIndex,
  harmonyColors,
  seedCustomHandles,
  type HarmonyRule,
  type Hsv,
} from './color/harmony.js';
import { parseColor } from './color/parse.js';
import { generateSchemeRows, type SchemeRowId } from './color/scheme.js';
import { displayColor, serializeColor } from './color/serialize.js';
import {
  COLOR_FORMATS,
  color,
  isColorFormat,
  type ColorFormat,
  type ColorValue,
} from './color/types.js';
import { channelName, channelValueText, dimensionLabel, stepForKey } from './dimensions.js';
import { pickScreenColor, supportsEyeDropper } from './eyedropper.js';
import {
  alphaGradient,
  areaGradient,
  channelGradient,
  flatGradient,
  hueConicGradient,
  hueGradient,
  wheelGradient,
} from './gradients.js';
import {
  channelDisplayValue,
  fromHsv,
  normalizeColorText,
  stickyHsv,
  toWorkingSpace,
  withAlpha,
  withChannel,
} from './model.js';
import { pushRecent } from './recent.js';
import { resolveStrings } from './strings.js';
import { colorPickerStyles } from './styles.js';
import {
  HUE_CHANNEL,
  VALUE_CHANNEL,
  type ColorSurfaceChangeDetail,
} from './surfaces/surface-element.js';
import { TpColorPickerArea } from './surfaces/area.js';
import { TpColorPickerWheel } from './surfaces/wheel.js';
import { TpColorPickerTriangle } from './surfaces/triangle.js';
import { renderSwatchRow, type SwatchRow } from './views/swatches.js';
import {
  COLOR_PICKER_VIEWS,
  listConverter,
  type ColorPickerChangeMetadata,
  type ColorPickerPicker,
  type ColorPickerShape,
  type ColorPickerSize,
  type ColorPickerStrings,
  type ColorPickerSurface,
  type ColorPickerView,
  type ColorScheme,
  type ColorSwatchInput,
} from './types.js';

export type ColorPickerValueChangeCallback = (event: TpValueChangeEvent<string>) => void;
export type ColorPickerValueCommitCallback = (event: TpValueCommitEvent<string>) => void;

interface DragSnapshot {
  readonly value: string;
  readonly hsv: Hsv;
}
interface ImmediateCommit {
  readonly reason: ChangeReason;
  readonly source: Event | undefined;
  readonly previous: string;
  readonly metadata: ColorPickerChangeMetadata;
}
interface NumberFieldBinding {
  readonly controller: NumberFieldController;
  readonly root: HTMLElement;
  readonly input: TpInput;
  readonly scope: CleanupScope;
  /** Refreshed on every update: a key such as `lightness` has one definition per format. */
  definition: ChannelDefinition;
  previous: string | null;
}
/** Which HSV component a composed Slider edits when it is not a channel of the format. */
type HsvKey = 'h' | 'v';
interface SliderOptions {
  readonly hsv?: HsvKey;
  readonly visibleLabel?: boolean;
}

const BLACK = color('srgb', [0, 0, 0]);
const FORMAT_STRING_KEYS: Readonly<Record<ColorFormat, keyof ColorPickerStrings>> = {
  hex: 'formatHex',
  rgb: 'formatRgb',
  hsl: 'formatHsl',
  hwb: 'formatHwb',
  hsv: 'formatHsv',
  lab: 'formatLab',
  oklab: 'formatOklab',
  oklch: 'formatOklch',
  cmyk: 'formatCmyk',
};
const VIEW_STRING_KEYS: Readonly<Record<ColorPickerView, keyof ColorPickerStrings>> = {
  area: 'viewArea',
  sliders: 'viewSliders',
  wheel: 'viewWheel',
  triangle: 'viewTriangle',
  swatches: 'viewSwatches',
  schemes: 'viewSchemes',
};
const HARMONY_STRING_KEYS: Readonly<Record<HarmonyRule, keyof ColorPickerStrings>> = {
  none: 'harmonyNone',
  complementary: 'harmonyComplementary',
  analogous: 'harmonyAnalogous',
  triad: 'harmonyTriad',
  compound: 'harmonyCompound',
  custom: 'harmonyCustom',
};
const SCHEME_STRING_KEYS: Readonly<Record<SchemeRowId, keyof ColorPickerStrings>> = {
  tints: 'schemeTints',
  shades: 'schemeShades',
  tones: 'schemeTones',
  analogous: 'schemeAnalogous',
  complementary: 'schemeComplementary',
  triad: 'schemeTriad',
  tetrad: 'schemeTetrad',
};
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-format-change',
  'tp-view-change',
  'tp-harmony-change',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-presence-complete',
] as const;
const NESTED_HOSTS =
  'tp-slider, tp-select, tp-input, tp-input-group, tp-button, tp-label, tp-tabs, tp-toggle-group, tp-toggle, tp-popover';
const SURFACES = 'tp-color-picker-area, tp-color-picker-wheel, tp-color-picker-triangle';
const isView = (value: unknown): value is ColorPickerView =>
  typeof value === 'string' && (COLOR_PICKER_VIEWS as readonly string[]).includes(value);
const isHarmony = (value: unknown): value is HarmonyRule =>
  typeof value === 'string' && (HARMONY_RULES as readonly string[]).includes(value);
const stop = (event: Event): void => event.stopPropagation();

/**
 * Color picker widget (UI Widgets Specification 6.1): one CSS color edited through a
 * saturation/brightness area, hue and alpha Sliders, format Select and numeric fields, with
 * further views (sliders, wheel, triangle, swatches, schemes) and an inline or popup picker.
 * Every constituent is a library component; only the render surfaces are widget-owned.
 */
export class TpColorPicker extends TpFormElement<string> {
  static tagName = 'tp-color-picker';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpColorPickerArea,
      TpColorPickerWheel,
      TpColorPickerTriangle,
      TpSlider,
      TpInput,
      TpInputGroup,
      TpSelect,
      TpButton,
      TpIcon,
      TpLabel,
      TpTabs,
      TpToggleGroup,
      TpToggle,
      TpPopover,
    ];
  }
  static override presentation = colorPickerPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    format: { type: String, noAccessor: true },
    defaultFormat: { type: String, attribute: 'default-format' },
    formats: { converter: listConverter },
    alpha: { type: Boolean, converter: defaultTrue },
    picker: { type: String, reflect: true },
    views: { converter: listConverter },
    view: { type: String, noAccessor: true },
    defaultView: { type: String, attribute: 'default-view' },
    fields: { type: Boolean, converter: defaultTrue },
    formatSelect: { type: Boolean, attribute: 'format-select', converter: defaultTrue },
    preview: { type: Boolean, converter: defaultTrue },
    eyedropper: { type: Boolean, converter: defaultTrue },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    harmony: { type: String, noAccessor: true },
    defaultHarmony: { type: String, attribute: 'default-harmony' },
    swatches: { attribute: false },
    recentLimit: { type: Number, attribute: 'recent-limit' },
    schemes: { attribute: false },
    allowWheelScrub: { type: Boolean, attribute: 'allow-wheel-scrub' },
    label: { type: String },
    locale: { type: String },
    strings: { attribute: false },
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [TpElement.styles, colorPickerStyles];

  defaultValue: string | undefined;
  defaultFormat: ColorFormat | undefined;
  formats: readonly ColorFormat[] = COLOR_FORMATS;
  alpha = true;
  picker: ColorPickerPicker = 'inline';
  views: readonly ColorPickerView[] = ['area'];
  defaultView: ColorPickerView | undefined;
  fields = true;
  formatSelect = true;
  preview = true;
  eyedropper = true;
  size: ColorPickerSize = 'default';
  shape: ColorPickerShape = 'square';
  defaultHarmony: HarmonyRule | undefined;
  swatches: readonly ColorSwatchInput[] = [];
  recentLimit = 8;
  schemes: readonly ColorScheme[] = [];
  allowWheelScrub = false;
  label = '';
  locale = '';
  strings: Partial<ColorPickerStrings> = {};
  defaultOpen = false;
  onValueChange: ColorPickerValueChangeCallback | undefined;
  onValueCommitted: ColorPickerValueCommitCallback | undefined;

  #provided: string | undefined;
  #providedFormat: ColorFormat | undefined;
  #providedView: ColorPickerView | undefined;
  #providedHarmony: HarmonyRule | undefined;
  #providedOpen: boolean | undefined;
  #model: ColorValue | null = null;
  #modelText = '';
  #hsv: Hsv = { h: 0, s: 0, v: 0 };
  #pending: { color: ColorValue; hsv: Hsv; text: string } | null = null;
  #immediate: ImmediateCommit | undefined;
  #dragSnapshot: DragSnapshot | undefined;
  #dragging = false;
  #suppressedSlider: TpSlider | null = null;
  #hexText = '';
  #recent: readonly string[] = [];
  #customHandles: readonly Hsv[] = [];
  #templateIndex = 0;
  #generatedBase: ColorValue | null = null;
  #generated: { identity: string; rows: readonly SwatchRow[] } | undefined;
  #numberFields = new Map<string, NumberFieldBinding>();
  #registeredParts = new Map<Element, () => void>();
  #composed = new WeakSet<Element>();
  #composition: object | undefined;
  #panel: HTMLElement | null = null;
  #authoredTrigger = false;
  #lightObserver: MutationObserver | undefined;
  #eyedropperAbort: AbortController | undefined;
  #strings: ColorPickerStrings = resolveStrings();
  #eyedropperSupported = false;

  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () =>
      this.#provided === undefined ? undefined : this.#normalize(this.#provided),
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : this.#normalize(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: (a, b) => a === b,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#committed(value, previous, reason),
    diagnostic: (message) => this.diagnose('color-picker-state', message),
  });
  readonly #formatState = new ControllableState<ColorFormat>({
    host: this,
    initialValue: 'hex',
    readControlledValue: () => this.#providedFormat,
    readDefaultValue: () => this.defaultFormat,
    hasDefaultValue: () => this.defaultFormat !== undefined,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-format-change'),
    onCommit: (format, previous, reason) => this.#formatCommitted(format, previous, reason),
    diagnostic: (message) => this.diagnose('color-picker-format', message),
  });
  readonly #viewState = new ControllableState<ColorPickerView>({
    host: this,
    initialValue: 'area',
    readControlledValue: () => this.#providedView,
    readDefaultValue: () => this.defaultView ?? this.views[0] ?? 'area',
    hasDefaultValue: () => this.defaultView !== undefined,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-view-change'),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnose('color-picker-view', message),
  });
  readonly #harmonyState = new ControllableState<HarmonyRule>({
    host: this,
    initialValue: 'none',
    readControlledValue: () => this.#providedHarmony,
    readDefaultValue: () => this.defaultHarmony,
    hasDefaultValue: () => this.defaultHarmony !== undefined,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-harmony-change'),
    onCommit: (rule, previous) => this.#harmonyCommitted(rule, previous),
    diagnostic: (message) => this.diagnose('color-picker-harmony', message),
  });

  // ---- public value lane -----------------------------------------------------------------

  override get value(): string {
    return this.#state.value;
  }
  override set value(value: string) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : String(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  get format(): ColorFormat {
    return this.#formatState.value;
  }
  set format(value: ColorFormat) {
    const previous = this.format;
    const next = isColorFormat(value) ? value : undefined;
    // Provided before the first update (or while controlled): the lane is owner-authoritative.
    // Written later on an uncontrolled lane: an ordinary programmatic proposal.
    if (!this.hasUpdated || this.#formatState.controlled) {
      this.#providedFormat = next;
      if (this.hasUpdated) this.#formatState.sync();
    } else if (next) this.#formatState.set(next, 'programmatic');
    this.requestUpdate('format', previous);
  }
  get view(): ColorPickerView {
    return this.#viewState.value;
  }
  set view(value: ColorPickerView) {
    const previous = this.view;
    const next = isView(value) ? value : undefined;
    if (!this.hasUpdated || this.#viewState.controlled) {
      this.#providedView = next;
      if (this.hasUpdated) this.#viewState.sync();
    } else if (next) this.#viewState.set(next, 'programmatic');
    this.requestUpdate('view', previous);
  }
  get harmony(): HarmonyRule {
    return this.#harmonyState.value;
  }
  set harmony(value: HarmonyRule) {
    const previous = this.harmony;
    const next = isHarmony(value) ? value : undefined;
    if (!this.hasUpdated || this.#harmonyState.controlled) {
      this.#providedHarmony = next;
      if (this.hasUpdated) this.#harmonyState.sync();
    } else if (next) this.#harmonyState.set(next, 'programmatic');
    this.requestUpdate('harmony', previous);
  }
  /** Popup open state; the composed Popover remains the state owner. */
  get open(): boolean {
    return this.#popover?.open ?? this.#providedOpen ?? this.defaultOpen;
  }
  set open(value: boolean | undefined) {
    const previous = this.open;
    this.#providedOpen = value === undefined || value === null ? undefined : Boolean(value);
    this.requestUpdate('open', previous);
  }

  /** The internal floating-point color in the working space of the format, or null when empty. */
  get color(): ColorValue | null {
    return this.#model;
  }
  get controlled(): boolean {
    return this.#state.controlled;
  }
  get dragging(): boolean {
    return this.#dragging;
  }
  get recentColors(): readonly string[] {
    return this.#recent;
  }
  get supportsEyeDropper(): boolean {
    return this.#eyedropperSupported;
  }
  /** Harmony colors in the active format: the base color first, then the derived handles. */
  get harmonyColors(): readonly string[] {
    const model = this.#model;
    if (!model || this.harmony === 'none') return [];
    const colors = this.#wheelColors();
    const baseIndex = harmonyBaseIndex(this.harmony);
    const ordered = [colors[baseIndex]!, ...colors.filter((_, index) => index !== baseIndex)];
    return ordered.map((hsv) =>
      serializeColor(fromHsv(hsv, model.alpha, this.format), this.format),
    );
  }

  /** Proposes and commits a color; returns whether the proposal was accepted. */
  setValue(
    value: string | ColorValue,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    const parsed = typeof value === 'string' ? parseColor(value) : value;
    if (!parsed) return this.#proposeText('', reason, sourceEvent, {});
    return this.#proposeColor(
      this.#adoptAlpha(toWorkingSpace(parsed, this.format)),
      reason,
      sourceEvent,
      { immediate: true },
    );
  }

  clearRecentColors(): void {
    this.#recent = [];
    this.requestUpdate();
  }

  /** Opens the platform eyedropper; resolves true when a color was picked and accepted. */
  async pickFromScreen(): Promise<boolean> {
    const owner = this.ownerDocument.defaultView;
    if (!owner || !supportsEyeDropper(owner) || this.effectiveDisabled || this.readOnly)
      return false;
    this.#eyedropperAbort?.abort();
    const abort = (this.#eyedropperAbort = new AbortController());
    const picked = await pickScreenColor(owner, abort.signal);
    if (this.#eyedropperAbort === abort) this.#eyedropperAbort = undefined;
    if (!picked || !this.isConnected) return false;
    const parsed = parseColor(picked);
    if (!parsed) return false;
    return this.#proposeColor(
      this.#adoptAlpha(toWorkingSpace(parsed, this.format)),
      'trigger-press',
      new Event('tp-eyedropper'),
      { immediate: true, surface: 'eyedropper' },
    );
  }

  /** Opens or closes the popup picker through the composed Popover. */
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    const popover = this.#popover;
    if (!popover) return false;
    return popover.setOpen(open, reason, event);
  }
  close(): void {
    this.setOpen(false, 'imperative-action');
  }

  // ---- lifecycle ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker (Field's selector list is closed).
    this.setAttribute('data-field-control', '');
    this.#eyedropperSupported = supportsEyeDropper(this.ownerDocument.defaultView);
    // Safety net: no constituent lane event leaves this shadow root (Widgets 6.1 Events).
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.addEventListener(type, this.#containNested);
    const view = this.ownerDocument.defaultView;
    if (view) {
      this.#lightObserver = new view.MutationObserver(() => this.requestUpdate());
      // Light-DOM children only: host attribute writes from updated() must not re-enter.
      this.#lightObserver.observe(this, { childList: true });
    }
  }

  override disconnectedCallback(): void {
    for (const type of NESTED_EVENT_TYPES)
      this.renderRoot.removeEventListener(type, this.#containNested);
    this.#lightObserver?.disconnect();
    this.#lightObserver = undefined;
    this.#eyedropperAbort?.abort();
    this.#eyedropperAbort = undefined;
    this.#dragSnapshot = undefined;
    this.#suppressedSlider = null;
    for (const binding of this.#numberFields.values()) this.#disposeField(binding);
    this.#numberFields.clear();
    for (const release of this.#registeredParts.values()) release();
    this.#registeredParts.clear();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('strings')) this.#strings = resolveStrings(this.strings);
    this.#state.initialize();
    this.#formatState.initialize();
    this.#viewState.initialize();
    this.#harmonyState.initialize();
    if (changed.has('alpha') && !this.alpha && this.#model && this.#model.alpha < 1)
      this.#state.reconcile(this.#serialize(withAlpha(this.#model, 1)));
    if (this.#modelText !== this.value) this.#adoptText(this.value);
    this.#authoredTrigger = this.querySelector(':scope > [slot="trigger"]') !== null;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const model = this.#model;
    this.toggleAttribute('data-empty', !model);
    this.toggleAttribute('data-dragging', this.#dragging);
    this.setAttribute('data-view', this.view);
    this.setAttribute('data-picker', this.picker);
    this.setAttribute('data-format', this.format);
    this.toggleAttribute('data-alpha', this.alpha);
    this.setAttribute('data-harmony', this.harmony);
    this.toggleAttribute('data-eyedropper', this.#eyedropperSupported && this.eyedropper);
    this.toggleAttribute('data-open', this.picker === 'popup' && this.open);
    this.setFormValue(this.value || null, this.value);
    this.setRequiredValidity(this.required && !this.value, this.#strings.valueMissing);
    this.#syncNumberFields();
    this.#syncComposition();
    void this.#registerNestedParts();
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.#state.set(this.#normalize(state), 'programmatic', undefined, { cancelable: false });
  }

  override get inputElement(): HTMLElement | null {
    return this.#dimensionInput();
  }

  protected override focusTarget(): HTMLElement | null {
    if (this.picker === 'popup' && !this.open) return this.#triggerElement() ?? super.focusTarget();
    return this.#dimensionInput() ?? this.#firstControl() ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="color-picker"]');
  }

  // ---- model helpers -----------------------------------------------------------------------

  #normalize(text: string): string {
    return normalizeColorText(text, this.format, this.alpha);
  }

  #serialize(value: ColorValue): string {
    return serializeColor(this.alpha ? value : withAlpha(value, 1), this.format);
  }

  #adoptAlpha(value: ColorValue): ColorValue {
    return this.alpha ? value : withAlpha(value, 1);
  }

  #identity(): string | null {
    return this.#model ? serializeColor(this.#model, 'hex') : null;
  }

  /** Makes the float model follow a committed string, keeping the float proposal that produced it. */
  #adoptText(text: string): void {
    this.#modelText = text;
    if (this.#pending && this.#pending.text === text) {
      this.#model = this.#pending.color;
      this.#hsv = this.#pending.hsv;
    } else {
      const parsed = text ? parseColor(text) : null;
      this.#model = parsed ? toWorkingSpace(parsed, this.format) : null;
      this.#hsv = this.#model ? stickyHsv(this.#hsv, this.#model) : this.#hsv;
    }
    this.#pending = null;
    this.#hexText = this.#model ? serializeColor(this.#model, 'hex').slice(1) : '';
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

  #metadata(extra: Partial<ColorPickerChangeMetadata> = {}): ColorPickerChangeMetadata {
    return { color: this.#pending?.color ?? this.#model, ...extra };
  }

  #proposeText(
    text: string,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    extra: Partial<ColorPickerChangeMetadata>,
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
   * Proposes a float color on the value lane. `immediate` commits once the proposal publishes
   * (keyboard, wheel, swatch, eyedropper, fields); drags commit on release instead.
   */
  #proposeColor(
    next: ColorValue,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    options: {
      immediate?: boolean;
      hsv?: Hsv;
      surface?: ColorPickerSurface;
      channel?: ChannelDefinition['key'];
      cancelable?: boolean;
    } = {},
  ): boolean {
    const text = this.#serialize(next);
    const hsv = options.hsv ?? stickyHsv(this.#hsv, next);
    this.#pending = { color: next, hsv, text };
    const metadata = this.#metadata({
      ...(options.surface ? { surface: options.surface } : {}),
      ...(options.channel ? { channel: options.channel } : {}),
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
    metadata: ColorPickerChangeMetadata,
  ): void {
    if (value === previous) return;
    const event = new TpValueCommitEvent<string>(value, previous, reason, source, { metadata });
    this.onValueCommitted?.(event);
    this.dispatchEvent(event);
    if (
      reason !== 'programmatic' &&
      reason !== 'form-reset' &&
      !metadata.formatChange &&
      this.#model &&
      this.recentLimit > 0
    ) {
      this.#recent = pushRecent(this.#recent, serializeColor(this.#model, 'hex'), this.recentLimit);
      this.requestUpdate();
    }
  }

  #beginDrag(): void {
    if (this.#dragSnapshot) return;
    this.#dragSnapshot = { value: this.value, hsv: this.#hsv };
    this.#dragging = true;
    this.requestUpdate();
  }

  #endDrag(
    reason: ChangeReason,
    sourceEvent: Event,
    metadata: Partial<ColorPickerChangeMetadata>,
  ): void {
    const snapshot = this.#dragSnapshot;
    this.#dragSnapshot = undefined;
    this.#dragging = false;
    if (snapshot)
      this.#emitCommit(this.value, snapshot.value, reason, sourceEvent, this.#metadata(metadata));
    this.requestUpdate();
  }

  #restoreDrag(reason: ChangeReason, sourceEvent: Event): void {
    const snapshot = this.#dragSnapshot;
    this.#dragSnapshot = undefined;
    this.#dragging = false;
    if (!snapshot) return;
    this.#pending = null;
    this.#immediate = undefined;
    if (snapshot.value !== this.value)
      this.#state.set(snapshot.value, reason, sourceEvent, {
        cancelable: false,
        metadata: this.#metadata(),
      });
    this.#hsv = snapshot.hsv;
    this.requestUpdate();
  }

  /**
   * The value is always serialized in the active format (Widgets 6.1 Properties): once a format
   * is accepted the re-serialized string is published through a non-cancelable change and a
   * commit. A controlled value re-reads in the new format, so the proposal is dispatched
   * explicitly before the lane syncs; the owner may still write any other color back.
   */
  #formatCommitted(format: ColorFormat, previous: ColorFormat, reason: ChangeReason): void {
    if (this.#model) {
      const converted = toWorkingSpace(this.#model, format);
      const text = this.#serialize(converted);
      this.#pending = { color: converted, hsv: this.#hsv, text };
      const before = this.value;
      if (text !== before) {
        const metadata = this.#metadata({ formatChange: true });
        if (this.controlled) {
          const event = new TpValueChangeEvent<string>(text, before, reason, undefined, {
            cancelable: false,
            metadata,
          });
          this.onValueChange?.(event);
          this.dispatchEvent(event);
          this.#state.sync();
        } else this.#state.set(text, reason, undefined, { cancelable: false, metadata });
        if (this.value !== before)
          this.#emitCommit(this.value, before, reason, undefined, metadata);
      } else this.#adoptText(text);
    }
    this.requestUpdate('format', previous);
  }

  #harmonyCommitted(rule: HarmonyRule, previous: HarmonyRule): void {
    // Custom handles start from the previous rule so the layout does not jump.
    if (rule === 'custom') this.#customHandles = seedCustomHandles(this.#hsv, previous);
    this.requestUpdate('harmony', previous);
  }

  /** Wheel handle colors in wheel order for the current rule and custom handles. */
  #wheelColors(): readonly Hsv[] {
    const base = this.#hsv;
    if (this.harmony === 'none') return [base];
    return harmonyColors(
      base,
      this.harmony,
      this.#customHandles.length ? [base, ...this.#customHandles.slice(1)] : undefined,
    );
  }

  /** Nested constituent events stop at this shadow root; the widget republishes its own lanes. */
  #containNested = (event: Event): void => {
    if (event.target !== this) event.stopPropagation();
  };

  // ---- surfaces ------------------------------------------------------------------------------

  #surfaceChange = (event: CustomEvent<ColorSurfaceChangeDetail>): void => {
    event.stopPropagation();
    const detail = event.detail;
    if (detail.handle !== undefined) {
      // A custom harmony handle: widget state only, no value proposal.
      const handles = [...this.#customHandles];
      while (handles.length <= detail.handle) handles.push(this.#hsv);
      handles[detail.handle] = { ...handles[detail.handle]!, ...detail.hsv };
      this.#customHandles = handles;
      this.requestUpdate();
      return;
    }
    const surface: ColorPickerSurface =
      (event.target as HTMLElement).localName === 'tp-color-picker-wheel'
        ? 'wheel'
        : (event.target as HTMLElement).localName === 'tp-color-picker-triangle'
          ? 'triangle'
          : 'area';
    if (detail.phase === 'restore') {
      this.#restoreDrag(detail.reason, detail.sourceEvent);
      return;
    }
    const hsv: Hsv = { ...this.#hsv, ...detail.hsv };
    const next = fromHsv(hsv, this.#model?.alpha ?? 1, this.format);
    if (detail.phase === 'press') this.#beginDrag();
    const immediate = detail.phase === 'commit' && !this.#dragSnapshot;
    this.#proposeColor(next, detail.reason, detail.sourceEvent, { hsv, surface, immediate });
    if (detail.phase === 'commit' && this.#dragSnapshot)
      this.#endDrag(detail.reason, detail.sourceEvent, { surface });
  };

  // ---- composed sliders ------------------------------------------------------------------------

  #sliderChange(
    definition: ChannelDefinition,
    hsvKey: HsvKey | undefined,
    event: TpValueChangeEvent<SliderValue | undefined>,
  ): void {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const slider = event.currentTarget as TpSlider;
    const { value, reason, sourceEvent } = event.detail;
    if (typeof value !== 'number' || this.readOnly || this.effectiveDisabled) {
      event.preventDefault();
      return;
    }
    if (this.#suppressedSlider === slider) {
      event.preventDefault();
      return;
    }
    if (reason === 'track-press' || reason === 'drag') this.#beginDrag();
    const immediate = reason !== 'track-press' && reason !== 'drag';
    const accepted = this.#proposeColor(
      this.#withSliderValue(definition, value, hsvKey),
      reason,
      sourceEvent,
      {
        immediate,
        surface: 'slider',
        channel: definition.key,
        ...(hsvKey ? { hsv: this.#hsvWith(hsvKey, clampChannel(definition, value)) } : {}),
      },
    );
    if (!accepted) event.preventDefault();
  }

  #hsvWith(key: HsvKey, value: number): Hsv {
    return key === 'h' ? { ...this.#hsv, h: value } : { ...this.#hsv, v: value };
  }

  #withSliderValue(
    definition: ChannelDefinition,
    value: number,
    hsvKey: HsvKey | undefined,
  ): ColorValue {
    const base = this.#model ?? toWorkingSpace(BLACK, this.format);
    if (hsvKey)
      return fromHsv(
        this.#hsvWith(hsvKey, clampChannel(definition, value)),
        base.alpha,
        this.format,
      );
    return withChannel(base, definition, value);
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

  #sliderPointerCancel = (event: PointerEvent): void => {
    const slider = event.currentTarget as TpSlider;
    if (slider.dragging && this.#dragSnapshot) this.#restoreDrag('pointer', event);
  };

  /**
   * A release the Slider did not commit (every proposal of the gesture was rejected) still ends
   * the widget's drag; `#endDrag` emits nothing when the value never changed.
   */
  #sliderRelease = (event: PointerEvent): void => {
    const slider = event.currentTarget as TpSlider;
    if (!this.#dragSnapshot || this.#suppressedSlider === slider) return;
    this.#endDrag(slider.dragging ? 'drag' : 'track-press', event, { surface: 'slider' });
  };

  #sliderWheel(definition: ChannelDefinition, hsvKey: HsvKey | undefined, event: WheelEvent): void {
    if (!this.allowWheelScrub || this.readOnly || this.effectiveDisabled) return;
    event.preventDefault();
    const direction = event.deltaY < 0 ? 1 : event.deltaY > 0 ? -1 : 0;
    if (!direction || !this.#model) return;
    const current = hsvKey ? this.#hsv[hsvKey] : channelDisplayValue(this.#model, definition);
    const amount = event.shiftKey
      ? definition.largeStep
      : event.altKey
        ? definition.smallStep
        : definition.step;
    this.#proposeColor(
      this.#withSliderValue(definition, current + direction * amount, hsvKey),
      'wheel',
      event,
      { immediate: true, surface: 'slider', channel: definition.key },
    );
  }

  /** Hue wraps at the bounds: the Slider clamps, so the widget takes the step past 0 or 360. */
  #hueThumbKeyDown = (event: KeyboardEvent): void => {
    if (this.readOnly || this.effectiveDisabled) return;
    const step = stepForKey(event, {
      definition: HUE_CHANNEL,
      axis: 'both',
      direction: this.direction,
    });
    if (!step || step.kind !== 'delta') return;
    const next = this.#hsv.h + step.amount;
    if (next >= 0 && next <= 360) return;
    preventComponentHandling(event);
    event.preventDefault();
    const wrapped = ((next % 360) + 360) % 360;
    this.#proposeColor(
      fromHsv({ ...this.#hsv, h: wrapped }, this.#model?.alpha ?? 1, this.format),
      'keyboard',
      event,
      { immediate: true, surface: 'slider', channel: 'hue', hsv: { ...this.#hsv, h: wrapped } },
    );
  };

  // ---- fields --------------------------------------------------------------------------------

  /**
   * The composed Selects are controlled; an accepted pick is written back synchronously
   * (inside the Select's own proposal) so the Select commits and closes its listbox at once.
   */
  #formatSelectChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = event.detail.value;
    if (!isColorFormat(next)) return;
    const accepted = this.#formatState.set(next, 'item-press', event.detail.sourceEvent);
    if (!accepted && this.format !== next) event.preventDefault();
    else (event.currentTarget as TpSelect).value = this.format;
  };

  #hexInput = (event: TpValueChangeEvent<string>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    // The Input is controlled; accept the typed text synchronously so editing continues.
    this.#hexText = event.detail.value;
    (event.currentTarget as TpInput).value = event.detail.value;
    if (event.detail.reason === 'input-paste')
      this.#commitHex(event.detail.value, 'input-paste', event);
  };

  #hexKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    this.#commitHex(this.#hexText, 'keyboard', event);
  };

  #hexBlur = (event: FocusEvent): void => {
    this.#commitHex(this.#hexText, 'input-blur', event);
  };

  #commitHex(text: string, reason: ChangeReason, sourceEvent: Event): void {
    const digits = text.trim().replace(/^#/, '');
    const parsed = /^[0-9a-f]{3,8}$/i.test(digits) ? parseColor(`#${digits}`) : null;
    if (!parsed) {
      // Invalid text reverts to the current color (tweakpane parity).
      this.#hexText = this.#model ? serializeColor(this.#model, 'hex').slice(1) : '';
      this.requestUpdate();
      return;
    }
    // Editing hex keeps the current alpha unless alpha digits were typed.
    const alpha =
      digits.length === 4 || digits.length === 8 ? parsed.alpha : (this.#model?.alpha ?? 1);
    const next = this.#adoptAlpha(withAlpha(toWorkingSpace(parsed, this.format), alpha));
    this.#proposeColor(next, reason, sourceEvent, { immediate: true, surface: 'field' });
    this.#hexText = serializeColor(next, 'hex').slice(1);
    this.requestUpdate();
  }

  #fieldChange(binding: NumberFieldBinding, event: TpValueChangeEvent<number | null>): void {
    if (event.target !== binding.input) return;
    event.stopPropagation();
    const { value, reason, sourceEvent } = event.detail;
    if (value === null) return;
    if (binding.previous === null) binding.previous = this.value;
    const base = this.#model ?? toWorkingSpace(BLACK, this.format);
    const accepted = this.#proposeColor(
      withChannel(base, binding.definition, value),
      reason,
      sourceEvent,
      {
        surface: 'field',
        channel: binding.definition.key,
      },
    );
    if (!accepted) {
      event.preventDefault();
      return;
    }
    // Accept the controlled field proposal synchronously (inside its request, so the
    // NumberField keeps its last commit and still commits on blur or Enter).
    binding.controller.update({ value: clampChannel(binding.definition, value) });
  }

  #fieldCommit(binding: NumberFieldBinding, event: TpValueCommitEvent<number | null>): void {
    if (event.target !== binding.input) return;
    event.stopPropagation();
    const previous = binding.previous ?? this.value;
    binding.previous = null;
    this.#emitCommit(
      this.value,
      previous,
      event.detail.reason,
      event.detail.sourceEvent,
      this.#metadata({ surface: 'field', channel: binding.definition.key }),
    );
  }

  #fieldOptions(definition: ChannelDefinition) {
    const model = this.#model ?? toWorkingSpace(BLACK, this.format);
    const current = channelDisplayValue(model, definition);
    return {
      value: Number(formatChannelValue(definition, current)),
      minimum: definition.min,
      maximum: definition.max,
      step: definition.step,
      smallStep: definition.smallStep,
      largeStep: definition.largeStep,
      format: { maximumFractionDigits: definition.precision, useGrouping: false },
      ...(this.locale ? { locale: this.locale } : {}),
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      allowWheelScrub: this.allowWheelScrub,
    };
  }

  #syncNumberFields(): void {
    // Lit reuses the field elements across formats, so a root may now carry another key, or
    // another Input: such bindings release their NumberField before the new key claims the root.
    for (const [key, binding] of this.#numberFields)
      if (
        !binding.input.isConnected ||
        binding.root.dataset.numberField !== key ||
        binding.root.querySelector('tp-input') !== binding.input
      ) {
        this.#disposeField(binding);
        this.#numberFields.delete(key);
      }
    for (const root of this.#queryAll<HTMLElement>('[data-number-field]')) {
      const key = root.dataset.numberField!;
      const definition = this.#channelByKey(key);
      const input = root.querySelector<TpInput>('tp-input');
      if (!definition || !input) continue;
      const binding = this.#numberFields.get(key);
      if (binding) {
        binding.definition = definition;
        // Re-publishing an unchanged value would reset the field's last commit mid-edit.
        const { value, ...options } = this.#fieldOptions(definition);
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
      const controller = new NumberFieldController(root, input, this.#fieldOptions(definition));
      const created: NumberFieldBinding = {
        controller,
        root,
        input,
        scope,
        definition,
        previous: null,
      };
      const group = root.querySelector<HTMLElement>('tp-input-group');
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

  /** Number-field keys are scoped (`fields:hue`, `channel:hue`) so both rows may coexist. */
  #channelByKey(scoped: string): ChannelDefinition | undefined {
    const key = scoped.slice(scoped.indexOf(':') + 1);
    if (key === 'alpha') return ALPHA_CHANNEL;
    return channelDefinitions(this.format, false).find((definition) => definition.key === key);
  }

  // ---- views ------------------------------------------------------------------------------------

  #tabsChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = event.detail.value;
    if (!isView(next) || next === this.view) return;
    const accepted = this.#viewState.set(next, event.detail.reason, event.detail.sourceEvent);
    if (!accepted && event.cancelable) event.preventDefault();
  };

  #harmonySelectChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const next = event.detail.value;
    if (!isHarmony(next)) return;
    const accepted = this.#harmonyState.set(next, 'item-press', event.detail.sourceEvent);
    if (!accepted && this.harmony !== next) event.preventDefault();
    else (event.currentTarget as TpSelect).value = this.harmony;
  };

  #templateChange = (event: TpValueChangeEvent<unknown>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const index = Number(event.detail.value);
    if (!Number.isInteger(index) || index < 0 || index >= this.schemes.length) return;
    this.#templateIndex = index;
    (event.currentTarget as TpSelect).value = String(index);
    this.requestUpdate();
  };

  #generate = (): void => {
    if (this.effectiveDisabled || this.readOnly) return;
    this.#generatedBase = this.#model;
    this.requestUpdate();
  };

  #swatchChange(event: TpValueChangeEvent<readonly string[]>, surface: 'swatch' | 'scheme'): void {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    // The widget's value lane owns the selection; the group never adopts on its own.
    event.preventDefault();
    const next = event.detail.value[0];
    if (!next || this.readOnly || this.effectiveDisabled) return;
    const parsed = parseColor(next);
    if (!parsed) return;
    const source = event.detail.sourceEvent;
    const reason: ChangeReason =
      surfaceInteraction(source) === 'keyboard' ? 'keyboard' : 'item-press';
    this.#proposeColor(this.#adoptAlpha(toWorkingSpace(parsed, this.format)), reason, source, {
      immediate: true,
      surface,
    });
  }

  /** Rows stay pinned to the color they were generated from, so strips never move under a press. */
  #generatedRows(): readonly SwatchRow[] {
    const base = (this.#generatedBase ??= this.#model ?? BLACK);
    const identity = `${serializeColor(base, 'hex')}|${this.#strings.schemeTints}`;
    if (this.#generated?.identity === identity) return this.#generated.rows;
    const strings = this.#strings;
    const rows = generateSchemeRows(base).map((row) => ({
      label: strings[SCHEME_STRING_KEYS[row.id]],
      colors: row.colors.map((entry) => serializeColor(entry, 'hex')),
    }));
    this.#generated = { identity, rows };
    return rows;
  }

  // ---- open lane (popup) --------------------------------------------------------------------

  get #popover(): TpPopover | null {
    return this.renderRoot?.querySelector?.<TpPopover>('tp-popover') ?? null;
  }

  #openChange = (event: TpSurfaceOpenChangeEvent): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    const { value, previousValue, reason, sourceEvent } = event.detail;
    const proposal = new TpOpenChangeEvent(value, previousValue, reason, sourceEvent);
    this.dispatchEvent(proposal);
    if (proposal.defaultPrevented || proposal.detail.cancelled) event.preventDefault();
    this.requestUpdate();
  };

  #openComplete = (event: CustomEvent<{ open: boolean }>): void => {
    if (event.target !== event.currentTarget) return;
    event.stopPropagation();
    this.emit('tp-open-change-complete', { open: event.detail.open });
    this.requestUpdate();
  };

  #initialFocus = (): HTMLElement | null => this.#dimensionInput() ?? this.#firstControl();

  // ---- presentation plumbing ---------------------------------------------------------------

  #panelReference = (node: HTMLElement | null): void => {
    this.#panel = node;
  };

  /** Rendered constituents: the panel content leaves this shadow root while the popup is open. */
  #queryAll<T extends Element>(selector: string): T[] {
    const found = new Set<T>(this.renderRoot.querySelectorAll<T>(selector));
    if (this.#panel)
      for (const element of this.#panel.querySelectorAll<T>(selector)) found.add(element);
    return [...found];
  }

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    // Nested components and the render surfaces: consumer presentation reaches both.
    for (const nested of this.#queryAll<HTMLElement & { partPresentation?: unknown }>(
      `${NESTED_HOSTS}, ${SURFACES}`,
    )) {
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
    for (const slider of this.#queryAll<TpSlider>('tp-slider')) {
      await slider.updateComplete;
      if (!slider.isConnected) continue;
      const root = slider.shadowRoot;
      if (!root) continue;
      const trackName = slider.classList.contains('alpha')
        ? 'color-picker-alpha-track'
        : 'color-picker-slider-track';
      this.#registerOnce(root.querySelector<HTMLElement>('[part~="slider-track"]'), trackName);
      this.#registerOnce(
        root.querySelector<HTMLElement>('[part~="slider-range"]'),
        'color-picker-slider-range',
      );
      for (const thumb of root.querySelectorAll<
        HTMLElement & { visualElement: HTMLElement | null; updateComplete: Promise<unknown> }
      >('tp-slider-thumb')) {
        await thumb.updateComplete;
        this.#registerOnce(thumb.visualElement, 'color-picker-slider-thumb');
      }
    }
    for (const group of this.#queryAll<TpToggleGroup>('tp-toggle-group')) {
      await group.updateComplete;
      if (!group.isConnected) continue;
      this.#registerOnce(
        group.shadowRoot?.querySelector<HTMLElement>('[part~="toggle-group"]') ?? null,
        group.classList.contains('scheme') ? 'color-picker-scheme' : 'color-picker-swatch-grid',
      );
      for (const toggle of group.querySelectorAll<TpToggle>('tp-toggle')) {
        await toggle.updateComplete;
        this.#registerOnce(
          toggle.shadowRoot?.querySelector<HTMLElement>('[part~="toggle"]') ?? null,
          'color-picker-swatch-item',
        );
      }
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

  #dimensionInput(): HTMLElement | null {
    const surface = this.#queryAll<TpElement>(SURFACES)[0];
    const root = surface?.renderRoot;
    if (!root) return null;
    return (
      root.querySelector<HTMLElement>('[data-primary] input') ??
      root.querySelector<HTMLElement>('input')
    );
  }

  #firstControl(): HTMLElement | null {
    return this.#panel?.querySelector<HTMLElement>(NESTED_HOSTS) ?? null;
  }

  #triggerElement(): HTMLElement | null {
    return (
      this.renderRoot.querySelector<HTMLElement>('tp-button.trigger') ??
      this.querySelector<HTMLElement>(':scope > [slot="trigger"]')
    );
  }

  // ---- render -----------------------------------------------------------------------------------

  protected override render() {
    const strings = this.#strings;
    const model = this.#model;
    const state = {
      value: this.value,
      format: this.format,
      view: this.view,
      picker: this.picker,
      size: this.size,
      shape: this.shape,
      alpha: this.alpha,
      empty: !model,
      dragging: this.#dragging,
      open: this.picker === 'popup' && this.open,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
    };
    const label = this.label
      ? this.renderPart('color-picker-label', state, {
          tag: 'span',
          properties: {
            part: 'color-picker-label',
            class: 'label',
            '@click': () => this.activateFromLabel(),
          },
          content: this.label,
        })
      : nothing;
    const panel = this.picker === 'popup' ? this.#renderPopup(state) : this.#renderPanel();
    return this.renderPart('color-picker', state, {
      tag: 'div',
      properties: {
        part: 'color-picker',
        class: 'root',
        role: 'group',
        'aria-label': this.label || this.getAttribute('aria-label') || strings.viewArea,
        'data-view': this.view,
        'data-picker': this.picker,
        'data-format': this.format,
        'data-empty': !model,
        'data-dragging': this.#dragging,
        'data-open': state.open,
        'data-disabled': this.effectiveDisabled,
        'data-readonly': this.readOnly,
      },
      content: html`${label}${panel}${this.renderPart('color-picker-footer', state, {
        tag: 'div',
        properties: { part: 'color-picker-footer', class: 'footer' },
        content: html`<slot name="footer"></slot>`,
      })}`,
    });
  }

  /** Inline and popup listeners that keep every nested lane event inside the widget. */
  #panelListeners(): Record<string, unknown> {
    const listeners: Record<string, unknown> = {};
    for (const type of NESTED_EVENT_TYPES) listeners[`@${type}`] = this.#containNested;
    return listeners;
  }

  #renderPanel() {
    return html`<div
      ${bindPart({ class: 'panel', ...this.#panelListeners() }, [this.#panelReference])}
    >
      ${this.#renderViews()}${this.#renderFields()}
    </div>`;
  }

  #renderPopup(state: Record<string, unknown>) {
    const strings = this.#strings;
    const trigger = this.#authoredTrigger
      ? html`<slot name="trigger" slot="trigger"></slot>`
      : html`<tp-button
          slot="trigger"
          class="trigger"
          part="color-picker-trigger"
          variant="outline"
          size="icon"
          aria-label=${this.label || strings.viewArea}
          ?disabled=${this.effectiveDisabled}
          >${this.#renderPreview('icon-start')}</tp-button
        >`;
    // The popup renders in place (native top layer, no portal): portaled content would leave
    // this shadow root and lose the widget's structural styles and generated presentation.
    return html`<tp-popover
      class="popup"
      label=${this.label || strings.viewArea}
      .portal=${false}
      .open=${this.#providedOpen}
      .defaultOpen=${this.defaultOpen}
      .initialFocus=${this.#initialFocus}
      ?disabled=${this.effectiveDisabled}
      @tp-open-change=${this.#openChange}
      @tp-open-change-complete=${this.#openComplete}
      @tp-field-value=${stop}
      >${trigger}${this.renderPart('color-picker-popup', state, {
        tag: 'div',
        reference: this.#panelReference,
        properties: {
          part: 'color-picker-popup',
          class: 'panel popup-panel',
          ...this.#panelListeners(),
        },
        content: html`${this.#renderViews()}${this.#renderFields()}`,
      })}</tp-popover
    >`;
  }

  #renderViews() {
    const views = this.views.filter(isView);
    if (views.length <= 1) return this.#renderView(views[0] ?? this.view);
    const strings = this.#strings;
    return html`<tp-tabs
      class="views"
      variant="enclosed"
      activation="automatic"
      label=${strings.views}
      .value=${this.view}
      @tp-value-change=${this.#tabsChange}
      @tp-presence-complete=${stop}
      >${views.map(
        (view) =>
          html`<button slot="tab" value=${view} ?disabled=${this.effectiveDisabled && false}>
            ${strings[VIEW_STRING_KEYS[view]]}
          </button>`,
      )}${views.map(
        (view) =>
          html`<div slot="panel" value=${view} class="view" data-view=${view}>
            ${view === this.view ? this.#renderView(view) : nothing}
          </div>`,
      )}</tp-tabs
    >`;
  }

  #renderView(view: ColorPickerView) {
    switch (view) {
      case 'area':
        return this.#renderArea();
      case 'sliders':
        return this.#renderSlidersView();
      case 'wheel':
        return this.#renderWheelView();
      case 'triangle':
        return this.#renderTriangleView();
      case 'swatches':
        return this.#renderSwatchesView();
      case 'schemes':
        return this.#renderSchemesView();
      default:
        return nothing;
    }
  }

  #renderControls(sliders: unknown[]) {
    const strings = this.#strings;
    const eyedropper =
      this.eyedropper && this.#eyedropperSupported
        ? html`<tp-button
            class="eyedropper"
            variant="ghost"
            size="icon-sm"
            .icon=${pipetteIcon}
            aria-label=${dimensionLabel(this.label, strings.eyedropper)}
            ?disabled=${this.effectiveDisabled || this.readOnly}
            @click=${() => void this.pickFromScreen()}
          ></tp-button>`
        : nothing;
    return this.renderPart(
      'color-picker-controls',
      { eyedropper: eyedropper !== nothing },
      {
        tag: 'div',
        properties: {
          part: 'color-picker-controls',
          class: 'controls',
          'data-eyedropper': eyedropper !== nothing,
        },
        content: html`${eyedropper}
          <div class="sliders">${sliders}</div>`,
      },
    );
  }

  #alphaSlider(model: ColorValue) {
    return this.alpha
      ? this.#renderSlider(ALPHA_CHANNEL, model.alpha * 100, this.#strings.alpha, {
          '--_tp-color-picker-paint': alphaGradient(model),
          '--_tp-color-picker-thumb-paint': displayColor(model),
        })
      : nothing;
  }

  #renderArea() {
    const model = this.#model ?? toWorkingSpace(BLACK, this.format);
    const strings = this.#strings;
    const hue = this.#hsv.h;
    const paint = {
      '--_tp-color-picker-paint': areaGradient(hue),
      '--_tp-color-picker-thumb-paint': displayColor(withAlpha(model, 1)),
    };
    return html`<tp-color-picker-area
        exportparts="color-picker-area, color-picker-area-thumb"
        .hue=${hue}
        .saturation=${this.#hsv.s}
        .brightness=${this.#hsv.v}
        .label=${this.label}
        .strings=${this.#strings}
        .allowWheelScrub=${this.allowWheelScrub}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
        style=${styleMap(paint)}
        @color-surface-change=${this.#surfaceChange}
      ></tp-color-picker-area>
      ${this.#renderControls([
        this.#renderSlider(
          HUE_CHANNEL,
          hue,
          strings.hue,
          {
            '--_tp-color-picker-paint': hueGradient(),
            '--_tp-color-picker-thumb-paint': `hsl(${Math.round(hue)} 100% 50%)`,
          },
          { hsv: 'h' },
        ),
        this.#alphaSlider(model),
      ])}`;
  }

  #renderSlidersView() {
    const model = this.#model ?? toWorkingSpace(BLACK, this.format);
    const strings = this.#strings;
    const thumb = displayColor(withAlpha(model, 1));
    const rows = channelDefinitions(this.format, false).map((definition) =>
      this.#renderChannelRow(
        definition,
        channelDisplayValue(model, definition),
        channelName(strings, definition),
        {
          '--_tp-color-picker-paint': channelGradient(model, definition),
          '--_tp-color-picker-thumb-paint': thumb,
        },
      ),
    );
    const alpha = this.alpha
      ? this.#renderChannelRow(ALPHA_CHANNEL, model.alpha * 100, strings.alpha, {
          '--_tp-color-picker-paint': alphaGradient(model),
          '--_tp-color-picker-thumb-paint': displayColor(model),
        })
      : nothing;
    return html`<div class="channels">${rows}${alpha}</div>`;
  }

  #renderChannelRow(
    definition: ChannelDefinition,
    current: number,
    name: string,
    paint: Record<string, string>,
  ) {
    return this.renderPart(
      'color-picker-channel',
      { channel: definition.key },
      {
        tag: 'div',
        properties: {
          part: 'color-picker-channel',
          class: 'channel-row',
          'data-channel': definition.key,
        },
        content: html`${this.#renderSlider(definition, current, name, paint, {
          visibleLabel: true,
        })}${this.#renderField(definition, 'channel')}`,
      },
    );
  }

  #renderWheelView() {
    const model = this.#model ?? toWorkingSpace(BLACK, this.format);
    const strings = this.#strings;
    const hsv = this.#hsv;
    const paint = {
      '--_tp-color-picker-paint': wheelGradient(),
      '--_tp-color-picker-dim': `rgb(0 0 0 / ${(1 - hsv.v / 100).toFixed(3)})`,
    };
    const harmony = html`<tp-select
      class="harmony"
      label=${strings.harmony}
      .items=${HARMONY_RULES.map((rule) => ({ value: rule, label: strings[HARMONY_STRING_KEYS[rule]] }))}
      .value=${this.harmony}
      ?disabled=${this.effectiveDisabled}
      @tp-value-change=${this.#harmonySelectChange}
      @tp-field-value=${stop}
    ></tp-select>`;
    return html`<tp-color-picker-wheel
        exportparts="color-picker-wheel, color-picker-wheel-handle, color-picker-wheel-line"
        .hue=${hsv.h}
        .saturation=${hsv.s}
        .brightness=${hsv.v}
        .harmony=${this.harmony}
        .handles=${this.#customHandles}
        .label=${this.label}
        .strings=${this.#strings}
        .allowWheelScrub=${this.allowWheelScrub}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
        style=${styleMap(paint)}
        @color-surface-change=${this.#surfaceChange}
      ></tp-color-picker-wheel>
      ${this.renderPart(
        'color-picker-toolbar',
        { view: 'wheel' },
        {
          tag: 'div',
          properties: { part: 'color-picker-toolbar', class: 'toolbar' },
          content: html`<tp-label class="heading">${strings.harmony}</tp-label>${harmony}`,
        },
      )}
      ${this.#renderControls([
        this.#renderSlider(
          VALUE_CHANNEL,
          hsv.v,
          strings.value,
          {
            '--_tp-color-picker-paint': `linear-gradient(var(--_tp-color-picker-axis, to right), rgb(0 0 0), ${displayColor(fromHsv({ ...hsv, v: 100 }, 1, 'rgb'))})`,
            '--_tp-color-picker-thumb-paint': displayColor(withAlpha(model, 1)),
          },
          { hsv: 'v' },
        ),
        this.#alphaSlider(model),
      ])}`;
  }

  #renderTriangleView() {
    const model = this.#model ?? toWorkingSpace(BLACK, this.format);
    const hsv = this.#hsv;
    const paint = { '--_tp-color-picker-paint': hueConicGradient() };
    return html`<tp-color-picker-triangle
        exportparts="color-picker-ring, color-picker-ring-thumb, color-picker-triangle, color-picker-triangle-thumb"
        .hue=${hsv.h}
        .saturation=${hsv.s}
        .brightness=${hsv.v}
        .label=${this.label}
        .strings=${this.#strings}
        .allowWheelScrub=${this.allowWheelScrub}
        ?disabled=${this.effectiveDisabled}
        ?readonly=${this.readOnly}
        style=${styleMap(paint)}
        @color-surface-change=${this.#surfaceChange}
      ></tp-color-picker-triangle>
      ${this.#renderControls([this.#alphaSlider(model)])}`;
  }

  #renderSwatchesView() {
    const strings = this.#strings;
    const rows: SwatchRow[] = [];
    const loose = this.swatches.filter((entry): entry is string => typeof entry === 'string');
    if (loose.length) rows.push({ label: strings.savedColors, colors: loose });
    for (const entry of this.swatches) if (typeof entry !== 'string') rows.push(entry);
    if (this.#recent.length) rows.push({ label: strings.recentColors, colors: this.#recent });
    const options = {
      kind: 'swatches' as const,
      selected: this.#identity(),
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      onChange: (event: TpValueChangeEvent<readonly string[]>) =>
        this.#swatchChange(event, 'swatch'),
    };
    return this.renderPart(
      'color-picker-swatches',
      { rows: rows.length },
      {
        tag: 'div',
        properties: { part: 'color-picker-swatches', class: 'swatches' },
        content: rows.map(
          (row) =>
            html`<div class="swatch-group">
              <tp-label class="heading">${row.label}</tp-label>${renderSwatchRow(row, options)}
            </div>`,
        ),
      },
    );
  }

  #renderSchemesView() {
    const strings = this.#strings;
    const consumer = this.schemes.length > 0;
    const index = Math.min(this.#templateIndex, Math.max(0, this.schemes.length - 1));
    const rows: readonly SwatchRow[] = consumer
      ? this.schemes[index]!.palettes
      : this.#generatedRows();
    const template = consumer
      ? html`<tp-label class="heading">${strings.template}</tp-label
          ><tp-select
            class="template"
            label=${strings.template}
            .items=${this.schemes.map((scheme, position) => ({ value: String(position), label: scheme.label }))}
            .value=${String(index)}
            ?disabled=${this.effectiveDisabled}
            @tp-value-change=${this.#templateChange}
            @tp-field-value=${stop}
          ></tp-select>`
      : html`<tp-button
          class="generate"
          variant="ghost"
          size="icon-sm"
          .icon=${wandSparklesIcon}
          aria-label=${strings.generate}
          ?disabled=${this.effectiveDisabled || this.readOnly}
          @click=${this.#generate}
        ></tp-button>`;
    const options = {
      kind: 'scheme' as const,
      selected: this.#identity(),
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      onChange: (event: TpValueChangeEvent<readonly string[]>) =>
        this.#swatchChange(event, 'scheme'),
    };
    return this.renderPart(
      'color-picker-schemes',
      { rows: rows.length, consumer },
      {
        tag: 'div',
        properties: { part: 'color-picker-schemes', class: 'schemes' },
        content: html`${this.renderPart(
          'color-picker-toolbar',
          { view: 'schemes' },
          {
            tag: 'div',
            properties: { part: 'color-picker-toolbar', class: 'toolbar' },
            content: template,
          },
        )}${rows.map(
          (row) =>
            html`<div class="scheme-row">
              <span class="heading">${row.label}</span>${renderSwatchRow(row, options)}
            </div>`,
        )}`,
      },
    );
  }

  #renderSlider(
    definition: ChannelDefinition,
    current: number,
    name: string,
    paint: Record<string, string>,
    options: SliderOptions = {},
  ) {
    const label = dimensionLabel(this.label, name);
    const thumbContract =
      options.hsv === 'h'
        ? { 'slider-thumb': { hostProperties: { '@keydown': this.#hueThumbKeyDown } } }
        : {};
    return html`<tp-slider
      class=${`channel ${definition.key}`}
      exportparts="slider-track: color-picker-slider-track, slider-range: color-picker-slider-range, slider-thumb: color-picker-slider-thumb"
      aria-label=${options.visibleLabel ? nothing : label}
      label=${options.visibleLabel ? name : nothing}
      thumb-alignment="edge"
      .minimum=${definition.min}
      .maximum=${definition.max}
      .step=${definition.step}
      .largeStep=${definition.largeStep}
      .formAssociatedValue=${false}
      .value=${Number(formatChannelValue(definition, current))}
      .getAccessibleLabel=${() => label}
      .getAccessibleValueText=${(_formatted: string, value: number) => channelValueText(definition, value)}
      .partContracts=${thumbContract}
      ?disabled=${this.effectiveDisabled}
      ?readonly=${this.readOnly}
      style=${styleMap(paint)}
      @tp-value-change=${(event: TpValueChangeEvent<SliderValue | undefined>) =>
        this.#sliderChange(definition, options.hsv, event)}
      @tp-value-commit=${this.#sliderCommit}
      @tp-field-value=${stop}
      @keydown=${this.#sliderKeyDown}
      @pointercancel=${this.#sliderPointerCancel}
      @pointerup=${this.#sliderRelease}
      @lostpointercapture=${this.#sliderRelease}
      @wheel=${(event: WheelEvent) => this.#sliderWheel(definition, options.hsv, event)}
    ></tp-slider>`;
  }

  /** The preview swatch; inside the icon-size trigger Button it fills the leading mark slot. */
  #renderPreview(slot?: string) {
    return this.preview
      ? this.renderPart(
          'color-picker-preview',
          { value: this.value },
          {
            tag: 'span',
            properties: {
              part: 'color-picker-preview',
              class: 'preview',
              'aria-hidden': 'true',
              ...(slot ? { slot } : {}),
              style: {
                '--_tp-color-picker-paint': this.#model ? flatGradient(this.#model) : 'none',
              },
            },
          },
        )
      : nothing;
  }

  #renderFields() {
    if (!this.fields) return nothing;
    const strings = this.#strings;
    const preview = this.#renderPreview();
    const formatSelect = this.formatSelect
      ? html`<tp-select
          class="format"
          label=${strings.format}
          .items=${this.formats
            .filter(isColorFormat)
            .map((format) => ({ value: format, label: strings[FORMAT_STRING_KEYS[format]] }))}
          .value=${this.format}
          ?disabled=${this.effectiveDisabled}
          @tp-value-change=${this.#formatSelectChange}
          @tp-field-value=${stop}
        ></tp-select>`
      : nothing;
    const channels =
      this.format === 'hex'
        ? html`<div class="field" part="color-picker-field" data-field="hex">
            <tp-input-group
              ><span slot="prefix">#</span
              ><tp-input
                class="hex"
                label=${dimensionLabel(this.label, strings.hex)}
                .value=${this.#hexText}
                .hostProperties=${{ inputmode: 'text', spellcheck: 'false', autocapitalize: 'off', maxlength: 8 }}
                ?disabled=${this.effectiveDisabled}
                ?readonly=${this.readOnly}
                @tp-value-change=${this.#hexInput}
                @tp-field-value=${stop}
                @keydown=${this.#hexKeyDown}
                @focusout=${this.#hexBlur}
              ></tp-input
            ></tp-input-group>
          </div>`
        : channelDefinitions(this.format, false).map((definition) =>
            this.#renderField(definition, 'fields'),
          );
    const alphaField = this.alpha ? this.#renderField(ALPHA_CHANNEL, 'fields') : nothing;
    return this.renderPart(
      'color-picker-fields',
      { format: this.format },
      {
        tag: 'div',
        properties: {
          part: 'color-picker-fields',
          class: 'fields',
          'data-preview': this.preview,
        },
        content: html`${preview}
          <div class="fields-row">${formatSelect}${channels}${alphaField}</div>`,
      },
    );
  }

  #renderField(definition: ChannelDefinition, scope: 'fields' | 'channel') {
    const name = channelName(this.#strings, definition);
    const suffix = definition.unit ? html`<span slot="suffix">${definition.unit}</span>` : nothing;
    return html`<div
      class="field"
      part="color-picker-field"
      data-field=${definition.key}
      data-number-field=${`${scope}:${definition.key}`}
    >
      <tp-input-group
        ><tp-input
          label=${dimensionLabel(this.label, name)}
          ?disabled=${this.effectiveDisabled}
          ?readonly=${this.readOnly}
        ></tp-input
        >${suffix}</tp-input-group
      >
    </div>`;
  }
}

/** Re-exported so consumers can type the commit detail. */
export type ColorPickerChangeDetail = ValueChangeDetail<string> & {
  metadata?: ColorPickerChangeMetadata;
};

declare global {
  interface HTMLElementTagNameMap {
    'tp-color-picker': TpColorPicker;
  }
}
