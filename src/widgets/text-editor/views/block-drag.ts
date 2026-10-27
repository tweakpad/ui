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

/**
 * The insertion index among the remaining rows at which the dragged blocks stay where they are:
 * the remaining rows before the source block. Fixed for a drag, so a move compares only it.
 */
export function originIndex(
  tree: TextEditorBlockTree,
  rows: readonly ProjectedRow[],
  source: string,
): number {
  const remaining = new Set(rows.map((row) => row.id));
  let index = 0;
  for (const block of tree.ordered()) {
    if (block.id === source) return index;
    if (remaining.has(block.id)) index += 1;
  }
  return -1;
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

/** Row boxes read by index: a list, or boxes measured when first read (`TextEditorRowBoxes`). */
export type TextEditorRowBoxSource =
  readonly TextEditorRowBox[] | { readonly length: number; get(index: number): TextEditorRowBox };

/**
 * The insertion index of a vertical position among row boxes: before the first row whose vertical
 * midpoint lies below it, else after the last (C-565). Rows follow each other down the content, so
 * a binary search reads only the boxes it needs.
 */
export function dropIndex(boxes: TextEditorRowBoxSource, y: number): number {
  const at = (index: number): TextEditorRowBox =>
    'get' in boxes && typeof boxes.get === 'function'
      ? boxes.get(index)
      : (boxes as readonly TextEditorRowBox[])[index]!;
  let low = 0;
  let high = boxes.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    const box = at(middle);
    if (y < (box.top + box.bottom) / 2) high = middle;
    else low = middle + 1;
  }
  return low;
}

/** A row's content box relative to the content part. */
export interface TextEditorRowGeometry extends TextEditorRowBox {
  readonly left: number;
  readonly right: number;
}

/**
 * The content boxes of a drag's remaining rows, relative to the content part, each measured the
 * first time it is read: a drag start reads a few rows, not the whole document. A row without a
 * layout box takes the end of the row before it.
 */
export class TextEditorRowBoxes {
  readonly #rows: readonly ProjectedRow[];
  readonly #measure: (id: string) => DOMRectReadOnly | null;
  readonly #origin: () => { readonly left: number; readonly top: number };
  readonly #boxes: (TextEditorRowGeometry | undefined)[] = [];

  constructor(
    rows: readonly ProjectedRow[],
    measure: (id: string) => DOMRectReadOnly | null,
    origin: () => { readonly left: number; readonly top: number },
  ) {
    this.#rows = rows;
    this.#measure = measure;
    this.#origin = origin;
  }

  get length(): number {
    return this.#rows.length;
  }

  get(index: number): TextEditorRowGeometry {
    const known = this.#boxes[index];
    if (known) return known;
    const row = this.#rows[index];
    const rect = row ? this.#measure(row.id) : null;
    let box: TextEditorRowGeometry;
    if (rect) {
      const origin = this.#origin();
      box = {
        top: rect.top - origin.top,
        bottom: rect.bottom - origin.top,
        left: rect.left - origin.left,
        right: rect.right - origin.left,
      };
    } else if (index > 0) {
      const previous = this.get(index - 1);
      box = { ...previous, top: previous.bottom };
    } else box = { top: 0, bottom: 0, left: 0, right: 0 };
    this.#boxes[index] = box;
    return box;
  }
}

/**
 * The inline extent of top-level content, content-relative: the top-level rows that are not list
 * items share the content column (a list item's content is inset by its list), so the first and
 * last of them give it; without one, every top-level row does; without any, `fallback`.
 */
