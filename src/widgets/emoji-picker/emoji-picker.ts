import { html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import {
  TpOpenChangeEvent,
  TpValueChangeEvent,
  TpValueCommitEvent,
} from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { resolveLocale } from '../../foundation/services.js';
import { observeSubtree } from '../../foundation/observation.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import type { TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import { fillTemplate } from '../../foundation/template.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { builtinEmojiData } from '../../foundation/emoji/builtin.js';
import { SKIN_TONE_NAMES, toneEmoji } from '../../foundation/emoji/skin-tones.js';
import {
  detectEmojiSupport,
  EMOJI_FONT_STACK,
  filterSupported,
  type EmojiSupport,
} from '../../foundation/emoji/support.js';
import {
  isSkinTone,
  SKIN_TONES,
  type CustomEmojiGroup,
  type EmojiData,
  type EmojiDataSource,
  type SkinTone,
} from '../../foundation/emoji/types.js';
import { setPartComposition } from '../../presentation/controller.js';
import type { PartPresentation } from '../../presentation/resolver.js';
import { emojiPickerPresentation } from '../../presentation/families/emoji-picker.js';
import { TpButton } from '../../components/button/button.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpPopover } from '../../components/popover/popover.js';
import { TpMenu } from '../../components/menu/menu.js';
import { TpMenuRadioGroup } from '../../components/menu/menu-radio-group.js';
import { TpMenuRadioItem } from '../../components/menu/menu-radio-item.js';
import { TpTabs } from '../../components/tabs/tabs.js';
import { TpTooltip } from '../../components/tooltip/tooltip.js';
import { emojiCategoryIcons } from '../../icons/emoji-categories.js';
import {
  buildPickerModel,
  optionKey,
  pickerItem,
  RECENT_CATEGORY,
  type PickerModel,
} from './groups.js';
import { LIST_PARTS, TpEmojiPickerList } from './list.js';
import { resolveStrings, TONE_OPTION_KEYS, TONE_STRING_KEYS } from './strings.js';
import { emojiPickerStyles } from './styles.js';
import type {
  EmojiPickerChangeMetadata,
  EmojiPickerItem,
  EmojiPickerPicker,
  EmojiPickerSize,
  EmojiPickerStatus,
  EmojiPickerStrings,
} from './types.js';
import { renderCategoryBar } from './views/categories.js';
import { renderFooter, renderGlyph } from './views/footer.js';

export type EmojiPickerValueChangeCallback = (event: TpValueChangeEvent<string>) => void;
export type EmojiPickerValueCommitCallback = (event: TpValueCommitEvent<string>) => void;

const DEFAULT_COLUMNS = 9;
const TONE_SAMPLE = '✋';
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-input-value-change',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-presence-complete',
  'tp-search-status',
  'tp-search-error',
  'tp-action',
] as const;
const NESTED_HOSTS =
  'tp-emoji-picker-list, tp-tabs, tp-tooltip, tp-button, tp-popover, tp-icon, tp-menu, tp-menu-radio-group, tp-menu-radio-item';
const stop = (event: Event): void => event.stopPropagation();
/** The popup panel is the surface's whole content: no Popover inset around the picker. */
const POPUP_PRESENTATION: PartPresentation = {
  'popover-content': { styleHook: { padding: '0', gap: '0', overflow: 'hidden' } },
};

interface ImmediateCommit {
  readonly reason: ChangeReason;
  readonly source: Event | undefined;
  readonly previous: string;
  readonly metadata: EmojiPickerChangeMetadata;
}

/**
 * Chooses one emoji: a search field filters a categorized grid by name and keyword, a category
 * bar jumps between categories, a skin tone menu tones the emoji that accept one, and a footer
 * previews the highlighted emoji, inline or in a popup. A small English dataset is built in;
 * `data` takes a complete or localized one. Form-associated: `name` submits the emoji.
 *
 * @slot footer - Content at the end of the footer, after the preview and the skin tone Button.
 * @slot trigger - Replaces the popup picker's default trigger Button.
 *
 * @fires tp-action - Cancelable, on every pick, also of the current emoji; `detail.value`,
 * `detail.item` and `detail.sourceEvent`. Listen here to insert emoji into text; cancelling it
 * leaves the value and the popup unchanged.
 * @fires tp-value-change - Cancelable proposal of a different emoji; `detail.metadata` carries the
 * picked `item` and its `category`.
 * @fires tp-value-commit - The settled emoji, right after an accepted pick.
 * @fires tp-query-change - Cancelable search text proposal.
 * @fires tp-skin-tone-change - Cancelable skin tone proposal from the tone menu.
 * @fires tp-loading-status-change - Each dataset loading status change; `detail.status` and
 * `detail.error`.
 * @fires tp-open-change - Cancelable proposal to open or close the popup; cancel the close after a
 * pick to keep it open for several picks.
 * @fires tp-open-change-complete - After the popup finishes opening or closing; `detail.open`.
 * @fires tp-field-value - Each committed value, for a surrounding Field's validation state.
 */
