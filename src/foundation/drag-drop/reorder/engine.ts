import { ControllableState, orderedValuesEqual } from '../../controllable-state.js';
import { pointerNearest } from '../collision.js';
import { landingSide } from '../landing.js';
import type { SortableInput } from '../sortable.js';
import type { ChangeReason } from '../../types.js';
import type { TpChangeEventOptions } from '../../events.js';
import { createId } from '../../id.js';
import type { DragDropManager } from '../manager.js';
import { LitDragDropRenderer } from '../renderer.js';
import { isSortable } from '../sortable.js';
import { arrayMove, reportDragDropDiagnostic, type UniqueIdentifier } from '../sorting.js';
import { validIdentifier } from '../registry.js';
import type { DragEvent, DragEventName, OperationSnapshot } from '../types.js';

import type { Droppable } from '../entities.js';

// The one reorder engine. Every component that reorders items by dragging (Drag drop list, Tree
// view and the widgets on them) registers containers with it, so the session, the projection of
// the landing (target, side, displaced order or landing line), keyboard moves and the commit are
// decided here, once, the same for all of them. A container supplies only its items, its look
// (the stand-in, the line, the glides render through the shared helpers) and, for a tree, the
// refinements of a landing (depth, into).

/** Where `moveItem` puts an item: an index in this container, or in a connected one. */
export interface ReorderDestination<T = unknown> {
  container?: ReorderContainer<T>;
  group?: UniqueIdentifier;
  index: number;
}
/** The result of a move: accepted, changed nothing, or rejected. */
export type ReorderOutcome = 'accepted' | 'no-op' | 'rejected';
/** A pending commit's event and options, read by a host's value lane while it commits. */
export interface ReorderCommit {
  event: Event;
  eventOptions: TpChangeEventOptions;
}

/** What a component that reorders gives the engine: its element, which renders the items. */
export interface ReorderHost<T> extends HTMLElement {
  readonly updateComplete: Promise<boolean>;
  /** The container's group, unique among the containers of one manager. */
  readonly reorderGroup: UniqueIdentifier;
  /** An item's identity; the item itself or its `id` by default. */
  readonly reorderItemId: ((item: T, index: number) => UniqueIdentifier) | undefined;
  /** An item's label for announcements; its `label` or its identity by default. */
  readonly reorderItemLabel: ((item: T, index: number) => string) | undefined;
  readonly dropIndicator: 'displace' | 'line';
  /** The axis the items follow. */
  readonly reorderOrientation: 'vertical' | 'horizontal';
  readonly disabled: boolean;
  readonly readOnly: boolean;
  /** The droppable of the container itself, which an empty container is dropped on. */
  readonly containerTarget: Droppable | undefined;
  /** The value a controlled owner wrote back during a commit. */
  readonly controlledInput: readonly T[] | undefined;
  pendingCommit: ReorderCommit | undefined;
  requestUpdate(): void;
  observeDragEvent(name: DragEventName, event: DragEvent): void;
  createFeedbackPreview(id: UniqueIdentifier): HTMLElement;
  renderAccessibilityPart(
    part: 'instructions' | 'announcements',
    element: HTMLElement,
    text: string,
  ): void;
  /** The items the container shows while one of its own items is dragged; `committed` by default. */
  reorderDragItems?(itemId: UniqueIdentifier, input: 'pointer' | 'keyboard'): readonly T[];
  /** Whether a target item takes the dragged one as a child: its middle half lands into it. */
  reorderHolds?(targetId: UniqueIdentifier, itemId: UniqueIdentifier): boolean;
  /** Extra data of a landing (a tree's depth), decided again at each move of the drag. */
  reorderRefine?(landing: ReorderLanding<T>): unknown;
  /** Commits a landing itself instead of through the value lane; whether it was accepted. */
  reorderCommit?(landing: ReorderLanding<T>, reason: ChangeReason, event: Event): boolean;
}

