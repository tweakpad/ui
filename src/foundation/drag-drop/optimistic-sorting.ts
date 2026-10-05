/** OptimisticSortingPlugin behavior, adapted from dnd-kit (MIT).
 * Foundation owns plain DOM ordering. Renderer adapters claim their own keyed
 * collections and use the same manager barriers without mutating managed DOM.
 */
import { isSortable, type Sortable } from './sortable.js';
import type { DragDropManager } from './manager.js';
import type { Draggable } from './entities.js';
import type { DragEvent, DragOutcome } from './types.js';
import { measureElement, cancelGeometryTransitions, parseTransform } from './dom-geometry.js';
import { dragMotion, dragMotionContext } from './motion.js';
import type { MotionHandle } from '../motion.js';

interface Member {
  sortable: Sortable;
  index: number;
  group: Sortable['group'];
  element: Element | null;
  parent: Node | null;
  next: Node | null;
}
type Membership = Map<Sortable['id'], Member>;
interface IdleMember {
  rect: ReturnType<typeof measureElement>;
  index: number;
  group: Sortable['group'];
}
export class OptimisticSorting {
  readonly #owners = new Set<(source: Draggable) => boolean>();
  readonly #motions = new Map<Element, MotionHandle>();
  #idleRects = new Map<Sortable, IdleMember>();
  #idleRevision = 0;
  changed(): void {
    if (this.manager.dragOperation.status !== 'idle' || this.manager.destroyed) return;
    const revision = ++this.#idleRevision;
    void this.manager.renderer.rendering
      .then(() => {
        if (
          revision !== this.#idleRevision ||
          this.manager.destroyed ||
          this.manager.dragOperation.status !== 'idle'
        )
          return;
        const nextRects = new Map<Sortable, IdleMember>();
        for (const member of this.capture().values()) {
          const sortable = member.sortable,
            element = sortable.element;
          if (!element || [...this.#owners].some((owns) => owns(sortable.draggable))) continue;
          cancelGeometryTransitions(element);
          const next = measureElement(element),
            previous = this.#idleRects.get(sortable),
            old = previous?.rect;
          nextRects.set(sortable, { rect: next, index: sortable.index, group: sortable.group });
          const transition = sortable.transition;
          if (!next || !old || !transition?.idle) continue;
          const x = old.left - next.left,
            y = old.top - next.top;
          if (!x && !y) continue;
          this.#motions.get(element)?.cancel();
          const base = parseTransform({
            translate: element.ownerDocument.defaultView!.getComputedStyle(element).translate,
          });
          const bx = base?.x ?? 0,
            by = base?.y ?? 0;
          this.#motions.set(
            element,
            dragMotion(
              element as HTMLElement,
              element as HTMLElement,
              'sort-displacement',
              [{ translate: `${bx + x}px ${by + y}px` }, { translate: `${bx}px ${by}px` }],
              transition,
              dragMotionContext(
                sortable.id,
                {
                  sourceGroup: previous?.group,
                  targetGroup: sortable.group,
                  fromIndex: previous?.index,
                  toIndex: sortable.index,
                },
                { x, y },
              ),
            ),
          );
        }
        this.#idleRects = nextRects;
      })
      .catch((error) => this.manager.reportError(error));
  }
  #initial: Membership | undefined;
  #last: Membership | undefined;
  constructor(readonly manager: DragDropManager) {}
  own(predicate: (source: Draggable) => boolean): () => void {
    this.#owners.add(predicate);
    return () => {
      this.#owners.delete(predicate);
    };
  }
  capture(): Membership {
    const members: Membership = new Map();
    for (const entity of this.manager.registry.droppables)
      if (isSortable(entity)) {
        const sortable = entity.sortable,
          element = sortable.element;
        members.set(sortable.id, {
          sortable,
          index: sortable.index,
          group: sortable.group,
          element,
          parent: element?.parentNode ?? null,
          next: element?.nextSibling ?? null,
        });
      }
    return members;
  }
  #unchanged(members: Membership): boolean {
    const current = this.capture();
    return (
      current.size === members.size &&
      [...members].every(([id, old]) => {
        const next = current.get(id);
        return (
          next?.sortable === old.sortable &&
          next.index === old.index &&
          next.group === old.group &&
          next.element === old.element
        );
      })
    );
  }
  start(): void {
    this.#initial = this.capture();
    this.#last = undefined;
  }
  async project(event: DragEvent, members: Membership): Promise<void> {
    const operation = this.manager.dragOperation,
      source = operation.source,
      target = operation.target;
    if (
      !isSortable(source) ||
      !isSortable(target) ||
      source.sortable === target.sortable ||
      [...this.#owners].some((owns) => owns(source))
    )
      return;
    const generation = operation.id;
    await this.manager.renderer.rendering;
    if (
      event.defaultPrevented ||
      this.manager.destroyed ||
      operation.id !== generation ||
      operation.status !== 'dragging' ||
      operation.source !== source ||
      operation.target !== target ||
      !this.#unchanged(members) ||
      !source.registered ||
      !target.registered
    )
      return;
    const from = source.sortable,
      to = target.sortable;
    const same = from.group === to.group;
    const ordered = (group: Sortable['group']) =>
      [...members.values()]
        .filter((entry) => entry.group === group)
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.sortable);
    const sourceItems = ordered(from.group),
      targetItems = same ? sourceItems : ordered(to.group);
    const oldIndex = sourceItems.indexOf(from),
      targetIndex = targetItems.indexOf(to);
    if (oldIndex < 0 || targetIndex < 0 || !to.element?.isConnected || !from.element?.isConnected)
      return;
    const oldRects = new Map(
      [...members.values()].map((m) => [m.sortable, measureElement(m.element)]),
    );
    sourceItems.splice(oldIndex, 1);
    const after = same
      ? oldIndex < targetIndex
      : !!(
          target.shape &&
          operation.shape &&
          operation.shape.current.center.y > target.shape.center.y
        );
    targetItems.splice(targetIndex + (!same && after ? 1 : 0), 0, from);
    const layout = this.manager.feedback.placeholder ?? from.element;
    const release = this.manager.collisionObserver.suppress();
    try {
      to.element.insertAdjacentElement(after ? 'afterend' : 'beforebegin', layout);
      this.manager.feedback.syncPlacement();
      this.manager.registry.coordinator.batch(() => {
        sourceItems.forEach((item, index) => item.setMembership(index, from.group));
        if (!same) targetItems.forEach((item, index) => item.setMembership(index, to.group));
      });
      this.#last = this.capture();
      await this.manager.actions.setDropTarget(source.id);
      if (operation.id !== generation || operation.status !== 'dragging') return;
      for (const [sortable, old] of oldRects) {
        const element = sortable.element,
          transition = sortable.transition;
        if (!element || !old || !transition || sortable === from) continue;
        cancelGeometryTransitions(element);
        const next = measureElement(element);
        if (!next) continue;
        const x = old.left - next.left,
          y = old.top - next.top;
        if (!x && !y) continue;
        this.#motions.get(element)?.cancel();
        const translate = parseTransform({
          translate: element.ownerDocument.defaultView!.getComputedStyle(element).translate,
        });
        const base = { x: translate?.x ?? 0, y: translate?.y ?? 0 };
        this.#motions.set(
          element,
          dragMotion(
            element as HTMLElement,
            element as HTMLElement,
            'sort-displacement',
            [
              { translate: `${base.x + x}px ${base.y + y}px` },
              { translate: `${base.x}px ${base.y}px` },
            ],
            transition,
            dragMotionContext(
              sortable.id,
              {
                sourceGroup: members.get(sortable.id)?.group,
                targetGroup: sortable.group,
                fromIndex: members.get(sortable.id)?.index,
                toIndex: sortable.index,
              },
              { x, y },
            ),
          ),
        );
      }
    } finally {
      release();
    }
  }
  settle(outcome: DragOutcome): void {
    if (outcome === 'committed' || !this.#initial || !this.#last) return;
    if (!this.#last || !this.#unchanged(this.#last)) return;
    const initial = this.#initial;
    const source = this.manager.dragOperation.source;
    if (!source || !isSortable(source)) return;
    const origin = initial.get(source.id),
      layout = this.manager.feedback.placeholder ?? source.sortable.element;
    if (!origin?.parent?.isConnected || !layout) return;
    origin.parent.insertBefore(
      layout,
      origin.next?.parentNode === origin.parent ? origin.next : null,
    );
    this.manager.feedback.syncPlacement();
    this.manager.registry.coordinator.batch(() => {
      for (const entry of initial.values()) entry.sortable.setMembership(entry.index, entry.group);
    });
  }
  reset(): void {
    this.#idleRevision++;
    this.#idleRects.clear();
    this.#initial = this.#last = undefined;
    for (const motion of this.#motions.values()) motion.cancel();
    this.#motions.clear();
  }
}
