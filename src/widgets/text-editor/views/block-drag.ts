/**
 * Block drag and keyboard block moves (`uwg-te-req-blocks-5`, Foundation `dnd-tree-profile`): one
 * drag-and-drop manager per widget with a pointer sensor (4 px), one Draggable retargeted to the
 * gripped block with the grip as its handle, one container Droppable, an overlay preview of the
 * dragged blocks, the drop slot and depth from the tree reorder projection with a nest predicate
 * that accepts list items under list items only, one `blocks.move` request on drop and the
 * announcements of the tree reorder profile.
 */
import { cloneFeedback } from '../../../foundation/drag-drop/clone.js';
import { Draggable, Droppable } from '../../../foundation/drag-drop/entities.js';
import { DragDropManager } from '../../../foundation/drag-drop/manager.js';
import { DistanceConstraint } from '../../../foundation/drag-drop/sensors/activation.js';
import { PointerSensor } from '../../../foundation/drag-drop/sensors/pointer.js';
import type { DragEvent, OperationSnapshot } from '../../../foundation/drag-drop/types.js';
import type {
  TextEditorAction,
  TextEditorBlockSlot,
} from '../../../foundation/text-editor/actions.js';
import type {
  TextEditorRequestOutcome,
  TextEditorRequestProposal,
} from '../../../foundation/text-editor/controller.js';
import type { TextEditorEngineInstance } from '../../../foundation/text-editor/engine.js';
import type {
  TextEditorBlock,
  TextEditorBlockTree,
} from '../../../foundation/text-editor/model.js';
import type { TextEditorStrings } from '../../../foundation/text-editor/strings.js';
import { TreeModel } from '../../../foundation/tree/model.js';
import {
  dragDepth,
  projectDepth,
  validMove,
  type ProjectedRow,
  type TreeNestPredicate,
} from '../../../foundation/tree/projection.js';
import { blockDragText, type TextEditorDragPlace } from '../announcer.js';
import {
  OverlayPool,
  type OverlayBox,
  type OverlayLayer,
  type OverlayMeasureContext,
} from '../geometry.js';
import { topmostBlocks } from './block-selection.js';

// Projection -------------------------------------------------------------------------------------

const LIST_KINDS: ReadonlySet<string> = new Set(['list-bullet', 'list-ordered', 'list-task']);

/** A list item accepts a list item as a child, and nothing else nests (blocks-5). */
export function blockNestPredicate(tree: TextEditorBlockTree): TreeNestPredicate {
  const listItem = (id: string) => LIST_KINDS.has(tree.get(id)?.kind ?? '');
  return (parent, source) => listItem(parent.id) && listItem(source.id);
}

/** The blocks in document order without the moved blocks and their nested items. */
export function remainingRows(tree: TextEditorBlockTree, moved: readonly string[]): ProjectedRow[] {
  const excluded = new Set(moved);
  const rows: ProjectedRow[] = [];
  for (const block of tree.ordered()) {
    let parent: string | null = block.id;
    let covered = false;
    while (parent !== null) {
      if (excluded.has(parent)) {
        covered = true;
        break;
      }
      parent = tree.get(parent)?.parentId ?? null;
    }
    if (!covered) rows.push({ id: block.id, depth: block.depth, parentId: block.parentId });
  }
  return rows;
}

/** A drop projection: the slot among the remaining rows, the depth, the parent and the move. */
export interface TextEditorDropProjection {
  /** The insertion index among the remaining rows. */
  readonly index: number;
  readonly depth: number;
  readonly parentId: string | null;
  readonly slot: TextEditorBlockSlot;
}

/** The per-drag tree that `validMove` checks moves against. */
export function blockTreeModel(tree: TextEditorBlockTree): TreeModel<TextEditorBlock> {
  return new TreeModel<TextEditorBlock>({
    items: tree.roots.map((id) => tree.get(id)!).filter(Boolean),
    accessors: {
      id: (block) => block.id,
      label: (block) => block.id,
      children: (block) =>
        block.children
          .map((child) => tree.get(child))
          .filter((child): child is TextEditorBlock => child !== undefined),
      disabled: () => false,
      hasChildren: (block) => block.children.length > 0,
    },
  });
}

/**
 * The projection of the moved blocks' first block inserted at `index` of the remaining rows with
 * a requested depth (`dnd-tree-p-projection` with the nest predicate); `null` when it is vetoed,
 * lands where the block already is, or `validMove` rejects it.
 */