/** Where a drag would land in one container, as the engine projects it. */
export interface ReorderLanding<T> {
  readonly itemId: UniqueIdentifier;
  /** The container's items in the order the drop would leave them. */
  readonly order: readonly T[];
  /** The item the drop lands into, when it is a child landing. */
  readonly into: UniqueIdentifier | null;
  /** How far the drag has moved from where it started. */
  readonly offset: { readonly x: number; readonly y: number };
  readonly input: 'pointer' | 'keyboard';
  /** The container's refinement of this landing. */
  readonly refinement: unknown;
}

export interface ItemRecord<T> {
  item: T;
  id: UniqueIdentifier;
  label: string;
  index: number;
  duplicate: boolean;
  key: UniqueIdentifier | object;
}
export function defaultItemId(item: unknown): UniqueIdentifier {
  const id =
    typeof item === 'object' && item !== null && Object.hasOwn(item, 'id')
      ? (item as { id: unknown }).id
      : item;
  if (!validIdentifier(id))
    throw new TypeError(
      'Drag items require a string/finite-number identity or an own id property.',
    );
  return id;
}
export function defaultItemLabel(item: unknown, id: UniqueIdentifier): string {
  const label =
    typeof item === 'object' && item !== null && 'label' in item ? item.label : undefined;
  return typeof label === 'string' && label.trim() ? label : String(id);
}

/** Independent drag/drop participation lanes for one list item. */
export function itemParticipation(
  option: boolean | { draggable?: boolean; droppable?: boolean } | undefined,
  state: { disabled: boolean; readOnly: boolean; duplicate: boolean },
): { dragDisabled: boolean; dropDisabled: boolean } {
  const blocked = state.disabled || state.readOnly || state.duplicate;
  const lanes =
    typeof option === 'boolean' ? { draggable: option, droppable: option } : (option ?? {});
  return {
    dragDisabled: blocked || !!lanes.draggable,
    dropDisabled: blocked || !!lanes.droppable,
  };
}

const networks = new WeakMap<DragDropManager, ReorderEngine>();
type AnyList = ReorderContainer<any>;
interface Session {
  id: number;
  source: AnyList;
  itemId: UniqueIdentifier;
  initial: Map<AnyList, readonly unknown[]>;
  versions: Map<AnyList, number>;
  preview: Map<AnyList, readonly unknown[]>;
  /**
   * Line mode: where a drop would put the item, while `preview` keeps the order on screen; null
   * while the drop would change nothing.
   */
  pending: Map<AnyList, readonly unknown[]> | null;
  /** Line mode: the list and the boundary (an index into its shown items) the line marks. */
  anchor: { list: AnyList; slot: number } | null;
  /** Line mode, released: the landing order is rendering, so the items glide before it commits. */
  landing?: boolean;
  /** The item the drop lands into (a child landing), in the anchor's or the source's container. */
  into: { list: AnyList; id: UniqueIdentifier } | null;
  /** The container's refinement of the current landing (a tree's depth). */
  refinement: unknown;
  revision: number;
}

/**
 * The committed order a container reorders: a value lane, which the engine's transaction commits,
 * or for a host that commits itself (`reorderCommit`) any source of the current order.
 */
export type ReorderState<T> = ControllableState<readonly T[]> | { readonly value: readonly T[] };

/**
 * The Sortable settings every reordering container starts its items from, so a list and a tree
 * drag the same way: the drag feedback's ghost in the item's place (`clone`) unless the container
 * asks for `move` or `none`, and under a landing line a target that follows the pointer.
 */
export function reorderItemDefaults(
  host: Pick<ReorderHost<unknown>, 'dropIndicator'>,
  options: {
    feedback?: SortableInput['feedback'];
    collisionDetector?: SortableInput['collisionDetector'];
  } = {},
): {
  feedback: SortableInput['feedback'] | undefined;
  collisionDetector: SortableInput['collisionDetector'] | undefined;
} {
  return {
    feedback: (options.feedback ?? 'default') === 'default' ? 'clone' : options.feedback,
    collisionDetector:
      options.collisionDetector ?? (host.dropIndicator === 'line' ? pointerNearest : undefined),
  };
}

