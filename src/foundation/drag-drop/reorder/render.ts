import type { MotionHandle } from '../../motion.js';
import { cancelGeometryTransitions, measureElement, parseTransform } from '../dom-geometry.js';
import type { Rectangle } from '../geometry.js';
import { landingLine } from '../landing.js';
import { dragMotion, dragMotionContext } from '../motion.js';
import type { Sortable } from '../sortable.js';
import type { UniqueIdentifier } from '../sorting.js';
import type { ReorderContainer } from './engine.js';

// How every reordering container draws a reorder, so a list and a tree draw it the same: the
// landing line at the engine's anchor, and the glides of the items that make room.

/** What a container gives to draw its reorder. */
export interface ReorderView {
  readonly container: ReorderContainer<unknown>;
  /** The element the items flow in, which the line is placed against. */
  readonly frame: HTMLElement;
  /** An item's element by its identity, when it is mounted. */
  element(id: UniqueIdentifier): HTMLElement | undefined;
  /** An item's Sortable: its transition, its index and group, and whether it is being dragged. */
  sortable(id: UniqueIdentifier): Sortable | undefined;
  /** The stand-in that holds the dragged item's place, from the drag feedback. */
  readonly placeholder: HTMLElement | null | undefined;
  readonly orientation: 'vertical' | 'horizontal';
}

/**
 * Places `line` at the boundary the drop would land at (the engine's anchor): halfway across the
 * gap between the items around it, along their cross extent, with the stand-in for the dragged
 * item. `inset` moves its inline start in, as a tree's depth does. Whether the line shows at all is
 * the caller's (an anchor exists).
 */
export function placeReorderLine(view: ReorderView, line: HTMLElement, inset = 0): void {
  const slot = view.container.anchor;
  if (slot === null) return;
  const records = view.container.records;
  const box = (index: number): DOMRect | null => {
    const record = records[index];
    if (!record) return null;
    let element = view.element(record.id);
    if (element?.matches(':popover-open') || view.sortable(record.id)?.isDragSource)
      element = view.placeholder ?? undefined;
    return element?.isConnected ? element.getBoundingClientRect() : null;
  };
  let previous: DOMRect | null = null,
    next: DOMRect | null = null;
  for (let index = slot - 1; index >= 0 && !previous; index--) previous = box(index);
  for (let index = slot; index < records.length && !next; index++) next = box(index);
  const near = previous ?? next;
  if (!near) return;
  const style = getComputedStyle(view.frame),
    frame = view.frame.getBoundingClientRect();
  if (view.orientation === 'horizontal') {
    const rtl = style.direction === 'rtl',
      gap = parseFloat(style.columnGap) || 0;
    // Along the row's order: right to left, the axis runs against the coordinates.
    const along = (rect: DOMRect | null) =>
      rect && (rtl ? { start: rect.right, end: rect.left } : { start: rect.left, end: rect.right });
    const x = landingLine(along(previous), along(next), gap, rtl ? -1 : 1)!;
    line.style.left = `${x - frame.left}px`;
    line.style.top = `${near.top - frame.top}px`;
    line.style.height = `${near.height}px`;
    line.style.width = '';
  } else {
    const gap = parseFloat(style.rowGap) || 0;
    const along = (rect: DOMRect | null) => rect && { start: rect.top, end: rect.bottom };
    const y = landingLine(along(previous), along(next), gap)!;
    const rtl = style.direction === 'rtl';
    line.style.top = `${y - frame.top}px`;
    line.style.left = `${near.left - frame.left + (rtl ? 0 : inset)}px`;
    line.style.width = `${Math.max(0, near.width - inset)}px`;
    line.style.height = '';
  }
}

/**
 * The glides of a reorder: before a render that may move items, `capture` records where they are
 * drawn; after it, `play` glides each moved item from there to its new place (`sort-displacement`).
 * The dragged item is the drag feedback's and never glides here.
 */
export class ReorderGlides {
  #rects = new Map<
    UniqueIdentifier,
    { rect: Rectangle; index: number | undefined; group: UniqueIdentifier | undefined }
  >();
  #motions = new Map<UniqueIdentifier, MotionHandle>();

  capture(view: ReorderView, ids: Iterable<UniqueIdentifier>): void {
    for (const id of ids) {
      const element = view.element(id);
      const rect = element && measureElement(element);
      const sortable = view.sortable(id);
      if (rect) this.#rects.set(id, { rect, index: sortable?.index, group: sortable?.group });
    }
  }

  play(view: ReorderView, ids: Iterable<UniqueIdentifier>): void {
    for (const id of ids) {
      const element = view.element(id);
      if (!element) continue;
      const sortable = view.sortable(id),
        transition = sortable?.transition,
        previous = this.#rects.get(id),
        old = previous?.rect;
      cancelGeometryTransitions(element);
      const next = measureElement(element);
      if (
        !old ||
        !next ||
        !transition ||
        sortable?.isDragSource ||
        (!view.container.network?.session && !transition.idle)
      )
        continue;
      const x = old.left - next.left,
        y = old.top - next.top;
      if (!x && !y) continue;
      this.#motions.get(id)?.cancel();
      const base = parseTransform({
        translate: element.ownerDocument.defaultView!.getComputedStyle(element).translate,
      });
      const bx = base?.x ?? 0,
        by = base?.y ?? 0;
      this.#motions.set(
        id,
        dragMotion(
          element,
          element,
          'sort-displacement',
          [{ translate: `${bx + x}px ${by + y}px` }, { translate: `${bx}px ${by}px` }],
          transition,
          dragMotionContext(
            id,
            {
              sourceGroup: previous?.group,
              targetGroup: sortable?.group,
              fromIndex: previous?.index,
              toIndex: sortable?.index,
            },
            { x, y },
          ),
        ),
      );
    }
    this.#rects.clear();
  }

  cancel(): void {
    for (const motion of this.#motions.values()) motion.cancel();
    this.#motions.clear();
    this.#rects.clear();
  }
}