export function projectBlockDrop(
  tree: TextEditorBlockTree,
  model: TreeModel<TextEditorBlock>,
  rows: readonly ProjectedRow[],
  source: string,
  index: number,
  requestedDepth: number,
): TextEditorDropProjection | null {
  const block = tree.get(source);
  if (!block || index < 0 || index > rows.length) return null;
  const projected: ProjectedRow[] = [
    ...rows.slice(0, index),
    { id: source, depth: requestedDepth, parentId: block.parentId },
    ...rows.slice(index),
  ];
  const projection = projectDepth(projected, index, requestedDepth, blockNestPredicate(tree));
  if (projection.vetoed) return null;
  const parent = projection.parentId;
  let slotIndex = 0;
  for (let cursor = 0; cursor < index; cursor++) if (rows[cursor]!.parentId === parent) slotIndex++;
  const move = {
    itemId: source,
    fromParentId: block.parentId,
    fromIndex: block.index,
    toParentId: parent,
    toIndex: slotIndex,
  };
  if (!validMove(model, move)) return null;
  return { index, depth: projection.depth, parentId: parent, slot: { parent, index: slotIndex } };
}

/** The content-relative vertical extent of a remaining row. */
export interface TextEditorRowBox {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The insertion index of a vertical position among row boxes: before the first row whose vertical
 * midpoint lies below it, else after the last (C-565).
 */
export function dropIndex(boxes: readonly TextEditorRowBox[], y: number): number {
  for (let index = 0; index < boxes.length; index++) {
    const box = boxes[index]!;
    if (y < (box.top + box.bottom) / 2) return index;
  }
  return boxes.length;
}

/**
 * The slot of a keyboard move (`uwg-te-req-blocks-5`, a declared deviation from the keyboard rule):
 * the nearest slot before (`up`) or after (`down`) the moved blocks, among the remaining rows, at
 * which the projection of their first block with no horizontal offset yields an accepted depth;
 * `null` when there is none.
 */
export function keyboardMoveSlot(
  tree: TextEditorBlockTree,
  ids: readonly string[],
  direction: 'up' | 'down',
): TextEditorBlockSlot | null {
  const moved = topmostBlocks(tree, ids);
  const first = moved[0];
  const block = first === undefined ? undefined : tree.get(first);
  if (!block) return null;
  const rows = remainingRows(tree, moved);
  const ordered = tree.ordered();
  const position = ordered.findIndex((entry) => entry.id === block.id);
  const remaining = new Set(rows.map((row) => row.id));
  const current = ordered.slice(0, position).filter((entry) => remaining.has(entry.id)).length;
  const model = blockTreeModel(tree);
  const step = direction === 'up' ? -1 : 1;
  for (let index = current + step; index >= 0 && index <= rows.length; index += step) {
    const projection = projectBlockDrop(tree, model, rows, block.id, index, block.depth);
    if (projection) return projection.slot;
  }
  return null;
}

/** The action of moving blocks, each list item with its nested items, to a slot. */
export function moveAction(
  tree: TextEditorBlockTree,
  ids: readonly string[],
  slot: TextEditorBlockSlot,
): TextEditorAction {
  return { type: 'blocks.move', ids: topmostBlocks(tree, ids), to: slot };
}

// Session ----------------------------------------------------------------------------------------

/** What the drag needs from the element. */
export interface TextEditorBlockDragHost {
  instance(): TextEditorEngineInstance | null;
  /** The block the gutter sits beside, which a grip press drags. */
  gripBlock(): string | null;
  /** The block selection while in block mode, else `null`. */
  blockSelection(): readonly string[] | null;
  viewport(): HTMLElement | null;
  content(): HTMLElement | null;
  /** The overlay layer, where the drop indicator is pooled. */
  overlay(): HTMLElement | null;
  direction(): 'ltr' | 'rtl';
  strings(): TextEditorStrings;
  announce(message: string): void;
  /** The engine's dry run of an action. */
  can(action: TextEditorAction): boolean;
  request(proposal: TextEditorRequestProposal): Promise<TextEditorRequestOutcome>;
  /** The short label that announcements name a block by. */
  blockLabel(id: string): string;
  /** A drag started (true) or ended (false). */
  dragChanged(active: boolean): void;
}

interface RowGeometry extends TextEditorRowBox {
  readonly left: number;
  readonly right: number;
}

interface Session {
  readonly ids: readonly string[];
  readonly source: string;
  readonly tree: TextEditorBlockTree;
  readonly model: TreeModel<TextEditorBlock>;
  readonly rows: readonly ProjectedRow[];
  readonly boxes: readonly RowGeometry[];
  /** The inline extent of top-level content, content-relative. */
  readonly start: number;
  readonly end: number;
  readonly indent: number;
  readonly initialDepth: number;
  valid: TextEditorDropProjection | null;
  announced: string;
  readonly clones: (() => void)[];
}

/** The fallback inline indentation of one nesting step, in CSS pixels. */
const DEFAULT_INDENT = 24;
/** The delay before a projected move is announced. */
const ANNOUNCE_DELAY = 300;

/** The block drag of one widget: manager, entities, preview, projection and drop indicator. */
export class TextEditorBlockDrag implements OverlayLayer<OverlayBox | null> {
  readonly #host: TextEditorBlockDragHost;
  readonly #indicator: OverlayPool;
  #manager: DragDropManager | null = null;
  #draggable: Draggable | null = null;
  #droppable: Droppable | null = null;
  #grip: HTMLElement | null = null;
  #releases: (() => void)[] = [];
  #session: Session | null = null;
  #timer: ReturnType<typeof setTimeout> | undefined;

