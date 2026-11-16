import { DRAG_COPY_OPACITY } from '../../foundation/drag-drop/feedback.js';
import {
  landingLine,
  landingSide,
  landingTarget,
  type LandingBox,
} from '../../foundation/drag-drop/landing.js';
import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { Sortable } from '../../foundation/drag-drop/sortable.js';
import { PointerSensor } from '../../foundation/drag-drop/sensors/index.js';
import type { Draggable } from '../../foundation/drag-drop/entities.js';
import type { DragEvent, SensorConfiguration } from '../../foundation/drag-drop/types.js';
import { composedContains } from '../../foundation/focus.js';
import { interactiveTargetInPath, targetInPath } from '../../foundation/interactive-target.js';
import { dragMotion, dragMotionContext } from '../../foundation/drag-drop/motion.js';
import { resolveMotionTiming, type MotionHandle } from '../../foundation/motion.js';
import {
  dragDepth,
  intoMove,
  placeRow,
  projectDepth,
  resolveMove,
  type ProjectedRow,
  type TreeModel,
  type TreeMove,
} from '../../foundation/tree/index.js';
import type { ChangeReason, Direction } from '../../foundation/types.js';
import type { TreeViewDragActivation, TreeViewDropIndicator, TreeViewMessages } from './types.js';

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
  /** The element the rows are laid out in. */
  list(): HTMLElement | null;
  activation(): TreeViewDragActivation;
  indicator(): TreeViewDropIndicator;
  /** A drop predicate is set: rows without children may take children it accepts. */
  nestable(): boolean;
  /** Whether the drop predicate lets an item be a child of a parent at all. */
  nests(parentId: string, itemId: string): boolean;
  messages(): Required<TreeViewMessages>;
  direction(): Direction;
  /** One indentation step in CSS pixels. */
  indentation(): number;
  /** The inline space before depth zero's content that rows keep at every depth (a start handle). */
  lead(): number;
  announce(message: string): void;
  accepts(move: TreeMove): boolean;
  commit(move: TreeMove, reason: ChangeReason, sourceEvent?: Event): boolean;
  focus(id: string): Promise<void>;
}

interface Session {
  sourceId: string;
  input: 'pointer' | 'keyboard';
  /** Visible rows with the source's descendants removed, in projected order. */
  rows: string[];
  /** The rows rendered while a line marks the landing place: the order before the drag. */
  still: readonly string[] | null;
  /** The source's descendants, hidden while rows make space and dragged with it otherwise. */
  descendants: ReadonlySet<string>;
  /** The parent the source lands in as its last child, instead of the projected place. */
  into: string | null;
  /** Rows that take the source as a child, decided once per row. */
  holds: Map<string, boolean>;
  point: { x: number; y: number } | null;
  /** Where the pointer took hold of the source row, from the row's top. */
  grab: number;
  /** The block offset the source row is drawn at to stay under the pointer. */
  follow: number;
  initialDepth: number;
  /** The level a pointer drag projects from: the row it was last beside. */
  baseDepth: number;
  depth: number;
  parentId: string | null;
  /** The last projection the consumer accepted. */
  valid: { index: number; depth: number; parentId: string | null } | null;
  offset: number;
}

const GROUP = 'tp-tree-view';

