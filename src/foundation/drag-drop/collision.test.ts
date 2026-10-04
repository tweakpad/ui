import { describe, expect, it } from 'vitest';
import { Rectangle } from './geometry.js';
import {
  closestCenter,
  closestCorners,
  defaultCollisionDetection,
  directionBiased,
  pointerDistance,
  pointerIntersection,
  shapeIntersection,
  sameCollisionSequence,
  sortCollisions,
  validCollision,
  CollisionPriority,
  CollisionType,
} from './collision.js';
import type { Collision, CollisionInput } from './collision.js';

const input = (): CollisionInput => ({
  dragOperation: {
    shape: { current: new Rectangle(0, 0, 10, 10) },
    position: { current: { x: 10, y: 5 }, direction: null },
  },
  droppable: { id: 1, shape: new Rectangle(5, 0, 10, 10) },
});
const collision = (id: number | string, priority = 2, type = 0, value = 1): Collision => ({
  id,
  priority,
  type,
  value,
});

describe('collision source formulas and typed ordering, V-34–V-37', () => {
  it('preserves enum values, inclusive pointer edges and exact-center infinity', () => {
    const i = input();
    expect(pointerIntersection(i)).toEqual(collision(1, 3, 2, Infinity));
    expect(defaultCollisionDetection(i)).toEqual(pointerIntersection(i));
    expect(validCollision(pointerIntersection(i)!, 1)).toBe(true);
    expect(CollisionPriority.Highest).toBe(4);
    expect(CollisionType.PointerIntersection).toBe(2);
    i.dragOperation.position.current = { x: 15, y: 10 };
    expect(pointerIntersection(i)).not.toBeNull();
  });
  it('preserves intersection ratio divided by pointer distance and center fallback', () => {
    const i = input();
    i.dragOperation.position.current = { x: 0, y: 5 };
    expect(shapeIntersection(i)?.value).toBeCloseTo(50 / 150 / 10);
    expect(closestCenter(i)).toEqual(shapeIntersection(i));
    i.droppable.shape = new Rectangle(20, 0, 10, 10);
    expect(closestCenter(i)?.value).toBe(1 / 20);
    expect(closestCorners(i)?.value).toBe(1 / 20);
    expect(pointerDistance(i)?.value).toBe(1 / 25);
  });
  it('preserves directional edge eligibility and zero-distance fallback', () => {
    const i = input();
    i.droppable.shape = new Rectangle(0, 0, 10, 10);
    i.dragOperation.position.direction = 'down';
    expect(directionBiased(i)?.value).toBe(1);
    i.droppable.shape = new Rectangle(0, -20, 10, 10);
    expect(directionBiased(i)).toBeNull();
    i.dragOperation.shape = null;
    expect(directionBiased(i)).toBeNull();
  });
  it('ranks priority then type then score with stable ties', () => {
    const collisions = [
      collision('a'),
      collision('b'),
      collision('type', 2, 2, 0),
      collision('priority', 4, 0, 0),
    ];
    expect(collisions.sort(sortCollisions).map((c) => c.id)).toEqual([
      'priority',
      'type',
      'a',
      'b',
    ]);
    expect(sortCollisions(collision(1, 2, 2, Infinity), collision(2, 2, 2, Infinity))).toBe(0);
  });
  it('does not concatenate or coerce IDs; rejects invalid detector output', () => {
    expect(
      sameCollisionSequence([collision(1), collision(23)], [collision(12), collision(3)]),
    ).toBe(false);
    expect(sameCollisionSequence([collision(1)], [collision('1')])).toBe(false);
    expect(sameCollisionSequence([collision(1)], [collision(1, 2, 2, 10)])).toBe(true);
    for (const bad of [
      collision(1, NaN),
      collision(1, 2, 99),
      collision(1, 2, 0, NaN),
      collision(1, 2, 0, -1),
    ])
      expect(validCollision(bad, 1)).toBe(false);
  });
});
