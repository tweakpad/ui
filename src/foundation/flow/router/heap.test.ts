import { describe, expect, it } from 'vitest';
import { IndexHeap } from './heap.js';

describe('IndexHeap', () => {
  it('pops keys in priority order', () => {
    const heap = new IndexHeap(8);
    heap.push(3, 5);
    heap.push(1, 2);
    heap.push(2, 9);
    heap.push(0, 2.5);
    expect(heap.size).toBe(4);
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual([1, 0, 3, 2, -1]);
  });

  it('breaks ties on the secondary priority, then on the key', () => {
    const heap = new IndexHeap(8);
    heap.push(5, 1, 3);
    heap.push(4, 1, 1);
    heap.push(7, 1, 1);
    heap.push(6, 1, 2);
    expect([heap.pop(), heap.pop(), heap.pop(), heap.pop()]).toEqual([4, 7, 6, 5]);
  });

  it('re-prioritizes present keys in both directions', () => {
    const heap = new IndexHeap(8);
    heap.push(0, 10);
    heap.push(1, 20);
    heap.push(2, 30);
    heap.push(2, 5);
    expect(heap.has(2)).toBe(true);
    expect(heap.peek()).toBe(2);
    heap.push(2, 25);
    expect(heap.pop()).toBe(0);
    expect(heap.pop()).toBe(1);
    expect(heap.pop()).toBe(2);
    expect(heap.has(2)).toBe(false);
  });

  it('clears in O(1) and reuses the stamps', () => {
    const heap = new IndexHeap(4);
    heap.push(1, 1);
    heap.push(2, 2);
    heap.clear();
    expect(heap.size).toBe(0);
    expect(heap.has(1)).toBe(false);
    heap.push(2, 1);
    heap.push(1, 2);
    expect([heap.pop(), heap.pop()]).toEqual([2, 1]);
  });

  it('grows past its initial capacity', () => {
    const heap = new IndexHeap(2);
    for (let key = 99; key >= 0; key -= 1) heap.push(key, key);
    expect(heap.capacity).toBeGreaterThanOrEqual(100);
    const order: number[] = [];
    while (heap.size > 0) order.push(heap.pop());
    expect(order).toEqual(Array.from({ length: 100 }, (_, index) => index));
  });

  it('matches a sorted sequence over random pushes', () => {
    let state = 11;
    const next = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    const heap = new IndexHeap(16);
    const expected: Array<[number, number, number]> = [];
    for (let key = 0; key < 500; key += 1) {
      const primary = Math.floor(next() * 20);
      const secondary = Math.floor(next() * 5);
      heap.push(key, primary, secondary);
      expected.push([primary, secondary, key]);
    }
    expected.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);
    const popped: number[] = [];
    while (heap.size > 0) popped.push(heap.pop());
    expect(popped).toEqual(expected.map((entry) => entry[2]));
  });
});
