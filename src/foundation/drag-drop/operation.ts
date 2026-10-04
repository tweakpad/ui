import { Point, Position, Rectangle, type Coordinates } from './geometry.js';
import type { Draggable, Droppable } from './entities.js';
import type { DragStatus, EntitySnapshot, OperationSnapshot } from './types.js';
import type { UniqueIdentifier } from './sorting.js';

const copyRect = (rect: Rectangle): Rectangle => {
  const copy = Rectangle.from(rect);
  copy.scale = { ...rect.scale };
  return Object.freeze(copy);
};
const copyPoint = (point: Coordinates): Coordinates => Object.freeze({ ...point });
export function entitySnapshot(entity: Draggable | Droppable | null): EntitySnapshot | null {
  if (!entity) return null;
  const sortable = (
    entity as Draggable & {
      sortable?: {
        index: number;
        group: UniqueIdentifier | undefined;
        initialIndex: number;
        initialGroup: UniqueIdentifier | undefined;
      };
    }
  ).sortable;
  return Object.freeze({
    id: entity.id,
    data: entity.data,
    type: entity.type,
    element: entity.element,
    ...('shape' in entity ? { shape: entity.shape ? copyRect(entity.shape) : undefined } : {}),
    ...(sortable
      ? {
          index: sortable.index,
          group: sortable.group,
          initialIndex: sortable.initialIndex,
          initialGroup: sortable.initialGroup,
        }
      : {}),
    ...(entity.data.container === true ? { container: true } : {}),
  });
}

export class DragOperation {
  id = 0;
  status: DragStatus = 'idle';
  source: Draggable | null = null;
  sourceId: UniqueIdentifier | undefined;
  target: Droppable | null = null;
  readonly position = new Position({ x: 0, y: 0 });
  transform: Coordinates = { x: 0, y: 0 };
  shape: { initial: Rectangle; current: Rectangle; previous: Rectangle | undefined } | null = null;
  activatorEvent: Event | null = null;
  input: 'pointer' | 'keyboard' | 'imperative' = 'imperative';
  canceled = false;
  controller: AbortController | undefined;
  readonly initialMembership = new Map<
    UniqueIdentifier,
    { index: number; group: UniqueIdentifier | undefined }
  >();
  snapshot(): OperationSnapshot {
    const p = this.position;
    return Object.freeze({
      id: this.id,
      status: this.status,
      source: entitySnapshot(this.source),
      target: entitySnapshot(this.target),
      position: Object.freeze({
        initial: copyPoint(p.initial),
        current: copyPoint(p.current),
        previous: p.previous ? copyPoint(p.previous) : undefined,
        delta: copyPoint(p.delta),
        direction: p.direction,
        velocity: copyPoint(p.velocity),
      }),
      transform: copyPoint(this.transform),
      shape: this.shape
        ? Object.freeze({
            initial: copyRect(this.shape.initial),
            current: copyRect(this.shape.current),
            previous: this.shape.previous ? copyRect(this.shape.previous) : undefined,
          })
        : null,
      activatorEvent: this.activatorEvent,
      input: this.input,
      canceled: this.canceled,
    });
  }
  move(position: Coordinates, transform: Coordinates): void {
    this.position.current = position;
    this.transform = Point.from(transform);
    if (this.shape)
      this.shape = {
        ...this.shape,
        previous: this.shape.current,
        current: this.shape.initial.translate(transform.x, transform.y),
      };
  }
  reset(): void {
    this.sourceId = undefined;
    this.status = 'idle';
    this.source = this.target = null;
    this.position.reset();
    this.transform = { x: 0, y: 0 };
    this.shape = null;
    this.activatorEvent = null;
    this.input = 'imperative';
    this.canceled = false;
    this.controller = undefined;
    this.initialMembership.clear();
  }
}
