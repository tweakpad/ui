import { describe, expect, it } from 'vitest';
import { ObservableStore } from './store.js';

describe('coherent operation publication (drag-drop V-70)', () => {
  it('publishes batches whose old value is undefined exactly once', () => {
    const store = new ObservableStore<number | undefined>(undefined);
    const seen: unknown[] = [];
    store.subscribe((change) => seen.push(change));
    store.batch(() => {
      store.set(1);
      store.batch(() => store.set(2));
    });
    expect(seen).toEqual([{ value: 2, previousValue: undefined, reason: 'programmatic' }]);
  });
  it('preserves nested reentrant batch boundaries', () => {
    const store = new ObservableStore(0),
      seen: number[][] = [];
    store.subscribe(({ value }) => {
      if (value === 1)
        store.batch(() => {
          store.update((v) => v + 1);
          store.batch(() => store.update((v) => v + 1));
        });
    });
    store.subscribe(({ value }) => seen.push([value, store.value]));
    store.set(1);
    expect(seen).toEqual([
      [1, 1],
      [3, 3],
    ]);
  });
  it('queues reentrant writes until every observer sees the same current value', () => {
    const store = new ObservableStore(0);
    const seen: number[][] = [];
    store.subscribe(({ value }) => {
      if (value === 1) {
        store.update((v) => v + 1);
        store.update((v) => v + 1);
      }
    });
    store.subscribe(({ value }) => seen.push([value, store.value]));
    store.set(1);
    expect(seen).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
    ]);
  });
});