export class ReorderContainer<T> {
  network: ReorderEngine | undefined;
  version = 0;
  records: ItemRecord<T>[] = [];
  #lastValue: readonly T[] | undefined;
  #lastResolver: unknown;
  #duplicates: object[] = [];
  constructor(
    readonly host: ReorderHost<T>,
    readonly state: ReorderState<T>,
  ) {}
  /** The item this container's current landing goes into, else null. */
  get into(): UniqueIdentifier | null {
    const into = this.network?.session?.into;
    return into?.list === this ? into.id : null;
  }
  /** The container's refinement of the current landing, while one of its items is dragged. */
  get refinement(): unknown {
    const session = this.network?.session;
    return session?.source === this ? session.refinement : undefined;
  }
  get group(): UniqueIdentifier {
    return this.host.reorderGroup;
  }
  get committed(): readonly T[] {
    return this.state.value;
  }
  /** Line mode: the boundary among this list's shown items that a drop would land at. */
  get anchor(): number | null {
    const anchor = this.network?.session?.anchor;
    return anchor?.list === this ? anchor.slot : null;
  }
  get preview(): readonly T[] {
    return (this.network?.session?.preview.get(this) ?? this.committed) as readonly T[];
  }
  canConnect(manager: DragDropManager): boolean {
    const other = networks.get(manager)?.lists.get(this.group);
    return !other || other === this;
  }
  connect(manager: DragDropManager): void {
    this.disconnect();
    let network = networks.get(manager);
    if (!network) networks.set(manager, (network = new ReorderEngine(manager)));
    network.add(this);
    this.network = network;
  }
  disconnect(): void {
    this.network?.remove(this);
    this.network = undefined;
  }
  resolve(value: readonly T[]): ItemRecord<T>[] {
    if (!Array.isArray(value)) throw new TypeError('Drag Drop List value must be an array.');
    const ids = new Set<UniqueIdentifier>();
    return value.map((item, index) => {
      const id = this.host.reorderItemId
        ? this.host.reorderItemId(item, index)
        : defaultItemId(item);
      if (!validIdentifier(id))
        throw new TypeError('getItemId must return a string or finite number.');
      const label = this.host.reorderItemLabel
        ? this.host.reorderItemLabel(item, index)
        : defaultItemLabel(item, id);
      if (typeof label !== 'string' || !label.trim())
        throw new TypeError('getItemLabel must return useful nonempty text.');
      const duplicate = ids.has(id);
      ids.add(id);
      if (duplicate)
        reportDragDropDiagnostic(
          'duplicate-item',
          'Only the first item with a typed ID participates in dragging.',
          id,
        );
      return {
        item,
        id,
        label,
        index,
        duplicate,
        key: duplicate ? (this.#duplicates[index] ??= {}) : id,
      };
    });
  }
  sync(): void {
    if (this.#lastValue !== this.committed || this.#lastResolver !== this.host.reorderItemId) {
      if (!this.network?.committing) {
        this.version++;
        this.network?.invalidate(this);
      }
      this.#lastValue = this.committed;
      this.#lastResolver = this.host.reorderItemId;
    }
    try {
      this.records = this.resolve(this.preview);
    } catch (error) {
      this.network?.invalidate(this);
      reportDragDropDiagnostic(
        'items',
        'Invalid item resolution retained the previous coherent rendering.',
        error,
      );
    }
  }
  moveItem(id: UniqueIdentifier, destination: ReorderDestination<T>): ReorderOutcome {
    return this.network?.move(this, id, destination) ?? 'rejected';
  }
  cancel(): void {
    if (this.network?.involves(this)) void this.network.manager.actions.stop({ canceled: true });
  }
  changed(): void {
    this.host.requestUpdate();
  }
}

export class ReorderEngine {
  readonly lists = new Map<UniqueIdentifier, AnyList>();
  readonly type = Symbol('Tweakpad connected lists');
  readonly renderer = new LitDragDropRenderer();
  readonly #releases: Array<() => void> = [];
  readonly #hosts = new Map<AnyList, () => void>();
  readonly #previousRenderer;
  readonly #composedRenderer;
  session: Session | undefined;
  committing = false;
  #previewRevision = 0;
  constructor(readonly manager: DragDropManager) {
    this.#releases.push(
      manager.sorting.own((source) =>
        [...this.lists.values()].some((list) => source.data.list === list),
      ),
    );
    this.#previousRenderer = manager.renderer;
    const previous = this.#previousRenderer,
      renderer = this.renderer;
    this.#composedRenderer = {
      get rendering() {
        return Promise.all([previous.rendering, renderer.rendering]).then(() => undefined);
      },
    };
    manager.renderer = this.#composedRenderer;
    for (const name of [
      'beforedragstart',
      'dragstart',
      'dragmove',
      'collision',
      'dragover',
      'dragend',
      'settled',
    ] as const)
      this.#releases.push(
        manager.monitor.addEventListener(name, (event) => this.#event(name, event)),
      );
    this.#releases.push(
      manager.addRollback(() => {
        if (this.session) {
          this.session = undefined;
          this.#changed();
        }
      }),
    );
    this.#releases.push(manager.addCompletion((snapshot) => this.#complete(snapshot)));
    const previousPreview = manager.feedback.createPreview,
      previousMotionOwner = manager.feedback.resolveMotionOwner,
      previousContent = manager.accessibility.renderContent;
    manager.accessibility.renderContent = (source, part, element, text) => {
      const owner = source.data.list as AnyList | undefined;
      if (owner?.network === this) owner.host.renderAccessibilityPart(part, element, text);
      else if (previousContent) previousContent(source, part, element, text);
      else element.textContent = text;
    };
    this.#releases.push(() => {
      manager.feedback.createPreview = previousPreview;
      manager.feedback.resolveMotionOwner = previousMotionOwner;
      manager.accessibility.renderContent = previousContent;
    });
    manager.feedback.resolveMotionOwner = (source) => {
      const owner = source.data.list as AnyList | undefined;
      return owner?.network === this ? owner.host : previousMotionOwner?.(source);
    };
    manager.feedback.createPreview = (source) => {
      const owner = source.data.list as AnyList | undefined;
      if (!owner || owner.network !== this) return previousPreview?.(source);
      return owner.host.createFeedbackPreview(source.id);
    };
  }
  add(list: AnyList): void {
    if (this.lists.has(list.group) && this.lists.get(list.group) !== list)
      throw new Error('Connected Drag Drop List groups must be unique.');
    this.lists.set(list.group, list);
    this.#hosts.set(list, this.renderer.add(list.host));
  }
  remove(list: AnyList): void {
    this.invalidate(list);
    this.session?.initial.delete(list);
    this.session?.preview.delete(list);
    this.session?.pending?.delete(list);
    if (this.session?.anchor?.list === list) this.session.anchor = null;
    this.session?.versions.delete(list);
    for (const [group, member] of this.lists) if (member === list) this.lists.delete(group);
    this.#hosts.get(list)?.();
    this.#hosts.delete(list);
    if (!this.lists.size) {
      for (const release of this.#releases) release();
      if (this.manager.renderer === this.#composedRenderer)
        this.manager.renderer = this.#previousRenderer;
      networks.delete(this.manager);
    }
  }
  involves(list: AnyList): boolean {
    const session = this.session;
    return (
      !!session &&
      (session.source === list ||
        session.preview.get(list) !== session.initial.get(list) ||
        this.manager.dragOperation.target?.data.list === list)
    );
  }
  invalidate(list: AnyList): void {
    if (this.committing || !this.session?.initial.has(list)) return;
    if (this.involves(list)) {
      this.session = undefined;
      void this.manager.actions.stop({ canceled: true });
      this.#changed();
    } else {
      this.session.initial.set(list, list.committed);
      this.session.preview.set(list, list.committed);
      this.session.versions.set(list, list.version);
    }
  }
  #changed(): void {
    for (const list of this.lists.values()) list.changed();
  }
  #event(name: DragEventName, event: DragEvent): void {
    const owner = event.operation.source?.data.list as AnyList | undefined;
    if (!owner || owner.network !== this) return;
    if (name === 'beforedragstart') {
      this.session = {
        id: event.operation.id,
        source: owner,
        itemId: event.operation.source!.id,
        initial: new Map(),
        versions: new Map(),
        preview: new Map(),
        pending: null,
        anchor: null,
        into: null,
        refinement: undefined,
        revision: 0,
      };
      const itemId = event.operation.source!.id;
      for (const list of this.lists.values()) {
        const items =
          list === owner
            ? (list.host.reorderDragItems?.(
                itemId,
                event.operation.input === 'keyboard' ? 'keyboard' : 'pointer',
              ) ?? list.committed)
            : list.committed;
        this.session.initial.set(list, items);
        this.session.preview.set(list, items);
        this.session.versions.set(list, list.version);
      }
    }
    // Bridge before the default response; the final monitor cancellation is checked in its microtask.
    for (const list of this.lists.values()) list.host.observeDragEvent(name, event);
    // Line mode keeps the items still, so the target only changes between items: each pointer
    // move re-decides the side of the target the line marks.
    const lining =
      name === 'dragmove' &&
      this.session?.source.host.dropIndicator === 'line' &&
      event.operation.input === 'pointer';
    if (name === 'dragover' || lining) {
      const revision = ++this.#previewRevision;
      queueMicrotask(() => {
        try {
          if (
            !event.defaultPrevented &&
            revision === this.#previewRevision &&
            this.session?.id === event.operation.id
          )
            this.#project(event);
        } catch (error) {
          this.manager.fail(error);
        }
      });
    }
    // Line mode, released: the shown order becomes the landing order now, so the items make room
    // and the dropped item settles into its new place as in a displacing drag.
    if (name === 'dragend' && this.session?.anchor) {
      const session = this.session;
      if (session.pending && !(event.canceled || event.operation.canceled)) {
        for (const [list, value] of session.pending) session.preview.set(list, value);
        session.landing = true;
      }
      session.anchor = null;
      session.revision++;
    }
    // A container's refinement (a tree's depth) follows every move, pointer or keyboard, also
    // while the target stays; the move event precedes the operation's own position.
    if (name === 'dragmove' && this.session && this.session.source.host.reorderRefine) {
      const session = this.session;
      if (this.#refine(session, event.to)) {
        session.revision++;
        this.#changed();
      }
    }
    if (name === 'settled') {
      this.session = undefined;
      this.#changed();
    } else if (name !== 'collision' && name !== 'dragmove') this.#changed();
  }
  #valid(session: Session): boolean {
    return (
      this.session === session &&
      !this.manager.destroyed &&
      [...session.versions].every(
        ([list, version]) => list.version === version && this.lists.get(list.group) === list,
      ) &&
      !session.source.host.disabled &&
      !session.source.host.readOnly
    );
  }
  #location(
    session: Session,
    values: Map<AnyList, readonly unknown[]> = session.preview,
  ): { list: AnyList; index: number } | undefined {
    for (const [list, items] of values) {
      const index = list
        .resolve(items)
        .findIndex((record) => record.id === session.itemId && !record.duplicate);
      if (index !== -1) return { list, index };
    }
    return undefined;
  }
  #project(event: DragEvent): void {
    const session = this.session,
      target = this.manager.dragOperation.target;
    if (!session || !this.#valid(session) || !target || event.operation.target?.id !== target.id)
      return;
    const destination = target.data.list as AnyList | undefined,
      source = this.#location(session);
    if (
      !source ||
      !destination ||
      destination.network !== this ||
      destination.host.disabled ||
      destination.host.readOnly
    )
      return;
    // A pointer drag of a line-marked list keeps the items still; keyboard moves show the order.
    const line =
      session.source.host.dropIndicator === 'line' &&
      this.manager.dragOperation.input === 'pointer';
    // Over the dragged item's own place it lands there: no line, and no longer into another item.
    if (target.id === session.itemId && isSortable(target)) {
      if (line) this.#mark(session, null, null);
      else if (session.into) {
        session.into = null;
        session.revision++;
        this.#refine(session);
        this.#changed();
      }
      return;
    }
    const records = destination.resolve(session.preview.get(destination)!);
    let index = target.data.container
      ? records.length
      : records.findIndex((record) => record.id === target.id && !record.duplicate);
    if (index < 0) return;
    // A landing line marks where the pointer is, whatever part of the row it holds; a displacing
    // drag swaps rows when the dragged row's middle passes theirs.
    const shape = target.shape,
      position = line
        ? this.manager.dragOperation.position.current
        : (this.manager.dragOperation.shape?.current.center ??
          this.manager.dragOperation.position.current);
    const horizontal = destination.host.reorderOrientation === 'horizontal',
      rtl =
        horizontal &&
        destination.host.ownerDocument.defaultView!.getComputedStyle(destination.host).direction ===
          'rtl';
    // The side of the target, by the shared landing rules.
    const bounds = shape?.boundingRectangle;
    // A target that takes the dragged item as a child lands it into itself over its middle half.
    const holds =
      !target.data.container &&
      target.id !== session.itemId &&
      !!destination.host.reorderHolds?.(target.id, session.itemId);
    const side = bounds
      ? landingSide(
          horizontal
            ? { start: bounds.left, end: bounds.right }
            : { start: bounds.top, end: bounds.bottom },
          horizontal ? position.x : position.y,
          { reversed: rtl, into: holds },
        )
      : 'before';
    if (side === 'into') {
      this.#landInto(session, destination, target.id);
      return;
    }
    if (session.into) {
      session.into = null;
      session.revision++;
    }
    const after = side === 'after';
    if (line) {
      this.#projectLine(
        session,
        source,
        destination,
        records,
        index,
        after,
        !!target.data.container,
      );
      return;
    }
    if (target.data.container) index = after ? records.length : 0;
    else if (source.list !== destination && after) index++;
    const from = session.preview.get(source.list)!,
      to = session.preview.get(destination)!;
    let next: readonly unknown[];
    if (source.list === destination) {
      index = Math.min(index, from.length - 1);
      next = arrayMove(from, source.index, index);
      if (next === from) return;
      session.preview.set(source.list, next);
    } else {
      const item = from[source.index];
      if (records.some((record) => record.id === session.itemId)) return;
      const sourceArray = [...from],
        destinationArray = [...to];
      sourceArray.splice(source.index, 1);
      destinationArray.splice(index, 0, item);
      const transferred = destination.resolve(destinationArray)[index];
      if (!transferred || transferred.id !== session.itemId)
        throw new Error('Destination identity resolver changed the transferred item ID.');
      session.preview.set(source.list, sourceArray);
      session.preview.set(destination, destinationArray);
    }
    session.revision++;
    this.#refine(session);
    this.#changed();
  }
  /** A child landing: the order stays, and the target marks where the item goes. */
  #landInto(session: Session, list: AnyList, id: UniqueIdentifier): void {
    if (session.into?.list === list && session.into.id === id) return;
    session.into = { list, id };
    session.pending = null;
    session.anchor = null;
    session.revision++;
    this.#refine(session);
    this.#changed();
  }
  /** The source container's refinement of the landing, decided again; whether it changed. */
  #refine(session: Session, to?: { x: number; y: number }): boolean {
    const host = session.source.host;
    if (!host.reorderRefine) return false;
    const operation = this.manager.dragOperation;
    const current = to ?? operation.position.current;
    const order = (session.pending ?? session.preview).get(session.source) ?? [];
    const refinement = host.reorderRefine({
      itemId: session.itemId,
      order,
      into: session.into?.list === session.source ? session.into.id : null,
      offset: {
        x: current.x - operation.position.initial.x,
        y: current.y - operation.position.initial.y,
      },
      input: operation.input === 'keyboard' ? 'keyboard' : 'pointer',
      refinement: session.refinement,
    });
    const changed = JSON.stringify(refinement) !== JSON.stringify(session.refinement);
    session.refinement = refinement;
    return changed;
  }
  /**
   * Line mode: the shown order stays; the drop target and the pointer's side of it pick the
   * boundary the item lands at, which the destination list marks with a line.
   */
  #projectLine(
    session: Session,
    source: { list: AnyList; index: number },
    destination: AnyList,
    records: readonly { id: UniqueIdentifier; duplicate: boolean }[],
    index: number,
    after: boolean,
    container: boolean,
  ): void {
    const slot = container ? (after ? records.length : 0) : index + (after ? 1 : 0);
    const from = session.preview.get(source.list)!;
    if (source.list === destination) {
      // The boundaries on either side of the item itself change nothing.
      if (slot === source.index || slot === source.index + 1) {
        this.#mark(session, null, null);
        return;
      }
      const next = arrayMove(from, source.index, slot > source.index ? slot - 1 : slot);
      const pending = new Map(session.preview);
      pending.set(source.list, next);
      this.#mark(session, pending, { list: destination, slot });
      return;
    }
    if (records.some((record) => record.id === session.itemId)) return;
    const to = session.preview.get(destination)!;
    const sourceArray = [...from],
      destinationArray = [...to];
    const [item] = sourceArray.splice(source.index, 1);
    destinationArray.splice(slot, 0, item);
    if (destination.resolve(destinationArray)[slot]?.id !== session.itemId)
      throw new Error('Destination identity resolver changed the transferred item ID.');
    const pending = new Map(session.preview);
    pending.set(source.list, sourceArray);
    pending.set(destination, destinationArray);
    this.#mark(session, pending, { list: destination, slot });
  }
  #mark(session: Session, pending: Session['pending'], anchor: Session['anchor']): void {
    const same =
      session.anchor?.list === anchor?.list &&
      session.anchor?.slot === anchor?.slot &&
      !session.into;
    session.pending = pending;
    session.anchor = anchor;
    session.into = null;
    const refined = this.#refine(session);
    if (same && !refined) return;
    session.revision++;
    this.#changed();
  }
  #complete(snapshot: OperationSnapshot): boolean | Promise<boolean> {
    const session = this.session;
    if (session?.landing && session.id === snapshot.id) {
      session.landing = false;
      return this.renderer.rendering.then(() => this.#complete(snapshot));
    }
    if (!session || session.id !== snapshot.id) return true;
    if (!this.#valid(session)) return false;
    // A container that commits itself takes the landing: its order, or the item it goes into.
    const host = session.source.host;
    if (host.reorderCommit) {
      const order = (session.pending ?? session.preview).get(session.source) ?? [];
      const into = session.into?.list === session.source ? session.into.id : null;
      const accepted = host.reorderCommit(
        {
          itemId: session.itemId,
          order,
          into,
          offset: { x: 0, y: 0 },
          input: snapshot.input === 'keyboard' ? 'keyboard' : 'pointer',
          refinement: session.refinement,
        },
        snapshot.input === 'keyboard' ? 'keyboard' : 'drag',
        snapshot.activatorEvent ?? new Event('drag'),
      );
      if (accepted) {
        this.session = undefined;
        this.#changed();
      }
      return accepted;
    }
    // Line mode drops where the line marks; the shown order never moved.
    const values = session.pending ?? session.preview;
    const location = this.#location(session, values),
      targetList = snapshot.target?.data.list;
    if (!location || targetList !== location.list) return false;
    const result = this.#transaction(
      values,
      session.itemId,
      session.source,
      location.list,
      snapshot.input === 'keyboard' ? 'keyboard' : 'drag',
      snapshot.activatorEvent ?? new Event('drag'),
      snapshot.id,
    );
    if (result !== 'rejected') {
      this.session = undefined;
      this.#changed();
    }
    return result !== 'rejected';
  }
  #transaction(
    values: Map<AnyList, readonly unknown[]>,
    itemId: UniqueIdentifier,
    source: AnyList,
    destination: AnyList,
    reason: ChangeReason,
    event: Event,
    operationId: number | string,
  ): ReorderOutcome {
    const changed = [...values].filter(
      ([list, value]) => !orderedValuesEqual(list.committed, value),
    ) as [
      ReorderContainer<unknown> & { state: ControllableState<readonly unknown[]> },
      readonly unknown[],
    ][];
    if (!changed.length) return 'no-op';
    // A container that commits itself never joins a value transaction.
    if (changed.some(([list]) => !(list.state instanceof ControllableState))) return 'rejected';
    const expected = new Map(
      changed.map(([list, value]) => [list, list.resolve(value).map((record) => record.id)]),
    );
    const metadata = {
      operationId,
      itemId,
      sourceGroup: source.group,
      destinationGroup: destination.group,
      fromIndex: source.resolve(source.committed).findIndex((r) => r.id === itemId),
      toIndex: destination.resolve(values.get(destination)!).findIndex((r) => r.id === itemId),
      input: reason,
    };
    const eventOptions: TpChangeEventOptions = { metadata };
    this.committing = true;
    for (const [list] of changed) list.host.pendingCommit = { event, eventOptions };
    try {
      const accepted = ControllableState.transaction(
        changed.map(([list, value]) => list.state.proposal(value, reason, event, eventOptions)),
        {
          changed: false,
          begin: () => true,
          dispatch() {},
          publish() {},
          notify() {},
          end() {},
          resolve: () =>
            changed.every(([list, proposed]) => {
              const resolved = list.state.controlled ? list.host.controlledInput : proposed;
              if (!resolved || list.host.disabled || list.host.readOnly || list.network !== this)
                return false;
              const ids = list.resolve(resolved).map((record) => record.id),
                wanted = expected.get(list)!;
              return (
                ids.length === wanted.length &&
                ids.every((id, index) => id === wanted[index]) &&
                new Set(ids).size === ids.length
              );
            }),
        },
      );
      return accepted ? 'accepted' : 'rejected';
    } catch (error) {
      reportDragDropDiagnostic(
        'transaction',
        'The complete connected transaction was rejected.',
        error,
      );
      return 'rejected';
    } finally {
      this.committing = false;
      for (const [list] of changed) {
        list.host.pendingCommit = undefined;
        list.changed();
      }
    }
  }
  move<T>(
    source: ReorderContainer<T>,
    id: UniqueIdentifier,
    destination: ReorderDestination<T>,
  ): ReorderOutcome {
    if (
      this.manager.dragOperation.status !== 'idle' ||
      source.host.disabled ||
      source.host.readOnly
    )
      return 'rejected';
    const target =
      destination.container ??
      (destination.group === undefined ? source : this.lists.get(destination.group));
    if (!target || target.network !== this || target.host.disabled || target.host.readOnly)
      return 'rejected';
    try {
      const from = source.resolve(source.committed),
        to = target.resolve(target.committed),
        index = from.findIndex((record) => record.id === id && !record.duplicate),
        insertion = destination.index;
      if (
        index < 0 ||
        !Number.isInteger(insertion) ||
        insertion < 0 ||
        insertion >= to.length + (source === target ? 0 : 1)
      )
        return 'rejected';
      const draggable = this.manager.registry.draggables.get(id),
        droppable = target.host.containerTarget;
      if (
        !draggable ||
        draggable.disabled ||
        !droppable ||
        droppable.disabled ||
        !droppable.accepts(draggable)
      )
        return 'rejected';
      const values = new Map<AnyList, readonly unknown[]>([
        [source, source.committed],
        [target, target.committed],
      ]);
      if (source === target) values.set(source, arrayMove(source.committed, index, insertion));
      else {
        if (to.some((record) => record.id === id)) return 'rejected';
        const nextSource = [...source.committed],
          nextTarget = [...target.committed],
          item = nextSource.splice(index, 1)[0]!;
        nextTarget.splice(insertion, 0, item);
        if (target.resolve(nextTarget)[insertion]?.id !== id) return 'rejected';
        values.set(source, nextSource);
        values.set(target, nextTarget);
      }
      return this.#transaction(
        values,
        id,
        source,
        target,
        'imperative-action',
        new Event('tp-programmatic-source'),
        createId('drag-action'),
      );
    } catch (error) {
      reportDragDropDiagnostic('imperative', 'moveItem rejected invalid data or options.', error);
      return 'rejected';
    }
  }
}
