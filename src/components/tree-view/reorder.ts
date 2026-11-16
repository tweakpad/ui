import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { Sortable } from '../../foundation/drag-drop/sortable.js';
import { KeyboardSensor, PointerSensor } from '../../foundation/drag-drop/sensors/index.js';
import type { Draggable } from '../../foundation/drag-drop/entities.js';
import type {
  DragEvent,
  DragEventName,
  SensorConfiguration,
} from '../../foundation/drag-drop/types.js';
import type { UniqueIdentifier } from '../../foundation/drag-drop/sorting.js';
import {
  ReorderContainer,
  reorderItemDefaults,
  type ReorderHost,
  type ReorderLanding,
} from '../../foundation/drag-drop/reorder/engine.js';
import {
  ReorderGlides,
  placeReorderLine,
  type ReorderView,
} from '../../foundation/drag-drop/reorder/render.js';
import { composedContains } from '../../foundation/focus.js';
import { interactiveTargetInPath, targetInPath } from '../../foundation/interactive-target.js';
import {
  dragDepth,
  intoMove,
  projectDepth,
  resolveMove,
  type ProjectedRow,
  type TreeModel,
  type TreeMove,
} from '../../foundation/tree/index.js';
import type { ChangeReason, Direction } from '../../foundation/types.js';
import type { TreeViewDragActivation, TreeViewMessages } from './types.js';

/** What the tree gives its reorder container. */
export interface ReorderContext {
  /** The tree element, which the reorder engine renders and settles through. */
  host: ReorderHost<string>;
  /** Records mode with `reorderable`. */
  enabled(): boolean;
  /** Disabled or read-only. */
  blocked(): boolean;
  model(): TreeModel<unknown>;
  /** Visible rows, in order. */
  rows(): readonly string[];
  /** A mounted row's element. */
  element(id: string): HTMLElement | null;
  /** The element the rows flow in. */
  list(): HTMLElement | null;
  activation(): TreeViewDragActivation;
  /** A drop predicate limits which rows take children. */
  nestable(): boolean;
  /** Whether `parentId` may take `itemId` as a child. */
  nests(parentId: string, itemId: string): boolean;
  messages(): Required<TreeViewMessages>;
  direction(): Direction;
  /** One level's indentation, in pixels. */
  indentation(): number;
  /** A start handle's extent before the indentation. */
  lead(): number;
  announce(message: string): void;
  accepts(move: TreeMove): boolean;
  commit(move: TreeMove, reason: ChangeReason, sourceEvent?: Event): boolean;
}

/** A tree's refinement of a landing: the level the dragged row would take. */
interface TreeLanding {
  depth: number;
  parentId: string | null;
  /** The move is accepted, or changes nothing. */
  valid: boolean;
  /** The move changes nothing. */
  same: boolean;
}

/**
 * Records-mode reordering: the tree is one container of the shared reorder engine, which decides
 * the landing (target, side, displaced order or landing line, keyboard steps) as it does for every
 * reordering component, and draws the drag through the shared drag feedback, line and glides. The
 * tree adds only what a tree has: the subtree that moves with a parent, children landings into a
 * row, the depth a landing takes from the drag's horizontal offset, and the move it commits.
 */
export class TreeReorder {
  readonly #context: ReorderContext;
  readonly container: ReorderContainer<string>;
  #manager: DragDropManager | null = null;
  #sortables = new Map<string, Sortable>();
  #rowSensors = new WeakMap<
    HTMLElement,
    { activation: TreeViewDragActivation; sensors: SensorConfiguration }
  >();
  readonly #glides = new ReorderGlides();

  constructor(context: ReorderContext) {
    this.#context = context;
    const committed = () => this.#committed();
    this.container = new ReorderContainer<string>(context.host, {
      get value() {
        return committed();
      },
    });
  }

