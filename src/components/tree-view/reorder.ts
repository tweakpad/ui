import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { Sortable } from '../../foundation/drag-drop/sortable.js';
import { PointerSensor } from '../../foundation/drag-drop/sensors/index.js';
import type { DragEvent } from '../../foundation/drag-drop/types.js';
import { dragMotion, dragMotionContext } from '../../foundation/drag-drop/motion.js';
import type { MotionHandle } from '../../foundation/motion.js';
import {
  dragDepth,
  projectDepth,
  resolveMove,
  type ProjectedRow,
  type TreeModel,
  type TreeMove,
} from '../../foundation/tree/index.js';
import type { ChangeReason, Direction } from '../../foundation/types.js';
import type { TreeViewMessages } from './types.js';

/** What the reorder binding needs from its tree. */
export interface ReorderContext {
  host: HTMLElement & { requestUpdate(): void };
  /** Records mode with `reorderable`. */
  enabled(): boolean;
  /** Disabled or read-only. */
  blocked(): boolean;
  model(): TreeModel<unknown>;
  /** Visible rows in order. */
  rows(): readonly string[];
  /** Mounted row element of an item. */
  element(id: string): HTMLElement | null;
  messages(): Required<TreeViewMessages>;
  direction(): Direction;
  /** One indentation step in CSS pixels. */
  indentation(): number;
  announce(message: string): void;
  accepts(move: TreeMove): boolean;
  commit(move: TreeMove, reason: ChangeReason, sourceEvent?: Event): boolean;
  focus(id: string): Promise<void>;
}

interface Session {
  sourceId: string;
  input: 'pointer' | 'keyboard';
  /** Visible rows with the source's descendants removed, in preview order. */
  rows: string[];
  initialDepth: number;
  depth: number;
  parentId: string | null;
  /** The last projection the consumer accepted. */
  valid: { index: number; depth: number; parentId: string | null } | null;
  offset: number;
}

const GROUP = 'tp-tree-view';

/**
 * Records-mode reordering (Foundation §19.19 tree reorder profile). Pointer drags run through a
 * Drag-and-drop manager with one Sortable per mounted row; the tree renders the projected
 * order itself, so the manager's own DOM sorting is claimed away. Keyboard reordering starts
 * with Control+Enter (Command+Enter) on an item.
 */
export class TreeReorder {
  readonly #context: ReorderContext;
  #manager: DragDropManager | null = null;
  #releases: Array<() => void> = [];
  #sortables = new Map<string, Sortable>();
  #session: Session | null = null;
  #type = Symbol('tree-view-item');
  #rects = new Map<string, { top: number; left: number; index: number }>();
  #motions = new Map<string, MotionHandle>();

  constructor(context: ReorderContext) {
    this.#context = context;
  }

  /** Records mode with `reorderable`. */
  get enabled(): boolean {
    return this.#context.enabled();
  }

  /** A reorder is in progress. */
  get active(): boolean {
    return this.#session !== null;
  }

  /** Preview order while reordering, else null. */
  get rows(): readonly string[] | null {
    return this.#session?.rows ?? null;
  }

  isSource(id: string): boolean {
    return this.#session?.sourceId === id;
  }

  /** Projected level of the source row while reordering. */
  levelOf(id: string): number | null {
    return this.#session?.sourceId === id ? this.#session.depth + 1 : null;
  }

  pinnedIds(): readonly string[] {
    return this.#session ? [this.#session.sourceId] : [];
  }