export function columnExtent(
  tree: TextEditorBlockTree,
  rows: readonly ProjectedRow[],
  boxes: { get(index: number): TextEditorRowGeometry },
  fallback: { readonly start: number; readonly end: number },
): { start: number; end: number } {
  const top = rows.flatMap((row, index) => (row.depth === 0 ? [{ row, index }] : []));
  const plain = top.filter(({ row }) => !LIST_KINDS.has(tree.get(row.id)?.kind ?? ''));
  const sample = plain.length ? [plain[0]!, plain.at(-1)!] : top;
  if (!sample.length) return { ...fallback };
  const measured = sample.map(({ index }) => boxes.get(index));
  return {
    start: Math.min(...measured.map((box) => box.left)),
    end: Math.max(...measured.map((box) => box.right)),
  };
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

/**
 * The selection after an applied drop: the moved blocks, as a block selection
 * (`uwg-te-req-key-8`); set without a request, as every selection-only change is.
 */
export function droppedSelection(ids: readonly string[]): TextEditorAction {
  return { type: 'selection.set', selection: { kind: 'blocks', ids: [...ids] } };
}

/** The action of moving blocks, each list item with its nested items, to a slot. */
export function moveAction(
  tree: TextEditorBlockTree,
  ids: readonly string[],
  slot: TextEditorBlockSlot,
): TextEditorAction {
  return { type: 'blocks.move', ids: topmostBlocks(tree, ids), to: slot };
}

// Preview ----------------------------------------------------------------------------------------

/** The preview's custom property: how far list markers reach before the copies, in pixels. */
const PREVIEW_INSET = '--_tp-text-editor-preview-inset';

/** The list a block's element is an item of (vocabulary classes), else `null`. */
export function previewListOf(element: Element): Element | null {
  const list = element.parentElement;
  return element.classList.contains('tp-te-item') && list?.classList.contains('tp-te-list')
    ? list
    : null;
}

/**
 * The elements whose copies show a block in the drag preview: its element and, for a list item
 * whose nested items the engine renders in the following wrapper item, that wrapper too.
 */
export function previewSourcesOf(element: Element): Element[] {
  const next = element.nextElementSibling;
  return element.classList.contains('tp-te-item') &&
    !element.classList.contains('tp-te-nested-item') &&
    next?.classList.contains('tp-te-nested-item')
    ? [element, next]
    : [element];
}

/**
 * The number an ordered list shows for an item: the list's `start` (1 when absent) for its first
 * item, an item's own `value`, else one more than the item before.
 */
export function listItemOrdinal(item: Element): number {
  const list = item.parentElement;
  const start = Number.parseInt(list?.getAttribute('start') ?? '', 10);
  let ordinal = (Number.isFinite(start) ? start : 1) - 1;
  for (const child of list ? Array.from(list.children) : [item]) {
    if (child.localName !== 'li') continue;
    const value = Number.parseInt(child.getAttribute('value') ?? '', 10);
    ordinal = Number.isFinite(value) ? value : ordinal + 1;
    if (child === item) break;
  }
  return ordinal;
}

/**
 * Gives every copied list item the marker of its original: the computed marker type (which the
 * original's nesting decides) and, in an ordered list, the original's number; a copied task
 * marker keeps its original's opacity, which the copy's disabled checkbox would otherwise dim.
 */
export function keepListMarkers(
  mapping: ReadonlyMap<Element, Element>,
  view: Pick<Window, 'getComputedStyle'>,
): void {
  for (const [original, copy] of mapping) {
    if (!('style' in copy)) continue;
    const style = (copy as HTMLElement).style;
    if (original.classList.contains('tp-te-task-marker'))
      style.opacity = view.getComputedStyle(original).opacity;
    if (original.localName !== 'li') continue;
    style.listStyleType = view.getComputedStyle(original).listStyleType;
    if (original.parentElement?.localName === 'ol')
      copy.setAttribute('value', String(listItemOrdinal(original)));
  }
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

interface Session {
  readonly ids: readonly string[];
  readonly source: string;
  readonly tree: TextEditorBlockTree;
  readonly model: TreeModel<TextEditorBlock>;
  readonly rows: readonly ProjectedRow[];
  readonly boxes: TextEditorRowBoxes;
  /** The inline extent of top-level content, content-relative. */
  readonly start: number;
  readonly end: number;
  readonly indent: number;
  readonly initialDepth: number;
  /** The insertion index that leaves the dragged blocks in place (`originIndex`). */
  readonly origin: number;
  valid: TextEditorDropProjection | null;
  announced: string;
  /** Removes the preview copies and the Escape listener of the drag. */
  readonly cleanups: (() => void)[];
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

  /**
   * Whether this Escape keydown cancelled the drag: the pointer sensor ends a drag on Escape
   * before the editing root sees the key, which must then take no further Escape step.
   */
  cancelledBy(event: Event): boolean {
    return this.#escape === event;
  }

  /** The last Escape keydown during a drag, seen at the window before every other listener. */
  #escape: Event | null = null;

  readonly #onKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#session) this.#escape = event;
  };

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
    // The drag measures only the rows it reads (`uwg-te-req-perf-1`): the column, one nesting
    // step, and later the rows around the pointer.
    const boxes = new TextEditorRowBoxes(
      rows,
      (id) => instance.blockRects(id)?.content ?? null,
      () => content.getBoundingClientRect(),
    );
    const rtl = this.#host.direction() === 'rtl';
    const { start, end } = columnExtent(tree, rows, boxes, {
      start: 0,
      end: content.getBoundingClientRect().width,
    });
    const nested = rows.findIndex((row) => row.depth > 0 && row.parentId !== null);
    let indent = DEFAULT_INDENT;
    if (nested >= 0) {
      const parent = rows.findIndex((row) => row.id === rows[nested]!.parentId);
      if (parent >= 0) {
        const child = boxes.get(nested);
        const owner = boxes.get(parent);
        const step = rtl ? owner.right - child.right : child.left - owner.left;
        if (step > 0) indent = step;
      }
    }
    const cleanups = this.#fillPreview(instance, content, ids);
    const view = content.ownerDocument.defaultView;
    view?.addEventListener('keydown', this.#onKeyDown, { capture: true });
    cleanups.push(() => view?.removeEventListener('keydown', this.#onKeyDown, { capture: true }));
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
      origin: originIndex(tree, rows, source),
      valid: null,
      announced: '',
      cleanups,
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
      session.valid = index === session.origin ? null : session.valid;
    }
    this.#indicatorChanged();
    this.#announceLater(session);
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
      if (outcome !== 'applied') return false;
      this.#host.announce(blockDragText(strings, 'dropped', place));
      // Focus in the editing root with the moved blocks selected (`uwg-te-req-key-8`).
      const select = droppedSelection(session.ids);
      const instance = this.#host.instance();
      if (instance?.can(select)) instance.execute([select], { reason: 'drag', focus: true });
      return true;
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
    for (const dispose of session.cleanups) dispose();
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
    const document = content.ownerDocument;
    const view = document.defaultView;
    const preview = this.#previewElement(document);
    const badge = preview.querySelector<HTMLElement>('.block-drag-count');
    const disposers: (() => void)[] = [];
    // Consecutive list items of one list share a copy of that list, so that their markers show.
    let frame: { list: Element; element: HTMLElement } | null = null;
    let inset = 0;
    for (const id of ids) {
      const element = instance.blockElement(id);
      if (!element) continue;
      const list: Element | null = previewListOf(element);
      const current: Element | null = frame === null ? null : frame.list;
      if (!list) frame = null;
      else if (current !== list) {
        const copy: HTMLElement = document.createElement(list.localName);
        copy.className = list.className;
        // The copied item stays where the original sits; its marker takes the list's inset before it.
        const start = Number.parseFloat(view?.getComputedStyle(list).paddingInlineStart ?? '') || 0;
        copy.style.marginInlineStart = `${-start}px`;
        inset = Math.max(inset, start);
        preview.insertBefore(copy, badge);
        disposers.push(() => copy.remove());
        frame = { list, element: copy };
      }
      for (const source of previewSourcesOf(element)) {
        const clone = cloneFeedback(source);
        if (view) keepListMarkers(clone.mapping, view);
        if (frame) frame.element.append(clone.element);
        else preview.insertBefore(clone.element, badge);
        disposers.push(() => {
          clone.element.remove();
          clone.dispose();
        });
      }
    }
    // The backdrop reaches over the markers that lie before the copies.
    preview.style.setProperty(PREVIEW_INSET, `${inset}px`);
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
    const before = index > 0 ? boxes.get(index - 1) : undefined;
    const after = index < boxes.length ? boxes.get(index) : undefined;
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
