/** Source-derived collision formulas: dnd-kit packages/collision/src/algorithms,
 * e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94. MIT; see LICENSE.dnd-kit.
 */
import { Point, Rectangle } from './geometry.js';
import type { Coordinates, Position } from './geometry.js';
import type { UniqueIdentifier } from './sorting.js';

export enum CollisionPriority {
  Lowest = 0,
  Low = 1,
  Normal = 2,
  High = 3,
  Highest = 4,
}
export enum CollisionType {
  Collision = 0,
  ShapeIntersection = 1,
  PointerIntersection = 2,
}
export interface Collision {
  id: UniqueIdentifier;
  priority: number;
  type: CollisionType;
  value: number;
  data?: Record<string, unknown>;
}
export interface CollisionInput {
  dragOperation: {
    shape: { current: Rectangle } | null;
    position: { current: Coordinates; direction: Position['direction'] };
  };
  droppable: { id: UniqueIdentifier; shape: Rectangle | undefined };
}
export type CollisionDetector = (input: CollisionInput) => Collision | null;

// Upstream: pointerIntersection.ts

/**
 * A high precision collision detection algorithm that detects
 * whether the pointer intersects with a given droppable element.
 *
 * Returns the distance between the pointer coordinates and the center of the
 * droppable element if the pointer is within the droppable element.
 *
 * Returns null if the pointer is outside of the droppable element.
 */
export const pointerIntersection: CollisionDetector = ({ dragOperation, droppable }) => {
  const pointerCoordinates = dragOperation.position.current;

  if (!pointerCoordinates) {
    return null;
  }

  const { id } = droppable;

  if (!droppable.shape) {
    return null;
  }

  if (droppable.shape.containsPoint(pointerCoordinates)) {
    /* There may be more than a single rectangle intersecting
     * with the pointer coordinates. In order to sort the
     * colliding rectangles, we measure the distance between
     * the pointer and the center of the intersecting rectangle
     */
    const distance = Point.distance(droppable.shape.center, pointerCoordinates);

    return {
      id,
      value: 1 / distance,
      type: CollisionType.PointerIntersection,
      priority: CollisionPriority.High,
    };
  }

  return null;
};

// Upstream: shapeIntersection.ts

/**
 * Returns the droppable with the greatest intersection area with
 * the collision shape.
 */
export const shapeIntersection: CollisionDetector = ({ dragOperation, droppable }) => {
  const { shape } = dragOperation;

  if (!droppable.shape || !shape?.current) {
    return null;
  }

  const intersectionArea = shape.current.intersectionArea(droppable.shape);

  // Check if the droppable is intersecting with the drag operation shape.
  if (intersectionArea) {
    const { position } = dragOperation;
    /* There could be multiple droppables intersecting with the drag operation shape,
     * so we need to prioritize the droppable that is the closest to the pointer.
     * We don't use the intersection area for this because it can lead to cyclic
     * collisions.
     */
    const distance = Point.distance(droppable.shape.center, position.current);
    const intersectionRatio =
      intersectionArea / (shape.current.area + droppable.shape.area - intersectionArea);

    const value = intersectionRatio / distance;

    return {
      id: droppable.id,
      value,
      type: CollisionType.ShapeIntersection,
      priority: CollisionPriority.Normal,
    };
  }

  return null;
};

// Upstream: default.ts

/**
 * Returns the droppable that has the greatest intersection area with the
 * pointer coordinates. If there are no pointer coordinates, or the pointer
 * is not intersecting with any droppable, return the greatest intersection area
 * between the collision shape and other intersecting droppable shapes.
 */
export const defaultCollisionDetection: CollisionDetector = (args) => {
  return pointerIntersection(args) ?? shapeIntersection(args);
};

// Upstream: closestCenter.ts

/**
 * Returns the distance between the droppable shape and the drag operation shape.
 */
export const closestCenter: CollisionDetector = (input) => {
  const { dragOperation, droppable } = input;
  const { shape, position } = dragOperation;

  if (!droppable.shape) {
    return null;
  }

  const collision = defaultCollisionDetection(input);

  if (collision) {
    return collision;
  }

  const distance = Point.distance(
    droppable.shape.center,
    shape?.current.center ?? position.current,
  );

  const value = 1 / distance;

  return {
    id: droppable.id,
    value,
    type: CollisionType.Collision,
    priority: CollisionPriority.Normal,
  };
};

// Upstream: closestCorners.ts

/**
 * Returns the distance between the corners of the droppable shape and the drag operation shape.
 */
export const closestCorners: CollisionDetector = (input) => {
  const { dragOperation, droppable } = input;
  const { shape, position } = dragOperation;

  if (!droppable.shape) {
    return null;
  }

  const shapeCorners = shape ? Rectangle.from(shape.current.boundingRectangle).corners : undefined;
  const distance = Rectangle.from(droppable.shape.boundingRectangle).corners.reduce(
    (acc, corner, index) =>
      acc + Point.distance(Point.from(corner), shapeCorners?.[index] ?? position.current),
    0,
  );
  const value = distance / 4;

  return {
    id: droppable.id,
    value: 1 / value,
    type: CollisionType.Collision,
    priority: CollisionPriority.Normal,
  };
};

// Upstream: pointerDistance.ts

/**
 * Returns the distance between the droppable shape and the drag operation coordinates.
 */
export const pointerDistance: CollisionDetector = (input) => {
  const { dragOperation, droppable } = input;
  const { position } = dragOperation;

  if (!droppable.shape) {
    return null;
  }

  const distance = Point.distance(droppable.shape.center, position.current);
  const value = 1 / distance;

  return {
    id: droppable.id,
    value,
    type: CollisionType.Collision,
    priority: CollisionPriority.Normal,
  };
};

// Upstream: directionBiased.ts

export const directionBiased: CollisionDetector = ({ dragOperation, droppable }) => {
  if (!droppable.shape) {
    return null;
  }

  const { position, shape } = dragOperation;
  const { direction } = position;

  if (!shape) {
    return null;
  }

  if (direction === null) {
    return defaultCollisionDetection({ dragOperation, droppable });
  }

  const { center } = shape.current;
  const rect = droppable.shape.boundingRectangle;
  const isBelow = rect.bottom >= center.y;
  const isAbove = rect.top <= center.y;
  const isLeft = rect.left <= center.x;
  const isRight = rect.right >= center.x;

  if (
    (direction === 'down' && isBelow) ||
    (direction === 'up' && isAbove) ||
    (direction === 'left' && isLeft) ||
    (direction === 'right' && isRight)
  ) {
    const distance = Point.distance(droppable.shape.center, center);
    const value = distance === 0 ? 1 : 1 / distance;

    return {
      id: droppable.id,
      value,
      type: CollisionType.Collision,
      priority: CollisionPriority.Normal,
    };
  }

  return null;
};

/** Stable source order breaks exact numeric ties; infinity is a valid score. */
export function sortCollisions(a: Collision, b: Collision): number {
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.type !== b.type) return b.type - a.type;
  return a.value === b.value ? 0 : b.value - a.value;
}

export function validCollision(value: Collision, expectedId: UniqueIdentifier): boolean {
  return (
    value.id === expectedId &&
    Number.isFinite(value.priority) &&
    [
      CollisionType.Collision,
      CollisionType.ShapeIntersection,
      CollisionType.PointerIntersection,
    ].includes(value.type) &&
    value.value >= 0 &&
    (Number.isFinite(value.value) || value.value === Infinity)
  );
}

/** A05: sequence comparison follows collision notification, never precedes it. */
export function sameCollisionSequence(a: readonly Collision[], b: readonly Collision[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry.id === b[index]?.id);
}
