import { describe, expect, it, vi } from 'vitest';
import { arrayMove, arraySwap, move, swap, dragDropDiagnostics } from './sorting.js';
import type { SortingEvent, SortingIdentity } from './sorting.js';

const manager = { dragOperation: { position: { current: { x: 0, y: 100 } } } };
const event = (source: SortingIdentity, target: SortingIdentity): SortingEvent => ({
  operation: { source, target },
  preventDefault: vi.fn(),
});

describe('sorting validation, A06/A20; V-48–V-51', () => {
  for (const index of [-1, 0.5, NaN, Infinity, -Infinity, 10]) {
    it(`rejects ${String(index)} before direct, fallback and reconciliation indexing`, () => {
      const items = Object.freeze(['a', 'b', 'c']);
      const grouped = Object.freeze({ a: items, b: Object.freeze(['d']) });
      for (const mutate of [arrayMove, arraySwap]) {
        expect(mutate(items, index, 1)).toBe(items);
        expect(mutate(items, 1, index)).toBe(items);
      }
      for (const mutate of [move, swap]) {
        const cases = [
          event({ id: 'a', index }, { id: 'b' }),
          event({ id: 'computed', initialIndex: 0, index }, { id: 'target' }),
          event({ id: 'computed', initialIndex: index, index: 1 }, { id: 'target' }),
        ];
        for (const e of cases) {
          expect(mutate(items, e)).toBe(items);
          expect(e.preventDefault).toHaveBeenCalled();
        }
        for (const group of ['a', 'b']) {
          const fallback = event(
            { id: 'computed', initialGroup: 'a', group, initialIndex: 0, index },
            { id: 'target' },
          );
          expect(mutate(grouped, fallback)).toBe(grouped);
          const reconcile = event({ id: 'a', manager, initialIndex: 0, index, group }, { id: 'a' });
          expect(mutate(grouped, reconcile)).toBe(grouped);
        }
      }
    });
  }
  it('preserves item identity and unaffected groups when transferring at length', () => {
    const item = Object.freeze({ id: 'a' });
    const items = Object.freeze({
      a: Object.freeze([item]),
      b: Object.freeze([{ id: 'b' }]),
      c: Object.freeze([]),
    });
    const e = event({ id: 'a', manager }, { id: 'b', shape: { center: { x: 0, y: 0 } } });
    const result = swap(items, e);
    expect(result.a).toEqual([]);
    expect(result.b.at(-1)).toBe(item);
    expect(result.c).toBe(items.c);
    expect(items.a).toEqual([item]);
  });
  it('handles null items and rejects prototype groups without inserting undefined', () => {
    const items = { a: [null, 'item'], empty: [] };
    expect(move(items, event({ id: 'item', manager }, { id: 'empty' }))).toEqual({
      a: [null],
      empty: ['item'],
    });
    expect(move(items, event({ id: 'item', manager }, { id: 'constructor' }))).toBe(items);
  });
  it('reports actionable invalid-index diagnostics', () => {
    const listener = vi.fn();
    dragDropDiagnostics.addEventListener('diagnostic', listener);
    arrayMove(['a'], 0, NaN);
    dragDropDiagnostics.removeEventListener('diagnostic', listener);
    expect(listener).toHaveBeenCalledOnce();
    expect(listener.mock.calls[0]![0].detail.code).toBe('drag-drop:index');
  });
});