  constructor(host: TextEditorBlockDragHost) {
    this.#host = host;
    this.#indicator = new OverlayPool(() => host.overlay(), 'text-editor-drop-indicator');
  }

  /** A drag is in progress. */
  get active(): boolean {
    return this.#session !== null;
  }

  /**
   * Binds the drag to the current grip and viewport and retargets the Draggable to the block
   * beside the grip; called after each render and whenever the gutter moves.
   */
  sync(grip: HTMLElement | null): void {
    if (this.#session) return;
    const viewport = this.#host.viewport();
    if (!grip || !viewport) {
      this.release();
      return;
    }
    if (grip !== this.#grip || !this.#manager) {
      this.release();
      this.#create(grip, viewport);
    }
    const block = this.#host.gripBlock();
    const element = block ? (this.#host.instance()?.blockElement(block) ?? null) : null;
    const draggable = this.#draggable;
    if (draggable && draggable.element !== element) draggable.element = element ?? grip;
    if (draggable) draggable.disabled = element === null;
  }

  /** Cancels an active drag without a request (Escape). */
  cancel(): void {
    if (this.#session) void this.#manager?.actions.stop({ canceled: true });
  }

  release(): void {
    for (const release of this.#releases) release();
    this.#releases = [];
    this.#end();
    this.#draggable?.destroy();
    this.#droppable?.destroy();
    this.#manager?.destroy();
    this.#draggable = null;
    this.#droppable = null;
    this.#manager = null;
    this.#grip = null;
    this.#indicator.hide();
  }

  #create(grip: HTMLElement, viewport: HTMLElement): void {
    const preview = this.#previewElement(grip.ownerDocument);
    const manager = new DragDropManager({
      sensors: [
        PointerSensor.configure({
          activationConstraints: [new DistanceConstraint({ value: 4 })],
          // The press on the grip is never prevented and always may start a drag.
          preventActivation: () => false,
        }),
      ],
      accessibility: false,
      autoScroll: { acceleration: 25, threshold: 0.2 },
      dropAnimation: null,
    });
    this.#manager = manager;
    this.#grip = grip;
    this.#draggable = new Draggable(
      {
        id: 'text-editor-block',
        element: grip,
        handle: grip,
        overlay: { element: preview, dropAnimation: null },
      },
      manager,
    );
    this.#droppable = new Droppable({ id: 'text-editor-content', element: viewport }, manager);
    this.#releases.push(
      // The preview is filled before the feedback measures and shows it.
      manager.monitor.addEventListener('beforedragstart', (event) => this.#start(event)),
      manager.monitor.addEventListener('dragmove', (event) => this.#move(event)),
      manager.monitor.addEventListener('dragend', (event) => this.#dragEnd(event)),
      // A drop that the manager rejects before its completion still ends the session.
      manager.monitor.addEventListener('settled', () => this.#end()),
      manager.addCompletion((snapshot) => this.#drop(snapshot)),
    );
  }

  #start(event: DragEvent): void {
    const instance = this.#host.instance();
    const content = this.#host.content();
    const block = this.#host.gripBlock();
    if (!instance || !content || !block) {
      event.preventDefault();
      return;
    }
    const tree = instance.getBlocks();
    const selected = this.#host.blockSelection();
    const ids = topmostBlocks(tree, selected?.includes(block) ? selected : [block]);
    const source = ids[0] ?? block;
    const rows = remainingRows(tree, ids);
    const origin = content.getBoundingClientRect();
    const boxes = rows.map((row): RowGeometry => {
      const rect = instance.blockRects(row.id)?.content;
      return rect
        ? {
            top: rect.top - origin.top,
            bottom: rect.bottom - origin.top,
            left: rect.left - origin.left,
            right: rect.right - origin.left,
          }
        : { top: 0, bottom: 0, left: 0, right: 0 };
    });
    const rtl = this.#host.direction() === 'rtl';
    const top = boxes.filter((_, index) => rows[index]!.depth === 0);
    const start = top.length ? Math.min(...top.map((box) => box.left)) : 0;
    const end = top.length ? Math.max(...top.map((box) => box.right)) : origin.width;
    const nested = rows.findIndex((row) => row.depth > 0 && row.parentId !== null);
    let indent = DEFAULT_INDENT;
    if (nested >= 0) {
      const parent = rows.findIndex((row) => row.id === rows[nested]!.parentId);
      if (parent >= 0) {
        const child = boxes[nested]!;
        const owner = boxes[parent]!;
        const step = rtl ? owner.right - child.right : child.left - owner.left;
        if (step > 0) indent = step;
      }
    }
    const clones = this.#fillPreview(instance, content, ids);
    const original = tree.get(source)!;
    this.#session = {
      ids,
      source,
      tree,
      model: blockTreeModel(tree),
      rows,
      boxes,
      start,
      end,
      indent,
      initialDepth: original.depth,
      valid: null,
      announced: '',
      clones,
    };
    this.#host.dragChanged(true);
    this.#host.announce(
      blockDragText(
        this.#host.strings(),
        'picked-up',
        this.#place(source, original.depth, original.parentId),
      ),
    );
  }

  #move(event: DragEvent): void {
    const session = this.#session;
    const content = this.#host.content();
    if (!session || !content) return;
    const { operation } = event;
    const y = operation.position.current.y - content.getBoundingClientRect().top;
    const index = dropIndex(session.boxes, y);
    const offset = dragDepth(
      operation.transform.x,
      session.indent,
      this.#host.direction() === 'rtl',
    );
    const projection = projectBlockDrop(
      session.tree,
      session.model,
      session.rows,
      session.source,
      index,
      session.initialDepth + offset,
    );
    // A slot the adapter rejects keeps the previous valid projection.
    if (
      projection &&
      this.#host.can({ type: 'blocks.move', ids: session.ids, to: projection.slot })
    )
      session.valid = projection;
    else if (!projection) {
      // The original position stays a valid target: the drop then changes nothing.
      session.valid = this.#atOrigin(session, index) ? null : session.valid;
    }
    this.#indicatorChanged();
    this.#announceLater(session);
  }

  #atOrigin(session: Session, index: number): boolean {
    const ordered = session.tree.ordered();
    const remaining = new Set(session.rows.map((row) => row.id));
    const position = ordered.findIndex((block) => block.id === session.source);
    return ordered.slice(0, position).filter((block) => remaining.has(block.id)).length === index;
  }

  #dragEnd(event: DragEvent): void {
    const session = this.#session;
    if (!session) return;
    if (event.canceled || event.operation.canceled) {
      const block = session.tree.get(session.source);
      if (block)
        this.#host.announce(
          blockDragText(
            this.#host.strings(),
            'cancelled',
            this.#place(session.source, block.depth, block.parentId),
          ),
        );
      this.#end();
    }
  }

