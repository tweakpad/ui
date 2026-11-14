import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import {
  editableTargetInPath,
  interactiveTargetInPath,
} from '../../foundation/interactive-target.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { normalizeIds } from '../../foundation/tree/selection.js';
import type { TreeMove } from '../../foundation/tree/projection.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { setPartComposition } from '../../presentation/controller.js';
import { layersPresentation } from '../../presentation/families/layers.js';
import { TpTreeView } from '../../components/tree-view/tree-view.js';
import { TpTreeItem } from '../../components/tree-view/tree-item.js';
import type {
  TreeViewDragActivation,
  TreeViewDropIndicator,
  TreeViewRenderContext,
  TreeViewSize,
} from '../../components/tree-view/types.js';
import { TpButton } from '../../components/button/button.js';
import { TpInput } from '../../components/input/input.js';
import { TpIcon } from '../../components/icon/icon.js';
import {
  LayerIndex,
  activeAfterRemoval,
  activeAfterSelection,
  copyLayer,
  defaultCreateId,
  dropLocation,
  existingIds,
  groupLayers,
  insertLayers,
  isGroup,
  moveLayers,
  dimmedIds,
  ENABLED_STATE,
  currentValue,
  isEnabled,
  layerState,
  nextValue,
  orderedIds,
  placeCopies,
  removeLayers,
  stepLocation,
  topmostIds,
  ungroupLayers,
  updateLayers,
  withState,
} from './model.js';
import { resolveLayersMessages, type ResolvedLayersMessages } from './strings.js';
import { LAYER_DECLARATION_CHANGE, TpLayer, TpLayerState, TpLayerStateValue } from './layer.js';
import { declaresLayers, readLayers, sameLayers, writeLayers } from './markup.js';
import { layersStyles } from './styles.js';
import type {
  Layer,
  LayerLocation,
  LayerRowState,
  LayerState,
  LayersChange,
  LayersCreateId,
  LayersMessages,
  LayersMove,
  LayersRenderLayer,
} from './types.js';

const idListConverter = {
  fromAttribute: (value: string | null) => (value === null ? undefined : normalizeIds(value)),
  toAttribute: (value: readonly string[] | undefined) =>
    value === undefined ? null : JSON.stringify(value),
};

/** Events of the nested Tree view, Toggles and Inputs that stop at the widget. */
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-expanded-change',
  'tp-items-change',
  'tp-action',
  'tp-loading-status-change',
] as const;

/** The detail of `tp-layers-change`: the proposed records, with what changed in `metadata.change`. */
export type LayersChangeDetail<D = unknown> = TpValueChangeEvent<readonly Layer<D>[]>['detail'] & {
  metadata: { change: LayersChange<D> };
};

/**
 * A stack of layers people select, reorder, rename and change the states of, as in an image or
 * design editor. Layers are declared as `tp-layer` children, which the stack keeps in step with
 * every edit, or passed as records. Layers can be grouped; several can be selected at once, and
 * one of them is the active layer an app's properties follow. Every change is a cancelable
 * proposal, so the app decides what the order, the states and the selection mean.
 *
 * @slot - `tp-layer` children declaring the layers.
 * @slot header - Controls at the start of the bar above the list, such as an opacity field for the
 * active layer.
 * @slot header-end - Controls at the end of the bar above the list, such as a lock toggle.
 * @slot footer - Controls at the start of the bar below the list, such as an add menu.
 * @slot footer-end - Controls at the end of the bar below the list, such as a remove button.
 * @slot empty - Shown in the list's place while the stack has no layers.
 * @fires tp-layers-change - Cancelable proposal of the new records; `detail.metadata.change` says
 * what changed (`move`, `rename`, `state`, `add`, `duplicate`, `remove`, `group` or `ungroup`).
 * @fires tp-value-change - Cancelable proposal of the selected ids, in stack order.
 * @fires tp-value-commit - After the selection changes.
 * @fires tp-active-change - Cancelable proposal of the active layer's id, or null.
 * @fires tp-expanded-change - Cancelable proposal of the expanded groups' ids.
 */
