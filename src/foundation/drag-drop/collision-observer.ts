import {
  sameCollisionSequence,
  sortCollisions,
  validCollision,
  type Collision,
  type CollisionDetector,
} from './collision.js';
import type { DragDropManager } from './manager.js';
import type { Droppable } from './entities.js';
import { reportDragDropDiagnostic } from './sorting.js';

export class CollisionObserver {
  #collisions: readonly Collision[] = [];
  #leases = new Set<object>();
  #computing = false;
  #invalidated = true;
  constructor(readonly manager: DragDropManager) {}
  get collisions(): readonly Collision[] {
    return this.#collisions;
  }
  suppress(): () => void {
    const token = {};
    this.#leases.add(token);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#leases.delete(token);
      this.forceUpdate(false);
    };
  }
  computeCollisions(
    entries: Iterable<Droppable> = this.manager.registry.droppables,
    detectorOverride?: CollisionDetector,
  ): Collision[] {
    const operation = this.manager.dragOperation,
      source = operation.source;
    if (!source || operation.status !== 'dragging') return [];
    const collisions: Collision[] = [];
    for (const droppable of entries) {
      if (
        this.manager.feedback.mode === 'move' &&
        !droppable.proxy &&
        droppable.element === source.element
      ) {
        droppable.clearShape();
        continue;
      }
      if (!droppable.registered || droppable.disabled || !droppable.accepts(source)) {
        droppable.clearShape();
        continue;
      }
      if (!droppable.refreshShape()) continue;
      const value = (detectorOverride ?? droppable.collisionDetector)({
        dragOperation: operation,
        droppable,
      });
      if (!value) continue;
      if (!validCollision(value, droppable.id)) {
        reportDragDropDiagnostic('collision', 'Invalid detector output was excluded.', value);
        continue;
      }
      collisions.push(
        Object.freeze({ ...value, priority: droppable.collisionPriority ?? value.priority }),
      );
    }
    return collisions.sort(sortCollisions);
  }
  forceUpdate(immediate = true): void {
    this.#invalidated = true;
    if (
      !immediate ||
      this.#computing ||
      this.#leases.size ||
      this.manager.registry.coordinator.pending ||
      this.manager.dragOperation.status !== 'dragging'
    )
      return;
    this.#computing = true;
    try {
      const next = this.computeCollisions();
      this.#invalidated = false;
      const event = this.manager.dispatch('collision', { collisions: next }, true);
      const changed = !sameCollisionSequence(this.#collisions, next);
      this.#collisions = Object.freeze(next);
      if (
        !event.defaultPrevented &&
        this.manager.dragOperation.status === 'dragging' &&
        (changed || !this.manager.dragOperation.target)
      )
        void this.manager.actions.setDropTarget(next[0]?.id ?? null);
    } catch (error) {
      this.manager.fail(error);
    } finally {
      this.#computing = false;
    }
  }
  update(): void {
    if (this.#invalidated) this.forceUpdate();
  }
  reset(): void {
    this.#collisions = [];
    this.#invalidated = true;
    this.#leases.clear();
  }
}