/** The insertion line of a drag, in the list's coordinates. */
export interface DropLine {
  top: number;
  inset: number;
}

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
  /** Row boxes at rest after the last render, in the list's coordinates (no glide offsets). */
  #rowSensors = new WeakMap<HTMLElement, SensorConfiguration>();
  /** The row drawn under the pointer, lifted above its neighbours until it settles. */
  #lifted: HTMLElement | null = null;
  #layout = new Map<string, { top: number; height: number }>();
  /**
   * A released drag settling: renders within one frame of the release glide rows from where they
   * were drawn to their committed place, and the source stays translucent until it arrives.
   */
  #settle: {
    sourceId: string;
    dragged: ReadonlySet<string>;
    rows: readonly string[];
    open: boolean;
  } | null = null;
  #settleMotion: MotionHandle | null = null;
  #line: DropLine | null = null;

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

  /** Rendered order while reordering, else null. */
  get rows(): readonly string[] | null {
    const session = this.#session;
    return session ? (session.still ?? session.rows) : null;
  }

  /** The item whose place a dimmed copy holds while a pointer drags it, else null. */
  get ghostId(): string | null {
    const session = this.#session;
    return session?.input === 'pointer' ? session.sourceId : null;
  }

  /** The insertion line while a line marks the landing place, else null. */
  get line(): DropLine | null {
    return this.#session?.still ? this.#line : null;
  }

  /** The item is dragged, or settling after the drop; a line drag carries its descendants. */
  isSource(id: string): boolean {
    const session = this.#session;
    if (session) return session.sourceId === id || (!!session.still && session.descendants.has(id));
    return !!this.#settle?.dragged.has(id);
  }

  /** The parent a drag would land in as its last child. */
  isDropInto(id: string): boolean {
    return this.#session?.into === id;
  }

  /** Projected level of the source row while its row moves with the projection. */
  levelOf(id: string): number | null {
    const session = this.#session;
    return session?.sourceId === id && !session.still ? session.depth + 1 : null;
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
      this.#context.host.requestUpdate();
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
      manager.monitor.addEventListener('dragmove', (event) => this.#pointer('dragmove', event)),
      manager.monitor.addEventListener('dragend', (event) => this.#pointer('dragend', event)),
    );
    return manager;
  }

  #pointer(name: 'dragstart' | 'dragmove' | 'dragend', event: DragEvent): void {
    const source = event.operation.source;
    if (!source || source.data.tree !== this.#context.host) return;
    const id = String(source.id);
    if (name === 'dragstart') {
      if (!this.#canStart(id)) {
        void this.#manager?.actions.stop({ canceled: true });
        return;
      }
      this.#begin(id, 'pointer');
      const session = this.#session!;
      const start = event.operation.position.initial;
      const rect = this.#context.element(id)?.getBoundingClientRect();
      session.point = { x: start.x, y: start.y };
      session.grab = rect ? Math.min(Math.max(start.y - rect.top, 0), rect.height) : 0;
      this.#context.host.ownerDocument.addEventListener('scroll', this.#scrolled, true);
      return;
    }
    const session = this.#session;
    if (!session || session.input !== 'pointer') return;
    if (name === 'dragmove') {
      // The event precedes the operation's own move: `to` is where the pointer is now.
      const { current, initial } = event.operation.position;
      const point = event.to ?? current;
      session.offset = dragDepth(
        point.x - initial.x,
        this.#indentation(),
        this.#context.direction() === 'rtl',
      );
      session.point = { x: point.x, y: point.y };
      this.#track();
      return;
    }
    this.#finish(Boolean(event.canceled || event.operation.canceled), event.nativeEvent);
  }

  /** Auto-scroll moves rows under a still pointer: the landing place follows. */
  #scrolled = (): void => {
    if (this.#session?.input === 'pointer') this.#track();
  };

  /**
   * Follow the pointer: the row under it (or the nearest across a gap) and the side of it the
   * pointer is on decide where the source lands, by the shared landing rules. Rows are hit-tested
   * at their resting boxes, so rows still gliding aside do not flip the decision back.
   */
  #track(): void {
    const session = this.#session!;
    const point = session.point;
    const list = this.#context.list();
    if (!point || !list) return;
    const listTop = list.getBoundingClientRect().top;
    const shown = session.still ?? session.rows;
    const entries: { id: string; box: LandingBox }[] = [];
    for (const id of shown) {
      const rest = this.#box(id, listTop);
      if (rest)
        entries.push({
          id,
          box: { start: listTop + rest.top, end: listTop + rest.top + rest.height },
        });
    }
    const landing = landingTarget(entries, point.y);
    const target = landing?.id ?? null;
    const box = landing?.box ?? null;
    const before = { rows: session.rows.join(), into: session.into, depth: session.depth };
    if (
      target !== null &&
      box &&
      (target === session.sourceId || session.descendants.has(target))
    ) {
      // Over the source itself: a line drag goes back to where it started; rows that make space
      // have moved the source under the pointer, which keeps its place.
      session.into = null;
      if (session.still) {
        session.baseDepth = session.initialDepth;
        session.rows = session.still.filter((id) => !session.descendants.has(id));
      }
      this.#project(session.baseDepth + session.offset, false);
    } else if (target !== null && box) {
      const zone = landingSide(box, point.y, { into: this.#holds(target) });
      if (zone === 'into') {
        // Rows keep their place; the parent marks the landing.
        session.into = target;
        this.#resolveInto(target);
      } else {
        session.into = null;
        // Beside a row is that row's level; moving sideways from there changes it.
        session.baseDepth = this.#context.model().get(target)?.depth ?? session.initialDepth;
        session.rows = placeRow(session.rows, session.sourceId, target, zone);
        this.#project(session.baseDepth + session.offset, false);
      }
    } else if (!session.into && session.depth !== session.baseDepth + session.offset)
      this.#project(session.baseDepth + session.offset, false);
    this.#placeLine();
    this.#follow();
    if (
      before.rows !== session.rows.join() ||
      before.into !== session.into ||
      before.depth !== session.depth
    ) {
      this.#announceMove();
      this.#context.host.requestUpdate();
    }
  }

  /** A row's resting box in list coordinates, measured now when no render recorded it. */
  #box(id: string, listTop: number): { top: number; height: number } | null {
    const known = this.#layout.get(id);
    if (known) return known;
    const element = this.#context.element(id);
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const drawn = this.#session?.sourceId === id ? this.#session.follow : 0;
    return { top: rect.top - drawn - listTop, height: rect.height };
  }

  /**
   * The dragged row stays under the pointer where it was taken hold of, within the list: its
   * place in the list shows as the gap the rows made (or the place it left), and the drop glides
   * it from the pointer to where it lands.
   */
  #follow(): void {
    const session = this.#session;
    const list = this.#context.list();
    if (!session || session.input !== 'pointer' || !session.point || !list) return;
    const element = this.#context.element(session.sourceId);
    if (!element) return;
    const bounds = list.getBoundingClientRect();
    const rest = this.#box(session.sourceId, bounds.top);
    if (!rest) return;
    const top = Math.min(
      Math.max(session.point.y - session.grab, bounds.top),
      Math.max(bounds.top, bounds.bottom - rest.height),
    );
    session.follow = top - (bounds.top + rest.top);
    this.#lifted = element;
    element.style.position = 'relative';
    element.style.zIndex = '1';
    element.style.translate = `0 ${session.follow}px`;
    // The shared drag look: the copy under the pointer is slightly translucent while the ghost
    // holds its place.
    element.style.opacity = DRAG_COPY_OPACITY;
    // The dimmed copy holds the row's place: the gap the rows made, or the place it left.
    const ghost = list.querySelector<HTMLElement>('.drag-ghost');
    if (ghost) ghost.style.translate = `0 ${rest.top}px`;
  }

  /** Puts the lifted row back in the flow of the list. */
  #drop(all: boolean): void {
    const element = this.#lifted;
    if (!element) return;
    element.style.translate = '';
    if (!all) return;
    element.style.position = '';
    element.style.zIndex = '';
    element.style.opacity = '';
    this.#lifted = null;
  }

  /** Whether a row takes the source as its last child: always rows with children, others under a drop predicate. */
  #holds(id: string): boolean {
    const session = this.#session!;
    let holds = session.holds.get(id);
    if (holds === undefined) {
      const model = this.#context.model();
      const node = model.get(id);
      const move =
        node && (node.expandable || this.#context.nestable())
          ? intoMove(model, session.sourceId, id)
          : null;
      holds = !!move && this.#context.accepts(move);
      session.holds.set(id, holds);
    }
    return holds;
  }

  /**
   * Over a parent's middle: the parent marks the landing, so the dragged row keeps the level it
   * was drawn at; the move appends it to the parent's children.
   */
  #resolveInto(parentId: string): void {
    const session = this.#session!;
    session.parentId = parentId;
    session.valid = {
      index: session.rows.indexOf(session.sourceId),
      depth: session.depth,
      parentId,
    };
  }

  /** The line between the rows around the projected place, inset to the projected depth. */
  #placeLine(): void {
    const session = this.#session!;
    const previous = this.#line;
    this.#line = null;
    const list = this.#context.list();
    if (session.still && list && !session.into && session.valid && this.#changes(session)) {
      const listTop = list.getBoundingClientRect().top;
      const index = session.rows.indexOf(session.sourceId);
      const above = session.rows[index - 1];
      const below = session.rows[index + 1];
      const extent = (id: string | undefined): LandingBox | null => {
        const box = id === undefined ? null : this.#box(id, listTop);
        return box ? { start: box.top, end: box.top + box.height } : null;
      };
      // After the row above (and its source subtree, if that is what follows it), by the shared
      // landing line.
      const top =
        above !== undefined
          ? landingLine(extent(above), extent(session.still[session.still.indexOf(above) + 1]))
          : landingLine(null, extent(below));
      if (top !== null)
        this.#line = { top, inset: this.#context.lead() + session.depth * this.#indentation() };
    }
    if (previous?.top !== this.#line?.top || previous?.inset !== this.#line?.inset)
      this.#context.host.requestUpdate();
  }

  /** The projected place differs from where the source is. */
  #changes(session: Session): boolean {
    const move = this.#move(session);
    return !!move && !(move.fromParentId === move.toParentId && move.fromIndex === move.toIndex);
  }

  #move(session: Session): TreeMove | null {
    const model = this.#context.model();
    if (session.into !== null) return intoMove(model, session.sourceId, session.into);
    return resolveMove(
      model,
      this.#rowsWithDepths(session),
      session.rows.indexOf(session.sourceId),
      session.parentId,
    );
  }

  #announceMove(): void {
    const session = this.#session!;
    const move = this.#move(session);
    if (!move) return;
    const model = this.#context.model();
    const label = model.get(session.sourceId)?.label ?? '';
    const level = session.into === null ? session.depth + 1 : model.level(session.into) + 1;
    this.#context.announce(
      this.#context
        .messages()
        .moved(label, level, this.#parentLabel(session.parentId), move.toIndex + 1),
    );
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

  #indentation(): number {
    return this.#context.indentation();
  }

  // ── Session ────────────────────────────────────────────────────────────────

  #begin(id: string, input: Session['input']): void {
    const model = this.#context.model();
    const node = model.get(id)!;
    const descendants = new Set(model.descendants(id));
    const visible = this.#context.rows();
    const rows = visible.filter((row) => !descendants.has(row));
    this.#cancelSettle();
    this.#line = null;
    this.#session = {
      sourceId: id,
      input,
      rows,
      still: input === 'pointer' && this.#context.indicator() === 'line' ? [...visible] : null,
      descendants,
      into: null,
      holds: new Map(),
      point: null,
      grab: 0,
      follow: 0,
      initialDepth: node.depth,
      baseDepth: node.depth,
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
    // Under a drop predicate, a row only nests under rows that take it as a child.
    const source = session.sourceId;
    const projection = projectDepth(
      rows,
      index,
      requestedDepth,
      this.#context.nestable() ? (parent) => this.#context.nests(parent.id, source) : undefined,
    );
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
  }

  #finish(canceled: boolean, event?: Event): void {
    const session = this.#session;
    if (!session) return;
    const document = this.#context.host.ownerDocument;
    document.removeEventListener('keydown', this.#keyboard, true);
    document.removeEventListener('scroll', this.#scrolled, true);
    // Rows glide from where they are drawn now to their committed place (or back).
    const dragged = new Set([session.sourceId, ...session.descendants]);
    this.#settle = {
      sourceId: session.sourceId,
      dragged,
      rows: [...(session.still ?? session.rows), ...session.descendants],
      open: true,
    };
    this.#session = null;
    this.#line = null;
    const model = this.#context.model();
    const node = model.get(session.sourceId);
    const messages = this.#context.messages();
    const label = node?.label ?? '';
    let committed = false;
    if (!canceled && session.valid) {
      const move = this.#move(session);
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
    // An owner that writes the move back later than the next frame renders it without a glide.
    const settle = this.#settle;
    const view = document.defaultView;
    const close = () => {
      if (this.#settle !== settle) return;
      settle.open = false;
      if (!this.#settleMotion) this.#endSettle();
    };
    if (view) view.requestAnimationFrame(close);
    else close();
  }

  #endSettle(): void {
    this.#drop(true);
    if (!this.#settle) return;
    this.#settle = null;
    this.#settleMotion = null;
    this.#context.host.requestUpdate();
  }

  #cancelSettle(): void {
    this.#drop(true);
    this.#settle = null;
    this.#settleMotion = null;
  }

  #parentLabel(parentId: string | null): string | null {
    return parentId === null ? null : (this.#context.model().get(parentId)?.label ?? parentId);
  }

  // ── Displacement ───────────────────────────────────────────────────────────

  /** Before a render that may move rows: remember where the mounted rows are drawn. */
  capture(): void {
    const session = this.#session;
    const settle = this.#settle;
    const ids = session
      ? (session.still ?? session.rows)
      : settle?.open
        ? [...new Set([...settle.rows, ...this.#context.rows()])]
        : null;
    if (!ids) return;
    this.#rects.clear();
    ids.forEach((id, index) => {
      const element = this.#context.element(id);
      if (!element) return;
      // Where the row is drawn, mid-glide included, so a re-targeted glide starts from there.
      const rect = element.getBoundingClientRect();
      const motion = this.#motions.get(id);
      motion?.cancel();
      // A re-targeted settle starts over from here; the cancelled glide no longer ends it.
      if (motion && motion === this.#settleMotion) this.#settleMotion = null;
      this.#rects.set(id, { top: rect.top, left: rect.left, index });
    });
    // The released row leaves the pointer: it glides from where it was drawn to its place.
    if (!session && settle) this.#drop(false);
  }

  /**
   * After the render: rows that moved glide from where they were drawn. While dragging they make
   * space (`sort-displacement`); after the release the source travels to its place
   * (`drop-settlement`) as the rows around it make room.
   */
  animate(): void {
    const session = this.#session;
    const rows = session ? (session.still ?? session.rows) : this.#context.rows();
    this.#layout.clear();
    const list = this.#context.list();
    const listTop = session && list ? list.getBoundingClientRect().top : 0;
    const settle = session ? null : this.#settle;
    const boxes = new Map<string, DOMRect>();
    for (const id of session ? rows : this.#rects.keys()) {
      const rect = this.#context.element(id)?.getBoundingClientRect();
      if (!rect) continue;
      boxes.set(id, rect);
      // The row under the pointer is drawn away from its place in the list.
      const drawn = session?.sourceId === id ? session.follow : 0;
      if (session) this.#layout.set(id, { top: rect.top - drawn - listTop, height: rect.height });
    }
    for (const [id, previous] of this.#rects) {
      const element = this.#context.element(id);
      const rect = boxes.get(id);
      if (!element || !rect) continue;
      // While dragging, the source stays under the pointer instead of gliding to its slot.
      if (session?.input === 'pointer' && id === session.sourceId) continue;
      const x = previous.left - rect.left;
      const y = previous.top - rect.top;
      if (!x && !y) continue;
      const role = settle?.sourceId === id ? 'drop-settlement' : 'sort-displacement';
      const motion = dragMotion(
        element,
        element,
        role,
        [{ translate: `${x}px ${y}px` }, { translate: '0 0' }],
        resolveMotionTiming(element, 'fast', 'enter'),
        dragMotionContext(id, { fromIndex: previous.index, toIndex: rows.indexOf(id) }, { x, y }),
      );
      this.#motions.set(id, motion);
      if (role === 'drop-settlement') {
        this.#settleMotion = motion;
        void motion.finished
          .catch(() => undefined)
          .then(() => {
            if (this.#settleMotion !== motion) return;
            this.#settleMotion = null;
            if (!this.#settle?.open) this.#endSettle();
          });
      }
    }
    this.#rects.clear();
    // The source's place in the list may have moved: keep it under the pointer.
    this.#follow();
    // A settle with nothing left to glide ends once its window has closed.
    if (settle && !settle.open && !this.#settleMotion) this.#endSettle();
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
        const sensors = this.#sensorsFor(element);
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
              ...(sensors ? { sensors } : {}),
            },
            manager,
          );
          this.#sortables.set(id, sortable);
        } else {
          sortable.element = element;
          sortable.handle = handle;
          if (sortable.sensors !== sensors) sortable.sensors = sensors;
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

  /** Whole-row activation binds the row as the activator, keeping one binding per element. */
  #sensorsFor(element: HTMLElement): SensorConfiguration | undefined {
    if (this.#context.activation() !== 'item') return undefined;
    let sensors = this.#rowSensors.get(element);
    if (!sensors) {
      sensors = [
        PointerSensor.configure({
          activatorElements: [element],
          preventActivation: this.#preventActivation,
        }),
      ];
      this.#rowSensors.set(element, sensors);
    }
    return sensors;
  }

  #releaseEntities(): void {
    for (const sortable of this.#sortables.values()) sortable.destroy();
    this.#sortables.clear();
  }

  disconnect(): void {
    if (this.#session) this.#finish(true);
    this.#cancelSettle();
    this.#drop(true);
    this.#releaseEntities();
    for (const release of this.#releases) release();
    this.#releases = [];
    this.#manager?.destroy();
    this.#manager = null;
  }
}