export class TpEmojiPicker extends TpFormElement<string> {
  static tagName = 'tp-emoji-picker';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpEmojiPickerList,
      TpTabs,
      TpTooltip,
      TpIcon,
      TpButton,
      TpPopover,
      TpMenu,
      TpMenuRadioGroup,
      TpMenuRadioItem,
    ];
  }
  static override presentation = emojiPickerPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    query: { type: String, noAccessor: true },
    defaultQuery: { type: String, attribute: 'default-query' },
    skinTone: { type: String, attribute: 'skin-tone', noAccessor: true },
    defaultSkinTone: { type: String, attribute: 'default-skin-tone' },
    picker: { type: String, reflect: true },
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    data: { attribute: false },
    emojiVersion: { type: Number, attribute: 'emoji-version' },
    columns: { type: Number },
    sticky: { type: Boolean, converter: defaultTrue },
    recent: { attribute: false },
    custom: { attribute: false },
    categoryBar: { type: Boolean, attribute: 'category-bar', converter: defaultTrue },
    preview: { type: Boolean, converter: defaultTrue },
    skinToneSelector: { type: Boolean, attribute: 'skin-tone-selector', converter: defaultTrue },
    size: { type: String, reflect: true },
    label: { type: String },
    locale: { type: String },
    strings: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [TpElement.styles, emojiPickerStyles];

  /** Starting emoji of an uncontrolled picker; form reset returns to it. */
  defaultValue: string | undefined;
  /** Starting search text of an uncontrolled search. */
  defaultQuery: string | undefined;
  /** Starting skin tone of an uncontrolled tone choice. */
  defaultSkinTone: SkinTone | undefined;
  /**
   * Renders the picker in place, or in a Popover opened from a trigger Button that shows the chosen
   * emoji.
   */
  picker: EmojiPickerPicker = 'inline';
  /** Opens the popup on first render, for an uncontrolled popup picker. */
  defaultOpen = false;
  /** A dataset or a data source; the built-in English dataset by default. */
  data: EmojiData | EmojiDataSource | undefined;
  /** Highest Emoji version shown; detected from the platform when unset. */
  emojiVersion: number | undefined;
  /** Number of emoji per row of the grid. */
  columns: number = DEFAULT_COLUMNS;
  /** Keeps each category's label at the top of the list while its emoji scroll. */
  sticky = true;
  /** Recent emoji supplied by the application; the widget keeps no history of its own. */
  recent: readonly string[] = [];
  /**
   * Your own image emoji, in categories of their own after the recent ones; a custom emoji's value
   * is `:id:`.
   */
  custom: readonly CustomEmojiGroup[] = [];
  /** Shows the row of category tabs above the list. */
  categoryBar = true;
  /** Shows the footer that previews the highlighted emoji and its name. */
  preview = true;
  /** Shows the Button that opens the skin tone menu. */
  skinToneSelector = true;
  /** Scales the cells and the emoji in them. */
  size: EmojiPickerSize = 'default';
  /**
   * Accessible name of the emoji list and of the popup trigger; a surrounding Field supplies it
   * otherwise.
   */
  label = '';
  /**
   * Language of the emoji names and keywords, passed to a data source; the document language when
   * empty.
   */
  locale = '';
  /** Replaces built-in texts (search placeholder, status messages, tone names) for localization. */
  strings: Partial<EmojiPickerStrings> = {};
  /**
   * Called synchronously with each `tp-value-change` proposal, before listeners; a controlled owner
   * writes `value` back here to accept it.
   */
  onValueChange: EmojiPickerValueChangeCallback | undefined;
  /** Called with each settled pick. */
  onValueCommitted: EmojiPickerValueCommitCallback | undefined;

  #provided: string | undefined;
  #providedQuery: string | undefined;
  #providedTone: SkinTone | undefined;
  #providedOpen: boolean | undefined;
  #strings: EmojiPickerStrings = resolveStrings();
  #immediate: ImmediateCommit | undefined;
  /** The dataset as loaded, before support filtering. */
  #dataset: EmojiData | null = null;
  #status: EmojiPickerStatus = 'idle';
  #abort: AbortController | undefined;
  /** `data` and locale of the latest load request. */
  #loadKey: { data: unknown; locale: string } | undefined;
  #support: { dataset: EmojiData; support: EmojiSupport } | undefined;
  #filtered:
    | { dataset: EmojiData; version: number | undefined; flags: boolean; data: EmojiData }
    | undefined;
  #model: { key: readonly unknown[]; model: PickerModel } | undefined;
  /** Option value of the highlighted emoji. */
  #active: string | undefined;
  /** Category at the top of the list. */
  #topCategory: string | undefined;
  /** Category of the latest jump; it stays pressed until the user scrolls or navigates. */
  #jumpedCategory: string | undefined;
  #announcer: LiveAnnouncer | undefined;
  #tabTooltips = new Map<
    HTMLButtonElement,
    { tooltip: TpTooltip; label: string | null; release: () => void }
  >();
  #composed = new WeakSet<Element>();
  #composition: object | undefined;
  #authoredTrigger = false;
  #releaseLight: (() => void) | undefined;
  #reportedDuplicates = '';

  readonly #state = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#provided,
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: (a, b) => a === b,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => this.#committed(value, previous, reason),
    diagnostic: (message) => this.diagnose('emoji-picker-state', message),
  });
  readonly #queryState = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#providedQuery,
    readDefaultValue: () => this.defaultQuery,
    hasDefaultValue: () => this.defaultQuery !== undefined,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-query-change'),
    onCommit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnose('emoji-picker-query', message),
  });
  readonly #toneState = new ControllableState<SkinTone>({
    host: this,
    initialValue: 'none',
    readControlledValue: () => this.#providedTone,
    readDefaultValue: () => this.defaultSkinTone,
    hasDefaultValue: () => this.defaultSkinTone !== undefined,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-skin-tone-change'),
    onCommit: (tone, previous) => {
      if (tone !== previous)
        this.#announcer?.announce(
          fillTemplate(this.#strings.skinToneChanged, { tone: this.#toneName(tone) }),
          { key: 'skin-tone' },
        );
      this.requestUpdate();
    },
    diagnostic: (message) => this.diagnose('emoji-picker-skin-tone', message),
  });

  constructor() {
    super();
    // Nested constituent events stop at this shadow root; the widget republishes its own lanes
    // (uwg-em-req-evt-3).
    containNestedEvents(this, { types: NESTED_EVENT_TYPES, on: 'root' });
  }

  // ---- lanes -------------------------------------------------------------------------------

  override get value(): string {
    return this.#state.value;
  }
  override set value(value: string) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : String(value);
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }
  /**
   * The search text that filters the emoji by name and keyword; setting it makes the search
   * controlled.
   */
  get query(): string {
    return this.#queryState.value;
  }
  set query(value: string) {
    const previous = this.query;
    const next = value === null || value === undefined ? undefined : String(value);
    if (!this.hasUpdated || this.#queryState.controlled) {
      this.#providedQuery = next;
      if (this.hasUpdated) this.#queryState.sync();
    } else if (next !== undefined) this.#queryState.set(next, 'programmatic');
    this.requestUpdate('query', previous);
  }
  /**
   * The skin tone applied to emoji that accept one; setting it makes the tone choice controlled.
   */
  get skinTone(): SkinTone {
    return this.#toneState.value;
  }
  set skinTone(value: SkinTone) {
    const previous = this.skinTone;
    const next = isSkinTone(value) ? value : undefined;
    if (!this.hasUpdated || this.#toneState.controlled) {
      this.#providedTone = next;
      if (this.hasUpdated) this.#toneState.sync();
    } else if (next) this.#toneState.set(next, 'programmatic');
    this.requestUpdate('skinTone', previous);
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

  // ---- read-only state ---------------------------------------------------------------------

  /** The dataset after support filtering, or null before one loads. */
  get emojiData(): EmojiData | null {
    return this.#filteredData();
  }
  /** Loading state of the dataset; an error shows a Retry button. */
  get status(): EmojiPickerStatus {
    return this.#status;
  }
  /** The highlighted emoji, or null. */
  get activeEmoji(): EmojiPickerItem | null {
    const slot =
      this.#active === undefined ? undefined : this.#pickerModel().slots.get(this.#active);
    return slot ? pickerItem(slot, this.skinTone) : null;
  }
  /** Identifier of the category at the top of the list; undefined while a query is active. */
  get activeCategory(): string | undefined {
    if (this.query.trim()) return undefined;
    return this.#jumpedCategory ?? this.#topCategory ?? this.#pickerModel().categories[0]?.id;
  }
  /** Whether the value is owned by the application through `value`. */
  get controlled(): boolean {
    return this.#state.controlled;
  }
  /** Highest Emoji version shown: `emojiVersion`, else the detected one (undefined before). */
  get supportedVersion(): number | undefined {
    return this.#versionLimit() ?? this.#support?.support.version;
  }

  // ---- methods -----------------------------------------------------------------------------

  /** Proposes and commits a value; returns whether it was accepted. */
  setValue(value: string, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    return this.#propose(String(value ?? ''), reason, sourceEvent, {});
  }
  /** Opens or closes the popup picker through the composed Popover. */
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    const popover = this.#popover;
    if (!popover) return false;
    return popover.setOpen(open, reason, event);
  }
  /** Closes the popup picker. */
  close(): void {
    this.setOpen(false, 'imperative-action');
  }
  /** Calls the data source again. */
  reload(): void {
    this.#load();
  }
  /**
   * Scrolls a category's label to the top of the list and highlights its first emoji; an active
   * query is cleared first. Returns false for an unknown category.
   */
  async scrollToCategory(
    id: string,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): Promise<boolean> {
    if (this.query && !this.#queryState.set('', reason, sourceEvent)) return false;
    await this.updateComplete;
    const list = this.#list;
    if (list) await list.updateComplete;
    const key = this.#pickerModel().first.get(id);
    if (!list || key === undefined) return false;
    list.revealCategory(key);
    // A category near the end cannot reach the top; it stays the pressed one regardless.
    this.#jumpedCategory = id;
    this.requestUpdate();
    return true;
  }

  // ---- lifecycle ---------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker (Field's selector list is closed).
    this.setAttribute('data-field-control', '');
    this.#announcer = new LiveAnnouncer({
      root: () => (this.renderRoot instanceof ShadowRoot ? this.renderRoot : this),
    });
    // Light-DOM children only: host attribute writes from updated() must not re-enter.
    this.#releaseLight = observeSubtree(this, () => this.requestUpdate(), {
      content: true,
      attributes: false,
      subtree: false,
    });
  }

  override disconnectedCallback(): void {
    this.#releaseLight?.();
    this.#releaseLight = undefined;
    this.#announcer?.dispose();
    this.#announcer = undefined;
    if (this.#status === 'loading') {
      // A load cut short by disconnection starts again on reconnection.
      this.#abort?.abort();
      this.#abort = undefined;
      this.#loadKey = undefined;
    }
    for (const entry of this.#tabTooltips.values()) entry.release();
    this.#tabTooltips.clear();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('strings')) this.#strings = resolveStrings(this.strings);
    this.#state.initialize();
    this.#queryState.initialize();
    this.#toneState.initialize();
    if (
      changed.has('columns') &&
      !(Number.isInteger(this.columns) && this.columns > 0) &&
      this.columns !== DEFAULT_COLUMNS
    )
      this.diagnose(
        'emoji-picker-columns',
        `columns must be a positive integer; ${String(this.columns)} uses ${DEFAULT_COLUMNS}.`,
      );
    const key = { data: this.data, locale: this.#locale() };
    if (
      this.isConnected &&
      (!this.#loadKey || this.#loadKey.data !== key.data || this.#loadKey.locale !== key.locale)
    )
      this.#load();
    // Before rendering, so the first render of a dataset already hides what the platform cannot
    // draw; detecting after it would schedule a second update from `updated()`.
    if (this.isConnected && this.#dataset && this.#support?.dataset !== this.#dataset)
      this.#detectSupport();
    this.#authoredTrigger = this.querySelector(':scope > [slot="trigger"]') !== null;
    const duplicates = this.#pickerModel().duplicates.join(',');
    if (duplicates && duplicates !== this.#reportedDuplicates)
      this.diagnose(
        'emoji-picker-custom',
        `Repeated custom emoji identifiers skipped: ${duplicates}.`,
      );
    this.#reportedDuplicates = duplicates;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-empty', !this.value);
    this.setAttribute('data-picker', this.picker);
    this.setAttribute('data-status', this.#status);
    this.toggleAttribute('data-loading', this.#status === 'loading');
    this.toggleAttribute('data-error', this.#status === 'error');
    this.toggleAttribute('data-searching', !!this.query.trim());
    this.toggleAttribute('data-sticky', this.sticky);
    this.toggleAttribute('data-category-bar', this.categoryBar);
    this.toggleAttribute('data-preview', this.preview);
    this.setAttribute('data-skin-tone', this.skinTone);
    this.toggleAttribute('data-open', this.picker === 'popup' && this.open);
    this.setFormValue(this.value || null, this.value);
    this.setRequiredValidity(this.required && !this.value, this.#strings.valueMissing);
    this.#syncComposition();
    this.#syncCategoryTooltips();
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    this.#state.set(state, 'programmatic', undefined, { cancelable: false });
  }

  override get inputElement(): HTMLElement | null {
    return this.#list?.inputElement ?? null;
  }

  protected override focusTarget(): HTMLElement | null {
    if (this.picker === 'popup' && !this.open) return this.#triggerElement() ?? super.focusTarget();
    return this.#list?.inputElement ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="emoji-picker"]');
  }

  // ---- data --------------------------------------------------------------------------------

  #locale(): string {
    return this.locale || resolveLocale(this) || 'en';
  }

  #setStatus(status: EmojiPickerStatus, error?: unknown): void {
    if (status === this.#status && status !== 'error') return;
    this.#status = status;
    this.emit('tp-loading-status-change', { status, error });
    this.requestUpdate();
  }

  #load(): void {
    this.#abort?.abort();
    this.#abort = undefined;
    const locale = this.#locale();
    this.#loadKey = { data: this.data, locale };
    const source = this.data ?? builtinEmojiData;
    if (typeof source !== 'function') {
      this.#adopt(source);
      return;
    }
    const controller = new AbortController();
    this.#abort = controller;
    let result: EmojiData | Promise<EmojiData>;
    try {
      result = source({ locale, signal: controller.signal });
    } catch (error) {
      this.#fail(error);
      return;
    }
    if (!(result && typeof (result as Promise<EmojiData>).then === 'function')) {
      this.#abort = undefined;
      this.#adopt(result as EmojiData);
      return;
    }
    this.#setStatus('loading');
    (result as Promise<EmojiData>).then(
      (data) => {
        if (this.#abort !== controller) return;
        this.#abort = undefined;
        this.#adopt(data);
      },
      (error: unknown) => {
        if (this.#abort !== controller || controller.signal.aborted) return;
        this.#abort = undefined;
        this.#fail(error);
      },
    );
  }

  #adopt(data: EmojiData): void {
    this.#dataset = data;
    this.#setStatus('loaded');
    this.requestUpdate();
  }

  #fail(error: unknown): void {
    // The error state replaces whatever was listed; Retry calls the source again.
    this.#dataset = null;
    this.diagnose(
      'emoji-picker-data',
      `Emoji data could not be loaded: ${error instanceof Error ? error.message : String(error)}`,
    );
    this.#setStatus('error', error);
  }

  #versionLimit(): number | undefined {
    const version = Number(this.emojiVersion);
    return Number.isFinite(version) && version > 0 ? version : undefined;
  }

  #detectSupport(): void {
    const dataset = this.#dataset;
    if (!dataset) return;
    const font =
      this.ownerDocument.defaultView
        ?.getComputedStyle(this)
        .getPropertyValue('--tp-font-emoji')
        .trim() || EMOJI_FONT_STACK;
    this.#support = {
      dataset,
      support: detectEmojiSupport(dataset.emojis, this.ownerDocument, font),
    };
  }

  #filteredData(): EmojiData | null {
    const dataset = this.#dataset;
    if (!dataset) return null;
    const detected = this.#support?.dataset === dataset ? this.#support.support : undefined;
    const limit = this.#versionLimit();
    // Until detection ran, nothing is hidden except by an explicit version.
    const support: EmojiSupport | undefined =
      limit !== undefined ? { version: limit, flags: detected?.flags ?? true } : detected;
    const version = support?.version;
    const flags = support?.flags ?? true;
    const cached = this.#filtered;
    if (
      cached &&
      cached.dataset === dataset &&
      cached.version === version &&
      cached.flags === flags
    )
      return cached.data;
    const data = support
      ? { ...dataset, emojis: filterSupported(dataset.emojis, support) }
      : dataset;
    this.#filtered = { dataset, version, flags, data };
    return data;
  }

  #pickerModel(): PickerModel {
    const data = this.#filteredData();
    // Recent hides while searching; without recent emoji the model is the same either way.
    const includeRecent = this.recent.length > 0 && !this.query.trim();
    const key = [data, this.recent, this.custom, includeRecent, this.#strings.recent] as const;
    const cached = this.#model;
    if (cached && cached.key.every((part, index) => part === key[index])) return cached.model;
    const model = buildPickerModel({
      data,
      recent: this.recent,
      custom: this.custom,
      includeRecent,
      recentLabel: this.#strings.recent,
    });
    this.#model = { key, model };
    return model;
  }

  // ---- picks -------------------------------------------------------------------------------

  #pick = (key: unknown, event: Event): void => {
    if (this.readOnly || this.effectiveDisabled) return;
    const model = this.#pickerModel();
    const slot = model.slots.get(String(key));
    if (!slot) return;
    const item = pickerItem(slot, this.skinTone);
    if (
      !this.emit('tp-action', { value: item.value, item, sourceEvent: event }, { cancelable: true })
    )
      return;
    const reason: ChangeReason = event.type.startsWith('key') ? 'keyboard' : 'item-press';
    if (
      item.value !== this.value &&
      !this.#propose(item.value, reason, event, { item, category: slot.category })
    )
      return;
    if (this.picker === 'popup') this.setOpen(false, 'item-press', event);
  };

  #propose(
    value: string,
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    metadata: EmojiPickerChangeMetadata,
  ): boolean {
    const previous = this.value;
    this.#immediate = { reason, source: sourceEvent, previous, metadata };
    const accepted = this.#state.set(value, reason, sourceEvent, { metadata });
    if (!accepted || !this.controlled) this.#immediate = undefined;
    return accepted;
  }

  #committed(value: string, previous: string, reason: ChangeReason): void {
    this.emit('tp-field-value', { value, previousValue: previous, reason });
    const immediate = this.#immediate;
    if (immediate) {
      this.#immediate = undefined;
      if (value !== immediate.previous) {
        const event = new TpValueCommitEvent<string>(
          value,
          immediate.previous,
          immediate.reason,
          immediate.source,
          { metadata: immediate.metadata },
        );
        this.onValueCommitted?.(event);
        this.dispatchEvent(event);
      }
    }
    this.requestUpdate('value', previous);
  }

  // ---- constituents ------------------------------------------------------------------------

  get #list(): TpEmojiPickerList | null {
    return this.renderRoot?.querySelector?.<TpEmojiPickerList>('tp-emoji-picker-list') ?? null;
  }

  get #popover(): TpPopover | null {
    return this.renderRoot?.querySelector?.<TpPopover>('tp-popover') ?? null;
  }

  #triggerElement(): HTMLElement | null {
    return (
      this.renderRoot.querySelector<HTMLElement>('tp-button.trigger') ??
      this.querySelector<HTMLElement>(':scope > [slot="trigger"]')
    );
  }

  #queryChange = (event: TpValueChangeEvent<string>): void => {
    const { value, reason, sourceEvent } = event.detail;
    this.#releaseJump();
    this.#queryState.set(value, reason, sourceEvent);
    // The list's query is controlled by this lane: hand it the accepted text at once.
    const list = this.#list;
    if (list) list.inputValue = this.query;
  };

  #highlight = (value: unknown, details?: { reason: ChangeReason }): void => {
    if (details?.reason === 'list-navigation') this.#releaseJump();
    const next = value === null || value === undefined ? undefined : String(value);
    if (next === this.#active) return;
    this.#active = next;
    this.requestUpdate();
  };

  #releaseJump = (): void => {
    if (this.#jumpedCategory === undefined) return;
    this.#jumpedCategory = undefined;
    this.requestUpdate();
  };

  #topGroup = (group: unknown): void => {
    const category = (group as { category?: string } | undefined)?.category;
    if (category === this.#topCategory) return;
    this.#topCategory = category;
    this.requestUpdate();
  };

  #categoryChange = (event: TpValueChangeEvent<unknown>): void => {
    event.stopPropagation();
    // The widget owns the selected category: it follows the list, never the press.
    event.preventDefault();
    const id = event.detail.value;
    if (typeof id === 'string')
      void this.scrollToCategory(id, 'item-press', event.detail.sourceEvent);
  };

  #toneChange = (event: TpValueChangeEvent<unknown>): void => {
    event.stopPropagation();
    const { value, sourceEvent } = event.detail;
    if (this.effectiveDisabled || !isSkinTone(value)) return;
    // The menu's radio group is controlled by this lane.
    this.#toneState.set(value, 'item-press', sourceEvent);
  };

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

  #initialFocus = (): HTMLElement | null => this.#list?.inputElement ?? null;

  #toneName(tone: SkinTone): string {
    return (
      this.#dataset?.skinTones?.[tone] ??
      (this.strings[TONE_STRING_KEYS[tone]] as string | undefined) ??
      SKIN_TONE_NAMES[tone]
    );
  }

  #glyphOf = (value: unknown): unknown => {
    const slot = this.#pickerModel().slots.get(String(value));
    return slot ? renderGlyph(pickerItem(slot, this.skinTone)) : String(value);
  };

  #nameOf = (value: unknown): string => {
    const slot = this.#pickerModel().slots.get(String(value));
    if (!slot) return String(value);
    const item = pickerItem(slot, this.skinTone);
    return item.skinTone && item.skinTone !== 'none'
      ? `${item.label}, ${this.#toneName(item.skinTone)}`
      : item.label;
  };

  #keywordsOf = (item: unknown): readonly string[] | undefined => {
    const value =
      item && typeof item === 'object' && 'value' in item
        ? (item as { value: unknown }).value
        : item;
    const slot = this.#pickerModel().slots.get(String(value));
    if (!slot) return undefined;
    return slot.kind === 'unicode'
      ? slot.record.keywords
      : slot.kind === 'custom'
        ? (slot.custom.keywords ?? [])
        : (slot.record?.keywords ?? slot.custom?.keywords ?? []);
  };

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    for (const nested of this.renderRoot.querySelectorAll<HTMLElement>(NESTED_HOSTS)) {
      if (!changed && this.#composed.has(nested)) continue;
      this.#composed.add(nested);
      setPartComposition(
        nested as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
  }

  /** Each category tab is a detached trigger of the one category Tooltip, named by its label. */
  #syncCategoryTooltips(): void {
    const tooltip = this.renderRoot.querySelector<TpTooltip>('tp-tooltip.category-tooltip');
    const tabs = tooltip
      ? [...this.renderRoot.querySelectorAll<HTMLButtonElement>('tp-tabs.categories > .category')]
      : [];
    for (const [tab, entry] of this.#tabTooltips)
      if (!tabs.includes(tab) || entry.tooltip !== tooltip || entry.label !== tab.ariaLabel) {
        entry.release();
        this.#tabTooltips.delete(tab);
      }
    for (const tab of tabs)
      if (tooltip && !this.#tabTooltips.has(tab))
        this.#tabTooltips.set(tab, {
          tooltip,
          label: tab.ariaLabel,
          release: tooltip.registerTrigger(tab, { identifier: tab.value, payload: tab.ariaLabel }),
        });
  }

  // ---- render ------------------------------------------------------------------------------

  protected override render() {
    const strings = this.#strings;
    const state = {
      value: this.value,
      picker: this.picker,
      size: this.size,
      empty: !this.value,
      open: this.picker === 'popup' && this.open,
      loading: this.#status === 'loading',
      error: this.#status === 'error',
      searching: !!this.query.trim(),
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
    };
    const label = this.label || strings.label;
    const panel = this.#renderPanel();
    return this.renderPart('emoji-picker', state, {
      tag: 'div',
      properties: {
        part: 'emoji-picker',
        class: 'root',
        role: 'group',
        'aria-label': label,
        'data-picker': this.picker,
        'data-empty': !this.value,
        'data-open': state.open,
        'data-loading': state.loading,
        'data-error': state.error,
        'data-searching': state.searching,
        'data-sticky': this.sticky,
        'data-disabled': this.effectiveDisabled,
        'data-readonly': this.readOnly,
        style: { '--_tp-emoji-picker-columns': String(this.#columns()) },
      },
      content: this.picker === 'popup' ? this.#renderPopup(state, panel) : panel,
    });
  }

  #renderPanel() {
    const strings = this.#strings;
    const model = this.#pickerModel();
    const data = this.#filteredData();
    const columns = this.#columns();
    const active = this.#active === undefined ? undefined : model.slots.get(this.#active);
    const chosenKey = optionKey(this.value, model, data);
    const chosen = chosenKey === undefined ? undefined : model.slots.get(chosenKey);
    const previewItem = active
      ? pickerItem(active, this.skinTone)
      : chosen
        ? { ...pickerItem(chosen, this.skinTone), value: this.value, emoji: this.value }
        : null;
    // A failed load replaces the list's empty state with the error and a Retry Button.
    const failed = this.#status === 'error';
    const retry = failed
      ? html`<div slot="empty" class="status">
          ${strings.error}
          <tp-button
            class="retry"
            part="emoji-picker-retry"
            variant="outline"
            size="sm"
            @click=${() => this.reload()}
            >${strings.retry}</tp-button
          >
        </div>`
      : nothing;
    return html`<div class="panel">
      ${
        this.categoryBar
          ? renderCategoryBar({
              categories: model.categories.map((category) =>
                category.id === RECENT_CATEGORY
                  ? { ...category, icon: emojiCategoryIcons.recent }
                  : category,
              ),
              active: this.activeCategory,
              label: strings.categories,
              disabled: this.effectiveDisabled,
              onChange: this.#categoryChange,
            })
          : nothing
      }
      <tp-emoji-picker-list
        class="list"
        exportparts=${LIST_PARTS}
        data-sticky=${this.sticky ? '' : nothing}
        .items=${model.entries}
        .value=${chosenKey ?? null}
        .inputValue=${this.query}
        .columns=${columns}
        .label=${strings.search}
        .listName=${this.label || strings.label}
        .placeholder=${strings.searchPlaceholder}
        .itemToLabel=${this.#glyphOf}
        .optionName=${this.#nameOf}
        .matchFields=${this.#keywordsOf}
        .messages=${{
          empty: failed ? strings.error : strings.noResults,
          loading: strings.loading,
          error: strings.error,
          // The status region announces a failed load instead of an empty count.
          results: (count: number) =>
            failed
              ? strings.error
              : count === 1
                ? strings.resultsOne
                : fillTemplate(strings.results, { count }),
        }}
        .busy=${this.#status === 'loading' && !this.#dataset}
        .locale=${this.#locale()}
        .disabled=${this.effectiveDisabled}
        .onPick=${this.#pick}
        .onHighlight=${this.#highlight}
        .onTopGroup=${this.#topGroup}
        .onUserScroll=${this.#releaseJump}
        .onInputValueChange=${this.#queryChange}
        @tp-input-value-change=${stop}
        @tp-field-value=${stop}
        @tp-search-status=${stop}
        >${retry}</tp-emoji-picker-list
      >
      ${renderFooter({
        preview: this.preview,
        skinToneSelector: this.skinToneSelector,
        item: previewItem,
        placeholder: strings.previewPlaceholder,
        toneSample: toneEmoji({ emoji: TONE_SAMPLE }, this.skinTone),
        toneLabel: `${strings.skinTone}: ${strings[TONE_OPTION_KEYS[this.skinTone]]}`,
        toneMenuLabel: strings.skinTone,
        tone: this.skinTone,
        tones: SKIN_TONES.map((tone) => ({
          tone,
          name: strings[TONE_OPTION_KEYS[tone]],
          sample: toneEmoji({ emoji: TONE_SAMPLE }, tone),
        })),
        disabled: this.effectiveDisabled,
        onTone: this.#toneChange,
      })}
    </div>`;
  }

  #columns(): number {
    return Number.isInteger(this.columns) && this.columns > 0 ? this.columns : DEFAULT_COLUMNS;
  }

  #renderPopup(state: Record<string, unknown>, panel: unknown) {
    const strings = this.#strings;
    const data = this.#filteredData();
    const model = this.#pickerModel();
    const key = optionKey(this.value, model, data);
    const slot = key === undefined ? undefined : model.slots.get(key);
    const chosen = slot ? { ...pickerItem(slot, this.skinTone), emoji: this.value } : null;
    const trigger = this.#authoredTrigger
      ? html`<slot name="trigger" slot="trigger"></slot>`
      : html`<tp-button
          slot="trigger"
          class="trigger"
          part="emoji-picker-trigger"
          variant="outline"
          size="icon"
          aria-label=${[this.label || strings.trigger, chosen?.label].filter(Boolean).join(', ')}
          .icon=${chosen ? undefined : emojiCategoryIcons['smileys-emotion']}
          ?disabled=${this.effectiveDisabled}
          >${
            chosen
              ? html`<span slot="icon-start" class="trigger-glyph" aria-hidden="true"
                  >${renderGlyph(chosen)}</span
                >`
              : nothing
          }</tp-button
        >`;
    // The popup renders in place (native top layer, no portal): portaled content would leave
    // this shadow root and lose the widget's structural styles and generated presentation.
    return html`<tp-popover
      class="popup"
      label=${this.label || strings.label}
      .portal=${false}
      .partPresentation=${POPUP_PRESENTATION}
      .open=${this.#providedOpen}
      .defaultOpen=${this.defaultOpen}
      .initialFocus=${this.#initialFocus}
      ?disabled=${this.effectiveDisabled}
      @tp-open-change=${this.#openChange}
      @tp-open-change-complete=${this.#openComplete}
      @tp-field-value=${stop}
      >${trigger}${this.renderPart('emoji-picker-popup', state, {
        tag: 'div',
        properties: { part: 'emoji-picker-popup', class: 'popup-panel' },
        content: panel,
      })}</tp-popover
    >`;
  }
}

export type EmojiPickerChangeDetail = TpValueChangeEvent<string>['detail'] & {
  metadata?: EmojiPickerChangeMetadata;
};

declare global {
  interface HTMLElementTagNameMap {
    'tp-emoji-picker': TpEmojiPicker;
  }
}
