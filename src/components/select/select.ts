import { SelectQueryController } from './query.js';
import { autofillHint } from '../../foundation/autofill.js';
import { renderQuery } from './query-view.js';
import { SelectSource } from './source.js';
import { isSelectItemCollection, type SelectItemCollection } from './items.js';
import type { SelectClearBehavior, SelectCompletionMode } from './query-types.js';
import { selectStateMarkers } from './state.js';
import { composedParent } from '../../foundation/focus.js';
import { anchoredArrowStyles } from '../shared/anchored-arrow.js';
import { html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { ChoiceCollectionController } from '../../foundation/choice-collection.js';
import { SurfaceState, type TpSurfaceOpenChangeEvent } from '../../foundation/surface-state.js';
import { PresenceController } from '../../foundation/presence.js';
import { FloatingDismissController } from '../../foundation/floating-dismiss.js';
import { acquireOutsideInert } from '../../foundation/outside-inert.js';
import { acquireScrollLock } from '../../foundation/scroll-lock.js';
import {
  deepActiveElement,
  focusableElements,
  isAvailable,
  restoreFocus,
} from '../../foundation/focus.js';
import {
  componentHandlingPrevented,
  renderPart,
  type ComponentPartContract,
  type PartRenderOptions,
  type PartState,
} from '../../foundation/part.js';
import {
  positionSurface,
  themeSpacing,
  resolveSide,
  geometryOffsets,
} from '../../foundation/positioning.js';
import type {
  Alignment,
  GeometryOffset,
  CollisionBoundary,
  CollisionPolicy,
  LogicalSide,
  PositioningHandle,
  PositioningStrategy,
} from '../../foundation/positioning.js';
import { prepareMotion, type MotionHandle } from '../../foundation/motion.js';
import { createId } from '../../foundation/id.js';
import { resolveSurfaceFocus } from '../../foundation/surface-focus.js';
import { resolveLocale } from '../../foundation/services.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { checkIcon } from '../../icons/check.js';
import { SelectModel, nativeSelectEntries, type SelectNode, type SelectRecord } from './model.js';
import { SelectPortal } from './portal.js';
import { SelectEnvironment } from './environment.js';
import { SelectPointer } from './pointer.js';
import { selectStyles } from './styles.js';
import type {
  SelectActions,
  SelectAnchor,
  SelectContainer,
  SelectEntry,
  SelectFocusTarget,
} from './types.js';
import { selectPresentation } from '../../presentation/families/select.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpButton } from '../button.js';
import { TpBadge } from '../badge/index.js';
import { TpInputGroup } from '../input-group/input-group.js';

export class TpSelect extends TpFormElement<unknown> {
  static tagName = 'tp-select';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon, TpButton, TpBadge, TpInputGroup];
  }
  static override presentation = selectPresentation;
  static override properties = {
    ...TpFormElement.properties,
    searchable: { type: Boolean, reflect: true },
    inputValue: { type: String, attribute: 'input-value', noAccessor: true },
    defaultInputValue: { type: String, attribute: 'default-input-value' },
    query: { type: String, noAccessor: true },
    filteredItems: { attribute: false },
    filter: { attribute: false },
    limit: { type: Number },
    locale: { type: String },
    completionMode: { type: String, attribute: 'completion-mode' },
    clearBehavior: { type: String, attribute: 'clear-behavior' },
    autoHighlight: { attribute: false },
    keepHighlight: { type: Boolean, attribute: 'keep-highlight' },
    loopFocus: { type: Boolean, attribute: 'loop-focus' },
    grid: { type: Boolean },
    inline: { type: Boolean },
    virtualized: { type: Boolean },
    mountedItems: { attribute: false },
    loading: { type: Boolean },
    openOnInputClick: { type: Boolean, attribute: 'open-on-input-click' },
    closeOnSelect: { type: Boolean, attribute: 'close-on-select' },
    showTrigger: { type: Boolean, attribute: 'show-trigger' },
    showClear: { type: Boolean, attribute: 'show-clear' },
    showChipRemove: { type: Boolean, attribute: 'show-chip-remove' },
    clearKeepMounted: { type: Boolean, attribute: 'clear-keep-mounted' },
    onInputValueChange: { attribute: false },
    onItemHighlighted: { attribute: false },

    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    multiple: { type: Boolean, reflect: true },
    items: { attribute: false },
    placeholder: { type: String },
    label: { type: String },
    identifier: { type: String },
    autoComplete: { type: String, attribute: 'autocomplete' },
    noAutofill: { type: Boolean, attribute: 'no-autofill', reflect: true },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    modal: { type: Boolean, noAccessor: true },
    highlightItemOnHover: { type: Boolean, attribute: 'highlight-item-on-hover' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    container: { attribute: false },
    alignItemWithTrigger: { type: Boolean, attribute: 'align-item-with-trigger', noAccessor: true },
    placement: { type: String },
    side: { type: String },
    align: { type: String },
    sideOffset: { type: Number, attribute: 'side-offset', noAccessor: true },
    alignOffset: { type: Number, attribute: 'align-offset' },
    anchor: { attribute: false },
    disableAnchorTracking: { type: Boolean, attribute: 'disable-anchor-tracking' },
    collisionAvoidance: { attribute: false },
    collisionBoundary: { attribute: false },
    collisionPadding: { attribute: false, noAccessor: true },
    sticky: { type: Boolean },
    positionMethod: { type: String, attribute: 'position-method' },
    initialFocus: { attribute: false },
    finalFocus: { attribute: false },
    scrollUpKeepMounted: { type: Boolean, attribute: 'scroll-up-keep-mounted' },
    scrollDownKeepMounted: { type: Boolean, attribute: 'scroll-down-keep-mounted' },
    showArrow: { type: Boolean, attribute: 'show-arrow' },
    arrowPadding: { type: Number, attribute: 'arrow-padding', noAccessor: true },
    arrowWidth: { type: Number, attribute: 'arrow-width', noAccessor: true },
    arrowHeight: { type: Number, attribute: 'arrow-height', noAccessor: true },
    arrowTipRadius: { type: Number, attribute: 'arrow-tip-radius' },
    arrowPath: { type: String, attribute: 'arrow-path' },
    arrowBorderColor: { type: String, attribute: 'arrow-border-color' },
    arrowBorderWidth: { type: Number, attribute: 'arrow-border-width' },
    showBackdrop: { type: Boolean, attribute: 'show-backdrop' },
    isItemEqual: { attribute: false },
    itemToText: { attribute: false },
    itemToLabel: { attribute: false },
    onValueChange: { attribute: false },
    onOpenChange: { attribute: false },
    onOpenChangeComplete: { attribute: false },
  };
  static override styles: CSSResultGroup = [TpElement.styles, anchoredArrowStyles, selectStyles];
  defaultValue: unknown = undefined;
  defaultOpen = false;
  multiple = false;
  items: readonly SelectEntry[] | SelectItemCollection<unknown> | undefined;
  searchable = false;
  defaultInputValue: string | undefined;
  filteredItems: readonly unknown[] | undefined;
  filter:
    ((item: unknown, query: string, text: (item: unknown) => string) => boolean) | null | undefined;
  limit = -1;
  locale: string | undefined;
  completionMode: SelectCompletionMode = 'list';
  clearBehavior: SelectClearBehavior = 'contextual';
  autoHighlight: boolean | 'always' = false;
  keepHighlight = false;
  loopFocus = true;
  grid = false;
  inline = false;
  virtualized = false;
  mountedItems: readonly unknown[] | undefined;
  loading = false;
  openOnInputClick = true;
  closeOnSelect: boolean | undefined;
  showTrigger = true;
  showClear = false;
  showChipRemove = true;
  clearKeepMounted = false;
  onInputValueChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
  onItemHighlighted:
    ((value: unknown, details: { index: number; reason: ChangeReason }) => void) | undefined;
  get inputValue(): string {
    return this.#query.value;
  }
  set inputValue(value: string | undefined) {
    const before = this.#query.providedValue;
    this.#query.providedValue = value;
    this.requestUpdate('inputValue', before);
    if (this.hasUpdated) this.#query.state.sync();
  }
  get query(): string {
    return this.inputValue;
  }
  set query(value: string | undefined) {
    this.inputValue = value;
  }
  clear(event?: Event): void {
    this.#query.clear(event);
  }
  removeChip(value: unknown, event?: Event): void {
    this.#query.remove(value, event);
  }
  override get inputElement(): HTMLInputElement | null {
    return this.#query.editor;
  }
  placeholder = '';
  label = 'Options';
  identifier = createId('tp-select');
  autoComplete = '';
  /** Opts the autofill receiver and the query editor out of host and extension autofill. */
  noAutofill = false;
  get effectiveNoAutofill(): boolean {
    return this.noAutofill || this.inheritedNoAutofill;
  }
  nativeAction = true;
  #providedModal: boolean | undefined;
  get modal(): boolean {
    return this.#providedModal ?? !this.searchable;
  }
  set modal(value: boolean | undefined) {
    const before = this.#providedModal;
    this.#providedModal = value;
    this.requestUpdate('modal', before);
  }
  highlightItemOnHover = true;
  keepMounted = false;
  container: SelectContainer = null;
  #providedAlignment: boolean | undefined;
  get alignItemWithTrigger(): boolean {
    return this.#providedAlignment ?? !this.searchable;
  }
  set alignItemWithTrigger(value: boolean | undefined) {
    const before = this.#providedAlignment;
    this.#providedAlignment = value;
    this.requestUpdate('alignItemWithTrigger', before);
  }
  placement = 'block-end start';
  side: LogicalSide | undefined;
  align: Alignment | undefined;
  #sideOffset: GeometryOffset | undefined;
  get sideOffset(): GeometryOffset {
    return this.#sideOffset ?? themeSpacing(this, 3);
  }
  set sideOffset(value: GeometryOffset | undefined) {
    const previous = this.#sideOffset;
    this.#sideOffset = value ?? undefined;
    this.requestUpdate('sideOffset', previous);
  }
  alignOffset: GeometryOffset = 0;
  anchor: SelectAnchor = null;
  disableAnchorTracking = false;
  collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'flip', fallbackAxisSide: 'none' };
  collisionBoundary: CollisionBoundary = 'clipping-ancestors';
  #collisionPadding:
    number | Partial<Record<'top' | 'bottom' | 'left' | 'right', number>> | undefined;
  get collisionPadding(): number | Partial<Record<'top' | 'bottom' | 'left' | 'right', number>> {
    return this.#collisionPadding ?? themeSpacing(this, 3);
  }
  set collisionPadding(
    value: number | Partial<Record<'top' | 'bottom' | 'left' | 'right', number>>,
  ) {
    const previous = this.#collisionPadding;
    this.#collisionPadding = value ?? undefined;
    this.requestUpdate('collisionPadding', previous);
  }
  sticky = false;
  positionMethod: PositioningStrategy = 'absolute';
  initialFocus: SelectFocusTarget = 'trigger';
  finalFocus: SelectFocusTarget = 'trigger';
  scrollUpKeepMounted = false;
  scrollDownKeepMounted = false;
  showArrow = false;
  #arrowPadding: number | undefined;
  get arrowPadding(): number {
    return this.#arrowPadding ?? themeSpacing(this, 2);
  }
  set arrowPadding(value: number) {
    const previous = this.#arrowPadding;
    this.#arrowPadding = value ?? undefined;
    this.requestUpdate('arrowPadding', previous);
  }
  protected get defaultArrowWidthUnits(): number {
    return 4;
  }
  protected get defaultArrowHeightUnits(): number {
    return 2;
  }
  #arrowWidth: number | undefined;
  get arrowWidth(): number {
    return this.#arrowWidth ?? themeSpacing(this, this.defaultArrowWidthUnits);
  }
  set arrowWidth(value: number) {
    const previous = this.#arrowWidth;
    this.#arrowWidth = value ?? undefined;
    this.requestUpdate('arrowWidth', previous);
  }
  #arrowHeight: number | undefined;
  get arrowHeight(): number {
    return this.#arrowHeight ?? themeSpacing(this, this.defaultArrowHeightUnits);
  }
  set arrowHeight(value: number) {
    const previous = this.#arrowHeight;
    this.#arrowHeight = value ?? undefined;
    this.requestUpdate('arrowHeight', previous);
  }
  arrowTipRadius = 0;
  arrowPath = '';
  arrowBorderColor = '';
  arrowBorderWidth = 0;
  showBackdrop = false;
  isItemEqual: ((a: unknown, b: unknown) => boolean) | undefined;
  itemToText: ((value: unknown) => string) | undefined;
  itemToLabel: ((value: unknown) => unknown) | undefined;
  onValueChange: ((event: TpValueChangeEvent<unknown>) => void) | undefined;
  onOpenChange: ((event: TpSurfaceOpenChangeEvent) => void) | undefined;
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  #providedValue: unknown;
  #providedOpen: boolean | undefined;
  override get value(): unknown {
    return this.#selection.value;
  }
  override set value(value: unknown) {
    const previous = this.#providedValue;
    this.#providedValue = value;
    this.requestUpdate('value', previous);
    if (this.hasUpdated) this.#selection.sync();
  }
  get open(): boolean {
    return this.searchable && this.inline ? !this.effectiveDisabled : this.#surface.open;
  }
  set open(value: boolean | undefined) {
    const previous = this.#providedOpen;
    this.#providedOpen = value;
    this.requestUpdate('open', previous);
    if (this.hasUpdated) this.#surface.sync(true);
  }
  readonly actions: SelectActions = {
    open: () => this.setOpen(true),
    close: () => this.setOpen(false),
    unmount: () => this.unmount(),
  };
  readonly #collection = new ChoiceCollectionController<unknown, SelectRecord>({
    locale: () => this.locale ?? resolveLocale(this),
    equals: (a, b) => this.isItemEqual?.(a, b) ?? Object.is(a, b),
    diagnostic: (message) => this.#diagnose(message),
  });
  readonly #model = new SelectModel(this);
  readonly #selection = new ControllableState<unknown>({
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
            this.#collection.equal(value, this.#values(b)[index]),
          )
        : this.#collection.equal(a, b),
    onCommit: () => {
      this.#syncForm();
      this.dispatchEvent(new Event('tp-field-value', { bubbles: true, composed: true }));
    },
    diagnostic: (message) => this.#diagnose(message),
  });
  readonly #source = new SelectSource();
  readonly #query = new SelectQueryController(this, {
    collection: this.#collection,
    selection: this.#selection,
    values: (value) => this.#values(value),
    text: (value) => this.#text(value),
    select: (record, event) => this.selectOption(record, event),
    metadata: (record) => ({
      source: this.#source.sources.get(record.option) ?? record.value,
      logicalIndex: record.option.index ?? this.#collection.source.indexOf(record),
      row: Number(
        (record.option as { row?: number }).row ??
          (this.#source.sources.get(record.option) as { row?: number } | undefined)?.row ??
          this.#collection.source.indexOf(record),
      ),
    }),
  });
  #clear: HTMLElement | null = null;
  readonly #clearPresence = new PresenceController(this, {
    surface: () => this.#clear,
    keepMounted: () => this.clearKeepMounted,
  });
  #outer: HTMLElement | null = null;
  readonly #surface = new SurfaceState({
    read: () => this.#providedOpen,
    defaultOpen: () => this.defaultOpen,
    dispatch: (event) => {
      this.dispatchEvent(event);
      this.onOpenChange?.(event);
    },
    commit: (open) => this.#openCommitted(open),
    diagnostic: (message) => this.#diagnose(message),
  });
  readonly #presence = new PresenceController(this, {
    surface: () => this.#content,
    keepMounted: () => !this.#forceUnmount && (this.keepMounted || this.#surface.retained),
    onStateChange: () => this.requestUpdate(),
    onComplete: (open) => {
      this.onOpenChangeComplete?.(open);
      if (!open) {
        if (!this.inline) this.#content?.hidePopover();
      }
    },
  });
  readonly #upPresence = new PresenceController(this, {
    surface: () => this.#up,
    keepMounted: () => this.scrollUpKeepMounted,
  });
  readonly #downPresence = new PresenceController(this, {
    surface: () => this.#down,
    keepMounted: () => this.scrollDownKeepMounted,
  });
  readonly #dismiss = new FloatingDismissController(this, {
    open: () => this.open && !this.inline,
    anchor: () => this.#trigger,
    insideElements: () => (this.#content ? [this.#content] : []),
    outside: () => true,
    escape: () => !this.#query.completion,
    topmostOnly: true,
    dismiss: (event) =>
      this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event),
  });
  #trigger: HTMLElement | null = null;
  #content: HTMLElement | null = null;
  #list: HTMLElement | null = null;
  #up: HTMLElement | null = null;
  #down: HTMLElement | null = null;
  #arrow: HTMLElement | null = null;
  #refs = new Map<string, (element: HTMLElement | null) => void>();
  #releases = new Map<string, () => void>();
  #portal = new SelectPortal(this, TpSelect.styles);
  #position: PositioningHandle | null = null;
  #positionKey = '';
  #positionAnchor: unknown;
  #positionBoundary: CollisionBoundary | undefined;
  #positionArrow: HTMLElement | null = null;
  #positionTarget: HTMLElement | null = null;
  #observer: MutationObserver | null = null;
  #nativeEntries: SelectEntry[] = [];
  readonly #environment = new SelectEnvironment(this, () => {
    this.requestUpdate();
    void this.#position?.update();
  });
  #repairFocus = false;
  #releaseModal: (() => void) | undefined;
  #releaseScroll: (() => void) | undefined;
  #forceUnmount = false;
  #previousFocus: Element | null = null;
  #focusPending = false;
  #wasOpen = false;
  #space = false;
  readonly #pointer = new SelectPointer<SelectRecord>(() =>
    this.ownerDocument.defaultView!.performance.now(),
  );
  #triggerPressed = false;
  #preventTriggerClick = false;
  #openingPointerCleanup: (() => void) | undefined;
  #scrollTimer: number | undefined;
  #scrollWindow: Window | null = null;
  #motion: MotionHandle | null = null;
  #motionPhase = '';
  #openingEvent: Event | undefined;
  #closingEvent: Event | undefined;
  #diagnostics = new Set<string>();

  get triggerElement(): HTMLElement | null {
    return this.#trigger;
  }
  get popupElement(): HTMLElement | null {
    return this.#content;
  }
  get listElement(): HTMLElement | null {
    return this.#list;
  }
  get highlightedValue(): unknown {
    return this.#collection.highlighted?.value;
  }
  get presenceState(): string {
    return this.#presence.state;
  }
  protected override focusTarget(): HTMLElement | null {
    return this.#trigger;
  }
  protected override associationTarget(): HTMLElement | null {
    return this.#trigger;
  }
  setOpen(open: boolean, reason: ChangeReason = 'imperative-action', event?: Event): void {
    if (this.searchable && this.inline) {
      if (!open) this.#query.resetTransient(event);
      return;
    }
    if (open && (this.effectiveDisabled || (this.searchable && this.readOnly))) return;
    if (open) this.#openingEvent = event;
    else this.#closingEvent = event;
    this.#surface.request(open, reason, event, this.#trigger ?? undefined);
  }
  close(): void {
    this.setOpen(false);
  }
  unmount(): void {
    this.#closingEvent = undefined;
    if (this.open) {
      this.#surface.request(
        false,
        'imperative-action',
        undefined,
        this.#trigger ?? undefined,
        () => {
          this.#forceUnmount = true;
          this.#surface.retained = false;
        },
      );
    } else {
      this.#forceUnmount = true;
      this.#surface.retained = false;
      this.#presence.releaseRetained();
      this.#presence.completeExit();
      this.requestUpdate();
    }
  }
  async updatePosition(): Promise<void> {
    await this.#position?.update();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#environment.connect();
    this.addEventListener('tp-select-source-change', this.#sourceChanged);
    this.#nativeEntries = nativeSelectEntries(this);
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(() => {
      this.#nativeEntries = nativeSelectEntries(this);
      this.requestUpdate();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['value', 'label', 'disabled', 'selected', 'index', 'native-action'],
    });
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.removeEventListener('tp-select-source-change', this.#sourceChanged);
    this.#outer?.removeEventListener('tp-open-change', this.#outerChange);
    this.#outer = null;
    this.#query.disconnect();
    this.#environment.disconnect();
    this.#cleanupSurface();
    this.#portal.clear();
    this.#collection.disconnect();
    this.#space = false;
    this.#motion?.cancel();
    this.#motion = null;
    for (const release of this.#releases.values()) release();
    this.#releases.clear();
    super.disconnectedCallback();
  }
  readonly #sourceChanged = (): void => this.requestUpdate();
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#surface.sync();
    if (this.effectiveDisabled && this.open) this.#surface.request(false, 'disabled');
    const active = deepActiveElement(this.ownerDocument);
    const focusedOption = this.#collection.source.find(
      (record) => this.#collection.element(record) === active,
    );
    const previousHighlight = this.#collection.highlighted;
    this.#model.update(
      isSelectItemCollection(this.items)
        ? this.#source.normalize(this.items, [])
        : (this.items ??
            (this.querySelector('tp-select-option')
              ? this.#source.normalize(
                  undefined,
                  [...this.children].filter((node) =>
                    node.matches('option,optgroup,hr,tp-select-option'),
                  ),
                )
              : this.searchable && this.filteredItems !== undefined
                ? this.#source.normalize(this.filteredItems, [])
                : this.#nativeEntries)),
      (value) => this.#text(value),
      (value) => this.itemToLabel?.(value) ?? this.#text(value),
    );
    this.#collection.setSource(this.#model.records);
    this.#query.sync(previousHighlight);
    if (this.searchable && this.virtualized && !this.items)
      this.#diagnose('virtualized requires the complete ordered source items.');
    this.#clearPresence.setPresent(
      this.searchable && this.showClear && (!!this.inputValue || !!this.#values(this.value).length),
    );
    this.#repairFocus =
      !!focusedOption &&
      (!this.#collection.source.includes(focusedOption) || !!focusedOption.disabled);
    if (this.open && !this.#wasOpen) {
      this.#pointer.opened();
      if (!this.searchable) this.#collection.openAt(this.#values(this.value));
      this.#focusPending = !this.inline;
    }
    this.#wasOpen = this.open;
    this.#presence.setPresent(this.open && this.isConnected);
    for (const record of this.#model.records)
      record.presence.setPresent(this.#selected(record.value));
  }
  protected renderQueryPrefix(): unknown {
    return nothing;
  }
  protected override render() {
    const state = this.#state();
    if (this.searchable)
      return html`${this.#part('select', state, {
          properties: { class: 'select-root', 'data-open': this.open, 'data-closed': !this.open },
          content: renderQuery(this, this.#query, {
            part: (name, state, options, contract) => this.#part(name, state, options, contract),
            ref: (key, part, commit) => this.#ref(key, part, commit),
            values: () => this.#values(this.value),
            text: (value) => this.#text(value),
            state,
            prefix: this.renderQueryPrefix(),
            focusOut: () => this.#focusOut(),
            clearMounted: this.#clearPresence.mounted,
            clearVisible: this.#clearPresence.mounted && this.#clearPresence.state !== 'retained',
            bindClear: (element) => {
              this.#clear = element;
            },
            bindEditor: (element) => {
              this.#query.editor = element as HTMLInputElement | null;
              this.#trigger = element;
            },
          }),
        })}${!this.container || this.inline ? this.#popup() : nothing}
        <div class="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
          ${this.open ? this.#query.status : ''}
        </div>
        <slot hidden></slot>`;
    const selected = this.#values(this.value).map(
      (value) =>
        this.#collection.selected(value)?.label ?? this.itemToLabel?.(value) ?? this.#text(value),
    );
    const value = this.#part('select-value', state, {
      tag: 'span',
      properties: { class: 'select-value', 'data-placeholder': !selected.length },
      content: selected.length
        ? selected.map((label, index) => html`${index ? ', ' : nothing}${label}`)
        : this.placeholder,
    });
    const trigger = this.#part('select-trigger', state, {
      tag: this.nativeAction ? 'button' : 'div',
      reference: this.#ref('trigger', 'select-trigger', (element) => {
        this.#trigger = element;
      }),
      onHandlerPrevented: {
        '@keydown': () => {
          this.#space = false;
        },
        '@keyup': () => {
          this.#space = false;
        },
        '@pointerdown': () => {
          this.#preventTriggerClick = true;
          this.#pointer.reset();
        },
      },
      properties: {
        class: 'select-trigger',
        part: 'select-trigger focusable',
        id: this.identifier,
        role: 'combobox',
        type: this.nativeAction ? 'button' : undefined,
        '.disabled': this.nativeAction ? this.effectiveDisabled : undefined,
        tabindex: this.effectiveDisabled ? -1 : 0,
        'aria-label': this.label || undefined,
        'aria-haspopup': 'listbox',
        'aria-expanded': String(this.open),
        'aria-controls': this.#presence.mounted ? `${this.identifier}-list` : undefined,
        'aria-disabled': this.effectiveDisabled ? 'true' : undefined,
        'aria-readonly': this.readOnly ? 'true' : undefined,
        'aria-required': this.required ? 'true' : undefined,
        'aria-invalid': this.effectiveInvalid ? 'true' : undefined,
        'data-open': this.open,
        'data-closed': !this.open,
        'data-disabled': this.effectiveDisabled,
        'data-invalid': this.effectiveInvalid,
        'data-placeholder': !selected.length,
        '@pointerdown': (event: PointerEvent) => this.#triggerPointerDown(event),
        '@pointercancel': () => {
          this.#triggerPressed = false;
          this.#pointer.reset();
          this.#openingPointerCleanup?.();
        },
        '@click': (event: MouseEvent) => {
          const handled = this.#preventTriggerClick || (this.#triggerPressed && event.detail !== 0);
          this.#preventTriggerClick = false;
          this.#triggerPressed = false;
          if (!handled) this.setOpen(!this.open, 'trigger-press', event);
        },
        '@keydown': (event: KeyboardEvent) => this.#keyDown(event, true),
        '@keyup': (event: KeyboardEvent) => this.#keyUp(event),
        '@blur': () => {
          this.#space = false;
        },
      },
      content: html`${value}<tp-icon
          size="var(--tp-icon-size-sm)"
          .icon=${chevronRightIcon}
        ></tp-icon>`,
    });
    return html`${this.#part('select', state, { properties: { class: 'select-root', 'data-open': this.open, 'data-closed': !this.open }, content: trigger })}
      <input
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        .value=${this.#values(this.value).map(String).join(',')}
        autocomplete=${this.effectiveNoAutofill ? 'off' : this.autoComplete || nothing}
        data-bwignore=${autofillHint(this.effectiveNoAutofill, 'data-bwignore')}
        data-1p-ignore=${autofillHint(this.effectiveNoAutofill, 'data-1p-ignore')}
        data-lpignore=${autofillHint(this.effectiveNoAutofill, 'data-lpignore')}
        data-form-type=${autofillHint(this.effectiveNoAutofill, 'data-form-type')}
        ?disabled=${this.effectiveDisabled}
        @change=${this.#autofill}
      />
      <slot hidden></slot>${this.container ? nothing : this.#popup()}`;
  }
  #popup(): unknown {
    if (!this.#presence.mounted && !this.inline) return nothing;
    const state = this.#state(),
      phase = this.#presence.state;
    const list = this.#part('select-list', state, {
      properties: {
        class: 'select-list',
        id: `${this.identifier}-list`,
        role: 'listbox',
        tabindex: -1,
        'aria-label': this.label || this.placeholder || 'Options',
        'aria-multiselectable': this.multiple ? 'true' : undefined,
        'aria-busy': this.loading ? 'true' : undefined,
        '@keydown': (event: KeyboardEvent) => {
          if (event.target === event.currentTarget) this.#keyDown(event, false);
        },
        '@keyup': (event: KeyboardEvent) => {
          if (event.target === event.currentTarget) this.#keyUp(event);
        },
        '@scroll': () => this.#scrollState(),
      },
      reference: this.#ref('list', 'select-list', (element) => {
        this.#list = element;
      }),
      content: html`${this.searchable ? this.#part('select-collection', state, { content: this.#nodes(this.#model.nodes) }) : this.#nodes(this.#model.nodes)}${this.searchable && !this.#collection.visible.length && !this.loading ? this.#part('select-empty-state', state, { properties: { role: 'presentation' }, content: html`<slot name="empty">No results found.</slot>` }) : nothing}`,
    });
    const content = this.#part('select-content', state, {
      properties: {
        class: 'select-content',
        popover: this.inline ? undefined : 'manual',
        'data-inline': this.inline,
        tabindex: -1,
        '.inert': !this.open,
        'aria-hidden': this.open ? undefined : 'true',
        'data-open': this.open,
        'data-closed': !this.open,
        'data-presence': phase,
        'data-starting-style': phase === 'starting',
        'data-ending-style': phase === 'ending',
        'data-align-item': this.alignItemWithTrigger && !this.searchable,
        '@focusout': () => this.#focusOut(),
      },
      reference: this.#ref('content', 'select-content', (element) => {
        this.#content = element;
      }),
      content: html`<div class="select-body">
          ${this.#scrollControl(-1)}${list}${this.#scrollControl(1)}
        </div>
        ${this.#renderArrow()}`,
    });
    return html`${this.showBackdrop && !this.inline ? this.#part('backdrop', state, { properties: { class: 'select-backdrop', 'aria-hidden': 'true', 'data-open': this.open, 'data-closed': !this.open, '@pointerdown': (event: Event) => this.setOpen(false, 'outside-press', event) } }) : nothing}${content}`;
  }
  #nodes(nodes: readonly SelectNode[]): unknown {
    if (this.searchable && this.filteredItems) {
      const positions = (node: SelectNode): number[] =>
        'children' in node
          ? node.children.flatMap(positions)
          : 'value' in node && this.#collection.visible.includes(node)
            ? [this.#collection.visible.indexOf(node)]
            : [];
      const ranked = nodes.flatMap((node, index): Array<{ node: SelectNode; rank: number }> => {
        if ('type' in node && node.type === 'separator') {
          const before = nodes.slice(0, index).flatMap(positions),
            after = nodes.slice(index + 1).flatMap(positions);
          return before.length && after.length
            ? [{ node, rank: (Math.max(...before) + Math.min(...after)) / 2 }]
            : [];
        }
        const rank = positions(node);
        return [{ node, rank: rank.length ? Math.min(...rank) : Infinity }];
      });
      nodes = ranked.sort((a, b) => a.rank - b.rank).map((entry) => entry.node);
    }
    if (!this.searchable || !this.grid)
      return repeat(
        nodes,
        (node) => node.id,
        (node) => this.#node(node),
      );
    const rows: Array<{ id: string; row?: number | undefined; nodes: SelectNode[] }> = [];
    for (const node of nodes) {
      const row = 'value' in node ? this.#query.owner.metadata(node).row : undefined;
      const previous = rows.at(-1);
      if (row !== undefined && previous?.row === row) previous.nodes.push(node);
      else rows.push({ id: node.id, row, nodes: [node] });
    }
    return repeat(
      rows,
      (row) => row.id,
      (row) =>
        row.row === undefined
          ? this.#node(row.nodes[0]!)
          : this.#part('select-row', this.#state(), {
              properties: { class: 'select-row' },
              content: row.nodes.map((node) => this.#node(node)),
            }),
    );
  }
  #visibleNode(node: SelectNode): boolean {
    return 'children' in node
      ? node.children.some((child) => this.#visibleNode(child))
      : 'value' in node && this.#collection.visible.includes(node);
  }
  #node(node: SelectNode): unknown {
    if (
      this.searchable &&
      'children' in node &&
      !this.#visibleNode(node) &&
      !(node as { forceMount?: boolean }).forceMount
    )
      return nothing;
    if ('type' in node && node.type === 'group')
      return this.#part(
        'select-group',
        this.#state(),
        {
          properties: {
            class: 'select-group',
            hidden: this.searchable && !this.#visibleNode(node),
            role: 'group',
            'aria-labelledby': node.label ? `${node.id}-label` : undefined,
          },
          reference: this.#ref(node.id, 'select-group'),
          content: html`${node.label ? this.#part('select-label', this.#state(), { properties: { class: 'select-label', id: `${node.id}-label` }, reference: this.#ref(`${node.id}-label`, 'select-label'), content: node.label }, node.labelContract) : nothing}${this.#nodes(node.children)}`,
        },
        node.partContract,
      );
    if ('type' in node && node.type === 'separator')
      return this.#part(
        'select-separator',
        this.#state(),
        {
          properties: {
            class: 'select-separator',
            role: 'separator',
            'aria-orientation': node.orientation ?? 'horizontal',
          },
          reference: this.#ref(node.id, 'select-separator'),
        },
        node.partContract,
      );
    const record = node as SelectRecord;
    if (
      (!this.#collection.visible.includes(record) &&
        !(record.option as { forceMount?: boolean }).forceMount) ||
      (this.searchable && !this.#query.mounted(record))
    )
      return nothing;
    const selected = this.#selected(record.value),
      highlighted = this.#collection.highlighted === record;
    const disabled = this.effectiveDisabled || !!record.disabled;
    const state = { ...this.#state(), value: record.value, selected, highlighted, disabled };
    const indicator = this.#part(
      'indicator',
      state,
      {
        tag: 'span',
        enabled: record.presence.mounted,
        properties: {
          class: 'select-indicator',
          'aria-hidden': 'true',
          'data-selected': selected,
          'data-presence': record.presence.state,
          'data-starting-style': record.presence.state === 'starting',
          'data-ending-style': record.presence.state === 'ending',
        },
        reference: this.#ref(`${record.id}-indicator`, '', (element) => {
          record.indicator = element;
        }),
        content: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${checkIcon}></tp-icon>`,
      },
      record.option.indicatorContract,
    );
    const text = this.#part(
      'item-text',
      state,
      { tag: 'span', properties: { class: 'select-item-text' }, content: record.label },
      record.option.textContract,
    );
    return this.#part(
      'select-option',
      state,
      {
        tag: record.option.nativeAction ? 'button' : 'div',
        reference: this.#ref(record.id, 'select-option', (element) =>
          this.#collection.mount(record, element),
        ),
        onHandlerPrevented: {
          '@keydown': () => {
            this.#space = false;
          },
          '@keyup': () => {
            this.#space = false;
          },
          '@pointerdown': () => this.#pointer.reset(),
          '@pointerup': () => this.#pointer.reset(),
        },
        properties: {
          class: 'select-option',
          hidden: !this.#collection.visible.includes(record),
          id: record.id,
          role: 'option',
          type: record.option.nativeAction ? 'button' : undefined,
          '.disabled': record.option.nativeAction ? disabled : undefined,
          tabindex: !this.searchable && this.open && highlighted ? 0 : -1,
          'aria-selected': String(this.optionAriaSelected(record)),
          'aria-label': this.optionAccessibleName(record),
          'aria-disabled': disabled ? 'true' : undefined,
          'aria-setsize': this.#collection.source.length,
          'aria-posinset': this.#collection.source.indexOf(record) + 1,
          'data-selected': selected,
          'data-highlighted': highlighted,
          'data-disabled': disabled,
          '@pointerenter': (event: PointerEvent) => this.#pointer.enter(event.pointerType),
          '@pointermove': (event: PointerEvent) => {
            this.#pointer.move(event.pointerType, event.buttons, event.movementY);
            if (this.highlightItemOnHover && event.pointerType !== 'touch' && !disabled)
              this.#highlight(record, false);
          },
          '@pointerdown': (event: PointerEvent) => {
            if (event.button !== 0 || disabled) return;
            if (this.searchable) event.preventDefault();
            this.#pointer.down(record, event.pointerType);
            this.#highlight(record, false);
          },
          '@pointerup': (event: PointerEvent) => {
            if (!disabled && this.#pointer.release(record, selected))
              this.selectOption(record, event);
          },
          '@pointercancel': () => this.#pointer.reset(),
          '@click': (event: MouseEvent) => {
            if (this.#pointer.click(record, event, highlighted)) this.selectOption(record, event);
          },
          '@keydown': (event: KeyboardEvent) => this.#keyDown(event, false),
          '@keyup': (event: KeyboardEvent) => this.#keyUp(event),
          '@focus': () => this.#highlight(record, false),
        },
        content: html`${text}${indicator}`,
      },
      record.option.partContract,
    );
  }
  #scrollControl(direction: -1 | 1): unknown {
    const presence = direction < 0 ? this.#upPresence : this.#downPresence;
    const name = direction < 0 ? 'select-scroll-up-button' : 'select-scroll-down-button';
    return this.#part(
      name,
      { ...this.#state(), visible: presence.state !== 'retained' },
      {
        enabled: presence.mounted,
        tag: 'div',
        properties: {
          class: `select-scroll select-scroll-${direction < 0 ? 'up' : 'down'}`,
          'aria-hidden': 'true',
          'data-presence': presence.state,
          'data-starting-style': presence.state === 'starting',
          'data-ending-style': presence.state === 'ending',
          '@pointerdown': (event: PointerEvent) => {
            event.preventDefault();
            this.#startScroll(direction);
          },
          '@pointerenter': (event: PointerEvent) => {
            if (event.pointerType !== 'touch') this.#startScroll(direction);
          },
          '@pointerleave': () => this.#stopScroll(),
          '@pointerup': () => this.#stopScroll(),
          '@pointercancel': () => this.#stopScroll(),
        },
        reference: this.#ref(name, name, (element) => {
          if (direction < 0) this.#up = element;
          else this.#down = element;
        }),
        content: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${chevronRightIcon}></tp-icon>`,
      },
    );
  }
  #renderArrow(): unknown {
    const width = Math.max(1, this.arrowWidth),
      height = Math.max(1, this.arrowHeight),
      radius = Math.min(height / 2, Math.max(0, this.arrowTipRadius));
    const path =
      this.arrowPath ||
      `M0 0 L${width / 2 - radius} ${height - radius} Q${width / 2} ${height} ${width / 2 + radius} ${height - radius} L${width} 0 Z`;
    return this.#part('arrow', this.#state(), {
      enabled: this.showArrow,
      properties: {
        class: 'select-arrow',
        'aria-hidden': 'true',
        style: {
          '--_tp-arrow-width':
            this.#arrowWidth === undefined
              ? `calc(var(--tp-spacing) * ${this.defaultArrowWidthUnits})`
              : `${width}px`,
          '--_tp-arrow-height':
            this.#arrowHeight === undefined
              ? `calc(var(--tp-spacing) * ${this.defaultArrowHeightUnits})`
              : `${height}px`,
        },
      },
      reference: this.#ref('arrow', '', (element) => {
        this.#arrow = element;
      }),
      content: html`<svg viewBox=${`0 0 ${width} ${height}`} aria-hidden="true">
        <path
          d=${path}
          stroke=${this.arrowBorderColor || 'none'}
          stroke-width=${this.arrowBorderWidth}
        ></path>
      </svg>`,
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    if (changed.has('alignItemWithTrigger')) this.#alignedItemOffset = undefined;
    if (this.container && !this.inline) this.#portal.update(this.container, this.#popup());
    else this.#portal.clear();
    super.updated(changed);
    if (this.open && this.#repairFocus) {
      this.#repairFocus = false;
      (this.#collection.element(this.#collection.highlighted) ?? this.#trigger)?.focus({
        preventScroll: true,
      });
    }
    this.#syncForm();
    this.toggleAttribute('data-open', this.open);
    this.toggleAttribute('data-closed', !this.open);
    this.toggleAttribute('data-searchable', this.searchable);
    if (this.searchable && this.#query.editor) {
      this.#query.editor.ariaActiveDescendantElement = this.open
        ? this.#collection.element(this.#collection.highlighted)
        : null;
      this.#query.restore();
    }
    if (this.inline) this.#syncOuter();
    if (this.#trigger && this.#list) this.#trigger.ariaControlsElements = [this.#list];
    if (this.open && this.#content) {
      if (!this.inline && !this.#content.matches(':popover-open')) this.#content.showPopover();
      if (!this.inline) this.#setupPosition();
      else {
        this.#position?.destroy();
        this.#position = null;
        this.#content.style.removeProperty('translate');
      }
      if (this.modal && !this.inline && !this.#releaseModal) {
        this.#releaseModal = acquireOutsideInert(this.ownerDocument, () => [
          this,
          ...(this.#portal.host ? [this.#portal.host] : []),
          ...this.#dismiss.branchElements.filter(
            (element): element is HTMLElement =>
              element.namespaceURI === 'http://www.w3.org/1999/xhtml',
          ),
        ]);
        if (
          this.#openingEvent?.type !== 'touchstart' &&
          !(
            this.#openingEvent &&
            'pointerType' in this.#openingEvent &&
            this.#openingEvent.pointerType === 'touch'
          )
        )
          this.#releaseScroll = acquireScrollLock(this.ownerDocument);
      } else if (!this.modal || this.inline) this.#releaseModality();
      if (this.#focusPending) {
        this.#focusPending = false;
        void this.updatePosition().then(() => this.#initialFocus());
      }
      this.#scrollState();
    } else {
      this.#releaseModality();
      this.#stopScroll();
      if (this.#presence.state !== 'ending') this.#cleanupSurface();
    }
    const phase = this.#presence.state;
    if (
      this.#content &&
      (phase === 'starting' || phase === 'ending') &&
      this.#motionPhase !== phase
    ) {
      this.#motionPhase = phase;
      this.#motion = prepareMotion(
        this,
        this.#content,
        {
          name: 'select.presence',
          kind: 'presence',
          phases: ['enter', 'exit'],
          completion: 'blocking',
        },
        { phase: phase === 'starting' ? 'enter' : 'exit', toState: this.open },
      );
      this.#presence.trackCompletion(this.#motion.finished);
      this.#motion.start();
    } else if (phase !== 'starting' && phase !== 'ending') this.#motionPhase = '';
    this.#pruneReferences();
    void this.#dismiss;
  }
  #pruneReferences(): void {
    const live = new Set([
      'trigger',
      'content',
      'list',
      'arrow',
      'select-scroll-up-button',
      'select-scroll-down-button',
    ]);
    const visit = (nodes: readonly SelectNode[]): void => {
      for (const node of nodes) {
        live.add(node.id);
        if ('children' in node) {
          live.add(`${node.id}-label`);
          visit(node.children);
        } else if ('value' in node) live.add(`${node.id}-indicator`);
      }
    };
    visit(this.#model.nodes);
    // Preserve refs while any ending/retained constituent still owns its target.
    for (const key of this.#refs.keys())
      if (!live.has(key) && !this.#releases.has(key)) this.#refs.delete(key);
  }
  #setupPosition(): void {
    const configured =
      typeof this.anchor === 'function'
        ? this.anchor()
        : this.anchor && 'current' in this.anchor
          ? this.anchor.current
          : this.anchor;
    const anchor = configured ?? (this.searchable ? this.#query.anchor : null) ?? this.#trigger;
    if (!anchor || !this.#content) return;
    const key = JSON.stringify([
      this.placement,
      this.side,
      this.align,
      this.sideOffset,
      this.alignOffset,
      this.positionMethod,
      this.collisionPadding,
      this.collisionAvoidance,
      this.sticky,
      this.disableAnchorTracking,
      this.alignItemWithTrigger,
      this.showArrow,
    ]);
    if (
      this.#position &&
      this.#positionKey === key &&
      this.#positionAnchor === anchor &&
      this.#positionBoundary === this.collisionBoundary &&
      this.#positionArrow === this.#arrow &&
      this.#positionTarget === this.#content
    ) {
      if (typeof this.sideOffset === 'function' || typeof this.alignOffset === 'function')
        void this.#position.update();
      return;
    }
    this.#position?.destroy();
    this.#positionKey = key;
    this.#positionAnchor = anchor;
    this.#positionBoundary = this.collisionBoundary;
    this.#positionArrow = this.#arrow;
    this.#positionTarget = this.#content;
    const [side = 'block-end', align = 'start'] = this.placement.trim().split(/\s+/);
    const padding = () => this.collisionPadding;
    const arrowPadding = () => this.arrowPadding;
    this.#position = positionSurface(anchor, this.#content, {
      resolvePlacement: () =>
        `${resolveSide(this.side ?? (side as LogicalSide), this)}-${this.align ?? (align as Alignment)}`,
      offset: (context) => geometryOffsets(this.sideOffset, this.alignOffset)(context),
      strategy: this.positionMethod,
      collision: this.collisionAvoidance,
      boundary: this.collisionBoundary,
      get padding() {
        return padding();
      },
      sticky: this.sticky,
      constrainSize: true,
      matchReferenceWidth: true,
      arrow: this.#arrow,
      get arrowPadding() {
        return arrowPadding();
      },
      tracking: this.disableAnchorTracking ? false : {},
      onInvalid: () => {
        if (this.open) this.setOpen(false, 'anchor-removed');
      },
      onPosition: () => {
        this.#alignSelectedItem();
        this.#scrollState();
      },
    });
  }
  #alignedItemOffset: number | undefined;
  #alignSelectedItem(): void {
    if (
      this.searchable ||
      !this.alignItemWithTrigger ||
      !this.#trigger ||
      !this.#content ||
      !this.#list
    )
      return;
    const trigger = this.#trigger.getBoundingClientRect(),
      content = this.#content.getBoundingClientRect();
    const view = this.ownerDocument.defaultView!;
    const padding =
      typeof this.collisionPadding === 'number'
        ? this.collisionPadding
        : (this.collisionPadding.top ?? themeSpacing(this, 3));
    if (content.height > view.innerHeight - padding * 2) return;
    const initialAlignment = this.#alignedItemOffset === undefined;
    if (this.#alignedItemOffset === undefined) {
      const item = this.#collection.element(
        this.#collection.source.find((record) => this.#selected(record.value)) ??
          this.#collection.highlighted,
      );
      if (!item) return;
      const option = item.getBoundingClientRect();
      if (option.height > trigger.height * 2) return;
      this.#alignedItemOffset = option.top - content.top + option.height / 2;
    }
    // Scroll arrows intentionally clear the highlight. The established opening
    // alignment belongs to the popup lifecycle, not to that transient highlight.
    const desired = trigger.top + trigger.height / 2 - this.#alignedItemOffset;
    const top = Math.max(padding, Math.min(view.innerHeight - padding - content.height, desired));
    const delta = top - content.top;
    const current = this.#position?.current;
    if (current) this.#content.style.translate = `${current.x}px ${current.y + delta}px`;
    const scroll = top - desired;
    if (initialAlignment && scroll) {
      this.#list.scrollTop = Math.max(0, this.#list.scrollTop + scroll);
    }
  }
  #triggerPointerDown(event: PointerEvent): void {
    this.#preventTriggerClick = false;
    if (event.button !== 0 || event.pointerType === 'touch' || this.effectiveDisabled) return;
    this.#triggerPressed = true;
    const opening = !this.open;
    this.setOpen(opening, 'trigger-press', event);
    this.#openingPointerCleanup?.();
    if (!opening || !this.open) return;
    const document = this.ownerDocument;
    const release = (end: PointerEvent): void => {
      this.#openingPointerCleanup?.();
      const bounds = this.#trigger?.getBoundingClientRect();
      const withinTrigger =
        bounds &&
        end.clientX >= bounds.left &&
        end.clientX <= bounds.right &&
        end.clientY >= bounds.top &&
        end.clientY <= bounds.bottom;
      if (
        !withinTrigger &&
        !this.#dismiss.contains((end.composedPath()[0] ?? end.target) as Node | null)
      )
        this.setOpen(false, 'cancel-open', end);
    };
    document.addEventListener('pointerup', release, { once: true });
    this.#openingPointerCleanup = () => {
      document.removeEventListener('pointerup', release);
      this.#openingPointerCleanup = undefined;
    };
  }
  #keyDown(event: KeyboardEvent, trigger: boolean): void {
    if (componentHandlingPrevented(event)) {
      this.#space = false;
      return;
    }
    if (event.isComposing || event.keyCode === 229 || this.effectiveDisabled) return;
    if (event.key === 'Tab' && this.open) {
      this.setOpen(false, 'keyboard', event);
      const items = focusableElements(this.ownerDocument.body).filter(
        (element) => !this.#content?.contains(element),
      );
      const index = items.indexOf(this.#trigger!);
      const target = items[index + (event.shiftKey ? -1 : 1)];
      if (!this.open && target) {
        event.preventDefault();
        target.focus();
      } else if (this.open) event.preventDefault();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault();
      const wasOpen = this.open;
      if (!wasOpen) this.setOpen(true, 'keyboard', event);
      if (!this.open) return;
      if (event.key === 'Home' || event.key === 'End')
        this.#collection.boundary(event.key === 'End');
      else if (wasOpen && !event.altKey) this.#collection.move(event.key === 'ArrowDown' ? 1 : -1);
      this.#focusHighlight();
      this.requestUpdate();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (!this.open) this.setOpen(true, 'keyboard', event);
      else if (!trigger || !this.nativeAction) {
        const record = this.#collection.highlighted;
        if (record) this.selectOption(record, event);
      } else {
        const record = this.#collection.highlighted;
        if (record) this.selectOption(record, event);
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (this.#collection.typeahead.typing) {
        const match = this.#collection.search(event.key);
        if (match) this.#highlight(match, true);
        this.#space = false;
      } else if (!event.repeat) this.#space = true;
    } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const match = this.#collection.search(event.key);
      if (match) {
        event.preventDefault();
        if (!this.open) this.setOpen(true, 'keyboard', event);
        this.#highlight(match, true);
      }
    }
  }
  #keyUp(event: KeyboardEvent): void {
    if (componentHandlingPrevented(event)) {
      this.#space = false;
      return;
    }
    if (event.key !== ' ') return;
    const armed = this.#space;
    this.#space = false;
    event.preventDefault();
    if (!armed || this.effectiveDisabled) return;
    if (!this.open) this.setOpen(true, 'keyboard', event);
    else {
      const record = this.#collection.highlighted;
      if (record) this.selectOption(record, event);
    }
  }
  protected selectOption(record: SelectRecord, event: Event): void {
    if (
      !this.open ||
      record.disabled ||
      this.effectiveDisabled ||
      this.readOnly ||
      !this.#collection.source.includes(record)
    )
      return;
    const next = this.multiple
      ? this.#collection.toggle(this.#values(this.value), record.value)
      : record.value;
    const unchanged = !this.multiple && this.#collection.equal(next, this.value);
    const accepted = unchanged || this.#selection.set(next, 'item-press', event);
    const committed = this.multiple
      ? this.#values(next).length === this.#values(this.value).length &&
        this.#values(next).every((value, index) =>
          this.#collection.equal(value, this.#values(this.value)[index]),
        )
      : this.#collection.equal(this.value, next);
    if (accepted && committed) {
      if (this.searchable) this.#query.selected(record, event);
      if (this.searchable ? (this.closeOnSelect ?? !this.multiple) : !this.multiple)
        this.setOpen(false, 'item-press', event);
    }
    this.requestUpdate();
  }
  #highlight(record: SelectRecord, focus: boolean): void {
    if (record.disabled) return;
    this.#collection.activeIndex = this.#collection.visible.indexOf(record);
    this.requestUpdate();
    if (this.searchable) this.#query.highlight(focus ? 'list-navigation' : 'pointer');
    else if (focus) this.#focusHighlight();
  }
  #focusHighlight(): void {
    void this.updateComplete.then(() => {
      if (!this.open) return;
      const element = this.#collection.element(this.#collection.highlighted);
      element?.focus({ preventScroll: true });
      const scrollOptions = { block: 'nearest', inline: 'nearest', container: 'nearest' } as const;
      element?.scrollIntoView(scrollOptions);
    });
  }
  #initialFocus(): void {
    if (!this.open) return;
    const element = this.#focusTarget(this.initialFocus, true);
    if (element && isAvailable(element)) element.focus({ preventScroll: true });
  }
  #openCommitted(open: boolean): void {
    this.#query.completion = '';
    this.#alignedItemOffset = undefined;
    this.#wasOpen = open;
    this.#space = false;
    if (open) {
      this.#forceUnmount = false;
      this.#pointer.opened();
      this.#previousFocus = deepActiveElement(this.ownerDocument);
      if (!this.searchable) this.#collection.openAt(this.#values(this.value));
      this.#focusPending = !this.inline;
    } else {
      this.#pointer.reset();
      this.#openingPointerCleanup?.();
      this.#releaseModality();
      this.#stopScroll();
      this.#collection.typeahead.reset();
      // Editable lists must not pull focus back after the user entered another
      // control. Explicit final-focus resolvers still own their chosen target.
      const active = deepActiveElement(this.ownerDocument);
      if (
        !this.searchable ||
        this.finalFocus !== 'trigger' ||
        !active ||
        active === this.ownerDocument.body ||
        this.#dismiss.contains(active)
      )
        restoreFocus(this.#focusTarget(this.finalFocus, false));
    }
    this.requestUpdate();
  }
  #focusTarget(target: SelectFocusTarget, initial: boolean): HTMLElement | null {
    const event = initial ? this.#openingEvent : this.#closingEvent;
    const interaction = !event
      ? ''
      : event.type.startsWith('key')
        ? 'keyboard'
        : 'pointerType' in event && ['touch', 'pen'].includes(String(event.pointerType))
          ? (event.pointerType as 'touch' | 'pen')
          : 'mouse';
    return resolveSurfaceFocus(target, {
      event,
      defaultTarget: () =>
        initial && !this.searchable && interaction === 'keyboard'
          ? (this.#collection.element(this.#collection.highlighted) ?? this.#trigger)
          : this.#trigger,
      trigger:
        initial && !this.searchable && interaction === 'keyboard'
          ? (this.#collection.element(this.#collection.highlighted) ?? this.#trigger)
          : this.#trigger,
      first:
        initial && !this.searchable
          ? (this.#collection.element(this.#collection.highlighted) ?? this.#trigger)
          : this.#trigger,
      popup: this.#content,
      previous: this.#previousFocus,
    });
  }

  #focusOut(): void {
    queueMicrotask(() => {
      if (!this.open || this.inline) return;
      const active = deepActiveElement(this.ownerDocument);
      if (active && !this.#dismiss.contains(active)) this.setOpen(false, 'focus-outside');
    });
  }
  #scrollState(): void {
    const list = this.#list;
    const up = !!list && this.open && list.scrollTop > 1;
    const down = !!list && this.open && list.scrollTop + list.clientHeight < list.scrollHeight - 1;
    this.#upPresence.setPresent(up);
    this.#downPresence.setPresent(down);
    // Scroll arrows overlay the list. Use their actual customized block extent so
    // native scrollIntoView also keeps keyboard focus clear of either overlay.
    list?.style.setProperty(
      '--_tp-select-scroll-up-height',
      `${up ? (this.#up?.offsetHeight ?? 0) : 0}px`,
    );
    list?.style.setProperty(
      '--_tp-select-scroll-down-height',
      `${down ? (this.#down?.offsetHeight ?? 0) : 0}px`,
    );
  }
  #startScroll(direction: number): void {
    this.#stopScroll();
    const tick = (): void => {
      if (!this.open || !this.#list) return this.#stopScroll();
      this.#collection.activeIndex = -1;
      const step =
        this.#collection.element(this.#collection.source[0])?.getBoundingClientRect().height ?? 24;
      this.#list.scrollTop += direction * step;
      this.#scrollState();
      this.requestUpdate();
      if (
        direction < 0
          ? this.#list.scrollTop <= 1
          : this.#list.scrollTop + this.#list.clientHeight >= this.#list.scrollHeight - 1
      )
        return this.#stopScroll();
      this.#scrollWindow = this.ownerDocument.defaultView;
      this.#scrollTimer = this.#scrollWindow!.setTimeout(tick, 40);
    };
    tick();
  }
  #stopScroll(): void {
    if (this.#scrollTimer !== undefined) this.#scrollWindow?.clearTimeout(this.#scrollTimer);
    this.#scrollTimer = undefined;
    this.#scrollWindow = null;
  }
  #releaseModality(): void {
    this.#releaseModal?.();
    this.#releaseModal = undefined;
    this.#releaseScroll?.();
    this.#releaseScroll = undefined;
  }
  #cleanupSurface(): void {
    this.#pointer.reset();
    this.#openingPointerCleanup?.();
    this.#position?.destroy();
    this.#position = null;
    this.#positionTarget = null;
    this.#releaseModality();
    this.#stopScroll();
    this.#collection.typeahead.reset();
  }
  #syncForm(): void {
    const values = this.#values(this.value),
      form = new FormData();
    for (const value of values) form.append(this.effectiveName, String(value));
    this.setFormValue(
      this.effectiveDisabled
        ? null
        : this.multiple
          ? form
          : values.length
            ? String(values[0])
            : null,
      JSON.stringify(values),
    );
    const missing = this.required && !values.length;
    this.setValidity(
      missing ? { valueMissing: true } : {},
      missing ? 'Please select an option.' : '',
      this.#trigger ?? undefined,
    );
  }
  protected override resetFormValue(): void {
    this.#selection.reset();
    this.#query.state.reset();
    this.#query.completion = '';
    this.close();
    this.#syncForm();
  }
  override formStateRestoreCallback(
    state: string | File | FormData | null,
    mode: 'restore' | 'autocomplete',
  ): void {
    if (typeof state !== 'string') return;
    let values: unknown[];
    try {
      values = JSON.parse(state) as unknown[];
    } catch {
      values = [state];
    }
    if (!Array.isArray(values)) values = [values];
    if (mode === 'autocomplete')
      this.#selection.set(this.multiple ? values : (values[0] ?? null), 'input');
    else if (!this.#selection.controlled)
      this.#selection.set(this.multiple ? values : (values[0] ?? null), 'programmatic');
  }
  #autofill = (event: Event): void => {
    const value = (event.target as HTMLInputElement).value;
    const record = this.#collection.source.find((entry) => String(entry.value) === value);
    if (record && !record.disabled && !this.readOnly && !this.effectiveDisabled)
      this.#selection.set(this.multiple ? [record.value] : record.value, 'input', event);
  };
  #values(value: unknown): unknown[] {
    return this.multiple
      ? this.#collection.normalize(Array.isArray(value) ? value : value == null ? [] : [value])
      : value == null
        ? []
        : [value];
  }
  #selected(value: unknown): boolean {
    return this.#values(this.value).some((selected) => this.#collection.equal(selected, value));
  }
  #text(value: unknown): string {
    return this.itemToText?.(value) ?? (value == null ? '' : String(value));
  }
  #state(): PartState {
    return {
      open: this.open,
      searchable: this.searchable,
      inputValue: this.inputValue,
      loading: this.loading,
      value: this.value,
      multiple: this.multiple,
      disabled: this.effectiveDisabled,
      readOnly: this.readOnly,
      required: this.required,
      invalid: this.effectiveInvalid,
      presence: this.#presence.state,
    };
  }
  protected get choiceCollection() {
    return this.#collection;
  }
  protected choicePart(name: string): string {
    return name;
  }
  protected choiceState(state: PartState): PartState {
    return state;
  }
  protected optionAccessibleName(record: SelectRecord): string | undefined {
    void record;
    return undefined;
  }
  protected optionAriaSelected(record: SelectRecord): boolean {
    return this.#selected(record.value);
  }
  #part(
    name: string,
    state: PartState,
    options: PartRenderOptions,
    contract?: ComponentPartContract,
  ): unknown {
    name = this.choicePart(name);
    state = this.choiceState(state);
    options = { ...options, properties: { ...options.properties, ...selectStateMarkers(state) } };
    const actionTag = (
      {
        'select-trigger': 'tp-select-trigger',
        'select-clear': 'tp-select-clear',
        'select-chip-remove': 'tp-select-chip-remove',
      } as Record<string, string>
    )[name];
    if (actionTag && options.tag === 'tp-button') {
      const properties = { ...options.properties };
      for (const [key, handler] of Object.entries(properties))
        if (key.startsWith('@') && typeof handler === 'function')
          properties[key] = (event: Event) => {
            if (!componentHandlingPrevented(event)) handler(event);
          };
      return renderPart('select-action-host', state, undefined, {
        ...Object.fromEntries(Object.entries(options).filter(([key]) => key !== 'reference')),
        tag: actionTag,
        properties: {
          ...properties,
          '.selectState': state,
          '.selectPresentation': this.partPresentation,
          '.selectContract': { ...this.partContracts[name], ...contract },
          '.selectReference': options.reference ?? this.#ref(name, name),
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
          !(
            this.searchable &&
            ['select-trigger', 'select-clear', 'select-chip-remove'].includes(part)
          )
        )
          this.#releases.set(
            key,
            this.presentationController.registerPart(this.choicePart(part), element),
          );
        commit?.(element);
      };
      this.#refs.set(key, reference);
    }
    return reference;
  }
  #syncOuter(): void {
    let outer: HTMLElement | null = null;
    for (let node = composedParent(this); node; node = composedParent(node))
      if (
        node.nodeType === 1 &&
        (node as Element).matches(
          'tp-dialog,tp-alert-dialog,tp-popover,tp-drawer,tp-command-palette',
        )
      ) {
        outer = node as HTMLElement;
        break;
      }
    if (outer === this.#outer) return;
    this.#outer?.removeEventListener('tp-open-change', this.#outerChange);
    this.#outer = outer;
    outer?.addEventListener('tp-open-change', this.#outerChange);
  }
  readonly #outerChange = (event: Event): void => {
    if (event.target !== this.#outer) return;
    queueMicrotask(() => {
      if (
        !(event as TpSurfaceOpenChangeEvent).defaultPrevented &&
        !(this.#outer as HTMLElement & { open?: boolean })?.open
      )
        this.#query.resetTransient(event);
    });
  };
  #diagnose(message: string): void {
    if (this.#diagnostics.has(message)) return;
    this.#diagnostics.add(message);
    this.dispatchEvent(
      new CustomEvent('tp-diagnostic', {
        detail: { component: 'select', message },
        bubbles: true,
        composed: true,
      }),
    );
  }
}
