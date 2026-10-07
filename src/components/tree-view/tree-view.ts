import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import {
  editableTargetInPath,
  interactiveTargetInPath,
} from '../../foundation/interactive-target.js';
import { TypeaheadController } from '../../foundation/typeahead.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { VirtualList } from '../../foundation/virtual-list.js';
import { createId } from '../../foundation/id.js';
import type { ChangeReason, Direction } from '../../foundation/types.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import {
  TreeLoader,
  TreeModel,
  VisibleRows,
  applyMove,
  checkedStates,
  collapsedAncestors,
  constrainSelection,
  expandableIds,
  expandableSiblings,
  inheritSelection,
  isTypeaheadKey,
  normalizeIds,
  propagateSelection,
  rangeIds,
  toggleId,
  treeKeyAction,
  unionIds,
  validMove,
  withExpanded,
  withoutExpanded,
  type TreeAccessors,
  type TreeCheckedState,
  type TreeKeyAction,
  type TreeLoadState,
  type TreeMove,
  type TreeSelectionMode,
} from '../../foundation/tree/index.js';
import { disclosurePanelStyles } from '../../presentation/motion.js';
import { treeViewPresentation } from '../../presentation/families/tree-view.js';
import { gripVerticalIcon } from '../../icons/grip-vertical.js';
import { TpButton } from '../button.js';
import { TpIcon } from '../icon.js';
import { TpTreeItem } from './tree-item.js';
import { GROUP_EXTENT, TreeSegment } from './segments.js';
import { DEFAULT_TREE_VIEW_MESSAGES } from './messages.js';
import { TreeReorder } from './reorder.js';
import type {
  TreeItemOwner,
  TreeItemState,
  TreeViewDropTarget,
  TreeViewExpansionTrigger,
  TreeViewGuides,
  TreeViewItem,
  TreeViewLoadChildren,
  TreeViewMessages,
  TreeViewRenderItem,
  TreeViewSize,
} from './types.js';

const idListConverter = {
  fromAttribute: (value: string | null) => (value === null ? undefined : normalizeIds(value)),
  toAttribute: (value: readonly string[] | undefined) =>
    value === undefined ? null : JSON.stringify(value),
};

const ITEM_PARTS =
  'row, indent, indicator, checkbox, leading, label, trailing, handle, status, group';
/** Larger single expansions appear without motion. */
const MAX_ANIMATED_ROWS = 200;

const generatedIds = new WeakMap<Element, string>();
function elementId(element: TpTreeItem): string {
  if (element.value) return element.value;
  let id = generatedIds.get(element);
  if (!id) generatedIds.set(element, (id = createId('tp-tree-item')));
  return id;
}

const markupAccessors = (loaded: ReadonlySet<string>): TreeAccessors<TpTreeItem> => ({
  id: elementId,
  label: (element) => element.labelText,
  children: (element) => {
    const children = element.childItems;
    if (children.length || !element.hasChildren) return children;
    return loaded.has(elementId(element)) ? children : undefined;
  },
  disabled: (element) => element.disabled,
  hasChildren: (element) => element.hasChildren,
});

/**
 * A hierarchy of items that can be expanded, selected, activated, loaded on demand,
 * virtualized and reordered (`ucl20-tree-view`, Foundation §17.8 Tree).
 *
 * Supply records through `items` (records mode: virtualization and reordering available) or
 * author nested `tp-tree-item` elements (markup mode).
 *
 * @slot - Markup mode: top-level `tp-tree-item` elements.
 * @slot empty - Content shown when there are no items.
 * @csspart tree - The tree (`role="tree"`; a labelled `group` while there are no items).
 * @csspart viewport - The scroll container of the rows.
 * @csspart item - Records mode: each rendered item; its parts are exported.
 * @csspart segment - Records mode: the transient region of rows entering or leaving.
 * @csspart empty - The empty region.
 * @fires tp-value-change - Selection proposal (cancelable).
 * @fires tp-expanded-change - Expansion proposal (cancelable).
 * @fires tp-items-change - Records-mode reorder proposal (cancelable); `detail.metadata.move`.
 * @fires tp-action - An item was pressed or Enter was pressed on it (cancelable).
 * @fires tp-loading-status-change - Children loading status of an item.
 */