  /**
   * The visible rows as the engine's committed order: a new array exactly when they change, since
   * the tree splices its rows in place.
   */
  #rowsCopy: readonly string[] = [];
  #committed(): readonly string[] {
    const rows = this.#context.rows();
    const copy = this.#rowsCopy;
    if (rows.length !== copy.length || rows.some((id, index) => id !== copy[index]))
      this.#rowsCopy = [...rows];
    return this.#rowsCopy;
  }

  get enabled(): boolean {
    return this.#context.enabled();
  }

  /** The reorder engine's session for a drag of this tree's rows, if one is running. */
  get #session() {
    const session = this.container.network?.session;
    return session?.source === this.container ? session : undefined;
  }

  /** A reorder of this tree's rows is in progress. */
  get active(): boolean {
    return !!this.#session;
  }

  /** The dragged row, while a reorder is in progress. */
  get draggedId(): string | null {
    const session = this.#session;
    return session ? String(session.itemId) : null;
  }

  /**
   * The rows in the order to render while reordering, else null. The engine's order moves the
   * dragged row alone; its subtree, shown under a landing line, goes with it, as the move commits it.
   */
  get rows(): readonly string[] | null {
    if (!this.active) return null;
    const order = this.container.records.map((record) => String(record.id));
    const dragged = this.draggedId;
    if (dragged === null) return order;
    const model = this.#context.model();
    const subtree = order.filter((id) => model.isDescendant(id, dragged));
    if (!subtree.length) return order;
    const rest = order.filter((id) => !subtree.includes(id));
    rest.splice(rest.indexOf(dragged) + 1, 0, ...subtree);
    return rest;
  }

  get #landing(): TreeLanding | undefined {
    return this.container.refinement as TreeLanding | undefined;
  }

  /** The landing line shows: an anchor that moves the row somewhere it is accepted. */
  get lineShown(): boolean {
    const landing = this.#landing;
    return this.container.anchor !== null && !!landing?.valid && !landing.same;
  }

  /** The line's inset: the start handle and the indentation of the depth the row would take. */
  get lineInset(): number {
    return this.#context.lead() + (this.#landing?.depth ?? 0) * this.#context.indentation();
  }

  /** The row is dragged; under a landing line its subtree is dragged with it. */
  isSource(id: string): boolean {
    const dragged = this.draggedId;
    if (dragged === null) return false;
    return id === dragged || this.#context.model().isDescendant(id, dragged);
  }

  /** The parent the drag would land in as its last child. */
  isDropInto(id: string): boolean {
    return this.container.into === id;
  }

  /** The level the dragged row takes while the rows make room for it. */
  levelOf(id: string): number | null {
    const landing = this.#landing;
    // Under a landing line the rows stay still: the ghost holds the row's own place and level,
    // and the line's inset shows the depth.
    const lined =
      this.#context.host.dropIndicator === 'line' &&
      this.#manager?.dragOperation.input !== 'keyboard';
    return id === this.draggedId && landing && !lined && this.container.into === null
      ? landing.depth + 1
      : null;
  }

  pinnedIds(): readonly string[] {
    const dragged = this.draggedId;
    return dragged === null ? [] : [dragged];
  }

  // ── The tree's part of a landing ───────────────────────────────────────────

  /** The rows shown while a row is dragged: making room, its subtree goes with it. */
  dragItems(itemId: UniqueIdentifier, input: 'pointer' | 'keyboard'): readonly string[] {
    const rows = this.#context.rows();
    const id = String(itemId);
    const line = input === 'pointer' && this.#context.host.dropIndicator === 'line';
    if (line) return rows;
    const model = this.#context.model();
    return rows.filter((row) => row === id || !model.isDescendant(row, id));
  }

  /** Rows with children, or rows a drop predicate accepts, take the dragged row as a child. */
  holds(targetId: UniqueIdentifier, itemId: UniqueIdentifier): boolean {
    const model = this.#context.model();
    const node = model.get(String(targetId));
    if (!node || model.isDescendant(String(targetId), String(itemId))) return false;
    const move =
      node.expandable || this.#context.nestable()
        ? intoMove(model, String(itemId), String(targetId))
        : null;
    return !!move && this.#context.accepts(move);
  }

  /**
   * The level the landing takes: beside the row it lands before (or after the last one), moved in
   * or out by whole indentation steps of the drag's horizontal offset, within what the rows
   * around it allow.
   */
  refine(landing: ReorderLanding<string>): TreeLanding {
    const refined = this.#refine(landing);
    if (landing.input === 'keyboard') this.#announceStep(landing, refined);
    return refined;
  }

  /** The last keyboard step announced, so a step is announced once. */
  #announced = '';

  /** Each keyboard step says where the row would land. */
  #announceStep(landing: ReorderLanding<string>, refined: TreeLanding): void {
    const model = this.#context.model();
    const id = String(landing.itemId);
    const move = this.#moveOf(landing, refined);
    if (!move) return;
    const key = `${refined.parentId}:${move.toIndex}:${refined.depth}`;
    if (key === this.#announced) return;
    this.#announced = key;
    this.#context.announce(
      this.#context
        .messages()
        .moved(
          model.get(id)?.label ?? '',
          refined.depth + 1,
          this.#parentLabel(refined.parentId),
          move.toIndex + 1,
        ),
    );
  }

  /** The tree move a refined landing makes. */
  #moveOf(landing: ReorderLanding<string>, refined: TreeLanding): TreeMove | null {
    const model = this.#context.model();
    const id = String(landing.itemId);
    if (landing.into !== null) return intoMove(model, id, String(landing.into));
    const order = landing.order.map(String);
    return resolveMove(
      model,
      this.#rows(order, id, refined.depth, refined.parentId),
      order.indexOf(id),
      refined.parentId,
    );
  }

  #refine(landing: ReorderLanding<string>): TreeLanding {
    const model = this.#context.model();
    const id = String(landing.itemId);
    if (landing.into !== null) {
      const into = String(landing.into);
      return { depth: model.level(into) + 1, parentId: into, valid: true, same: false };
    }
    const order = landing.order.map(String);
    const index = order.indexOf(id);
    const beside = order[index + 1] ?? order[index - 1];
    const base =
      beside === undefined ? (model.get(id)?.depth ?? 0) : (model.get(beside)?.depth ?? 0);
    const requested =
      base +
      dragDepth(landing.offset.x, this.#context.indentation(), this.#context.direction() === 'rtl');
    const rows = this.#rows(order, id, 0, null);
    const projection = projectDepth(
      rows,
      index,
      requested,
      this.#context.nestable() ? (parent) => this.#context.nests(parent.id, id) : undefined,
    );
    const move = resolveMove(
      model,
      this.#rows(order, id, projection.depth, projection.parentId),
      index,
      projection.parentId,
    );
    const same =
      !move || (move.fromParentId === move.toParentId && move.fromIndex === move.toIndex);
    return {
      depth: projection.depth,
      parentId: projection.parentId,
      valid: !!move && (same || this.#context.accepts(move)),
      same,
    };
  }

  /** The move a landing makes, committed through the tree's own lanes. */
  commit(landing: ReorderLanding<string>, reason: ChangeReason, event: Event): boolean {
    const model = this.#context.model();
    const id = String(landing.itemId);
    const refined = landing.refinement as TreeLanding | undefined;
    if (!refined?.valid) return false;
    const move = this.#moveOf(landing, refined);
    if (!move) return false;
    if (move.fromParentId === move.toParentId && move.fromIndex === move.toIndex) return true;
    const committed = this.#context.commit(move, reason, event);
    if (committed) {
      const label = model.get(id)?.label ?? '';
      this.#context.announce(
        this.#context
          .messages()
          .dropped(
            label,
            move.toParentId === null ? 1 : model.level(move.toParentId) + 1,
            this.#parentLabel(move.toParentId),
            move.toIndex + 1,
          ),
      );
    }
    return committed;
  }

  /** The drag's announcements, in the tree's words. */
  observe(name: DragEventName, event: DragEvent): void {
    const id = event.operation.source?.id;
    if (id === undefined || event.operation.source?.data.list !== this.container) return;
    const model = this.#context.model();
    const node = model.get(String(id));
    if (!node) return;
    const messages = this.#context.messages();
    if (name === 'dragstart') {
      this.#announced = '';
      this.#context.announce(
        messages.pickedUp(node.label, node.depth + 1, this.#parentLabel(node.parentId)),
      );
    } else if (name === 'dragend' && (event.canceled || event.operation.canceled))
      this.#context.announce(
        messages.cancelled(
          node.label,
          node.depth + 1,
          this.#parentLabel(node.parentId),
          node.index + 1,
        ),
      );
  }

  #rows(
    order: readonly string[],
    id: string,
    depth: number,
    parentId: string | null,
  ): ProjectedRow[] {
    const model = this.#context.model();
    return order.map((row) =>
      row === id
        ? { id: row, depth, parentId }
        : {
            id: row,
            depth: model.get(row)?.depth ?? 0,
            parentId: model.get(row)?.parentId ?? null,
          },
    );
  }

  #parentLabel(parentId: string | null): string | null {
    return parentId === null ? null : (this.#context.model().get(parentId)?.label ?? parentId);
  }

  // ── Drawing, as every reordering container draws ──────────────────────────

  get #view(): ReorderView {
    return {
      container: this.container as ReorderContainer<unknown>,
      frame: this.#context.list() ?? this.#context.host,
      element: (id) => this.#context.element(String(id)) ?? undefined,
      sortable: (id) => this.#sortables.get(String(id)),
      placeholder: this.#manager?.feedback.placeholder,
      orientation: 'vertical',
    };
  }

  /**
   * Before a render: the engine's records follow the rows (and a drag's projected order), and the
   * mounted rows' places are recorded for the glides.
   */
  capture(): void {
    this.container.sync();
    if (this.#context.list()) this.#glides.capture(this.#view, this.#mountedIds());
  }

  /** After the render: the moved rows glide, and the landing line takes its place. */
  animate(line: HTMLElement | null): void {
    if (!this.#context.list()) return;
    this.#glides.play(this.#view, this.#mountedIds());
    if (line && this.lineShown) placeReorderLine(this.#view, line, this.lineInset);
  }

  #mountedIds(): string[] {
    return [...new Set([...(this.rows ?? []), ...this.#context.rows()])].filter(
      (id) => !!this.#context.element(id),
    );
  }

  // ── Entities ───────────────────────────────────────────────────────────────

  #ensureManager(): DragDropManager {
    if (this.#manager) return this.#manager;
    const manager = new DragDropManager({ accessibility: false, autoScroll: true });
    this.#manager = manager;
    this.container.connect(manager);
    return manager;
  }

  /** One Sortable per mounted row, on the shared reorder engine, after each render. */
  sync(): void {
    if (!this.enabled || !this.#context.host.isConnected) {
      this.#releaseEntities();
      return;
    }
    const manager = this.#ensureManager();
    const network = this.container.network!;
    const rows = this.rows ?? this.#context.rows();
    const wanted = new Set<string>();
    const defaults = reorderItemDefaults(this.#context.host);
    manager.registry.coordinator.batch(() => {
      for (const id of rows) {
        const element = this.#context.element(id);
        const handle = element?.querySelector<HTMLElement>('[data-handle]') ?? null;
        if (!element || !handle) continue;
        wanted.add(id);
        const index = rows.indexOf(id);
        const node = this.#context.model().get(id);
        const disabled = Boolean(node?.disabled) || this.#context.blocked();
        const sensors = this.#sensorsFor(element);
        let sortable = this.#sortables.get(id);
        if (!sortable) {
          sortable = new Sortable(
            {
              id,
              index,
              group: this.container.group,
              element,
              handle,
              type: network.type,
              accept: network.type,
              data: { list: this.container, tree: this.#context.host },
              disabled: { draggable: disabled, droppable: false },
              sensors,
              ...(defaults.feedback ? { feedback: defaults.feedback } : {}),
              ...(defaults.collisionDetector
                ? { collisionDetector: defaults.collisionDetector }
                : {}),
            },
            manager,
          );
          this.#sortables.set(id, sortable);
        } else {
          sortable.element = element;
          sortable.handle = handle;
          if (sortable.sensors !== sensors) sortable.sensors = sensors;
          sortable.setMembership(index, this.container.group);
          sortable.disabled = { draggable: disabled, droppable: false };
          if (defaults.collisionDetector) sortable.collisionDetector = defaults.collisionDetector;
        }
      }
      for (const [id, sortable] of this.#sortables)
        if (!wanted.has(id) && id !== this.draggedId) {
          sortable.destroy();
          this.#sortables.delete(id);
        }
    });
  }

  /**
   * The row's sensors: the pointer, from the handle or with whole-row activation from the row;
   * the keyboard from the focused row with Control+Enter (Command+Enter), one row per Up or Down
   * and one level per Left or Right.
   */
  #sensorsFor(element: HTMLElement): SensorConfiguration {
    const context = this.#context;
    const activation = context.activation();
    let sensors = this.#rowSensors.get(element);
    if (sensors?.activation !== activation) {
      sensors = {
        activation,
        sensors: [
          activation === 'item'
            ? PointerSensor.configure({
                activatorElements: [element],
                preventActivation: this.#preventActivation,
              })
            : PointerSensor.configure(),
          KeyboardSensor.configure({
            activatorElements: [element],
            keyboardCodes: { start: ['Enter'] },
            get offset() {
              return { x: context.indentation(), y: element.offsetHeight || 1 };
            },
            preventActivation: (event) =>
              !(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey,
          }),
        ],
      };
      this.#rowSensors.set(element, sensors);
    }
    return sensors.sensors;
  }

  /**
   * Whole-row activation: presses on the handle start at once; presses on the row's controls
   * (state buttons, a rename field) and on a parent's chevron stay theirs.
   */
  #preventActivation = (event: PointerEvent, source: Draggable): boolean => {
    const element = source.element;
    if (!element) return true;
    const target = event.composedPath()[0];
    if (source.handle && target instanceof Node && composedContains(source.handle, target))
      return false;
    if (targetInPath(event, element, "[part~='indicator']:not([data-placeholder])")) return true;
    return interactiveTargetInPath(event, element);
  };

  #releaseEntities(): void {
    for (const sortable of this.#sortables.values()) sortable.destroy();
    this.#sortables.clear();
  }

  disconnect(): void {
    this.#glides.cancel();
    this.#releaseEntities();
    this.container.disconnect();
    this.#manager?.destroy();
    this.#manager = null;
  }
}