  #canStart(id: string): boolean {
    const node = this.#context.model().get(id);
    return this.enabled && !!node && !node.disabled && !this.#context.blocked() && !this.#session;
  }

  // ── Keyboard ───────────────────────────────────────────────────────────────

  /** Control+Enter (Command+Enter) picks up the focused item. */
  keyboardStart(event: KeyboardEvent, id: string): boolean {
    if (
      event.key !== 'Enter' ||
      !(event.ctrlKey || event.metaKey) ||
      event.shiftKey ||
      event.altKey
    )
      return false;
    if (!this.#canStart(id)) return false;
    this.#begin(id, 'keyboard');
    this.#context.host.ownerDocument.addEventListener('keydown', this.#keyboard, true);
    return true;
  }

  #keyboard = (event: KeyboardEvent): void => {
    const session = this.#session;
    if (!session || session.input !== 'keyboard') return;
    const rtl = this.#context.direction() === 'rtl';
    const index = session.rows.indexOf(session.sourceId);
    let handled = true;
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowDown': {
        const next = index + (event.key === 'ArrowUp' ? -1 : 1);
        if (next < 0 || next >= session.rows.length) break;
        session.rows.splice(index, 1);
        session.rows.splice(next, 0, session.sourceId);
        this.#project(session.depth, true);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowRight': {
        const deeper = (event.key === 'ArrowRight') !== rtl;
        this.#project(session.depth + (deeper ? 1 : -1), true);
        break;
      }
      case ' ':
      case 'Enter':
      case 'Tab':
        this.#finish(false, event);
        break;
      case 'Escape':
        this.#finish(true, event);
        break;
      default:
        handled = false;
    }
    if (handled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  // ── Pointer ────────────────────────────────────────────────────────────────

  #ensureManager(): DragDropManager {
    if (this.#manager) return this.#manager;
    const manager = new DragDropManager({
      sensors: [PointerSensor.configure()],
      feedback: 'none',
      accessibility: false,
      autoScroll: true,
    });
    this.#manager = manager;
    // The tree renders the projected order; the manager must not reorder its rows.
    this.#releases.push(manager.sorting.own((source) => source.data.tree === this.#context.host));
    this.#releases.push(
      manager.monitor.addEventListener('dragstart', (event) => this.#pointer('dragstart', event)),
      manager.monitor.addEventListener('dragover', (event) => this.#pointer('dragover', event)),
      manager.monitor.addEventListener('dragmove', (event) => this.#pointer('dragmove', event)),
      manager.monitor.addEventListener('dragend', (event) => this.#pointer('dragend', event)),
    );
    return manager;
  }

  #pointer(name: 'dragstart' | 'dragover' | 'dragmove' | 'dragend', event: DragEvent): void {
    const source = event.operation.source;
    if (!source || source.data.tree !== this.#context.host) return;
    const id = String(source.id);
    if (name === 'dragstart') {
      if (!this.#canStart(id)) {
        void this.#manager?.actions.stop({ canceled: true });
        return;
      }
      this.#begin(id, 'pointer');
      return;
    }
    const session = this.#session;
    if (!session || session.input !== 'pointer') return;
    if (name === 'dragover') {
      const target = event.operation.target;
      if (!target || String(target.id) === id) return;
      const from = session.rows.indexOf(id);
      const to = session.rows.indexOf(String(target.id));
      if (from < 0 || to < 0) return;
      session.rows.splice(from, 1);
      session.rows.splice(to, 0, id);
      this.#project(session.initialDepth + session.offset, true);
      return;
    }
    if (name === 'dragmove') {
      const offset = dragDepth(
        event.operation.transform.x,
        this.#indentation(),
        this.#context.direction() === 'rtl',
      );
      if (offset === session.offset) return;
      session.offset = offset;
      this.#project(session.initialDepth + offset, false);
      return;
    }
    this.#finish(Boolean(event.canceled || event.operation.canceled), event.nativeEvent);
  }

  #indentation(): number {
    return this.#context.indentation();
  }

  // ── Session ────────────────────────────────────────────────────────────────

  #begin(id: string, input: Session['input']): void {
    const model = this.#context.model();
    const node = model.get(id)!;
    const descendants = new Set(model.descendants(id));
    const rows = this.#context.rows().filter((row) => !descendants.has(row));
    this.#session = {
      sourceId: id,
      input,
      rows,
      initialDepth: node.depth,
      depth: node.depth,
      parentId: node.parentId,
      valid: { index: rows.indexOf(id), depth: node.depth, parentId: node.parentId },
      offset: 0,
    };
    const messages = this.#context.messages();
    this.#context.announce(
      messages.pickedUp(node.label, node.depth + 1, this.#parentLabel(node.parentId)),
    );
    this.#context.host.requestUpdate();
  }

  #rowsWithDepths(session: Session): ProjectedRow[] {
    const model = this.#context.model();
    return session.rows.map((id) =>
      id === session.sourceId
        ? { id, depth: session.depth, parentId: session.parentId }
        : { id, depth: model.get(id)?.depth ?? 0, parentId: model.get(id)?.parentId ?? null },
    );
  }

  /** Re-project the source at its current preview index; vetoed projections are not kept. */
  #project(requestedDepth: number, announce: boolean): void {
    const session = this.#session!;
    const rows = this.#rowsWithDepths(session);
    const index = session.rows.indexOf(session.sourceId);
    const projection = projectDepth(rows, index, requestedDepth);
    session.depth = projection.depth;
    session.parentId = projection.parentId;
    const move = resolveMove(
      this.#context.model(),
      this.#rowsWithDepths(session),
      index,
      projection.parentId,
    );
    if (move && this.#context.accepts(move))
      session.valid = { index, depth: projection.depth, parentId: projection.parentId };
    else if (move && move.fromParentId === move.toParentId && move.fromIndex === move.toIndex)
      session.valid = { index, depth: projection.depth, parentId: projection.parentId };
    else session.valid = null;
    if (announce && move) {
      const label = this.#context.model().get(session.sourceId)?.label ?? '';
      this.#context.announce(
        this.#context
          .messages()
          .moved(
            label,
            projection.depth + 1,
            this.#parentLabel(projection.parentId),
            move.toIndex + 1,
          ),
      );
    }
    this.#context.host.requestUpdate();
  }

  #finish(canceled: boolean, event?: Event): void {
    const session = this.#session;
    if (!session) return;
    this.#context.host.ownerDocument.removeEventListener('keydown', this.#keyboard, true);
    this.#session = null;
    const model = this.#context.model();
    const node = model.get(session.sourceId);
    const messages = this.#context.messages();
    const label = node?.label ?? '';
    let committed = false;
    if (!canceled && session.valid) {
      const index = session.rows.indexOf(session.sourceId);
      const move = resolveMove(model, this.#rowsWithDepths(session), index, session.parentId);
      if (move && !(move.fromParentId === move.toParentId && move.fromIndex === move.toIndex)) {
        committed = this.#context.commit(
          move,
          session.input === 'keyboard' ? 'keyboard' : 'drag',
          event,
        );
        if (committed)
          this.#context.announce(
            messages.dropped(
              label,
              move.toParentId === null ? 1 : model.level(move.toParentId) + 1,
              this.#parentLabel(move.toParentId),
              move.toIndex + 1,
            ),
          );
      }
    }
    if (!committed && node)
      this.#context.announce(
        messages.cancelled(label, node.depth + 1, this.#parentLabel(node.parentId), node.index + 1),
      );
    this.#context.host.requestUpdate();
    if (session.input === 'keyboard') void this.#context.focus(session.sourceId);
  }

  #parentLabel(parentId: string | null): string | null {
    return parentId === null ? null : (this.#context.model().get(parentId)?.label ?? parentId);
  }

  // ── Displacement ───────────────────────────────────────────────────────────

  /** Before a render that may move rows: remember where the mounted rows are. */
  capture(): void {
    const session = this.#session;
    if (!session) return;
    this.#rects.clear();
    session.rows.forEach((id, index) => {
      const element = this.#context.element(id);
      if (!element) return;
      this.#motions.get(id)?.cancel();
      const rect = element.getBoundingClientRect();
      this.#rects.set(id, { top: rect.top, left: rect.left, index });
    });
  }

  /** After the render: rows that moved glide from their old place (`sort-displacement`). */
  animate(): void {
    const rows = this.#session?.rows ?? this.#context.rows();
    for (const [id, previous] of this.#rects) {
      const element = this.#context.element(id);
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const x = previous.left - rect.left;
      const y = previous.top - rect.top;
      if (!x && !y) continue;
      this.#motions.set(
        id,
        dragMotion(
          element,
          element,
          'sort-displacement',
          [{ translate: `${x}px ${y}px` }, { translate: '0 0' }],
          { duration: 200, easing: 'cubic-bezier(0.25, 1, 0.5, 1)' },
          dragMotionContext(id, { fromIndex: previous.index, toIndex: rows.indexOf(id) }, { x, y }),
        ),
      );
    }
    this.#rects.clear();
  }

  // ── Entities ───────────────────────────────────────────────────────────────

  /** Bind one Sortable per mounted row after each render. */
  sync(): void {
    if (!this.enabled || !this.#context.host.isConnected) {
      this.#releaseEntities();
      return;
    }
    const manager = this.#ensureManager();
    const rows = this.#session?.rows ?? this.#context.rows();
    const wanted = new Set<string>();
    manager.registry.coordinator.batch(() => {
      for (const id of rows) {
        const element = this.#context.element(id);
        const handle = element?.querySelector<HTMLElement>('[data-handle]') ?? null;
        if (!element || !handle) continue;
        wanted.add(id);
        const index = rows.indexOf(id);
        const node = this.#context.model().get(id);
        const disabled = Boolean(node?.disabled) || this.#context.blocked();
        let sortable = this.#sortables.get(id);
        if (!sortable) {
          sortable = new Sortable(
            {
              id,
              index,
              group: GROUP,
              element,
              handle,
              type: this.#type,
              accept: this.#type,
              data: { tree: this.#context.host },
              transition: null,
              disabled: { draggable: disabled, droppable: false },
            },
            manager,
          );
          this.#sortables.set(id, sortable);
        } else {
          sortable.element = element;
          sortable.handle = handle;
          sortable.setMembership(index, GROUP);
          sortable.disabled = { draggable: disabled, droppable: false };
        }
      }
      for (const [id, sortable] of this.#sortables)
        if (!wanted.has(id) && id !== this.#session?.sourceId) {
          sortable.destroy();
          this.#sortables.delete(id);
        }
    });
  }

  #releaseEntities(): void {
    for (const sortable of this.#sortables.values()) sortable.destroy();
    this.#sortables.clear();
  }

  disconnect(): void {
    if (this.#session) this.#finish(true);
    this.#releaseEntities();
    for (const release of this.#releases) release();
    this.#releases = [];
    this.#manager?.destroy();
    this.#manager = null;
  }
}
