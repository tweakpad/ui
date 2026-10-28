import { describe, expect, it } from 'vitest';
import { deepFreeze, frozenCopy } from './freeze.js';
import { freezeMediaValue } from './media/state.js';

class Point {
  constructor(
    public x: number,
    public y: number,
  ) {}
}

describe('deep freezing (shared freeze owner)', () => {
  it('deepFreeze freezes in place and skips frozen values', () => {
    const shared = Object.freeze({ tags: ['a'] });
    const value = { list: [{ id: 1 }], nested: { deeper: { flag: true } }, shared };
    const result = deepFreeze(value);
    expect(result).toBe(value);
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(value.list)).toBe(true);
    expect(Object.isFrozen(value.list[0])).toBe(true);
    expect(Object.isFrozen(value.nested.deeper)).toBe(true);
    // A frozen value is kept as it is, without visiting what it holds.
    expect(Object.isFrozen(shared.tags)).toBe(false);
    expect(deepFreeze(7)).toBe(7);
    expect(deepFreeze(null)).toBeNull();
  });

  it("frozenCopy copies plain data and leaves the caller's objects unfrozen", () => {
    const value = { list: [{ id: 1 }], nested: { deeper: { flag: true } } };
    const copy = frozenCopy(value);
    expect(copy).toEqual(value);
    expect(copy).not.toBe(value);
    expect(copy.list).not.toBe(value.list);
    expect(copy.list[0]).not.toBe(value.list[0]);
    expect(Object.isFrozen(copy)).toBe(true);
    expect(Object.isFrozen(copy.list)).toBe(true);
    expect(Object.isFrozen(copy.list[0])).toBe(true);
    expect(Object.isFrozen(copy.nested.deeper)).toBe(true);
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(value.list[0])).toBe(false);
    expect(Object.isFrozen(value.nested.deeper)).toBe(false);
  });

  it('class instances are kept', () => {
    const point = new Point(1, 2);
    const copy = frozenCopy({ point, items: [point] });
    expect(copy.point).toBe(point);
    expect(copy.items[0]).toBe(point);
    expect(Object.isFrozen(point)).toBe(false);
    const prototypeless = Object.assign(Object.create(null) as Record<string, unknown>, { a: 1 });
    const copied = frozenCopy(prototypeless);
    expect(copied).not.toBe(prototypeless);
    expect(Object.isFrozen(copied)).toBe(true);
  });

  it('media freezeMediaValue delegates to deepFreeze', () => {
    const value = { buffered: [{ start: 0, end: 1 }] };
    expect(freezeMediaValue(value)).toBe(value);
    expect(Object.isFrozen(value.buffered[0])).toBe(true);
  });
});