export class TpLayers extends TpElement {
  static tagName = 'tp-layers';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpTreeView,
      TpTreeItem,
      TpButton,
      TpInput,
      TpIcon,
      TpLayer,
      TpLayerState,
      TpLayerStateValue,
    ];
  }
  static override presentation = layersPresentation;
  static override properties = {
    ...TpElement.properties,
    layers: { attribute: false, noAccessor: true },
    defaultLayers: { attribute: false },
    value: { noAccessor: true, converter: idListConverter },
    defaultValue: { attribute: 'default-value', converter: idListConverter },
    active: { noAccessor: true },
    defaultActive: { attribute: 'default-active' },
    expanded: { noAccessor: true, converter: idListConverter },
    defaultExpanded: { attribute: 'default-expanded', converter: idListConverter },
    canReorder: { type: Boolean, attribute: 'can-reorder', converter: defaultTrue },
    canRename: { type: Boolean, attribute: 'can-rename', reflect: true },
    canRemove: { type: Boolean, attribute: 'can-remove', reflect: true },
    canDrop: { attribute: false },
    dragActivation: { type: String, attribute: 'drag-activation', reflect: true },
    dropIndicator: { type: String, attribute: 'drop-indicator', reflect: true },
    size: { type: String, reflect: true },
    label: { type: String },
    messages: { attribute: false },
    renderLayer: { attribute: false },
    createLayerId: { attribute: false },
    onLayersChange: { attribute: false },
    onValueChange: { attribute: false },
    onActiveChange: { attribute: false },
    onExpandedChange: { attribute: false },
  };
  static override styles = [TpElement.styles, layersStyles];

  /** The records the stack starts from, when it owns them and has no `tp-layer` children. */
  defaultLayers: readonly Layer[] | undefined;
  /** The ids selected at first render, when the page does not own `value`. */
  defaultValue: readonly string[] | undefined;
  /** The active layer at first render, when the page does not own `active`. */
  defaultActive: string | null | undefined;
  /** The groups expanded at first render, when the page does not own `expanded`. */
  defaultExpanded: readonly string[] | undefined;
  /** Lets people drag layers, or move them with the keyboard, to a new place or group. */
  canReorder = true;
  /** Lets people rename a layer with a double-click or F2; a layer's own `can-rename` overrides it. */
  canRename = false;
  /** Lets people remove the selected layers with Delete or Backspace; a layer's own `can-remove` overrides it. */
  canRemove = false;
  /** Vetoes a move before the tree offers it; layers can only go into groups either way. */
  canDrop: ((move: LayersMove) => boolean) | null = null;
  /**
   * Where a drag starts: anywhere on the row, or only on its handle. Presses on a row's state
   * controls, its rename field and a group's chevron never start one.
   */
  dragActivation: TreeViewDragActivation = 'item';
  /**
   * How a drag shows where the layers land: a line between rows marks the place while the rows
   * stay still, or the rows make space. Holding the pointer over the middle of a group drops into
   * it, as its last layer.
   */
  dropIndicator: TreeViewDropIndicator = 'line';
  /** The row height: `sm` for dense panels. */
  size: TreeViewSize = 'default';
  /** The accessible name of the list. */
  label = 'Layers';
  /** User-facing text, including the tree's reorder announcements; English by default. */
  messages: LayersMessages | undefined;
  /** Replaces a row's leading content (the icon), for example with a thumbnail. */
  renderLayer: LayersRenderLayer | null = null;
  /** Supplies the ids of duplicated layers and new groups; the default never reuses an id. */
  createLayerId: LayersCreateId | null = null;
  /** Called with each proposed set of records before it commits; the event's `metadata.change` says what changed. */
  onLayersChange: ((event: TpValueChangeEvent<readonly Layer[]>) => void) | undefined;
  /** Called with each proposed selection before it commits. */
  onValueChange: ((event: TpValueChangeEvent<readonly string[]>) => void) | undefined;
  /** Called with each proposed active layer before it commits. */
  onActiveChange: ((event: TpValueChangeEvent<string | null>) => void) | undefined;
  /** Called with each proposed set of expanded groups before it commits. */
  onExpandedChange: ((event: TpValueChangeEvent<readonly string[]>) => void) | undefined;

  #providedLayers: readonly Layer[] | undefined;
  #providedValue: readonly string[] | undefined;
  #providedActive: string | null | undefined;
  #providedExpanded: readonly string[] | undefined;
  #renaming: string | null = null;
  #index: LayerIndex | null = null;
  #dimmed: Set<string> | null = null;
  /** The layers the `tp-layer` children declared at first render, which the stack starts from. */
  #markupLayers: readonly Layer[] | undefined;
  /** Whether the layers come from `tp-layer` children, which then mirror every edit. */
  #markup = false;
  #writing = false;
  #observer: MutationObserver | null = null;
  #generatedIds = 0;
  /** Registered row parts by reference key, with the layer each belongs to. */
  #partKeys = new Map<string, string>();
  #announcer: LiveAnnouncer | undefined;
  #filledSlots = new Set<string>();

  readonly #layers = new ControllableState<readonly Layer[]>({
    host: this,
    onChange: (event) => this.onLayersChange?.(event),
    initialValue: [],
    readControlledValue: () => this.#providedLayers,
    readDefaultValue: () => this.#markupLayers ?? this.defaultLayers,
    hasDefaultValue: () => this.#markupLayers !== undefined || this.defaultLayers !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-layers-change'),
    onCommit: (value) => {
      this.#index = null;
      this.#dimmed = null;
      this.#writeMarkup(value);
      this.#dropStaleParts();
      this.requestUpdate();
    },
    diagnostic: (message) => this.diagnose('layers', message, { once: true }),
  });
  readonly #selection = new ControllableState<readonly string[]>({
    host: this,
    onChange: (event) => this.onValueChange?.(event),
    initialValue: [],
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onCommit: (value, previous, reason) => {
      this.requestUpdate('value', previous);
      // A selection change is discrete, so it settles as soon as it commits.
      this.dispatchEvent(new TpValueCommitEvent(value, previous, reason));
    },
    diagnostic: (message) => this.diagnose('value', message, { once: true }),
  });
  readonly #active = new ControllableState<string | null>({
    host: this,
    onChange: (event) => this.onActiveChange?.(event),
    initialValue: null,
    readControlledValue: () => this.#providedActive,
    readDefaultValue: () => this.defaultActive,
    hasDefaultValue: () => this.defaultActive !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-active-change'),
    onCommit: (_value, previous) => this.requestUpdate('active', previous),
    diagnostic: (message) => this.diagnose('active', message, { once: true }),
  });
  readonly #expansion = new ControllableState<readonly string[]>({
    host: this,
    onChange: (event) => this.onExpandedChange?.(event),
    initialValue: [],
    readControlledValue: () => this.#providedExpanded,
    readDefaultValue: () => this.defaultExpanded,
    hasDefaultValue: () => this.defaultExpanded !== undefined,
    equals: orderedValuesEqual,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-expanded-change'),
    onCommit: (_value, previous) => this.requestUpdate('expanded', previous),
    diagnostic: (message) => this.diagnose('expanded', message, { once: true }),
  });

  constructor() {
    super();
    // Nested constituent events stop at this shadow root; the widget republishes its own lanes.
    containNestedEvents(this, { types: NESTED_EVENT_TYPES, on: 'root' });
  }

  // ── Lanes ──────────────────────────────────────────────────────────────────

  /** The layers, top first; set it to control them, then publish each accepted proposal back. */
  get layers(): readonly Layer[] {
    return this.#layers.value;
  }
  set layers(value: readonly Layer[] | undefined) {
    const previous = this.layers;
    this.#providedLayers = value;
    if (this.hasUpdated) this.#layers.sync();
    this.requestUpdate('layers', previous);
  }

  /** The selected ids; set it to control the selection, then publish each accepted proposal back. */
  get value(): readonly string[] {
    return this.#selection.value;
  }
  set value(value: readonly string[] | undefined) {
    const previous = this.value;
    this.#providedValue = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#selection.sync();
    this.requestUpdate('value', previous);
  }

  /**
   * The id of the active layer, the one an app's properties follow; null when nothing is selected.
   * Set it to control it, then publish each accepted proposal back.
   */
  get active(): string | null {
    return this.#active.value;
  }
  set active(value: string | null | undefined) {
    const previous = this.active;
    this.#providedActive = value;
    if (this.hasUpdated) this.#active.sync();
    this.requestUpdate('active', previous);
  }

  /** The expanded groups' ids; set it to control them, then publish each accepted proposal back. */
  get expanded(): readonly string[] {
    return this.#expansion.value;
  }
  set expanded(value: readonly string[] | undefined) {
    const previous = this.expanded;
    this.#providedExpanded = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#expansion.sync();
    this.requestUpdate('expanded', previous);
  }

  // ── Reading ────────────────────────────────────────────────────────────────

  get #stack(): LayerIndex {
    if (!this.#index || this.#index.layers !== this.layers) {
      this.#index = new LayerIndex(this.layers);
      this.#dimmed = null;
    }
    return this.#index;
  }

  get #dimmedIds(): Set<string> {
    this.#dimmed ??= dimmedIds(this.#stack);
    return this.#dimmed;
  }

  get #messages(): ResolvedLayersMessages {
    return resolveLayersMessages(this.messages);
  }

  /** A layer, its parent group's id (null at the top level) and its index among its siblings. */
  getLayer(id: string): { layer: Layer; parentId: string | null; index: number } | null {
    const entry = this.#stack.get(id);
    return entry ? { layer: entry.layer, parentId: entry.parentId, index: entry.index } : null;
  }

  /**
   * A layer's current value of a state, or undefined when the layer does not have it; `enabled`
   * is `'true'` unless the layer sets it.
   */
  getLayerState(id: string, name: string): string | undefined {
    const layer = this.#stack.get(id)?.layer;
    if (!layer) return undefined;
    if (name === ENABLED_STATE) return isEnabled(layer) ? 'true' : 'false';
    return layerState(layer, name)?.value;
  }

  /** Whether people may do something to a layer: the stack allows it and the layer is enabled. */
  #flag(layer: Layer, flag: 'canReorder' | 'canRename' | 'canRemove'): boolean {
    if (!isEnabled(layer)) return false;
    return flag === 'canReorder' ? this.canReorder : (layer[flag] ?? this[flag]);
  }

  /** Ids in use: the stack's and, for a declared stack, every element id in the document. */
  #taken(): { has(id: string): boolean; add(id: string): void } {
    const ids = new Set(this.#stack.ids);
    return {
      has: (id) => ids.has(id) || (this.#markup && this.ownerDocument.getElementById(id) !== null),
      add: (id) => void ids.add(id),
    };
  }

  get #editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  // ── Methods ────────────────────────────────────────────────────────────────

  /**
   * Adds a layer, by default above the active one in its group (or at the top), and selects it.
   * Returns whether the change was accepted.
   */
  addLayer(
    layer: Layer,
    options: { parentId?: string | null; index?: number; select?: boolean } = {},
  ): boolean {
    const stack = this.#stack;
    if (stack.has(layer.id)) {
      this.diagnose('layer-id', `A layer with the id "${layer.id}" is already in the stack.`);
      return false;
    }
    const anchor = this.active === null ? undefined : stack.get(this.active);
    const parentId = options.parentId !== undefined ? options.parentId : (anchor?.parentId ?? null);
    const index = options.index ?? (anchor && anchor.parentId === parentId ? anchor.index : 0);
    const change: LayersChange = { action: 'add', layers: [layer], parentId, index };
    const next = insertLayers(this.layers, [layer], parentId, index);
    const select = options.select ?? true;
    return this.#commit(
      next,
      change,
      'imperative-action',
      undefined,
      select ? [layer.id] : undefined,
      select ? layer.id : undefined,
    );
  }

  /** Removes layers (by default the selection) that can be removed, and everything inside them. */
  removeLayers(ids: readonly string[] = this.value): boolean {
    return this.#remove(ids, 'imperative-action');
  }

  /** Duplicates layers (by default the selection), each copy above its source, and selects the copies. */
  duplicateLayers(ids: readonly string[] = this.value): boolean {
    const stack = this.#stack;
    const sources = topmostIds(stack, ids);
    if (!sources.length) return false;
    const taken = this.#taken();
    const createId = this.createLayerId ?? (defaultCreateId as LayersCreateId);
    const suffix = this.#messages.copySuffix;
    const copies = new Map(
      sources.map((id) => [id, copyLayer(stack.get(id)!.layer, createId, taken, suffix)]),
    );
    const layers = sources.map((id) => copies.get(id)!);
    const next = placeCopies(this.layers, copies);
    const active =
      this.active !== null && copies.has(this.active) ? copies.get(this.active)!.id : layers[0]!.id;
    return this.#commit(
      next,
      { action: 'duplicate', ids: sources, layers },
      'imperative-action',
      undefined,
      layers.map((layer) => layer.id),
      active,
    );
  }

  /** Moves layers, in their stack order, into a group (null for the top level) at an index. */
  moveLayers(ids: readonly string[], location: LayerLocation): boolean {
    return this.#move(ids, location, 'imperative-action');
  }

  /** Wraps layers (by default the selection) in a new group, which becomes the active layer. */
  groupLayers(ids: readonly string[] = this.value, group?: Partial<Layer>): boolean {
    const stack = this.#stack;
    const members = topmostIds(stack, ids);
    if (!members.length) return false;
    const createId = this.createLayerId ?? (defaultCreateId as LayersCreateId);
    const record: Layer = {
      ...group,
      id: group?.id ?? createId(null, this.#taken()),
      label: group?.label ?? this.#messages.groupLabel,
      children: group?.children ?? [],
    };
    const next = groupLayers(stack, members, record);
    if (!next) return false;
    return this.#commit(
      next,
      { action: 'group', group: record, ids: members },
      'imperative-action',
      undefined,
      [record.id],
      record.id,
    );
  }

  /** Replaces groups (by default the selected ones) by their layers, which become selected. */
  ungroupLayers(ids: readonly string[] = this.value): boolean {
    const stack = this.#stack;
    const groups = orderedIds(stack, ids).filter((id) => isGroup(stack.get(id)!.layer));
    const next = ungroupLayers(stack, groups);
    if (!next) return false;
    const members = groups.flatMap((id) => (stack.get(id)!.layer.children ?? []).map((l) => l.id));
    const active =
      this.active !== null && groups.includes(this.active) ? (members[0] ?? null) : this.active;
    return this.#commit(
      next,
      { action: 'ungroup', ids: groups },
      'imperative-action',
      undefined,
      members,
      active,
    );
  }

  /**
   * Selects layers, in stack order, and makes one of them active: `active` when it is among them,
   * else the active layer when it stays selected, else the nearest selected layer.
   */
  selectLayers(ids: readonly string[], active?: string | null): boolean {
    const stack = this.#stack;
    const value = orderedIds(stack, ids);
    const next = activeAfterSelection(stack, value, this.active, active ?? null);
    return this.#select(value, next, 'imperative-action');
  }

  /**
   * Sets a state of layers to one of its values, for example to hide them. Layers without the
   * state are left alone, except for `enabled`, which every layer has.
   */
  setLayerState(ids: readonly string[], name: string, value: string): boolean {
    return this.#setState(ids, name, value, 'imperative-action');
  }

  /** Starts renaming a layer (by default the active one) in its row, when it can be renamed. */
  async renameLayer(id: string | null = this.active): Promise<void> {
    const layer = id === null ? undefined : this.#stack.get(id)?.layer;
    if (!layer || !this.#editable || !this.#flag(layer, 'canRename')) return;
    await this.revealLayer(layer.id);
    this.#renaming = layer.id;
    this.#refreshRows();
    await this.#tree?.updateComplete;
    const input = this.#tree?.renderRoot.querySelector<TpInput>('tp-input[data-layer-rename]');
    await input?.updateComplete;
    const field = input?.querySelector('input') ?? input?.renderRoot.querySelector('input');
    field?.focus();
    field?.select();
  }

  /** Expands the groups around a layer and scrolls it into view. */
  async revealLayer(id: string): Promise<void> {
    await this.#tree?.revealItem(id);
  }

  /** Moves keyboard focus to a layer's row. */
  async focusLayer(id: string): Promise<void> {
    await this.#tree?.focusItem(id);
  }

  // ── Proposals ──────────────────────────────────────────────────────────────

  /**
   * Proposes new records, and with them the selection and the active layer when given, as one
   * transaction: every lane changes or none does.
   */
  #commit(
    next: readonly Layer[],
    change: LayersChange,
    reason: ChangeReason,
    source?: Event,
    value?: readonly string[],
    active?: string | null,
  ): boolean {
    const proposals = [this.#layers.proposal(next, reason, source, { metadata: { change } })];
    if (value !== undefined) proposals.push(this.#selection.proposal(value, reason, source));
    if (active !== undefined) proposals.push(this.#active.proposal(active, reason, source));
    return ControllableState.transaction(proposals);
  }

  #select(
    value: readonly string[],
    active: string | null,
    reason: ChangeReason,
    source?: Event,
  ): boolean {
    return ControllableState.transaction([
      this.#selection.proposal(value, reason, source),
      this.#active.proposal(active, reason, source),
    ]);
  }

  #remove(ids: readonly string[], reason: ChangeReason, source?: Event): boolean {
    const stack = this.#stack;
    const removed = topmostIds(stack, ids).filter((id) =>
      this.#flag(stack.get(id)!.layer, 'canRemove'),
    );
    if (!removed.length) return false;
    const next = removeLayers(this.layers, removed);
    const after = new LayerIndex(next);
    const kept = this.value.filter((id) => after.has(id));
    const fallback = activeAfterRemoval(stack, removed, this.active);
    const value = kept.length ? kept : fallback === null ? [] : [fallback];
    const active = activeAfterSelection(
      after,
      value,
      this.active !== null && after.has(this.active) ? this.active : fallback,
      null,
    );
    return this.#commit(next, { action: 'remove', ids: removed }, reason, source, value, active);
  }

  #move(
    ids: readonly string[],
    location: LayerLocation,
    reason: ChangeReason,
    source?: Event,
  ): boolean {
    const stack = this.#stack;
    const moving = topmostIds(stack, ids);
    const next = moveLayers(stack, moving, location.parentId, location.index);
    if (!next) return false;
    const change: LayersChange = { action: 'move', ids: moving, ...location };
    const accepted = this.#commit(next, change, reason, source);
    if (accepted && moving.length > 1 && reason !== 'imperative-action') {
      this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
      this.#announcer.announce(this.#messages.movedLayers(moving.length));
    }
    return accepted;
  }

  #setState(
    ids: readonly string[],
    name: string,
    value: string,
    reason: ChangeReason,
    source?: Event,
  ): boolean {
    const stack = this.#stack;
    const targets = orderedIds(stack, ids).filter((id) => {
      const layer = stack.get(id)!.layer;
      if (name === ENABLED_STATE && !layerState(layer, name))
        return (value === 'false') === isEnabled(layer);
      const state = layerState(layer, name);
      return state !== undefined && state.value !== value;
    });
    if (!targets.length) return false;
    const next = updateLayers(this.layers, targets, (layer) => withState(layer, name, value));
    return this.#commit(next, { action: 'state', ids: targets, name, value }, reason, source);
  }

  #rename(id: string, label: string, source?: Event): boolean {
    const layer = this.#stack.get(id)?.layer;
    const trimmed = label.trim();
    if (!layer || !trimmed || trimmed === layer.label) return false;
    const next = updateLayers(this.layers, [id], (current) => ({ ...current, label: trimmed }));
    return this.#commit(
      next,
      { action: 'rename', id, label: trimmed, previous: layer.label },
      source instanceof KeyboardEvent ? 'keyboard' : 'input-blur',
      source,
    );
  }

  // ── Tree events ────────────────────────────────────────────────────────────

  get #tree(): TpTreeView<Layer> | null {
    return this.renderRoot?.querySelector<TpTreeView<Layer>>('tp-tree-view') ?? null;
  }

  /** Only the tree's own proposals; a nested Toggle or Input stops its own. */
  #fromTree(event: Event): boolean {
    return event.composedPath()[0] === event.currentTarget;
  }

  #onTreeValue = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#fromTree(event)) return;
    const value = orderedIds(this.#stack, event.detail.value);
    const item = (event.detail.metadata?.['item'] ?? null) as string | null;
    const active = activeAfterSelection(this.#stack, value, this.active, item);
    this.#select(value, active, event.detail.reason, event.detail.sourceEvent);
  };

  #onTreeExpanded = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#fromTree(event)) return;
    this.#expansion.set(event.detail.value, event.detail.reason, event.detail.sourceEvent);
  };

  #onTreeItems = (event: TpValueChangeEvent<readonly Layer[]>): void => {
    if (!this.#fromTree(event)) return;
    const move = event.detail.metadata?.['move'] as TreeMove | undefined;
    if (!move) return;
    const stack = this.#stack;
    // A drag of a selected layer takes the rest of the selection with it.
    const together =
      this.value.includes(move.itemId) && this.value.length > 1
        ? topmostIds(stack, this.value).filter((id) =>
            this.#flag(stack.get(id)!.layer, 'canReorder'),
          )
        : [move.itemId];
    const location =
      together.length > 1
        ? dropLocation(stack, move, together)
        : { parentId: move.toParentId, index: move.toIndex };
    this.#move(together, location, event.detail.reason, event.detail.sourceEvent);
  };

  /** Layers only go into groups, and a fixed layer stays where it is. */
  #treeCanDrop = (move: TreeMove): boolean => {
    const stack = this.#stack;
    const layer = stack.get(move.itemId)?.layer;
    if (!layer || !this.#flag(layer, 'canReorder')) return false;
    if (move.toParentId !== null) {
      const parent = stack.get(move.toParentId)?.layer;
      if (!parent || !isGroup(parent)) return false;
    }
    return this.canDrop?.(move) ?? true;
  };

  #itemOf(event: Event): string | null {
    for (const node of event.composedPath())
      if (node instanceof TpTreeItem) return typeof node.value === 'string' ? node.value : null;
    return null;
  }

  #onTreeKeydown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || !this.#editable) return;
    if (editableTargetInPath(event, this.#tree)) return;
    const id = this.#itemOf(event);
    if (id === null) return;
    const stack = this.#stack;
    const layer = stack.get(id)?.layer;
    if (!layer) return;
    const command = event.ctrlKey || event.metaKey;
    const targets = this.value.includes(id) ? this.value : [id];
    if (event.key === 'F2' && !command && !event.altKey && !event.shiftKey) {
      if (!this.#flag(layer, 'canRename')) return;
      event.preventDefault();
      void this.renameLayer(id);
    } else if ((event.key === 'Delete' || event.key === 'Backspace') && !command && !event.altKey) {
      event.preventDefault();
      this.#remove(targets, 'keyboard', event);
    } else if (
      event.altKey &&
      !command &&
      !event.shiftKey &&
      (event.key === 'ArrowUp' || event.key === 'ArrowDown')
    ) {
      event.preventDefault();
      const moving = topmostIds(stack, targets).filter((target) =>
        this.#flag(stack.get(target)!.layer, 'canReorder'),
      );
      const location = stepLocation(stack, moving, event.key === 'ArrowUp' ? -1 : 1);
      if (!location) return;
      if (
        moving.some(
          (target) =>
            !this.#treeCanDrop({
              itemId: target,
              fromParentId: stack.get(target)!.parentId,
              fromIndex: stack.get(target)!.index,
              toParentId: location.parentId,
              toIndex: location.index,
            }),
        )
      )
        return;
      if (this.#move(moving, location, 'keyboard', event)) void this.focusLayer(id);
    }
  };

  #onTreeDoubleClick = (event: MouseEvent): void => {
    if (!this.#editable) return;
    const tree = this.#tree;
    const id = this.#itemOf(event);
    if (!tree || id === null || this.#renaming === id) return;
    const item = event.composedPath().find((node) => node instanceof TpTreeItem) as Element;
    if (interactiveTargetInPath(event, item)) return;
    const path = event.composedPath();
    if (path.some((node) => node instanceof HTMLElement && node.hasAttribute('data-handle')))
      return;
    const layer = this.#stack.get(id)?.layer;
    if (layer && this.#flag(layer, 'canRename')) void this.renameLayer(id);
  };

  // ── Rows ───────────────────────────────────────────────────────────────────

  #part(name: string, id: string, member = ''): (element: Element | undefined) => void {
    const key = `${name}\u0000${member}\u0000${id}`;
    this.#partKeys.set(key, id);
    const reference = this.presentationController.partReference(key, name);
    return (element) => reference((element as HTMLElement | undefined) ?? null);
  }

  #dropStaleParts(): void {
    const ids = new LayerIndex(this.layers).ids;
    for (const [key, id] of this.#partKeys)
      if (!ids.has(id) && this.presentationController.dropReference(key))
        this.#partKeys.delete(key);
  }

  /** Rows render inside the tree; it renders them again only when told. */
  #refreshRows(): void {
    this.#tree?.requestUpdate();
  }

  #renderRow = (layer: Layer, context: TreeViewRenderContext): TemplateResult => {
    const id = layer.id;
    const dimmed = this.#dimmedIds.has(id);
    const renaming = this.#renaming === id;
    const state: LayerRowState = {
      id,
      depth: context.level - 1,
      group: isGroup(layer),
      expanded: context.expanded,
      selected: Boolean(context.selected),
      active: this.active === id,
      dimmed,
      enabled: isEnabled(layer),
      renaming,
    };
    const leading = this.renderLayer
      ? this.renderLayer(layer, state)
      : layer.icon
        ? html`<tp-icon .icon=${layer.icon}></tp-icon>`
        : nothing;
    // When any layer has an icon, every row keeps room for one, so the labels line up.
    const reserve = leading === nothing && !this.renderLayer && this.#hasIcons();
    return html`${
      leading !== nothing || reserve
        ? html`<span slot="leading" ${ref(this.#part('layers-icon', id))} ?data-dimmed=${dimmed}
            >${leading}</span
          >`
        : nothing
    }${
      renaming
        ? html`<tp-input
            ${ref(this.#part('layers-rename', id))}
            data-layer-rename
            size="sm"
            .copyable=${false}
            .defaultValue=${layer.label}
            .ariaLabel=${this.#messages.renameField(layer.label)}
            @keydown=${(event: KeyboardEvent) => this.#onRenameKey(event, id)}
            @focusout=${(event: FocusEvent) => this.#onRenameBlur(event, id)}
            @tp-value-change=${stop}
            @tp-value-commit=${stop}
            @tp-field-value=${stop}
          ></tp-input>`
        : html`<span ${ref(this.#part('layers-label', id))} ?data-dimmed=${dimmed}
            >${layer.label}</span
          >`
    }${this.#renderStates(layer, state)}`;
  };

  #hasIcons(): boolean {
    const stack = this.#stack;
    return stack.order.some((id) => stack.get(id)!.layer.icon);
  }

  /**
   * One control per state whose current value has an icon: a press proposes the state's next
   * value. A frozen layer's controls are inactive, except its own `enabled` control.
   */
  #renderStates(layer: Layer, row: LayerRowState): unknown {
    const controls = (layer.states ?? []).filter((state) => currentValue(state)?.icon);
    if (!controls.length) return nothing;
    return html`<span slot="trailing" ${ref(this.#part('layers-states', layer.id))}
      >${controls.map((state) => {
        const value = currentValue(state)!;
        const inactive = !this.#editable || (!row.enabled && state.name !== ENABLED_STATE);
        return html`<tp-button
          ${ref(this.#part('layers-state', layer.id, state.name))}
          size="icon-xs"
          variant="ghost"
          data-layer-state=${state.name}
          data-value=${value.value}
          data-display=${value.display ?? 'always'}
          .ariaLabel=${this.#messages.stateControl(state.label, value.label ?? value.value)}
          .icon=${value.icon}
          ?disabled=${inactive}
          @click=${(event: MouseEvent) => this.#onStatePress(event, layer.id, state)}
        ></tp-button>`;
      })}</span
    >`;
  }

  #onStatePress(event: MouseEvent, id: string, state: LayerState): void {
    const value = nextValue(state);
    if (value === undefined) return;
    const stack = this.#stack;
    const targets =
      state.scope === 'selection' && this.value.includes(id)
        ? this.value.filter((target) => {
            const layer = stack.get(target)?.layer;
            const own = layer && layerState(layer, state.name);
            return (
              own !== undefined &&
              own.values.some((entry) => entry.value === value) &&
              (isEnabled(layer!) || state.name === ENABLED_STATE)
            );
          })
        : [id];
    this.#setState(targets, state.name, value, 'trigger-press', event);
  }

  #finishing = false;

  #finishRename(id: string, name: string | null, source: Event, refocus: boolean): void {
    if (this.#finishing || this.#renaming !== id) return;
    this.#finishing = true;
    this.#renaming = null;
    if (name !== null) this.#rename(id, name, source);
    this.#refreshRows();
    if (refocus) void this.#tree?.updateComplete.then(() => this.focusLayer(id));
    queueMicrotask(() => (this.#finishing = false));
  }

  #onRenameKey(event: KeyboardEvent, id: string): void {
    event.stopPropagation();
    const input = event.currentTarget as TpInput;
    if (event.key === 'Enter') {
      event.preventDefault();
      this.#finishRename(id, input.value, event, true);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.#finishRename(id, null, event, true);
    }
  }

  #onRenameBlur(event: FocusEvent, id: string): void {
    // Focus has gone where the user put it; the row does not take it back.
    const next = event.relatedTarget;
    if (next instanceof Node && (event.currentTarget as Node).contains(next)) return;
    this.#finishRename(id, (event.currentTarget as TpInput).value, event, false);
  }

  #onSlotChange = (event: Event): void => {
    const slot = event.target as HTMLSlotElement;
    const filled = slot
      .assignedNodes({ flatten: true })
      .some((node) => node.nodeType === Node.ELEMENT_NODE || node.textContent?.trim());
    if (filled === this.#filledSlots.has(slot.name)) return;
    if (filled) this.#filledSlots.add(slot.name);
    else this.#filledSlots.delete(slot.name);
    this.requestUpdate();
  };

  // ── Markup ─────────────────────────────────────────────────────────────────

  #readMarkup(): Layer[] {
    return readLayers(this, () => {
      let id: string;
      do id = `layer-${++this.#generatedIds}`;
      while (this.ownerDocument.getElementById(id));
      return id;
    });
  }

  /** Mirrors committed records into the `tp-layer` children of a declared, uncontrolled stack. */
  #writeMarkup(layers: readonly Layer[]): void {
    if (!this.#markup || this.#layers.controlled) return;
    if (sameLayers(this.#readMarkup(), layers)) return;
    this.#writing = true;
    try {
      writeLayers(this, layers);
    } finally {
      this.#observer?.takeRecords();
      this.#writing = false;
    }
  }

  /**
   * A declaration changed. The stack's own writes read back as its records; any other change is
   * the author's and becomes the records.
   */
  #markupChanged = (): void => {
    if (this.#writing || !this.hasUpdated || this.#layers.controlled) return;
    if (!this.#markup && !declaresLayers(this)) return;
    this.#markup = true;
    const read = this.#readMarkup();
    if (!sameLayers(read, this.layers)) this.#layers.reconcile(read);
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener(LAYER_DECLARATION_CHANGE, this.#markupChanged);
    this.#observer ??= new MutationObserver(() => this.#markupChanged());
    // An icon set on a declared `tp-icon` shows as its `data-empty` attribute going away.
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-empty'],
    });
  }

  override disconnectedCallback(): void {
    this.removeEventListener(LAYER_DECLARATION_CHANGE, this.#markupChanged);
    this.#observer?.disconnect();
    super.disconnectedCallback();
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  #composedTree: Element | null = null;
  #composition: unknown;

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.hasUpdated) {
      if (this.#providedLayers === undefined && declaresLayers(this)) {
        this.#markup = true;
        this.#markupLayers = this.#readMarkup();
      }
      this.#layers.initialize();
      this.#selection.initialize();
      this.#active.initialize();
      this.#expansion.initialize();
      this.#repairInitialSelection();
    }
  }

  /** A default active layer that is not selected selects it; a selection without one picks one. */
  #repairInitialSelection(): void {
    const stack = this.#stack;
    const value = existingIds(stack, this.value);
    const active = this.active !== null && stack.has(this.active) ? this.active : null;
    if (active !== null && !value.includes(active)) {
      this.#selection.reconcile([...value, active], 'initial');
    } else if (active === null && value.length) {
      this.#active.reconcile(activeAfterSelection(stack, value, null, null), 'initial');
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const tree = this.#tree;
    if (tree && (tree !== this.#composedTree || this.#composition !== this.partPresentation)) {
      this.#composedTree = tree;
      this.#composition = this.partPresentation;
      setPartComposition(
        tree as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
    // Row content depends on the widget's own state, which the tree cannot see.
    if (
      changed.has('active' as keyof TpLayers) ||
      changed.has('renderLayer' as keyof TpLayers) ||
      changed.has('messages' as keyof TpLayers) ||
      changed.has('disabled' as keyof TpLayers) ||
      changed.has('readOnly' as keyof TpLayers)
    )
      this.#refreshRows();
  }

  protected override render() {
    const empty = this.layers.length === 0;
    const state = {
      size: this.size,
      empty,
      disabled: this.disabled,
      readOnly: this.readOnly,
    };
    const active = this.active;
    // A bar holds a start and an end region; it shows while either has content.
    const bar = (name: 'header' | 'footer') => {
      const end = `${name}-end`;
      const start = this.#filledSlots.has(name);
      const after = this.#filledSlots.has(end);
      return this.renderPart(`layers-${name}`, state, {
        tag: 'div',
        properties: {
          part: `layers-${name}`,
          class: `bar ${name}`,
          'data-empty': !start && !after,
        },
        content: html`<div class="region" data-region="start" ?data-empty=${!start}>
            <slot name=${name} @slotchange=${this.#onSlotChange}></slot>
          </div>
          <div class="region" data-region="end" ?data-empty=${!after}>
            <slot name=${end} @slotchange=${this.#onSlotChange}></slot>
          </div>`,
      });
    };
    return this.renderPart('layers', state, {
      tag: 'div',
      properties: {
        part: 'layers',
        class: 'root',
        'data-empty': empty,
        'data-size': this.size,
      },
      content: html`${bar('header')}<tp-tree-view
          part="layers-tree"
          class="tree"
          ?hidden=${empty}
          ?data-flat=${!this.layers.some(isGroup)}
          selection-mode="multiple"
          selection-behavior="replace"
          expansion-trigger="indicator"
          .label=${this.label}
          .size=${this.size}
          .items=${this.layers}
          .value=${this.value}
          .expanded=${this.expanded}
          .getItemLabel=${layerLabel}
          .isItemDisabled=${frozen}
          .isItemCurrent=${(layer: Layer) => layer.id === active}
          .renderItem=${this.#renderRow}
          .reorderable=${this.canReorder && this.#editable}
          .canDrop=${this.#treeCanDrop}
          .dragActivation=${this.dragActivation === 'handle' ? 'handle' : 'item'}
          .dropIndicator=${this.dropIndicator === 'displace' ? 'displace' : 'line'}
          handle-placement="start"
          .messages=${this.messages?.tree ?? {}}
          .disabled=${this.disabled}
          @tp-value-change=${this.#onTreeValue}
          @tp-expanded-change=${this.#onTreeExpanded}
          @tp-items-change=${this.#onTreeItems}
          @keydown=${this.#onTreeKeydown}
          @dblclick=${this.#onTreeDoubleClick}
        ></tp-tree-view
        >${this.renderPart('layers-empty', state, {
          tag: 'div',
          properties: { part: 'layers-empty', class: 'empty', hidden: !empty },
          content: html`<slot name="empty" @slotchange=${this.#onSlotChange}></slot>`,
        })}${bar('footer')}`,
    });
  }
}

const layerLabel = (layer: Layer): string => layer.label;
const frozen = (layer: Layer): boolean => !isEnabled(layer);
const stop = (event: Event): void => event.stopPropagation();

declare global {
  interface HTMLElementTagNameMap {
    'tp-layers': TpLayers;
  }
}