  /** The manager's completion: exactly one `blocks.move` request for a valid projection. */
  async #drop(snapshot: OperationSnapshot): Promise<boolean> {
    void snapshot;
    const session = this.#session;
    const projection = session?.valid ?? null;
    if (!session || !projection) {
      this.#end();
      return false;
    }
    const strings = this.#host.strings();
    const place = this.#place(session.source, projection.depth, projection.parentId);
    this.#end();
    try {
      const outcome = await this.#host.request({
        target: [{ type: 'blocks.move', ids: session.ids, to: projection.slot }],
        surface: 'drag',
        reason: 'drag',
        trigger: null,
      });
      if (outcome === 'applied') this.#host.announce(blockDragText(strings, 'dropped', place));
      return outcome === 'applied';
    } catch {
      return false;
    }
  }

  #end(): void {
    const session = this.#session;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = undefined;
    if (!session) return;
    this.#session = null;
    for (const dispose of session.clones) dispose();
    this.#indicator.hide();
    this.#host.dragChanged(false);
  }

  #preview: HTMLElement | null = null;

  /**
   * The element the feedback moves in the top layer: an inert, hidden copy of the dragged blocks,
   * created once and placed after the editing root in the content part only during a drag, so
   * that the content binding presents the copies as it presents the editing root's blocks.
   */
  #previewElement(document: Document): HTMLElement {
    if (this.#preview) return this.#preview;
    const preview = document.createElement('div');
    preview.className = 'block-drag-preview';
    preview.setAttribute('aria-hidden', 'true');
    preview.inert = true;
    // A root of the content binding, without the editing root's inset.
    preview.style.padding = '0';
    preview.style.minBlockSize = '0';
    const badge = document.createElement('tp-badge');
    badge.className = 'block-drag-count';
    badge.hidden = true;
    preview.append(badge);
    this.#preview = preview;
    return preview;
  }

  #fillPreview(
    instance: TextEditorEngineInstance,
    content: HTMLElement,
    ids: readonly string[],
  ): (() => void)[] {
    const preview = this.#previewElement(content.ownerDocument);
    const badge = preview.querySelector<HTMLElement>('.block-drag-count');
    const disposers: (() => void)[] = [];
    for (const id of ids) {
      const element = instance.blockElement(id);
      if (!element) continue;
      const clone = cloneFeedback(element);
      preview.insertBefore(clone.element, badge);
      disposers.push(() => {
        clone.element.remove();
        clone.dispose();
      });
    }
    if (badge) {
      badge.textContent = String(ids.length);
      badge.hidden = ids.length < 2;
    }
    content.append(preview);
    disposers.push(() => preview.remove());
    return disposers;
  }

  #place(id: string, depth: number, parentId: string | null): TextEditorDragPlace {
    return {
      label: this.#host.blockLabel(id),
      level: depth + 1,
      parent: parentId === null ? null : this.#host.blockLabel(parentId),
    };
  }

  #announceLater(session: Session): void {
    const projection = session.valid;
    const key = projection
      ? `${projection.slot.parent ?? ''}:${projection.slot.index}:${projection.depth}`
      : '';
    if (!projection || key === session.announced) return;
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#timer = undefined;
      if (this.#session !== session || session.valid !== projection) return;
      session.announced = key;
      this.#host.announce(
        blockDragText(
          this.#host.strings(),
          'over',
          this.#place(session.source, projection.depth, projection.parentId),
        ),
      );
    }, ANNOUNCE_DELAY);
  }

  #indicatorChanged(): void {
    // The overlay pass places the line; the drag reads only its cached rows.
    this.#pending = true;
    this.#wake?.();
  }

  #pending = false;
  #wake: (() => void) | null = null;

  /** The geometry's invalidation, which wakes one overlay pass. */
  setInvalidate(wake: () => void): void {
    this.#wake = wake;
  }

  // Layer: the drop indicator (uwg-te-tab-anatomy-r10) -------------------------------------------

  wanted(): boolean {
    return this.#session !== null && (this.#pending || this.#session.valid !== null);
  }

  measure(context: OverlayMeasureContext): OverlayBox | null {
    this.#pending = false;
    const session = this.#session;
    const content = this.#host.content();
    const projection = session?.valid;
    if (!session || !projection || !content) return null;
    const origin = context.toOverlay(content.getBoundingClientRect());
    const { boxes } = session;
    const index = projection.index;
    const before = boxes[index - 1];
    const after = boxes[index];
    const y =
      before && after
        ? (before.bottom + after.top) / 2
        : before
          ? before.bottom
          : (after?.top ?? 0);
    const inset = projection.depth * session.indent;
    const rtl = this.#host.direction() === 'rtl';
    const width = Math.max(0, session.end - session.start - inset);
    return {
      left: origin.left + (rtl ? session.start : session.start + inset),
      top: origin.top + y,
      width,
      height: 0,
    };
  }

  apply(box: OverlayBox | null): void {
    this.#indicator.write(box ? [box] : []);
  }

  hide(): void {
    this.#indicator.hide();
  }
}
