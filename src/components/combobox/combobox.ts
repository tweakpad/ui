import { comboboxStateMarkers } from './state.js';
import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement, TpFormElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { ChoiceCollectionController } from '../../foundation/choice-collection.js';
import { ChoiceModel, type ChoiceModelNode } from '../../foundation/choice-model.js';
import { SurfaceState, type TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import { PresenceController } from '../../foundation/presence.js';
import { FloatingDismissController } from '../../foundation/floating-dismiss.js';
import { OwnedPortal } from '../../foundation/owned-portal.js';
import { ComposedEnvironmentObserver } from '../../foundation/composed-environment.js';
import { acquireOutsideInert } from '../../foundation/outside-inert.js';
import { acquireScrollLock } from '../../foundation/scroll-lock.js';
import {
  deepActiveElement,
  focusableElements,
  isAvailable,
  restoreFocus,
  composedParent,
} from '../../foundation/focus.js';
import { resolveSurfaceFocus } from '../../foundation/surface-focus.js';
import {
  renderPart,
  type ComponentPartContract,
  type PartRenderOptions,
  type PartState,
  componentHandlingPrevented,
} from '../../foundation/part.js';
import { positionSurface, resolveSide, geometryOffsets } from '../../foundation/positioning.js';
import type {
  Alignment,
  CollisionBoundary,
  CollisionPolicy,
  LogicalSide,
  PositioningHandle,
  PositioningStrategy,
  GeometryOffset,
} from '../../foundation/positioning.js';
import { createId } from '../../foundation/id.js';
import { resolveLocale } from '../../foundation/services.js';
import type { ChangeReason } from '../../foundation/types.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { checkIcon } from '../../icons/check.js';
import { xIcon } from '../../icons/x.js';
import { createComboboxFilter, type ComboboxFilter } from './filter.js';
import {
  isComboboxItemCollection,
  comboboxLeaves,
  type ComboboxItemsData,
  type ComboboxItemCollection,
} from './items.js';
import { ComboboxSource } from './source.js';
import { comboboxStyles } from './styles.js';
import type {
  ComboboxAnchor,
  ComboboxChoiceOption,
  ComboboxClearBehavior,
  ComboboxCompletionMode,
  ComboboxContainer,
  ComboboxFocusTarget,
} from './types.js';

export class TpCombobox extends TpFormElement<unknown> {
  static tagName = 'tp-combobox';
  static override properties = {
    ...TpFormElement.properties,
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    inputValue: { type: String, attribute: 'input-value', noAccessor: true },
    defaultInputValue: { type: String, attribute: 'default-input-value', noAccessor: true },
    query: { type: String, noAccessor: true },
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open', noAccessor: true },
    multiple: { type: Boolean, reflect: true },
    items: { attribute: false },
    filteredItems: { attribute: false },
    filter: { attribute: false },
    limit: { type: Number },
    locale: { type: String },
    placeholder: { type: String },
    label: { type: String },
    identifier: { type: String },
    autoComplete: { type: String, attribute: 'autocomplete' },
    searchable: { type: Boolean },
    completionMode: { type: String, attribute: 'completion-mode' },
    clearBehavior: { type: String, attribute: 'clear-behavior' },
    autoHighlight: { attribute: false },
    keepHighlight: { type: Boolean, attribute: 'keep-highlight' },
    highlightItemOnHover: { type: Boolean, attribute: 'highlight-item-on-hover' },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    grid: { type: Boolean },
    inline: { type: Boolean },
    virtualized: { type: Boolean },
    mountedItems: { attribute: false },
    loading: { type: Boolean },
    modal: { type: Boolean },
    openOnInputClick: { type: Boolean, attribute: 'open-on-input-click' },
    closeOnSelect: { type: Boolean, attribute: 'close-on-select' },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    showTrigger: { type: Boolean, attribute: 'show-trigger' },
    showClear: { type: Boolean, attribute: 'show-clear' },
    showChipRemove: { type: Boolean, attribute: 'show-chip-remove' },
    clearKeepMounted: { type: Boolean, attribute: 'clear-keep-mounted' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    container: { attribute: false },
    placement: { type: String },
    side: { type: String },
    align: { type: String },
    sideOffset: { type: Number, attribute: 'side-offset' },
    alignOffset: { type: Number, attribute: 'align-offset' },
    anchor: { attribute: false },
    disableAnchorTracking: { type: Boolean, attribute: 'disable-anchor-tracking' },
    collisionAvoidance: { attribute: false },
    collisionBoundary: { attribute: false },
    collisionPadding: { attribute: false },
    sticky: { type: Boolean },
    positionMethod: { type: String, attribute: 'position-method' },
    initialFocus: { attribute: false },
    finalFocus: { attribute: false },
    showArrow: { type: Boolean, attribute: 'show-arrow' },
    arrowPadding: { type: Number, attribute: 'arrow-padding' },
    showBackdrop: { type: Boolean, attribute: 'show-backdrop' },
    isItemEqual: { attribute: false },
    itemToText: { attribute: false },
    itemToLabel: { attribute: false },
    onValueChange: { attribute: false },
    onInputValueChange: { attribute: false },
    onOpenChange: { attribute: false },
    onOpenChangeComplete: { attribute: false },
    onItemHighlighted: { attribute: false },
  };
  static override styles: CSSResultGroup = [TpElement.styles, comboboxStyles];
  defaultValue: unknown = undefined;
  #defaultInputValue = '';
  #hasDefaultInputValue = false;
  get defaultInputValue(): string {
    return this.#defaultInputValue;
  }
  set defaultInputValue(value: string) {
    const previous = this.#defaultInputValue;
    this.#defaultInputValue = String(value ?? '');
    this.#hasDefaultInputValue = true;
    this.requestUpdate('defaultInputValue', previous);
  }
  #defaultOpen = false;
  #hasDefaultOpen = false;
  get defaultOpen(): boolean {
    return this.#defaultOpen;
  }
  set defaultOpen(value: boolean) {
    const previous = this.#defaultOpen;
    this.#defaultOpen = Boolean(value);
    this.#hasDefaultOpen = true;
    this.requestUpdate('defaultOpen', previous);
  }
  multiple = false;
  items: ComboboxItemsData<unknown> | ComboboxItemCollection<unknown> | undefined;
  filteredItems: ComboboxItemsData<unknown> | undefined;
  filter:
    ((item: unknown, query: string, text: (item: unknown) => string) => boolean) | null | undefined;
  limit = -1;
  locale: string | undefined;
  placeholder = '';
  label = 'Options';
  identifier = createId('tp-combobox');
  autoComplete = '';
  searchable = true;
  completionMode: ComboboxCompletionMode = 'list';
  clearBehavior: ComboboxClearBehavior = 'contextual';
  autoHighlight: boolean | 'always' = false;
  keepHighlight = false;
  highlightItemOnHover = true;
  loopFocus = true;
  grid = false;
  inline = false;
  virtualized = false;
  mountedItems: readonly unknown[] | undefined;
  loading = false;
  modal = false;
  openOnInputClick = true;
  closeOnSelect: boolean | undefined;
  nativeAction = true;
  showTrigger = true;
  showClear = false;
  showChipRemove = true;
  clearKeepMounted = false;
  keepMounted = false;
  container: ComboboxContainer = null;
  placement = 'bottom center';
  side: LogicalSide | undefined;
  align: Alignment | undefined;
  sideOffset: GeometryOffset = 0;
  alignOffset: GeometryOffset = 0;
  anchor: ComboboxAnchor = null;
  disableAnchorTracking = false;
  collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'flip', fallbackAxisSide: 'none' };
  collisionBoundary: CollisionBoundary = 'clipping-ancestors';
  collisionPadding: number | Partial<Record<'top' | 'bottom' | 'left' | 'right', number>> = 5;
  sticky = false;
  positionMethod: PositioningStrategy = 'absolute';
  initialFocus: ComboboxFocusTarget = true;
  finalFocus: ComboboxFocusTarget = true;
  showArrow = false;
  arrowPadding = 5;
  showBackdrop = false;
  isItemEqual: ((a: unknown, b: unknown) => boolean) | undefined;
  itemToText: ((value: unknown) => string) | undefined;
  itemToLabel: ((value: unknown) => unknown) | undefined;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  onInputValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  onOpenChange: ((event: TpSurfaceOpenChangeEvent) => void) | undefined;
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  onItemHighlighted:
    ((value: unknown, detail: { index: number; reason: ChangeReason }) => void) | undefined;

  #providedValue: unknown;
  #providedInput: string | undefined;
  #providedOpen: boolean | undefined;
  override get value(): unknown {
    return this.selection.value;
  }
  override set value(value: unknown) {
    const before = this.#providedValue;
    this.#providedValue = value;
    this.requestUpdate('value', before);
    if (this.hasUpdated) this.selection.sync();
  }
  get inputValue(): string {
    return this.#inputState.value;
  }
  set inputValue(value: string | undefined) {
    const before = this.#providedInput;
    this.#providedInput = value;
    this.requestUpdate('inputValue', before);
    if (this.hasUpdated) this.#inputState.sync();
  }
  /** Legacy query remains an alias of the independently controlled text lane. */
  get query(): string {
    return this.inputValue;
  }
  set query(value: string) {
    if (this.hasUpdated && !this.#inputState.controlled)
      this.#inputState.set(value, 'programmatic');
    else this.inputValue = value;
  }
  get open(): boolean {
    this.#surface.initialize();
    return this.inline || this.#surface.open;
  }
  set open(value: boolean | undefined) {
    const before = this.#providedOpen;
    this.#providedOpen = value;
    this.requestUpdate('open', before);
    if (this.hasUpdated) {
      if (this.isOpenControlled) this.#surface.sync(true);
      else this.setOpen(value ?? false);
    }
  }
  protected get isOpenControlled(): boolean {
    return true;
  }
  protected get usesOwnFloatingSurface(): boolean {
    return !this.inline;
  }
  protected get navigationLoops(): boolean {
    return this.loopFocus;
  }
  protected readonly collection = new ChoiceCollectionController<unknown, ComboboxChoiceOption>({
    equals: (a, b) => this.isItemEqual?.(a, b) ?? Object.is(a, b),
    locale: () => this.locale ?? resolveLocale(this),
    diagnostic: (message) => this.#diagnose(message),
  });
  protected readonly selection = new ControllableState<unknown>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () =>
      this.multiple ? this.#values(this.defaultValue) : (this.defaultValue ?? null),
    hasDefaultValue: () => this.defaultValue !== undefined,
    onChange: (event) => this.onValueChange?.(event),
    equals: (a, b) =>
      this.multiple
        ? this.#values(a).length === this.#values(b).length &&
          this.#values(a).every((value, index) =>
            this.collection.equal(value, this.#values(b)[index]),
          )
        : this.collection.equal(a, b),
    onCommit: () => {
      this.#syncForm();
      this.dispatchEvent(new Event('tp-field-value', { bubbles: true, composed: true }));
    },
    diagnostic: (message) => this.#diagnose(message),
  });
  readonly #inputState = new ControllableState<string>({
    host: this,
    initialValue: '',
    readControlledValue: () => this.#providedInput,
    readDefaultValue: () => this.defaultInputValue,
    hasDefaultValue: () => this.#hasDefaultInputValue,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-input-value-change'),
    onChange: (event) => this.onInputValueChange?.(event),
    onCommit: () => {
      this.#completion = '';
      this.requestUpdate();
    },
    diagnostic: (message) => this.#diagnose(message),
  });
  readonly #surface = new SurfaceState({
    read: () => (this.isOpenControlled ? this.#providedOpen : undefined),
    defaultOpen: () =>
      this.isOpenControlled ? this.defaultOpen : (this.#providedOpen ?? this.defaultOpen),
    hasDefaultOpen: () => this.#hasDefaultOpen,
    dispatch: (event) => {
      this.onOpenChange?.(event);
      this.dispatchEvent(event);
    },
    commit: (open) => this.#openCommitted(open),
    diagnostic: (message) => this.#diagnose(message),
  });
  protected get options(): ComboboxChoiceOption[] {
    return [...this.collection.source];
  }
  protected get visibleOptions(): ComboboxChoiceOption[] {
    return [...this.collection.visible];
  }
  protected get activeIndex(): number {
    return this.collection.activeIndex;
  }
  protected set activeIndex(index: number) {
    this.collection.activeIndex = index;
  }
  readonly #model = new ChoiceModel(this);
  readonly #source = new ComboboxSource();
  readonly #portal = new OwnedPortal(this, TpCombobox.styles);
  readonly #presence = new PresenceController(this, {
    surface: () => this.#content,
    keepMounted: () => !this.#forceUnmount && (this.keepMounted || this.#surface.retained),
    onStateChange: () => this.requestUpdate(),
    onComplete: (open) => {
      this.onOpenChangeComplete?.(open);
      if (!open) this.#content?.hidePopover();
    },
  });
  readonly #clearPresence = new PresenceController(this, {
    surface: () => this.#clear,
    keepMounted: () => this.clearKeepMounted,
  });
  readonly #dismiss = new FloatingDismissController(this, {
    open: () => this.open && !this.inline,
    anchor: () => this.#editor,
    insideElements: () => (this.#content ? [this.#content] : []),
    outside: () => true,
    escape: () => !this.#completion,
    topmostOnly: true,
    dismiss: (event) =>
      this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event),
  });
  readonly #environment = new ComposedEnvironmentObserver(this, () => {
    this.requestUpdate();
    void this.#position?.update();
  });
  #editor: HTMLInputElement | null = null;
  #anchorElement: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #list: HTMLElement | null = null;
  #arrow: HTMLElement | null = null;
  #clear: HTMLElement | null = null;
  #position: PositioningHandle | null = null;
  #positionKey = '';
  #positionAnchor: unknown;
  #positionTarget: HTMLElement | null = null;
  #positionBoundary: CollisionBoundary | undefined;
  #positionArrow: HTMLElement | null = null;
  #observer: MutationObserver | null = null;
  #refs = new Map<string, (element: HTMLElement | null) => void>();
  #releases = new Map<string, () => void>();
  #previousFocus: Element | null = null;
  #openingEvent: Event | undefined;
  #closingEvent: Event | undefined;
  #releaseModal: (() => void) | undefined;
  #releaseScroll: (() => void) | undefined;
  #focusPending = false;
  #forceUnmount = false;
  #completion = '';
  #notifiedHighlight: { value: unknown; index: number } | undefined;
  #composing = false;
  #matcher: ComboboxFilter | undefined;
  #status = '';
  #lastQuery = '';
  #diagnostics = new Set<string>();
  #outer: HTMLElement | null = null;
  readonly actions = Object.freeze({
    open: () => this.setOpen(true, 'imperative-action'),
    close: () => this.setOpen(false, 'imperative-action'),
    unmount: () => {
      if (this.open) return;
      this.#forceUnmount = true;
      this.#presence.completeExit();
      this.requestUpdate();
    },
  });
  get popupElement(): HTMLElement | null {
    return this.#content;
  }
  get listElement(): HTMLElement | null {
    return this.#list;
  }
  get highlightedValue(): unknown {
    return this.collection.highlighted?.value ?? null;
  }
  override get inputElement(): HTMLInputElement | null {
    return this.#editor;
  }
  override focusTarget(): HTMLElement | null {
    return this.#editor;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.#editor;
  }
  async updatePosition(): Promise<void> {
    this.#setupPosition();
    await this.#position?.update();
  }
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', sourceEvent?: Event): void {
    if (this.inline) {
      if (!open) this.#resetTransient(sourceEvent);
      return;
    }
    if (open && (this.effectiveDisabled || this.readOnly)) return;
    if (open) this.#openingEvent = sourceEvent;
    else this.#closingEvent = sourceEvent;
    this.#surface.request(open, reason, sourceEvent, this.#editor ?? undefined);
  }
  clear(sourceEvent?: Event): void {
    if (this.readOnly || this.effectiveDisabled) return;
    const behavior =
      this.clearBehavior === 'contextual'
        ? this.inputValue
          ? 'query'
          : 'selection'
        : this.clearBehavior;
    const empty = this.multiple ? [] : null;
    if (behavior === 'both')
      ControllableState.transaction([
        this.selection.proposal(empty, 'clear', sourceEvent),
        this.#inputState.proposal('', 'clear', sourceEvent),
      ]);
    else if (behavior === 'query') this.#inputState.set('', 'clear', sourceEvent);
    else this.selection.set(empty, 'clear', sourceEvent);
    this.#completion = '';
    this.#editor?.focus({ preventScroll: true });
    this.requestUpdate();
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#environment.connect();
    this.addEventListener('tp-combobox-source-change', this.#sourceChanged);
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(() =>
      this.requestUpdate(),
    );
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'native-action', 'index'],
    });
  }
  readonly #sourceChanged = (): void => this.requestUpdate();
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.selection.initialize();
    this.#inputState.initialize();
    this.#surface.sync();
    this.#syncCollection(changed.has('inputValue') || changed.has('query'));
    this.#presence.setPresent(this.open);
    this.#clearPresence.setPresent(
      this.showClear && (this.inputValue !== '' || this.#values(this.value).length > 0),
    );
  }
  #syncCollection(queryChanged: boolean): void {
    const registered = [...this.children].filter((node) =>
      node.matches('option,optgroup,hr,tp-combobox-option'),
    );
    this.#model.update(
      this.#source.normalize(
        this.items === undefined && !registered.length ? this.filteredItems : this.items,
        registered,
      ),
      (value) => this.#text(value),
      (value) => this.itemToLabel?.(value) ?? this.#text(value),
    );
    const old = this.collection.highlighted;
    const records = this.#model.records.map((record, index) =>
      Object.assign(record, {
        source: this.#source.sources.get(record.option),
        logicalIndex: record.option.index ?? index,
        row: Number(
          (this.#source.sources.get(record.option) as { row?: number } | null)?.row ?? index,
        ),
      }),
    );
    const selectable = records.filter((record) => {
      if (
        record.source &&
        typeof record.source === 'object' &&
        'nodeType' in record.source &&
        record.source.nodeType === 1 &&
        (record.source as Element).localName === 'tp-combobox-option' &&
        record.value === undefined
      ) {
        this.#diagnose('Combobox Option requires an explicit value; missing values are excluded.');
        return false;
      }
      return true;
    });
    this.collection.setSource(selectable);
    const query = this.inputValue;
    queryChanged = queryChanged || query !== this.#lastQuery;
    this.#lastQuery = query;
    this.#matcher = createComboboxFilter({
      ...((this.locale ?? resolveLocale(this))
        ? { locale: this.locale ?? resolveLocale(this)! }
        : {}),
    });
    const authoritative =
      this.filteredItems === undefined ? undefined : comboboxLeaves(this.filteredItems);
    const selectedText = !this.multiple && this.value != null ? this.#text(this.value) : '';
    const orderedResults = authoritative?.flatMap((item) =>
      this.collection.source.filter(
        (record) => Object.is(item, record.source) || this.collection.equal(item, record.value),
      ),
    );
    const candidates = [...new Set(orderedResults ?? this.collection.source)].filter(
      (record) =>
        authoritative !== undefined ||
        this.filter === null ||
        this.completionMode === 'inline' ||
        this.completionMode === 'none' ||
        (!this.multiple && query === selectedText) ||
        (this.filter
          ? this.filter(record.source, query, () => record.text)
          : this.#matcher!.contains(record.text, query)),
    );
    const visible = new Set(
      this.limit >= 0 ? candidates.slice(0, Math.floor(this.limit)) : candidates,
    );
    this.collection.setFilter(
      (record) => visible.has(record),
      orderedResults ? [...new Set(orderedResults)] : undefined,
    );
    if (old && !this.collection.visible.includes(old)) this.collection.activeIndex = -1;
    if (queryChanged && !this.keepHighlight) this.collection.activeIndex = -1;
    if (
      (this.autoHighlight === 'always' || (this.autoHighlight && query !== '')) &&
      !this.collection.highlighted &&
      this.open &&
      !this.#composing
    )
      this.collection.boundary();
    this.#notifyHighlight(this.collection.highlighted, 'programmatic');
    if (this.virtualized && this.items === undefined)
      this.#diagnose('virtualized requires the complete ordered source items.');
    const message = this.loading
      ? 'Loading suggestions.'
      : `${this.collection.visible.length} ${this.collection.visible.length === 1 ? 'result' : 'results'} available.`;
    if (message !== this.#status) this.#status = message;
  }
  protected override render(): unknown {
    const state = this.#state();
    const input = this.#part('combobox-input', state, {
      tag: 'input',
      properties: {
        class: 'editor',
        id: `${this.identifier}-input`,
        type: 'text',
        role: 'combobox',
        'aria-label': this.label,
        '.value': this.#completion || this.inputValue,
        placeholder: this.placeholder,
        disabled: this.effectiveDisabled,
        readonly: this.readOnly || !this.searchable,
        'aria-expanded': String(this.open),
        'aria-controls': `${this.identifier}-list`,
        'aria-autocomplete': this.completionMode,
        'aria-activedescendant':
          this.open && this.collection.element(this.collection.highlighted)
            ? this.collection.highlighted?.id
            : nothing,
        autocomplete: this.autoComplete || 'off',
        'aria-required': String(this.required),
        'aria-invalid': String(this.effectiveInvalid),
        '@input': (event: Event) => this.#input(event),
        '@keydown': (event: KeyboardEvent) => this.#key(event),
        '@click': (event: Event) => {
          if (this.openOnInputClick) this.setOpen(true, 'input-press', event);
        },
        '@compositionstart': () => {
          this.#composing = true;
          this.#completion = '';
        },
        '@compositionend': (event: Event) => {
          this.#composing = false;
          this.#input(event);
        },
        '@focusout': () => this.#focusOut(),
      },
      reference: this.#ref('input', 'combobox-input', (element) => {
        this.#editor = element as HTMLInputElement | null;
      }),
      onHandlerPrevented: { '@input': () => this.#restoreInput() },
    });
    const trigger =
      this.showTrigger &&
      !(this.showClear && this.#clearPresence.mounted && this.#clearPresence.state !== 'retained')
        ? this.#part('combobox-trigger', state, {
            tag: 'tp-button',
            properties: {
              class: 'toggle',
              slot: 'action',
              '.variant': 'ghost',
              '.size': 'icon-xs',
              '.icon': chevronDownIcon,
              '.nativeAction': this.nativeAction,
              '.ariaLabel': 'Toggle suggestions',
              '.disabled': this.effectiveDisabled || this.readOnly,
              tabindex: '-1',
              '@pointerdown': (event: PointerEvent) => {
                if (event.pointerType !== 'touch') event.preventDefault();
              },
              '@click': (event: Event) => {
                this.setOpen(!this.open, 'trigger-press', event);
                this.#editor?.focus({ preventScroll: true });
              },
            },
          })
        : nothing;
    const clear =
      this.showClear && this.#clearPresence.mounted
        ? this.#part('combobox-clear', state, {
            tag: 'tp-button',
            properties: {
              slot: 'action',
              '.variant': 'ghost',
              '.size': 'icon-xs',
              '.icon': xIcon,
              '.ariaLabel': 'Clear',
              '.disabled': this.effectiveDisabled || this.readOnly,
              hidden: this.#clearPresence.state === 'retained',
              'aria-hidden': this.#clearPresence.state === 'retained' ? 'true' : nothing,
              '@pointerdown': (event: Event) => event.preventDefault(),
              '@click': (event: Event) => this.clear(event),
            },
            reference: this.#ref('clear', 'combobox-clear', (element) => {
              this.#clear = element;
            }),
          })
        : nothing;
    const editorGroup = this.#part('combobox-anchor', state, {
      tag: this.multiple ? 'div' : 'tp-input-group',
      properties: { class: 'control', '.invalid': this.effectiveInvalid, '.actionSize': 'icon-xs' },
      reference: this.#ref('anchor', '', (element) => {
        this.#anchorElement = element;
      }),
      content: this.multiple
        ? this.#chips(html`${input}${clear}${trigger}`)
        : html`${input}${clear}${trigger}`,
    });
    return this.#part('combobox', state, {
      properties: { class: 'root', 'data-open': this.open, 'data-closed': !this.open },
      content: html` ${editorGroup} ${this.inline || !this.container ? this.#popup() : nothing}
        <div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          ${this.open ? this.#status : ''}
        </div>
        <slot name="label"></slot><slot hidden></slot>`,
    });
  }
  #popup(): unknown {
    if (!this.#presence.mounted && !this.inline) return nothing;
    const state = this.#state();
    const nodes = this.#model.nodes;
    const list = this.#part('combobox-list', state, {
      properties: {
        class: 'list',
        id: `${this.identifier}-list`,
        role: 'listbox',
        'aria-label': `${this.label} suggestions`,
        'aria-multiselectable': String(this.multiple),
        'aria-busy': String(this.loading),
      },
      reference: this.#ref('list', 'combobox-list', (element) => {
        this.#list = element;
      }),
      content: this.#part('combobox-collection', state, {
        content: html`${this.#nodes(nodes)}
        ${!this.collection.visible.length && !this.loading ? this.#part('combobox-empty-state', state, { properties: { role: 'presentation' }, content: html`<slot name="empty">No results found.</slot>` }) : nothing}`,
      }),
    });
    const content = this.#part(
      this.inline ? 'combobox-list-container' : 'combobox-content',
      state,
      {
        properties: {
          class: 'listbox',
          popover: this.usesOwnFloatingSurface ? 'manual' : nothing,
          'data-inline': !this.usesOwnFloatingSurface,
          'data-presence': this.#presence.state,
          'data-open': this.open,
          'data-closed': !this.open,
          'data-starting-style': this.#presence.state === 'starting',
          'data-ending-style': this.#presence.state === 'ending',
          inert: !this.open,
          'aria-hidden': !this.open ? 'true' : nothing,
          '@focusout': () => this.#focusOut(),
          '@keydown': (event: KeyboardEvent) => this.#containFocus(event),
        },
        reference: this.#ref('content', this.inline ? '' : 'combobox-content', (element) => {
          this.#content = element;
        }),
        content: html`${list}${
          this.showArrow && this.usesOwnFloatingSurface
            ? this.#part('arrow', state, {
                properties: { class: 'arrow', 'aria-hidden': 'true' },
                reference: this.#ref('arrow', '', (element) => {
                  this.#arrow = element;
                }),
                content: html`<svg viewBox="0 0 10 5" width="10" height="5">
                  <path d="M0 5L5 0L10 5Z"></path>
                </svg>`,
              })
            : nothing
        }`,
      },
    );
    return html`${this.showBackdrop && this.usesOwnFloatingSurface ? this.#part('backdrop', state, { properties: { class: 'backdrop', 'aria-hidden': 'true', '@pointerdown': (event: Event) => this.setOpen(false, 'outside-press', event) } }) : nothing}${content}`;
  }
  #nodes(nodes: readonly ChoiceModelNode[]): unknown {
    if (!this.grid)
      return repeat(
        nodes,
        (node) => node.id,
        (node) => this.#node(node),
      );
    const rows: Array<{ key: string; nodes: ChoiceModelNode[]; row?: number }> = [];
    for (const node of nodes) {
      const row = 'value' in node ? (node as ComboboxChoiceOption).row : undefined;
      const previous = rows.at(-1);
      if (row !== undefined && previous?.row === row) previous.nodes.push(node);
      else rows.push({ key: node.id, nodes: [node], ...(row === undefined ? {} : { row }) });
    }
    return repeat(
      rows,
      (row) => row.key,
      (row) =>
        row.row === undefined
          ? this.#node(row.nodes[0]!)
          : this.#part('combobox-row', this.#state(), {
              properties: { class: 'row', 'data-row': row.row },
              content: row.nodes.map((node) => this.#node(node)),
            }),
    );
  }
  #node(node: ChoiceModelNode): unknown {
    if ('children' in node) {
      const visible = node.children.some(
        (child) =>
          ('value' in child && this.collection.visible.includes(child as ComboboxChoiceOption)) ||
          'children' in child,
      );
      if (!visible) return nothing;
      return this.#part(
        'combobox-group',
        this.#state(),
        {
          properties: {
            role: 'group',
            'aria-labelledby': node.label ? `${node.id}-label` : nothing,
          },
          reference: this.#ref(node.id, 'combobox-group'),
          content: html`${node.label ? this.#part('combobox-label', this.#state(), { properties: { id: `${node.id}-label` }, reference: this.#ref(`${node.id}-label`, 'combobox-label'), content: node.label }, node.labelContract) : nothing}${this.#nodes(node.children)}`,
        },
        node.partContract,
      );
    }
    if (!('value' in node))
      return this.#part(
        'combobox-separator',
        this.#state(),
        {
          properties: { role: 'separator', 'aria-orientation': node.orientation ?? 'horizontal' },
          reference: this.#ref(node.id, 'combobox-separator'),
        },
        node.partContract,
      );
    const record = node as ComboboxChoiceOption;
    if (
      !this.collection.visible.includes(record) ||
      (this.virtualized &&
        this.mountedItems &&
        !this.mountedItems.some(
          (item) => Object.is(item, record.source) || this.collection.equal(item, record.value),
        ))
    )
      return nothing;
    return this.renderOption(record, record.logicalIndex);
  }
  protected renderOption(option: ComboboxChoiceOption, index: number): unknown {
    const selected = this.#selected(option.value),
      highlighted = option === this.collection.highlighted;
    option.presence.setPresent(selected);
    const state = {
      ...this.#state(),
      value: option.value,
      selected,
      highlighted,
      disabled: this.effectiveDisabled || option.disabled,
      index,
    };
    const indicator = option.presence.mounted
      ? this.#part(
          'item-indicator',
          state,
          {
            properties: {
              class: 'indicator',
              'aria-hidden': 'true',
              'data-presence': option.presence.state,
            },
            reference: this.#ref(`${option.id}-indicator`, '', (element) => {
              option.indicator = element;
            }),
            content: html`<tp-icon .icon=${checkIcon} size="var(--tp-icon-size-sm)"></tp-icon>`,
          },
          option.option.indicatorContract,
        )
      : nothing;
    return this.#part(
      'combobox-option',
      state,
      {
        tag: option.option.nativeAction ? 'button' : 'div',
        properties: {
          class: 'option',
          id: option.id,
          role: 'option',
          tabindex: '-1',
          ...(option.option.nativeAction ? { type: 'button', disabled: state.disabled } : {}),
          'aria-selected': String(selected),
          'aria-disabled': String(!!state.disabled),
          'data-disabled': state.disabled,
          'data-selected': selected,
          'data-highlighted': highlighted,
          'data-index': index,
          '@pointerdown': (event: PointerEvent) => {
            if (event.pointerType !== 'touch') event.preventDefault();
          },
          '@pointermove': () => {
            if (this.highlightItemOnHover && !option.disabled) this.#highlight(option, 'pointer');
          },
          '@click': (event: Event) => this.selectOption(option, event),
          '@keydown': (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              this.selectOption(option, event);
            }
          },
        },
        reference: this.#ref(option.id, 'combobox-option', (element) => {
          this.collection.mount(option, element);
        }),
        content: html`${this.#part('item-text', state, { properties: { class: 'option-text' }, content: option.label }, option.option.textContract)}${indicator}`,
      },
      option.option.partContract,
    );
  }
  #chips(editor: unknown): unknown {
    return this.#part('combobox-chip-list', this.#state(), {
      properties: { class: 'chips', role: 'list', 'aria-label': `${this.label} selected values` },
      reference: this.#ref('chips', 'combobox-chip-list'),
      content: html`${repeat(
        this.#values(this.value),
        (value) => value,
        (value, index) =>
          this.#part(
            'combobox-chip',
            { ...this.#state(), value },
            {
              properties: { class: 'chip', role: 'listitem' },
              reference: this.#ref(`chip-${index}`, 'combobox-chip'),
              content: html`${this.itemToLabel?.(value) ?? this.#text(value)}
              ${
                this.showChipRemove
                  ? this.#part(
                      'combobox-chip-remove',
                      { ...this.#state(), value },
                      {
                        tag: 'tp-button',
                        properties: {
                          '.variant': 'ghost',
                          '.size': 'icon-xs',
                          '.icon': xIcon,
                          '.ariaLabel': `Remove ${this.#text(value)}`,
                          '.disabled': this.effectiveDisabled || this.readOnly,
                          '@click': (event: Event) => this.removeChip(value, event),
                          '@keydown': (event: KeyboardEvent) => this.#chipKey(event, index),
                          'data-chip-index': index,
                        },
                        reference: this.#ref(`chip-remove-${index}`, 'combobox-chip-remove'),
                      },
                    )
                  : nothing
              }`,
            },
          ),
      )}${editor}`,
    });
  }
  removeChip(value: unknown, sourceEvent?: Event): void {
    if (!this.multiple || this.readOnly || this.effectiveDisabled) return;
    const previous = this.#values(this.value),
      index = previous.findIndex((item) => this.collection.equal(item, value));
    if (index < 0) return;
    this.selection.set(
      previous.filter((item) => !this.collection.equal(item, value)),
      'chip-remove-press',
      sourceEvent,
    );
    if (this.#selected(value)) return;
    void this.updateComplete.then(() => {
      const remaining = this.#values(this.value).length;
      const target = remaining
        ? (this.renderRoot.querySelector<HTMLElement>(
            `[data-chip-index="${Math.min(index, remaining - 1)}"]`,
          ) ?? this.#editor)
        : this.#editor;
      target?.focus({ preventScroll: true });
    });
  }
  #chipKey(event: KeyboardEvent, index: number): void {
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      this.removeChip(this.#values(this.value)[index], event);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const rtl = this.ownerDocument.defaultView!.getComputedStyle(this).direction === 'rtl';
      const next = index + ((event.key === 'ArrowRight') !== rtl ? 1 : -1);
      (
        this.renderRoot.querySelector<HTMLElement>(`[data-chip-index="${next}"]`) ?? this.#editor
      )?.focus();
    }
  }
  protected selectOption(option: ComboboxChoiceOption, event: Event): void {
    if (option.disabled || this.effectiveDisabled || this.readOnly) return;
    const already = !this.multiple && this.#selected(option.value);
    const selected = this.collection.selected(option.value)?.value ?? option.value;
    const previousValues = this.#values(this.value);
    this.selection.set(
      this.multiple ? this.collection.toggle(previousValues, selected) : selected,
      'item-press',
      event,
    );
    const committedValues = this.#values(this.value);
    const multipleCommitted =
      this.multiple &&
      (previousValues.length !== committedValues.length ||
        previousValues.some(
          (value, index) => !this.collection.equal(value, committedValues[index]),
        ));
    if (already || (!this.multiple && this.#selected(selected)) || multipleCommitted) {
      this.#inputState.set(
        this.multiple ? '' : option.text,
        this.multiple ? 'input-clear' : 'item-press',
        event,
        this.multiple ? { metadata: { itemPress: true } } : undefined,
      );
      this.#completion = '';
      if (this.closeOnSelect ?? !this.multiple) this.setOpen(false, 'item-press', event);
      this.#editor?.focus({ preventScroll: true });
    }
    this.requestUpdate();
  }
  #input(event: Event): void {
    if (this.effectiveDisabled || this.readOnly || !this.searchable) {
      this.#restoreInput();
      return;
    }
    const text = (event.currentTarget as HTMLInputElement).value;
    this.#inputState.set(text, 'input', event);
    this.#restoreInput();
    if (!this.#composing) {
      this.#syncCollection(true);
      if (this.collection.visible.length || this.loading) this.setOpen(true, 'input', event);
    }
    this.requestUpdate();
  }
  #key(event: KeyboardEvent): void {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      this.#composing ||
      event.keyCode === 229 ||
      this.effectiveDisabled
    )
      return;
    if (event.key === 'Escape' && this.#completion) {
      event.preventDefault();
      event.stopPropagation();
      this.#completion = '';
      this.#restoreInput();
      return;
    }
    if (this.readOnly) return;
    if (event.key === 'Backspace' && !this.inputValue && this.multiple) {
      const last = this.#values(this.value).at(-1);
      if (last !== undefined) {
        event.preventDefault();
        this.removeChip(last, event);
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const wasOpen = this.open;
      this.setOpen(true, 'list-navigation', event);
      if (!this.open) return;
      if (this.grid && wasOpen) this.#moveGrid(event.key === 'ArrowDown' ? 1 : -1);
      else if (wasOpen)
        this.collection.move(event.key === 'ArrowDown' ? 1 : -1, this.navigationLoops);
      else this.collection.boundary(event.key === 'ArrowUp');
      this.#highlight(this.collection.highlighted, 'list-navigation');
    } else if ((event.key === 'Home' || event.key === 'End') && this.open) {
      event.preventDefault();
      this.collection.boundary(event.key === 'End');
      this.#highlight(this.collection.highlighted, 'list-navigation');
    } else if (event.key === 'Enter' && this.open && this.collection.highlighted) {
      event.preventDefault();
      this.selectOption(this.collection.highlighted, event);
    } else if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.setOpen(false, 'escape-key', event);
    } else if (event.key === 'Tab' && this.open && !this.modal)
      this.setOpen(false, 'list-navigation', event);
    else if (event.key === 'Tab' && this.open && this.modal) this.#containFocus(event);
    else if (
      this.grid &&
      (event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
      this.open &&
      this.collection.highlighted
    ) {
      event.preventDefault();
      const rtl = this.ownerDocument.defaultView!.getComputedStyle(this).direction === 'rtl';
      const delta = (event.key === 'ArrowRight') !== rtl ? 1 : -1;
      const current = this.collection.highlighted;
      const row = this.collection.visible.filter(
        (item) => !item.disabled && item.row === current.row,
      );
      let next = row.indexOf(current) + delta;
      next = this.navigationLoops
        ? (next + row.length) % row.length
        : Math.max(0, Math.min(row.length - 1, next));
      this.collection.activeIndex = this.collection.visible.indexOf(row[next]!);
      this.#highlight(this.collection.highlighted, 'list-navigation');
    }
  }
  #moveGrid(delta: number): void {
    const enabled = this.collection.visible.filter((item) => !item.disabled),
      current = this.collection.highlighted;
    if (!current) {
      this.collection.boundary(delta < 0);
      return;
    }
    const rows = [...new Set(enabled.map((item) => item.row))];
    const row = rows.indexOf(current.row),
      column = enabled.filter((item) => item.row === current.row).indexOf(current);
    let next = row + delta;
    if (this.navigationLoops) next = (next + rows.length) % rows.length;
    else next = Math.max(0, Math.min(rows.length - 1, next));
    const candidates = enabled.filter((item) => item.row === rows[next]);
    const target = candidates[Math.min(column, candidates.length - 1)];
    if (target) this.collection.activeIndex = this.collection.visible.indexOf(target);
  }
  #highlight(record: ComboboxChoiceOption | undefined, reason: ChangeReason): void {
    if (record) this.collection.activeIndex = this.collection.visible.indexOf(record);
    this.#notifyHighlight(record, reason);
    this.#completion = '';
    if (
      record &&
      (this.completionMode === 'both' || this.completionMode === 'inline') &&
      this.inputValue &&
      this.#matcher?.startsWith(record.text, this.inputValue)
    ) {
      this.#completion = record.text;
      void this.updateComplete.then(() => {
        if (this.#completion && this.#editor)
          this.#editor.setSelectionRange(this.inputValue.length, this.#completion.length);
      });
    }
    this.collection.element(record)?.scrollIntoView({ block: 'nearest' });
    this.requestUpdate();
  }
  #notifyHighlight(record: ComboboxChoiceOption | undefined, reason: ChangeReason): void {
    const previous = this.#notifiedHighlight;
    const index = record?.logicalIndex ?? -1;
    if (record) {
      if (
        previous &&
        this.collection.equal(previous.value, record.value) &&
        previous.index === index
      )
        return;
      this.#notifiedHighlight = { value: record.value, index };
    } else {
      if (!previous) return;
      this.#notifiedHighlight = undefined;
    }
    this.onItemHighlighted?.(record?.value ?? null, { index, reason });
  }
  #restoreInput(): void {
    if (this.#editor) this.#editor.value = this.#completion || this.inputValue;
  }
  protected override updated(changed: PropertyValues<this>): void {
    if (this.container && this.usesOwnFloatingSurface)
      this.#portal.update(this.container, this.#popup());
    else this.#portal.clear();
    super.updated(changed);
    this.#syncForm();
    this.toggleAttribute('data-open', this.open);
    this.toggleAttribute('data-closed', !this.open);
    if (this.#editor && this.#list) this.#editor.ariaControlsElements = [this.#list];
    const active = this.collection.element(this.collection.highlighted);
    if (this.#editor) this.#editor.ariaActiveDescendantElement = this.open ? active : null;
    if (this.open && this.#content) {
      if (this.usesOwnFloatingSurface && !this.#content.matches(':popover-open'))
        this.#content.showPopover();
      if (this.usesOwnFloatingSurface) this.#setupPosition();
      if (this.modal && this.usesOwnFloatingSurface && !this.#releaseModal) {
        this.#releaseModal = acquireOutsideInert(this.ownerDocument, () => [
          this,
          ...(this.#portal.host ? [this.#portal.host] : []),
          ...this.#dismiss.branchElements.filter(
            (element): element is HTMLElement =>
              element.namespaceURI === 'http://www.w3.org/1999/xhtml',
          ),
        ]);
        if (!(
          this.#openingEvent &&
          'pointerType' in this.#openingEvent &&
          this.#openingEvent.pointerType === 'touch'
        ))
          this.#releaseScroll = acquireScrollLock(this.ownerDocument);
      } else if (!this.modal || this.inline) this.#releaseModality();
      if (this.#focusPending) {
        this.#focusPending = false;
        void this.updatePosition().then(() => {
          if (this.open) this.#focusTarget(this.initialFocus, true)?.focus({ preventScroll: true });
        });
      }
    } else {
      this.#releaseModality();
      this.#position?.destroy();
      this.#position = null;
      if (this.#presence.state !== 'ending') this.#content?.hidePopover();
    }
    if (this.inline) this.#syncOuter();
    this.#pruneRefs();
    void this.#dismiss;
  }
  #setupPosition(): void {
    if (!this.usesOwnFloatingSurface || !this.open || !this.#content) return;
    const configured =
      typeof this.anchor === 'function'
        ? this.anchor()
        : this.anchor && 'current' in this.anchor
          ? this.anchor.current
          : this.anchor;
    const anchor = configured ?? this.#anchorElement ?? this.#editor;
    if (!anchor) return;
    const key = JSON.stringify([
      this.placement,
      this.side,
      this.align,
      this.sideOffset,
      this.alignOffset,
      this.positionMethod,
      this.collisionAvoidance,
      this.collisionPadding,
      this.sticky,
      this.disableAnchorTracking,
      this.showArrow,
      this.arrowPadding,
    ]);
    if (
      this.#position &&
      this.#positionKey === key &&
      this.#positionAnchor === anchor &&
      this.#positionTarget === this.#content &&
      this.#positionBoundary === this.collisionBoundary &&
      this.#positionArrow === this.#arrow
    )
      return;
    this.#position?.destroy();
    this.#positionKey = key;
    this.#positionAnchor = anchor;
    this.#positionTarget = this.#content;
    this.#positionBoundary = this.collisionBoundary;
    this.#positionArrow = this.#arrow;
    const [side = 'bottom', align = 'center'] = this.placement.split(/\s+/);
    this.#position = positionSurface(anchor, this.#content, {
      resolvePlacement: () =>
        `${resolveSide(this.side ?? (side as LogicalSide), this)}-${this.align ?? (align as Alignment)}`,
      offset: (context) => geometryOffsets(this.sideOffset, this.alignOffset)(context),
      strategy: this.positionMethod,
      collision: this.collisionAvoidance,
      boundary: this.collisionBoundary,
      padding: this.collisionPadding,
      sticky: this.sticky,
      constrainSize: true,
      matchReferenceWidth: true,
      arrow: this.#arrow,
      arrowPadding: this.arrowPadding,
      tracking: this.disableAnchorTracking ? false : {},
      onInvalid: () => this.setOpen(false, 'anchor-removed'),
    });
  }
  #openCommitted(open: boolean): void {
    this.#completion = '';
    if (open) {
      this.#forceUnmount = false;
      this.#previousFocus = deepActiveElement(this.ownerDocument);
      this.#focusPending = true;
    } else {
      this.#releaseModality();
      this.collection.typeahead.reset();
      this.collection.activeIndex = -1;
      restoreFocus(this.#focusTarget(this.finalFocus, false));
    }
    this.requestUpdate();
  }
  #focusTarget(target: ComboboxFocusTarget, initial: boolean): HTMLElement | null {
    return resolveSurfaceFocus(target, {
      event: initial ? this.#openingEvent : this.#closingEvent,
      defaultTarget: () => this.#editor,
      trigger: this.#editor,
      first: this.#editor,
      popup: this.#content,
      previous: this.#previousFocus,
    });
  }
  #focusOut(): void {
    queueMicrotask(() => {
      if (
        this.open &&
        !this.inline &&
        !this.#dismiss.contains(deepActiveElement(this.ownerDocument))
      )
        this.setOpen(false, 'focus-outside');
    });
  }
  #containFocus(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.modal || !this.open) return;
    const items = [this.#editor, ...(this.#content ? focusableElements(this.#content) : [])].filter(
      (item): item is HTMLElement => !!item && isAvailable(item),
    );
    const current = items.indexOf(deepActiveElement(this.ownerDocument) as HTMLElement);
    if (!items.length) return;
    event.preventDefault();
    items[(current + (event.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
  }
  #releaseModality(): void {
    this.#releaseModal?.();
    this.#releaseModal = undefined;
    this.#releaseScroll?.();
    this.#releaseScroll = undefined;
  }
  #syncOuter(): void {
    let outer: HTMLElement | null = null;
    for (let node = composedParent(this); node; node = composedParent(node))
      if (
        node.nodeType === 1 &&
        (node as Element).matches('tp-dialog,tp-alert-dialog,tp-popover,tp-drawer')
      ) {
        outer = node as HTMLElement;
        break;
      }
    if (outer === this.#outer) return;
    this.#outer?.removeEventListener('tp-open-change', this.#outerChange);
    this.#outer = outer;
    this.#outer?.addEventListener('tp-open-change', this.#outerChange);
  }
  #outerChange = (event: Event): void => {
    if (event.target !== this.#outer) return;
    const change = event as TpSurfaceOpenChangeEvent;
    queueMicrotask(() => {
      if (
        !change.defaultPrevented &&
        !change.detail.value &&
        !(this.#outer as HTMLElement & { open?: boolean })?.open
      )
        this.#resetTransient(event);
    });
  };
  #resetTransient(event?: Event): void {
    this.#inputState.set('', 'input-clear', event);
    this.collection.activeIndex = -1;
    this.#completion = '';
    this.requestUpdate();
  }
  #syncForm(): void {
    const values = this.#values(this.value),
      missing = this.required && !values.length;
    if (this.effectiveDisabled) this.setFormValue(null);
    else if (this.multiple) {
      const form = new this.ownerDocument.defaultView!.FormData();
      for (const value of values) form.append(this.effectiveName, this.#serialize(value));
      this.setFormValue(form, JSON.stringify(values.map((value) => this.#serialize(value))));
    } else
      this.setFormValue(
        values.length ? this.#serialize(values[0]) : null,
        JSON.stringify(values.map((value) => this.#serialize(value))),
      );
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select an option.' : '',
      this.#editor ?? undefined,
    );
  }
  protected override resetFormValue(): void {
    this.selection.reset();
    this.#inputState.reset();
    this.setOpen(false, 'form-reset');
    this.#completion = '';
    this.#syncForm();
  }
  override formStateRestoreCallback(
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state !== 'string') return;
    let labels: string[];
    try {
      labels = JSON.parse(state) as string[];
    } catch {
      labels = [state];
    }
    if (!Array.isArray(labels)) labels = [String(labels)];
    const values = labels.map(
      (label) =>
        this.collection.source.find((record) => this.#serialize(record.value) === label)?.value ??
        label,
    );
    if (mode === 'autocomplete' || !this.selection.controlled)
      this.selection.set(
        this.multiple ? values : (values[0] ?? null),
        mode === 'autocomplete' ? 'input' : 'programmatic',
      );
  }
  #values(value: unknown): unknown[] {
    return this.multiple
      ? this.collection.normalize(Array.isArray(value) ? value : value == null ? [] : [value])
      : value == null
        ? []
        : [value];
  }
  #selected(value: unknown): boolean {
    return this.#values(this.value).some((selected) => this.collection.equal(selected, value));
  }
  #serialize(value: unknown): string {
    return this.itemToText?.(value) ?? this.#text(value);
  }
  #text(value: unknown): string {
    if (this.itemToText) return this.itemToText(value);
    if (isComboboxItemCollection(this.items))
      return this.items.label(value as never, (a, b) => this.collection.equal(a, b));
    const record = this.collection?.selected(value);
    if (record?.text) return record.text;
    if (value && typeof value === 'object' && 'label' in value && typeof value.label === 'string')
      return value.label;
    return value == null ? '' : String(value);
  }
  #state(): PartState {
    return {
      ...this.fieldStateMarkers,
      valid: this.effectiveInvalid ? false : this.fieldStateMarkers.valid ? true : null,
      open: this.open,
      value: this.value,
      inputValue: this.inputValue,
      multiple: this.multiple,
      filled: this.fieldStateMarkers.filled ?? this.#values(this.value).length > 0,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      loading: this.loading,
      empty: !this.collection.visible.length,
      presence: this.#presence.state,
    };
  }
  #part(
    name: string,
    state: PartState,
    options: PartRenderOptions,
    contract?: ComponentPartContract,
  ): unknown {
    options = { ...options, properties: { ...options.properties, ...comboboxStateMarkers(state) } };
    const actionTag = (
      {
        'combobox-trigger': 'tp-combobox-trigger',
        'combobox-clear': 'tp-combobox-clear',
        'combobox-chip-remove': 'tp-combobox-chip-remove',
      } as Record<string, string>
    )[name];
    if (actionTag && options.tag === 'tp-button') {
      const properties = { ...options.properties };
      for (const [key, handler] of Object.entries(properties))
        if (key.startsWith('@') && typeof handler === 'function')
          properties[key] = (event: Event) => {
            if (!componentHandlingPrevented(event)) handler(event);
          };
      return renderPart('combobox-action-host', state, undefined, {
        ...Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'reference')),
        tag: actionTag,
        properties: {
          ...properties,
          '.comboboxState': state,
          '.comboboxPresentation': this.partPresentation,
          '.comboboxContract': { ...this.partContracts[name], ...contract },
          '.comboboxReference': options.reference ?? this.#ref(name, name),
        },
      });
    }
    return renderPart(name, state, { ...this.partContracts[name], ...contract }, options);
  }
  #ref(
    key: string,
    part: string,
    commit?: (element: HTMLElement | null) => void,
  ): (element: HTMLElement | null) => void {
    let reference = this.#refs.get(key);
    if (!reference) {
      reference = (element) => {
        this.#releases.get(key)?.();
        this.#releases.delete(key);
        if (
          element &&
          part &&
          !['combobox-trigger', 'combobox-clear', 'combobox-chip-remove'].includes(part)
        )
          this.#releases.set(key, this.presentationController.registerPart(part, element));
        commit?.(element);
      };
      this.#refs.set(key, reference);
    }
    return reference;
  }
  #pruneRefs(): void {
    for (const key of this.#refs.keys())
      if (
        !this.#releases.has(key) &&
        key.startsWith('tp-select-') &&
        !this.#model.records.some((record) => key.startsWith(record.id))
      )
        this.#refs.delete(key);
  }
  #diagnose(message: string): void {
    if (this.#diagnostics.has(message)) return;
    this.#diagnostics.add(message);
    this.emit('tp-diagnostic', { component: 'combobox', message });
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.removeEventListener('tp-combobox-source-change', this.#sourceChanged);
    this.#observer = null;
    this.#environment.disconnect();
    this.#position?.destroy();
    this.#position = null;
    this.#releaseModality();
    this.#portal.clear();
    this.collection.disconnect();
    this.#outer?.removeEventListener('tp-open-change', this.#outerChange);
    this.#outer = null;
    this.#completion = '';
    super.disconnectedCallback();
  }
  adoptedCallback(): void {
    if (this.isConnected) {
      this.#environment.connect();
      this.#position?.destroy();
      this.#position = null;
      this.requestUpdate();
    }
  }
}