export class TpTreeView<T = TreeViewItem>
  extends TpFormElement<readonly string[]>
  implements TreeItemOwner
{
  static tagName = 'tp-tree-view';
  static override presentation = treeViewPresentation;
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTreeItem, TpButton, TpIcon];
  }
  static override properties = {
    ...TpFormElement.properties,
    value: { noAccessor: true, converter: idListConverter },
    defaultValue: { attribute: 'default-value', converter: idListConverter },
    expanded: { noAccessor: true, converter: idListConverter },
    defaultExpanded: { attribute: 'default-expanded', converter: idListConverter },
    items: { attribute: false, noAccessor: true },
    defaultItems: { attribute: false },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    selectionPropagation: { type: Boolean, attribute: 'selection-propagation', reflect: true },
    checkboxSelection: { type: Boolean, attribute: 'checkbox-selection', reflect: true },
    expansionTrigger: { type: String, attribute: 'expansion-trigger', reflect: true },
    loadChildren: { attribute: false },
    virtualized: { type: Boolean, reflect: true },
    itemSize: { type: Number, attribute: 'item-size' },
    overscan: { type: Number },
    reorderable: { type: Boolean, reflect: true },
    canDrop: { attribute: false },
    size: { type: String, reflect: true },
    guides: { type: String, reflect: true },
    label: { type: String },
    messages: { attribute: false },
    getItemId: { attribute: false },
    getItemLabel: { attribute: false },
    getItemChildren: { attribute: false },
    isItemDisabled: { attribute: false },
    itemHasChildren: { attribute: false },
    withItemChildren: { attribute: false },
    renderItem: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    disclosurePanelStyles("[part~='segment']", GROUP_EXTENT.block),
    css`
      :host {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
        min-block-size: 0;

        --tp-tree-view-indent: calc(var(--tp-space-2) + var(--tp-icon-size-md));
      }

      [part~='tree'] {
        display: flex;
        flex: 1 1 auto;
        flex-direction: column;
        min-block-size: 0;
        outline: none;
      }

      [part~='viewport'] {
        flex: 1 1 auto;
        min-block-size: 0;
        overflow: hidden auto;
      }

      .list {
        overflow-anchor: none;
      }

      .space {
        pointer-events: none;
      }

      .indent-probe {
        position: absolute;
        inline-size: var(--tp-tree-view-indent);
        block-size: 0;
        visibility: hidden;
        pointer-events: none;
      }

      [part~='segment'] {
        display: block;
      }

      .segment-body {
        display: flow-root;
      }
    `,
  ];

  // Lanes.
  #providedValue: readonly string[] | undefined;
  #providedExpanded: readonly string[] | undefined;
  #providedItems: readonly T[] | undefined;
  defaultValue: readonly string[] | undefined;
  defaultExpanded: readonly string[] | undefined;
  defaultItems: readonly T[] | undefined;

  selectionMode: TreeSelectionMode = 'single';
  selectionPropagation = false;
  checkboxSelection = false;
  expansionTrigger: TreeViewExpansionTrigger = 'item';
  loadChildren: TreeViewLoadChildren<T> | TreeViewLoadChildren<TpTreeItem> | null = null;
  virtualized = false;
  itemSize: number | null = null;
  overscan = 4;
  reorderable = false;
  canDrop: ((move: TreeMove) => boolean) | null = null;
  size: TreeViewSize = 'default';
  guides: TreeViewGuides = 'line';
  label: string | null = null;
  messages: TreeViewMessages = {};
  getItemId: (item: T) => string = (item) => String((item as TreeViewItem).id ?? '');
  getItemLabel: (item: T) => string = (item) =>
    String((item as TreeViewItem).label ?? (item as TreeViewItem).id ?? '');
  getItemChildren: (item: T) => readonly T[] | null | undefined = (item) =>
    (item as TreeViewItem).children as readonly T[] | null | undefined;
  isItemDisabled: (item: T) => boolean = (item) => Boolean((item as TreeViewItem).disabled);
  itemHasChildren: (item: T) => boolean = (item) => Boolean((item as TreeViewItem).hasChildren);
  /** Produces a record with new children when a reorder changes them. */
  withItemChildren: (item: T, children: T[]) => T = (item, children) =>
    ({ ...(item as object), children }) as T;
  renderItem: TreeViewRenderItem<T> | null = null;

  readonly #selection = new ControllableState<readonly string[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : normalizeIds(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onCommit: (value, previous) => {
      this.#selected = new Set(value);
      this.#checked = null;
      this.requestUpdate('value', previous);
    },
    diagnostic: (message) => this.#diagnose('value', message),
  });
  readonly #expansion = new ControllableState<readonly string[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#providedExpanded,
    readDefaultValue: () =>
      this.defaultExpanded === undefined ? undefined : normalizeIds(this.defaultExpanded),
    hasDefaultValue: () => this.defaultExpanded !== undefined,
    equals: orderedValuesEqual,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-expanded-change'),
    onCommit: (value, previous) => this.#expansionCommitted(value, previous),
    diagnostic: (message) => this.#diagnose('expanded', message),
  });
  readonly #items = new ControllableState<readonly T[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#providedItems,
    readDefaultValue: () => this.defaultItems,
    hasDefaultValue: () => this.defaultItems !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-items-change'),
    onCommit: () => this.#rebuild(),
    diagnostic: (message) => this.#diagnose('items', message),
  });

  #model: TreeModel<unknown> = TreeModel.empty();
  #elements = new Map<string, TpTreeItem>();
  #rows = new VisibleRows();
  #selected = new Set<string>();
  #expandedSet = new Set<string>();
  #checked: Map<string, TreeCheckedState> | null = null;
  #loadedRecords = new Map<string, readonly T[]>();
  #loadedMarkup = new Set<string>();
  #focusedId: string | null = null;
  /** Tab stop of the render in progress. */
  #currentTabStop: string | null = null;
  #anchorId: string | null = null;
  #transitionId: string | null = null;
  #animateToggle: string | null = null;
  #segments = new Map<string, TreeSegment>();
  #mounted = new Map<string, TpTreeItem>();
  #hadFocus = false;
  #direction: Direction = 'ltr';
  /** Set by focusin; cleared when focus leaves for elsewhere, not when the focused item is removed. */
  #focusInside = false;
  #pendingFocus: string | null = null;
  #measuredRow = 0;
  #observer: MutationObserver | null = null;
  #rebuildQueued = false;
  #diagnostics = new Set<string>();
  #announcer: LiveAnnouncer | undefined;
  readonly #typeahead = new TypeaheadController(
    750,
    () => this.closest('[lang]')?.getAttribute('lang') ?? undefined,
  );
  readonly #loader = new TreeLoader<readonly unknown[] | void>({
    onChange: (id, state) => this.#loadChanged(id, state),
    onLoad: (id, children) => this.#childrenLoaded(id, children),
  });
  readonly #virtual = new VirtualList(this, {
    list: () => this.renderRoot?.querySelector<HTMLElement>('.list') ?? null,
    // Row control height plus the separation between rows.
    estimate: () => this.itemSize ?? (this.#measuredRow || (this.size === 'sm' ? 32 : 36)),
    overscan: () => Math.max(0, Math.floor(this.overscan) || 0),
    enabled: () => this.#records && this.virtualized,
  });
  readonly #reorder: TreeReorder = new TreeReorder({
    host: this,
    enabled: () => this.reorderable && this.#records,
    blocked: () => this.effectiveDisabled || this.readOnly,
    model: () => this.#model,
    rows: () => this.#rows.ids,
    element: (id) => this.#element(id),
    messages: () => this.resolvedMessages,
    direction: () => this.direction,
    indentation: () => this.#indentation(),
    announce: (message) => this.#announce(message),
    accepts: (move) => this.#acceptsMove(move),
    commit: (move, reason, event) => this.#commitMove(move, reason, event),
    focus: (id) => this.focusItem(id),
  });
  #keysFromReorder = false;
  #formKey: unknown[] | null = null;

  constructor() {
    super();
    this.addEventListener('keydown', this.#keydown);
    this.addEventListener('focusin', this.#focusin);
    this.addEventListener('focusout', this.#focusout);
  }

  // ── Public lanes ───────────────────────────────────────────────────────────

  override get value(): readonly string[] {
    return this.#selection.value;
  }
  override set value(value: readonly string[] | undefined) {
    const previous = this.value;
    this.#providedValue = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#selection.sync();
    this.requestUpdate('value', previous);
  }

  get expanded(): readonly string[] {
    return this.#expansion.value;
  }
  set expanded(value: readonly string[] | undefined) {
    const previous = this.expanded;
    this.#providedExpanded = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#expansion.sync();
    this.requestUpdate('expanded', previous);
  }

  get items(): readonly T[] | undefined {
    return this.#records ? this.#items.value : undefined;
  }
  set items(value: readonly T[] | undefined) {
    const previous = this.items;
    this.#providedItems = value;
    if (this.hasUpdated) this.#items.sync();
    this.#rebuild();
    this.requestUpdate('items', previous);
  }

  /** `messages` merged over the defaults. */
  get resolvedMessages(): Required<TreeViewMessages> {
    return { ...DEFAULT_TREE_VIEW_MESSAGES, ...this.messages };
  }

  /** Records mode when items are supplied through `items` or `defaultItems`. */
  get #records(): boolean {
    return this.#providedItems !== undefined || this.defaultItems !== undefined;
  }

  /** Identifiers of the visible rows in order. */
  get visibleItems(): readonly string[] {
    return this.#rows.ids;
  }

  /** Children loading status of an item. */
  loadingStatus(id: string): TreeLoadState {
    return this.#loader.state(id);
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  /** Expand every known expandable item; with `load`, also load and expand descendants. */
  async expandAll(options: { load?: boolean } = {}): Promise<void> {
    this.#setExpanded(withExpanded(this.expanded, expandableIds(this.#model)), 'imperative-action');
    if (!options.load) return;
    for (let wave = 0; wave < 64; wave++) {
      await this.#loader.settled();
      await this.updateComplete;
      const more = expandableIds(this.#model).filter((id) => !this.#expandedSet.has(id));
      if (!more.length && !this.#loader.pending) return;
      if (more.length) this.#setExpanded(withExpanded(this.expanded, more), 'imperative-action');
    }
  }

  collapseAll(): void {
    this.#setExpanded([], 'imperative-action');
  }

  expandItem(id: string): void {
    this.#toggle(id, true, 'imperative-action');
  }

  collapseItem(id: string): void {
    this.#toggle(id, false, 'imperative-action');
  }

  toggleItem(id: string): void {
    this.#toggle(id, !this.#expandedSet.has(id), 'imperative-action');
  }

  selectItem(id: string): void {
    if (!this.#model.has(id)) return;
    // Multiple mode adds to the selection; single mode replaces it.
    this.#select(id, this.selectionMode === 'multiple' ? 'add' : 'replace', 'imperative-action');
  }

  deselectItem(id: string): void {
    if (!this.#selected.has(id)) return;
    this.#select(id, 'toggle-off', 'imperative-action');
  }

  selectAll(): void {
    if (this.selectionMode !== 'multiple') return;
    const ids = [...this.#model.ids()].filter((id) => !this.#model.get(id)?.disabled);
    this.#setSelection(ids, 'imperative-action');
  }

  clearSelection(): void {
    this.#setSelection([], 'imperative-action');
  }

  /** Expand the ancestors, scroll the item into view and optionally focus or select it. */
  async revealItem(id: string, options: { focus?: boolean; select?: boolean } = {}): Promise<void> {
    if (!this.#model.has(id)) return;
    const ancestors = collapsedAncestors(this.#model, this.#expandedSet, id);
    if (ancestors.length)
      this.#setExpanded(withExpanded(this.expanded, ancestors), 'imperative-action');
    await this.updateComplete;
    if (!this.#rows.has(id)) return;
    this.#scrollTo(id);
    if (options.select) this.selectItem(id);
    if (options.focus) await this.focusItem(id);
  }

  /** Move focus to a visible item, mounting it first. */
  async focusItem(id: string): Promise<void> {
    if (!this.#rows.has(id)) return;
    this.#focusedId = id;
    this.#pendingFocus = id;
    this.#scrollTo(id);
    this.requestUpdate();
    await this.updateComplete;
    this.#applyPendingFocus();
  }

  /** Discard loaded children of an item and load them again. */
  reloadChildren(id: string): void {
    this.#loadedRecords.delete(id);
    this.#loadedMarkup.delete(id);
    this.#loader.abort(id);
    this.#rebuild();
    if (this.#expandedSet.has(id)) this.#ensureLoaded([id]);
  }

  /** Propose a records-mode move. Returns whether it was accepted. */
  moveItem(id: string, target: TreeViewDropTarget): boolean {
    const node = this.#model.get(id);
    if (!node || !this.#records) return false;
    const move: TreeMove = {
      itemId: id,
      fromParentId: node.parentId,
      fromIndex: node.index,
      toParentId: target.parentId,
      toIndex: target.index,
    };
    return this.#commitMove(move, 'imperative-action');
  }

  /** One indentation step in CSS pixels. */
  #indentation(): number {
    const probe = this.renderRoot?.querySelector<HTMLElement>('.indent-probe');
    const width = probe?.getBoundingClientRect().width ?? 0;
    return width > 0 ? width : 24;
  }

  /** Validates and proposes a move through the items lane. */
  #commitMove(move: TreeMove, reason: ChangeReason, sourceEvent?: Event): boolean {
    if (!this.#acceptsMove(move)) return false;
    const next = applyMove(this.#model as TreeModel<T>, move, this.withItemChildren);
    return this.#items.set(next, reason, sourceEvent, { metadata: { move } });
  }

  /** Structural validity plus the consumer veto. */
  #acceptsMove(move: TreeMove): boolean {
    return validMove(this.#model, move) && (this.canDrop?.(move) ?? true);
  }

  // ── Item owner ─────────────────────────────────────────────────────────────

  itemConnected(item: HTMLElement): void {
    if (this.#records || !(item instanceof TpTreeItem)) return;
    this.#scheduleRebuild();
  }

  itemPress(
    item: HTMLElement,
    region: 'row' | 'indicator' | 'checkbox' | 'retry',
    event: MouseEvent,
  ): void {
    const id = this.#idOf(item);
    const node = id === null ? undefined : this.#model.get(id);
    if (!node || id === null || this.effectiveDisabled) return;
    this.#defaultAnchor();
    void this.focusItem(id);
    if (region === 'retry') {
      this.#retry(id);
      return;
    }
    if (region === 'indicator') {
      if (node.expandable && !node.disabled)
        this.#toggle(id, !this.#expandedSet.has(id), 'trigger-press', event, true);
      return;
    }
    if (region === 'checkbox') {
      if (!node.disabled) this.#select(id, 'toggle', 'item-press', event);
      return;
    }
    if (!this.#action(id, event)) return;
    if (!node.disabled) {
      const mode = event.shiftKey ? 'range' : event.ctrlKey || event.metaKey ? 'toggle' : 'press';
      this.#select(
        id,
        mode,
        'item-press',
        event,
        event.shiftKey && (event.ctrlKey || event.metaKey),
      );
    }
    if (
      this.expansionTrigger === 'item' &&
      node.expandable &&
      !node.disabled &&
      !event.shiftKey &&
      !event.ctrlKey &&
      !event.metaKey
    )
      this.#toggle(id, !this.#expandedSet.has(id), 'item-press', event, true);
    this.requestUpdate();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#records) {
      this.#observer = new (this.ownerDocument.defaultView ?? window).MutationObserver(
        (records) => {
          if (records.some((record) => this.#structural(record))) this.#scheduleRebuild();
        },
      );
      this.#observer.observe(this, {
        childList: true,
        subtree: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['value', 'label', 'disabled', 'has-children'],
      });
    }
    this.#rebuild();
    if (this.hasUpdated) this.#ensureLoaded(this.expanded);
  }

  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#loader.abortPending();
    for (const segment of this.#segments.values()) segment.destroy();
    this.#segments.clear();
    this.#reorder.disconnect();
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.hasUpdated) {
      // Defaults and controlled values apply before the first rendered state, without events.
      this.#selection.initialize();
      this.#expansion.initialize();
      this.#items.initialize();
      this.#selected = new Set(this.#selection.value);
      this.#expandedSet = new Set(this.#expansion.value);
      this.#rebuild();
      this.#initialScroll();
    }
    if (changed.has('selectionMode') && this.hasUpdated) {
      const constrained = constrainSelection(this.value, this.selectionMode);
      if (constrained.length !== this.value.length) this.#setSelection(constrained, 'programmatic');
    }
    if (
      changed.has('getItemId') ||
      changed.has('getItemLabel') ||
      changed.has('getItemChildren') ||
      changed.has('isItemDisabled') ||
      changed.has('itemHasChildren') ||
      changed.has('defaultItems')
    )
      this.#rebuild();
    this.#reorder.capture();
    const order = this.#reorder.rows;
    if (order) {
      this.#virtual.setKeys([...order]);
      this.#keysFromReorder = true;
    } else if (this.#keysFromReorder) {
      this.#virtual.setKeys(this.#rows.ids);
      this.#keysFromReorder = false;
    }
    if ((this.checkboxSelection || this.selectionPropagation) && !this.#checked)
      this.#checked = checkedStates(this.#model, this.#selected, this.selectionPropagation);
    this.#hadFocus = this.matches(':focus-within');
    this.#direction = this.direction;
  }

  protected override firstUpdated(): void {
    this.#ensureLoaded(this.expanded);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#transitionId = null;
    if (this.#records) {
      this.#mounted.clear();
      for (const element of this.renderRoot.querySelectorAll<TpTreeItem>('.list tp-tree-item')) {
        const id = element.state?.id;
        if (id === undefined || element.closest('[data-exit]')) continue;
        this.#mounted.set(id, element);
        this.#virtual.observe(id, element);
        if (!this.#measuredRow && element.offsetHeight) this.#measuredRow = element.offsetHeight;
      }
      for (const segment of this.#segments.values())
        segment.attach(
          this.renderRoot.querySelector<HTMLElement>(
            `[data-segment="${CSS.escape(segment.parentId)}"]`,
          ),
        );
    } else {
      this.#currentTabStop = this.#tabStop();
      for (const [id, element] of this.#elements) {
        element.owner = this;
        element.state = this.#state(id, false);
      }
    }
    this.#applyPendingFocus();
    if (this.#hadFocus && !this.matches(':focus-within') && this.#focusedId) {
      // A row element was re-created under focus (a motion region ended): keep focus on it.
      const element = this.#element(this.#focusedId);
      if (element) {
        element.tabIndex = 0;
        element.focus({ preventScroll: true });
      }
    }
    this.#syncForm();
    this.#reorder.sync();
    this.#reorder.animate();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>("[part~='tree']") ?? null;
  }

  protected override focusTarget(): HTMLElement | null {
    const id = this.#tabStop();
    return id === null ? null : this.#element(id);
  }

  protected resetFormValue(): void {
    this.#selection.reset();
  }

  // ── Rendering ──────────────────────────────────────────────────────────────

  protected override render() {
    this.#currentTabStop = this.#tabStop();
    const empty = this.#model.size === 0;
    const multiple = this.selectionMode === 'multiple';
    return html`<div
      part="tree"
      role=${empty ? 'group' : 'tree'}
      aria-label=${this.label || nothing}
      aria-multiselectable=${multiple && !empty ? 'true' : nothing}
      aria-disabled=${this.effectiveDisabled ? 'true' : nothing}
      aria-required=${this.required && !empty ? 'true' : nothing}
      data-size=${this.size}
    >
      <div part="viewport">
        ${
          this.#records
            ? html`<div class="list" role="none">${this.#renderRecords()}</div>`
            : html`<slot @slotchange=${this.#scheduleRebuild}></slot>`
        }
      </div>
      <div part="empty" ?hidden=${!empty}><slot name="empty"></slot></div>
      <span class="indent-probe" aria-hidden="true"></span>
      ${
        this.#reorder.enabled
          ? html`<span id="reorder-instructions" hidden
              >${this.resolvedMessages.instructions}</span
            >`
          : nothing
      }
    </div>`;
  }

  #renderRecords(): unknown {
    const order = this.#reorder.rows ?? this.#rows.ids;
    const pinned: number[] = [];
    const focused = this.#focusedId ?? this.#tabStop();
    if (focused !== null) pinned.push(order.indexOf(focused));
    // Removing the element that holds focus forces a layout in the middle of this render, which
    // clamps the scroll position; it stays mounted until focus has moved to its replacement.
    const active = this.shadowRoot?.activeElement;
    const holder = active instanceof TpTreeItem ? this.#idOf(active) : null;
    if (holder !== null && holder !== focused) pinned.push(order.indexOf(holder));
    for (const id of this.#reorder.pinnedIds()) pinned.push(order.indexOf(id));
    const slots = this.#virtual.slots(pinned);
    // Rows that belong to an entering region are grouped into it.
    const entering = new Map<string, TreeSegment>();
    for (const segment of this.#segments.values())
      if (segment.phase === 'enter') for (const id of segment.ids) entering.set(id, segment);
    type Block =
      | { kind: 'space'; key: string; extent: number }
      | { kind: 'row'; key: string; id: string }
      | { kind: 'segment'; key: string; segment: TreeSegment; ids: string[] };
    const blocks: Block[] = [];
    for (const slot of slots) {
      if (slot.kind === 'space') {
        blocks.push({ kind: 'space', key: slot.key, extent: slot.extent });
        continue;
      }
      const id = order[slot.index]!;
      const segment = entering.get(id);
      const last = blocks[blocks.length - 1];
      if (segment) {
        if (last?.kind === 'segment' && last.segment === segment) last.ids.push(id);
        else
          blocks.push({ kind: 'segment', key: `segment:${segment.parentId}`, segment, ids: [id] });
        continue;
      }
      blocks.push({ kind: 'row', key: id, id });
      const leaving = this.#segments.get(id);
      if (leaving?.phase === 'exit')
        blocks.push({
          kind: 'segment',
          key: `segment:${id}`,
          segment: leaving,
          ids: [...leaving.ids],
        });
    }
    return repeat(
      blocks,
      (block) => block.key,
      (block) => {
        if (block.kind === 'space')
          return html`<div
            class="space"
            aria-hidden="true"
            style=${`block-size:${block.extent}px`}
          ></div>`;
        if (block.kind === 'row') return this.#renderRow(block.id);
        const presence = block.segment.state;
        const exit = block.segment.phase === 'exit';
        return html`<div
          part="segment"
          role="none"
          data-segment=${block.segment.parentId}
          data-state=${presence}
          ?data-exit=${exit}
          ?inert=${exit}
          ?data-starting-style=${presence === 'starting'}
          ?data-ending-style=${presence === 'ending'}
        >
          <div class="segment-body">
            ${repeat(
              block.ids,
              (id) => id,
              (id) => this.#renderRow(id, exit),
            )}
          </div>
        </div>`;
      },
    );
  }

  #renderRow(id: string, leaving = false): TemplateResult {
    const node = this.#model.get(id);
    if (!node) return html``;
    const state = this.#state(id, true);
    const record = node.item as T;
    const content = this.renderItem
      ? this.renderItem(record, { ...state, item: record })
      : node.label;
    const handle = this.#reorder.enabled
      ? html`<tp-button
          slot="handle"
          variant="ghost"
          size="icon-xs"
          tabindex="-1"
          data-handle
          .icon=${gripVerticalIcon}
          .ariaLabel=${this.resolvedMessages.moveHandle(node.label)}
          ?disabled=${node.disabled || this.effectiveDisabled || this.readOnly}
        ></tp-button>`
      : nothing;
    const reorder = this.#reorder.enabled;
    return html`<tp-tree-item
      part="item"
      exportparts=${ITEM_PARTS}
      .owner=${this}
      .state=${leaving ? { ...state, tabStop: false } : state}
      .value=${id}
      aria-describedby=${reorder ? 'reorder-instructions' : nothing}
      aria-keyshortcuts=${reorder ? 'Control+Enter Meta+Enter' : nothing}
      >${content}${handle}</tp-tree-item
    >`;
  }

  // ── State ──────────────────────────────────────────────────────────────────

  #state(id: string, records: boolean): TreeItemState {
    const node = this.#model.get(id)!;
    const expandable = node.expandable;
    const tabStop = this.#currentTabStop;
    return {
      id,
      label: node.label,
      level: this.#reorder.levelOf(id) ?? node.depth + 1,
      setSize: this.#model.setSize(id),
      posInSet: node.index + 1,
      expandable,
      expanded: expandable && this.#expandedSet.has(id),
      selected: this.selectionMode === 'none' ? undefined : this.#selected.has(id),
      checked: this.checkboxSelection
        ? (this.#checked?.get(id) ?? this.#selected.has(id))
        : undefined,
      disabled: node.disabled || this.effectiveDisabled,
      status: this.#loader.status(id),
      tabStop: id === tabStop,
      focusable: records || tabStop === null || !this.#model.isDescendant(tabStop, id),
      records,
      reorderable: this.#reorder.enabled,
      guides: this.guides === 'none' ? 'none' : 'line',
      expansionTrigger: this.expansionTrigger,
      transition: id === this.#transitionId,
      dragging: this.#reorder.isSource(id),
      direction: this.#direction,
    };
  }

  /** Last focused visible item, else the first visible selected item, else the first enabled. */
  #tabStop(): string | null {
    if (this.#focusedId !== null && this.#rows.has(this.#focusedId)) return this.#focusedId;
    let best = -1;
    for (const id of this.#selected) {
      const index = this.#rows.indexOf(id);
      if (index >= 0 && (best < 0 || index < best)) best = index;
    }
    if (best >= 0) return this.#rows.at(best)!;
    for (const id of this.#rows.ids) if (!this.#model.get(id)?.disabled) return id;
    return this.#rows.at(0) ?? null;
  }

  #idOf(element: Element): string | null {
    if (!(element instanceof TpTreeItem)) return null;
    if (this.#records) return element.state?.id ?? null;
    const id = elementId(element);
    return this.#elements.get(id) === element ? id : null;
  }

  #element(id: string): TpTreeItem | null {
    return (this.#records ? this.#mounted.get(id) : this.#elements.get(id)) ?? null;
  }

  // ── Model ──────────────────────────────────────────────────────────────────

  #scheduleRebuild = (): void => {
    if (this.#rebuildQueued) return;
    this.#rebuildQueued = true;
    queueMicrotask(() => {
      this.#rebuildQueued = false;
      if (this.isConnected) this.#rebuild();
    });
  };

  #structural(record: MutationRecord): boolean {
    if (record.type === 'characterData') return true;
    if (record.type === 'attributes') return record.target instanceof TpTreeItem;
    return [...record.addedNodes, ...record.removedNodes].some(
      (node) => node instanceof TpTreeItem || node.nodeType === Node.TEXT_NODE,
    );
  }

  #rebuild(): void {
    if (this.#records) {
      const accessors: TreeAccessors<T> = {
        id: (item) => this.getItemId(item),
        label: (item) => this.getItemLabel(item),
        children: (item) => this.getItemChildren(item),
        disabled: (item) => this.isItemDisabled(item),
        hasChildren: (item) => this.itemHasChildren(item),
      };
      this.#model = new TreeModel<T>({
        items: this.#items.value,
        accessors,
        loaded: this.#loadedRecords,
      }) as TreeModel<unknown>;
      this.#elements.clear();
    } else {
      const top = [...this.children].filter(
        (child): child is TpTreeItem => child instanceof TpTreeItem,
      );
      const model = new TreeModel<TpTreeItem>({
        items: top,
        accessors: markupAccessors(this.#loadedMarkup),
      });
      this.#model = model as TreeModel<unknown>;
      this.#elements = new Map([...model.nodes()].map((node) => [node.id, node.item]));
    }
    for (const id of this.#model.duplicates)
      this.#diagnose(
        `duplicate:${id}`,
        `Item identifier "${id}" is used more than once; later items are excluded.`,
      );
    this.#loader.retain((id) => this.#model.has(id));
    const previousRows = this.#rows.ids;
    this.#rows.rebuild(this.#model, this.#expandedSet);
    this.#replaceFocus(previousRows);
    this.#virtual.setKeys(this.#rows.ids);
    this.#checked = null;
    // An uncontrolled selection drops identifiers whose items were removed.
    if (!this.#selection.controlled && this.hasUpdated) {
      const kept = this.value.filter((id) => this.#model.has(id));
      if (kept.length !== this.value.length) this.#selection.reconcile(kept);
    }
    for (const [id, segment] of this.#segments)
      if (!this.#model.has(id)) {
        segment.destroy();
        this.#segments.delete(id);
      }
    if (this.hasUpdated) this.#ensureLoaded(this.expanded);
    this.requestUpdate();
  }

  // ── Expansion ──────────────────────────────────────────────────────────────

  #toggle(id: string, open: boolean, reason: ChangeReason, source?: Event, animate = false): void {
    const node = this.#model.get(id);
    if (!node?.expandable) return;
    if (open && this.#loader.status(id) === 'error') {
      this.#retry(id);
      if (this.#expandedSet.has(id)) return;
    }
    if (open === this.#expandedSet.has(id)) return;
    this.#animateToggle = animate || reason === 'imperative-action' ? id : null;
    this.#setExpanded(
      open ? withExpanded(this.expanded, [id]) : withoutExpanded(this.expanded, [id]),
      reason,
      source,
    );
    this.#animateToggle = null;
  }

  #setExpanded(next: readonly string[], reason: ChangeReason, source?: Event): boolean {
    return this.#expansion.set(next, reason, source);
  }

  #expansionCommitted(value: readonly string[], previous: readonly string[]): void {
    const before = this.#expandedSet;
    this.#expandedSet = new Set(value);
    const added = value.filter((id) => !before.has(id));
    const removed = previous.filter((id) => !this.#expandedSet.has(id));
    const single = added.length + removed.length === 1 ? (added[0] ?? removed[0])! : null;
    const visible = single !== null && this.#rows.has(single);
    if (single !== null && visible) {
      const opening = added.length === 1;
      const ids = opening
        ? this.#rows.expand(this.#model, this.#expandedSet, single)
        : this.#rows.collapse(this.#model, single);
      this.#virtual.setKeys(this.#rows.ids);
      this.#transitionId = this.#animateToggle === single ? single : null;
      if (
        this.#records &&
        this.#animateToggle === single &&
        ids.length &&
        ids.length <= MAX_ANIMATED_ROWS
      )
        this.#animateSegment(single, opening, ids);
      if (!opening) this.#repairFocus(single, ids);
    } else {
      this.#rows.rebuild(this.#model, this.#expandedSet);
      this.#virtual.setKeys(this.#rows.ids);
      if (this.#focusedId && !this.#rows.has(this.#focusedId)) {
        const ancestor = this.#model.ancestors(this.#focusedId).find((id) => this.#rows.has(id));
        if (ancestor) this.#moveFocusIfFocused(ancestor);
      }
    }
    this.requestUpdate('expanded', previous);
    if (this.hasUpdated) this.#ensureLoaded(added);
  }

  #animateSegment(parentId: string, opening: boolean, ids: readonly string[]): void {
    const existing = this.#segments.get(parentId);
    const shown = opening ? ids : ids.filter((id) => this.#mounted.has(id));
    if (!shown.length) return;
    if (existing) {
      existing.reverse(opening ? 'enter' : 'exit', shown);
      return;
    }
    const level = this.#model.level(parentId);
    this.#segments.set(
      parentId,
      new TreeSegment(this, parentId, shown, opening ? 'enter' : 'exit', level, (segment) => {
        if (this.#segments.get(parentId) !== segment) return;
        this.#segments.delete(parentId);
        segment.destroy();
        this.requestUpdate();
      }),
    );
  }

  /** Collapsing an ancestor of the focused item moves focus to that ancestor. */
  #repairFocus(collapsed: string, hidden: readonly string[]): void {
    if (this.#focusedId && hidden.includes(this.#focusedId)) this.#moveFocusIfFocused(collapsed);
  }

  /**
   * A data change removed or hid the focused item: move to its nearest visible ancestor,
   * else the nearest following visible item, else the nearest preceding one.
   */
  #replaceFocus(previous: readonly string[]): void {
    const id = this.#focusedId;
    if (id === null || this.#rows.has(id)) return;
    const visible = (candidate: string) => this.#rows.has(candidate);
    const index = previous.indexOf(id);
    const next =
      this.#model.ancestors(id).find(visible) ??
      (index < 0
        ? undefined
        : (previous.slice(index + 1).find(visible) ??
          previous.slice(0, index).reverse().find(visible)));
    this.#focusedId = next ?? null;
    if (next !== undefined && this.#holdsFocus()) this.#pendingFocus = next;
  }

  /** Focus is inside the tree, or was on an item element that has since been removed. */
  #holdsFocus(): boolean {
    if (this.matches(':focus-within')) return true;
    const active = document.activeElement;
    return this.#focusInside && (active === null || active === document.body);
  }

  #moveFocusIfFocused(id: string): void {
    const hadFocus = this.matches(':focus-within');
    this.#focusedId = id;
    if (hadFocus) this.#pendingFocus = id;
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  #ensureLoaded(ids: readonly string[]): void {
    if (!this.loadChildren) return;
    for (const id of ids) {
      const node = this.#model.get(id);
      if (!node?.expandable || node.loaded || this.#loader.status(id) !== 'idle') continue;
      this.#load(id);
    }
  }

  #load(id: string): void {
    const node = this.#model.get(id);
    const loader = this.loadChildren;
    if (!node || !loader) return;
    void this.#loader.load(id, async (signal) => {
      const result = await (loader as TreeViewLoadChildren<unknown>)(node.item, { signal });
      return (result ?? undefined) as readonly unknown[] | void;
    });
  }

  #retry(id: string): void {
    this.#loader.abort(id);
    this.#load(id);
  }

  #childrenLoaded(id: string, children: readonly unknown[] | void): void {
    if (this.#records) this.#loadedRecords.set(id, (children ?? []) as readonly T[]);
    else this.#loadedMarkup.add(id);
    this.#rebuild();
    if (this.selectionPropagation && this.#selected.has(id)) {
      const next = inheritSelection(this.#model, this.value, id);
      if (next.length !== this.value.length) this.#setSelection(next, 'programmatic');
    }
  }

  #loadChanged(id: string, state: TreeLoadState): void {
    this.emit('tp-loading-status-change', {
      itemId: id,
      status: state.status,
      ...(state.error !== undefined ? { error: state.error } : {}),
    });
    const label = this.#model.get(id)?.label ?? '';
    if (state.status === 'loading')
      this.#announce(`${this.resolvedMessages.loading} ${label}`.trim(), `load:${id}`);
    if (state.status === 'error')
      this.#announce(this.resolvedMessages.loadError(label), `load:${id}`);
    this.requestUpdate();
  }

  #announce(message: string, key?: string): void {
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(message, key ? { key } : {});
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  #setSelection(next: readonly string[], reason: ChangeReason, source?: Event): boolean {
    return this.#selection.set(constrainSelection(next, this.selectionMode), reason, source);
  }

  #select(
    id: string,
    mode: 'press' | 'replace' | 'add' | 'toggle' | 'toggle-off' | 'range',
    reason: ChangeReason,
    source?: Event,
    union = false,
  ): void {
    if (this.selectionMode === 'none' || this.effectiveDisabled) return;
    if (this.readOnly && reason !== 'imperative-action') return;
    const multiple = this.selectionMode === 'multiple';
    const current = this.value;
    const propagate = multiple && this.selectionPropagation;
    if (!multiple || mode === 'replace') {
      this.#anchorId = id;
      this.#setSelection(
        propagate ? propagateSelection(this.#model, [], id, true) : [id],
        reason,
        source,
      );
      return;
    }
    if (mode === 'range') {
      const anchor =
        this.#anchorId !== null && this.#rows.has(this.#anchorId) ? this.#anchorId : id;
      const range = rangeIds(
        this.#rows.ids,
        this.#rows.indexOf(anchor),
        this.#rows.indexOf(id),
        (value) => !this.#model.get(value)?.disabled,
      );
      let next: string[] = union ? unionIds(current, range) : range;
      if (propagate)
        for (const value of range) next = propagateSelection(this.#model, next, value, true);
      this.#setSelection(next, reason, source);
      return;
    }
    const selected =
      mode === 'toggle-off' ? false : mode === 'add' ? true : !this.#selected.has(id);
    if (mode !== 'toggle' || !source || !(source as MouseEvent).ctrlKey) this.#anchorId = id;
    const next = propagate
      ? propagateSelection(this.#model, current, id, selected)
      : toggleId(current, id, selected);
    this.#setSelection(next, reason, source);
  }

  /** A range extends from the last toggled item, else from the item focused before it. */
  #defaultAnchor(): void {
    if (this.#anchorId !== null && this.#rows.has(this.#anchorId)) return;
    this.#anchorId = this.#focusedId ?? this.#tabStop();
  }

  /** Cancelable `tp-action`; returns whether the default may proceed. */
  #action(id: string, source: Event): boolean {
    const node = this.#model.get(id);
    return this.emit(
      'tp-action',
      { value: id, item: node?.item, sourceEvent: source },
      { cancelable: true },
    );
  }

  // ── Keyboard and focus ─────────────────────────────────────────────────────

  #focusout = (event: FocusEvent): void => {
    const next = event.relatedTarget;
    if (next instanceof Node && (this.contains(next) || this.renderRoot.contains(next))) return;
    const target = event.composedPath()[0] as Node | undefined;
    // Removing a focused item blurs it before it is detached; keep the record so the rebuild
    // repairs focus.
    queueMicrotask(() => {
      if (target?.isConnected !== false) this.#focusInside = false;
    });
  };

  #focusin = (event: FocusEvent): void => {
    this.#focusInside = true;
    const item = event
      .composedPath()
      .find((node): node is TpTreeItem => node instanceof TpTreeItem && this.#idOf(node) !== null);
    if (!item) return;
    const id = this.#idOf(item)!;
    if (this.#focusedId !== id) {
      this.#focusedId = id;
      this.requestUpdate();
    }
  };

  #keydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event) || event.isComposing) return;
    if (this.effectiveDisabled || this.#reorder.active) return;
    const path = event.composedPath();
    const item = path.find(
      (node): node is TpTreeItem => node instanceof TpTreeItem && this.#idOf(node) !== null,
    );
    if (!item || editableTargetInPath(event, item)) return;
    // Controls placed in an item's content own their activation keys.
    if ((event.key === 'Enter' || event.key === ' ') && interactiveTargetInPath(event, item))
      return;
    if (path[0] instanceof HTMLElement && path[0] !== item && path[0].closest?.('[data-handle]'))
      return;
    const id = this.#idOf(item)!;
    this.#focusedId = id;
    const action = treeKeyAction(event, {
      model: this.#model,
      rows: this.#rows,
      expanded: this.#expandedSet,
      focused: id,
      direction: this.direction,
      multiple: this.selectionMode === 'multiple',
    });
    if (!action) {
      if (isTypeaheadKey(event)) this.#typeaheadKey(event, id);
      else if (this.#reorder.enabled && this.#reorder.keyboardStart(event, id))
        event.preventDefault();
      return;
    }
    event.preventDefault();
    this.#perform(action, event);
  };

  #perform(action: TreeKeyAction, event: KeyboardEvent): void {
    switch (action.type) {
      case 'focus':
        if (action.extend) this.#defaultAnchor();
        void this.focusItem(action.id);
        if (action.extend) this.#select(action.id, 'range', 'keyboard', event);
        return;
      case 'expand':
        if (!this.#model.get(action.id)?.disabled)
          this.#toggle(action.id, true, 'keyboard', event, true);
        return;
      case 'collapse':
        if (!this.#model.get(action.id)?.disabled)
          this.#toggle(action.id, false, 'keyboard', event, true);
        return;
      case 'expand-siblings': {
        const siblings = expandableSiblings(this.#model, action.id).filter(
          (id) => !this.#model.get(id)?.disabled,
        );
        this.#setExpanded(withExpanded(this.expanded, siblings), 'keyboard', event);
        return;
      }
      case 'activate':
        if (!this.#action(action.id, event)) return;
        if (this.#loader.status(action.id) === 'error') this.#retry(action.id);
        if (this.selectionMode === 'single' && !this.#model.get(action.id)?.disabled)
          this.#select(action.id, 'replace', 'keyboard', event);
        return;
      case 'toggle':
        if (this.#model.get(action.id)?.disabled) return;
        this.#select(
          action.id,
          this.selectionMode === 'multiple' ? 'toggle' : 'replace',
          'keyboard',
          event,
        );
        return;
      case 'select-range':
        this.#select(action.id, 'range', 'keyboard', event);
        return;
      case 'select-to-edge': {
        const from = this.#focusedId ?? action.id;
        const range = rangeIds(
          this.#rows.ids,
          this.#rows.indexOf(from),
          this.#rows.indexOf(action.id),
          (id) => !this.#model.get(id)?.disabled,
        );
        this.#setSelection(unionIds(this.value, range), 'keyboard', event);
        void this.focusItem(action.id);
        return;
      }
      case 'select-all':
        this.#setSelection(
          this.#rows.ids.filter((id) => !this.#model.get(id)?.disabled),
          'keyboard',
          event,
        );
        return;
    }
  }

  #typeaheadKey(event: KeyboardEvent, focused: string): void {
    const rows = this.#rows.ids;
    const index = this.#typeahead.search(
      rows.map((id) => ({ value: id, label: this.#model.get(id)?.label ?? null })),
      event.key,
      rows.indexOf(focused),
    );
    if (index < 0) return;
    event.preventDefault();
    void this.focusItem(rows[index]!);
  }

  #scrollTo(id: string): void {
    const index = this.#rows.indexOf(id);
    if (index < 0) return;
    if (this.#virtual.enabled) this.#virtual.scrollToIndex(index);
    else this.#element(id)?.rowElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  #applyPendingFocus(): void {
    const id = this.#pendingFocus;
    if (id === null) return;
    const element = this.#element(id);
    if (!element) return;
    this.#pendingFocus = null;
    // Rows mounted by this render have no extent until they render themselves; focusing forces
    // layout, which would clamp a virtual scroll position set for the full extent.
    const rows = this.#records ? this.#mounted.values() : this.#elements.values();
    const pending = [...rows].filter((row) => !row.hasUpdated);
    if (pending.length) {
      void Promise.all(pending.map((row) => row.updateComplete)).then(() => {
        if (this.#focusedId === id && element.isConnected) this.#focusRow(element);
      });
      return;
    }
    this.#focusRow(element);
  }

  #focusRow(element: TpTreeItem): void {
    // The item's own reflection runs in its update; make it focusable now.
    element.tabIndex = 0;
    element.focus({ preventScroll: this.#virtual.enabled });
    if (!this.#virtual.enabled)
      element.rowElement?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // Release the previous focus holder kept mounted by the render.
    else this.requestUpdate();
  }

  #initialScroll(): void {
    if (!this.#virtual.enabled) return;
    const target = this.#tabStop();
    if (target === null) return;
    void this.updateComplete.then(() => {
      const index = this.#rows.indexOf(target);
      if (index > 0) this.#virtual.scrollToIndex(index, 'center');
    });
  }

  // ── Forms ──────────────────────────────────────────────────────────────────

  #syncForm(): void {
    const key = [
      this.effectiveName,
      this.required,
      this.effectiveDisabled,
      this.value,
      this.#model,
    ];
    if (this.#formKey && key.every((part, index) => Object.is(part, this.#formKey![index]))) return;
    this.#formKey = key;
    const name = this.effectiveName;
    const ordered = this.#ordered(this.value);
    if (name && ordered.length) {
      const data = new FormData();
      for (const id of ordered) data.append(name, id);
      this.setFormValue(data);
    } else this.setFormValue(null);
    const tree = this.associationTarget() ?? undefined;
    if (this.required && !this.value.length)
      this.setValidity({ valueMissing: true }, 'Select an item.', tree);
    else this.setValidity({});
  }

  /** Selected identifiers in logical (depth-first) order; unknown ones last. */
  #ordered(ids: readonly string[]): string[] {
    if (ids.length < 2) return [...ids];
    const position = new Map<string, number>();
    let index = 0;
    const stack = [...this.#model.roots].reverse();
    while (stack.length) {
      const id = stack.pop()!;
      position.set(id, index++);
      const children = this.#model.get(id)?.children ?? [];
      for (let child = children.length - 1; child >= 0; child--) stack.push(children[child]!);
    }
    return [...ids].sort((a, b) => (position.get(a) ?? Infinity) - (position.get(b) ?? Infinity));
  }

  #diagnose(code: string, message: string): void {
    if (this.#diagnostics.has(code)) return;
    this.#diagnostics.add(code);
    this.emit('tp-diagnostic', { code: `tree-view-${code}`, message });
  }
}
