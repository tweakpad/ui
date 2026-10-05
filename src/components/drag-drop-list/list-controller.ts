import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { TpChangeEventOptions } from '../../foundation/events.js';
import { createId } from '../../foundation/id.js';
import type { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { LitDragDropRenderer } from '../../foundation/drag-drop/renderer.js';
import { isSortable } from '../../foundation/drag-drop/sortable.js';
import {
  arrayMove,
  arraySwap,
  reportDragDropDiagnostic,
  type UniqueIdentifier,
} from '../../foundation/drag-drop/sorting.js';
import { validIdentifier } from '../../foundation/drag-drop/registry.js';
import type {
  DragEvent,
  DragEventName,
  OperationSnapshot,
} from '../../foundation/drag-drop/types.js';
import type { TpDragDropList } from './drag-drop-list.js';
import type { DragDropDestination, MoveItemOutcome } from './types.js';

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

const networks = new WeakMap<DragDropManager, ListNetwork>();
type AnyList = ListController<any>;
interface Session {
  id: number;
  source: AnyList;
  itemId: UniqueIdentifier;
  initial: Map<AnyList, readonly unknown[]>;
  versions: Map<AnyList, number>;
  preview: Map<AnyList, readonly unknown[]>;
  revision: number;
}

export class ListController<T> {
  network: ListNetwork | undefined;
  version = 0;
  records: ItemRecord<T>[] = [];
  #lastValue: readonly T[] | undefined;
  #lastResolver: unknown;
  #duplicates: object[] = [];
  constructor(
    readonly host: TpDragDropList<T>,
    readonly state: ControllableState<readonly T[]>,
  ) {}
  get group(): UniqueIdentifier {
    return this.host.group;
  }
  get committed(): readonly T[] {
    return this.state.value;
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
    if (!network) networks.set(manager, (network = new ListNetwork(manager)));
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
      const id = this.host.getItemId ? this.host.getItemId(item, index) : defaultItemId(item);
      if (!validIdentifier(id))
        throw new TypeError('getItemId must return a string or finite number.');
      const label = this.host.getItemLabel
        ? this.host.getItemLabel(item, index)
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
    if (this.#lastValue !== this.committed || this.#lastResolver !== this.host.getItemId) {
      if (!this.network?.committing) {
        this.version++;
        this.network?.invalidate(this);
      }
      this.#lastValue = this.committed;
      this.#lastResolver = this.host.getItemId;
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
  moveItem(id: UniqueIdentifier, destination: DragDropDestination<T>): MoveItemOutcome {
    return this.network?.move(this, id, destination) ?? 'rejected';
  }
  cancel(): void {
    if (this.network?.involves(this)) void this.network.manager.actions.stop({ canceled: true });
  }
  changed(): void {
    this.host.requestUpdate();
  }
}

export class ListNetwork {
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
        revision: 0,
      };
      for (const list of this.lists.values()) {
        this.session.initial.set(list, list.committed);
        this.session.preview.set(list, list.committed);
        this.session.versions.set(list, list.version);
      }
    }
    // Bridge before the default response; the final monitor cancellation is checked in its microtask.
    for (const list of this.lists.values()) list.host.observeDragEvent(name, event);
    if (name === 'dragover') {
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
  #location(session: Session): { list: AnyList; index: number } | undefined {
    for (const [list, items] of session.preview) {
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
    if (target.id === session.itemId && isSortable(target)) return;
    const records = destination.resolve(session.preview.get(destination)!);
    let index = target.data.container
      ? records.length
      : records.findIndex((record) => record.id === target.id && !record.duplicate);
    if (index < 0) return;
    const shape = target.shape,
      position =
        this.manager.dragOperation.shape?.current.center ??
        this.manager.dragOperation.position.current;
    const horizontal = destination.host.orientation === 'horizontal',
      rtl =
        horizontal &&
        destination.host.ownerDocument.defaultView!.getComputedStyle(destination.host).direction ===
          'rtl';
    const after = shape
      ? horizontal
        ? position.x >= shape.center.x !== rtl
        : position.y >= shape.center.y
      : false;
    if (target.data.container) index = after ? records.length : 0;
    else if (source.list !== destination && after) index++;
    const from = session.preview.get(source.list)!,
      to = session.preview.get(destination)!;
    let next: readonly unknown[];
    if (source.list === destination) {
      index = Math.min(index, from.length - 1);
      next =
        session.source.host.reorderMode === 'swap'
          ? arraySwap(from, source.index, index)
          : arrayMove(from, source.index, index);
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
    this.#changed();
  }
  #complete(snapshot: OperationSnapshot): boolean {
    const session = this.session;
    if (!session || session.id !== snapshot.id) return true;
    if (!this.#valid(session)) return false;
    const location = this.#location(session),
      targetList = snapshot.target?.data.list;
    if (!location || targetList !== location.list) return false;
    const result = this.#transaction(
      session.preview,
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
  ): MoveItemOutcome {
    const changed = [...values].filter(
      ([list, value]) => !orderedValuesEqual(list.committed, value),
    );
    if (!changed.length) return 'no-op';
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
    source: ListController<T>,
    id: UniqueIdentifier,
    destination: DragDropDestination<T>,
  ): MoveItemOutcome {
    if (
      this.manager.dragOperation.status !== 'idle' ||
      source.host.disabled ||
      source.host.readOnly
    )
      return 'rejected';
    const target =
      destination.list?.controller ??
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
      if (source === target)
        values.set(
          source,
          source.host.reorderMode === 'swap'
            ? arraySwap(source.committed, index, insertion)
            : arrayMove(source.committed, index, insertion),
        );
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
