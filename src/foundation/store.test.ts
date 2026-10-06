import { describe, expect, it } from 'vitest';
import { ObservableStore, shallowEqual } from './store.js';

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

describe('selected subscriptions (media player C-09, V-11, V-74)', () => {
  interface Media {
    currentTime: number;
    paused: boolean;
    volume: { level: number; muted: boolean };
  }
  const selectTime = (state: Media) => state.currentTime;
  const initial: Media = Object.freeze({
    currentTime: 0,
    paused: true,
    volume: Object.freeze({ level: 1, muted: false }),
  });

  it('keeps the legacy (subscriber, emitCurrent) signature and full-value delivery', () => {
    const store = new ObservableStore(1);
    const seen: unknown[] = [];
    const stop = store.subscribe((change) => seen.push(change), true);
    store.set(2, 'keyboard');
    store.set(2);
    stop();
    store.set(3);
    expect(seen).toEqual([
      { value: 1, previousValue: 1, reason: 'programmatic' },
      { value: 2, previousValue: 1, reason: 'keyboard' },
    ]);
    const quiet: number[] = [];
    store.subscribe(({ value }) => quiet.push(value));
    store.subscribe(({ value }) => quiet.push(value * 10), false);
    store.subscribe(({ value }) => quiet.push(value * 100), { emitCurrent: false });
    store.set(4);
    expect(quiet).toEqual([4, 40, 400]);
  });

  it('accepts emitCurrent through the options record without a selector', () => {
    const store = new ObservableStore('a');
    const seen: string[] = [];
    store.subscribe(({ value, reason }) => seen.push(`${value}:${reason}`), { emitCurrent: true });
    store.set('b', 'media');
    expect(seen).toEqual(['a:programmatic', 'b:media']);
  });

  it('notifies only subscribers whose selected slice changed under Object.is', () => {
    const store = new ObservableStore<Media>(initial);
    const time: number[] = [];
    const paused: boolean[] = [];
    store.subscribe((value) => time.push(value), { selector: selectTime });
    store.subscribe((value) => paused.push(value), { selector: (state: Media) => state.paused });
    for (const currentTime of [0.25, 0.5, 0.75])
      store.set({ ...store.value, currentTime }, 'media');
    expect(time).toEqual([0.25, 0.5, 0.75]);
    expect(paused).toEqual([]);
    store.set({ ...store.value, paused: false }, 'trigger-press');
    expect(paused).toEqual([false]);
    expect(time).toEqual([0.25, 0.5, 0.75]);
  });

  it('delivers the selected change record with previous selection and reason', () => {
    const store = new ObservableStore<Media>(initial);
    const changes: unknown[] = [];
    store.subscribe<boolean>((value, change) => changes.push([value, change]), {
      selector: (state) => state.paused,
      emitCurrent: true,
    });
    store.set({ ...store.value, paused: false }, 'hotkey');
    expect(changes).toEqual([
      [true, { value: true, previousValue: true, reason: 'programmatic' }],
      [false, { value: false, previousValue: true, reason: 'hotkey' }],
    ]);
  });

  it('uses a supplied equality, including the exported shallowEqual', () => {
    const store = new ObservableStore<Media>(initial);
    const identity: unknown[] = [];
    const shallow: unknown[] = [];
    const select = (state: Media) => ({ level: state.volume.level, muted: state.volume.muted });
    store.subscribe((value) => identity.push(value), { selector: select });
    store.subscribe((value) => shallow.push(value), { selector: select, equality: shallowEqual });
    store.set({ ...store.value, currentTime: 5 }, 'media');
    expect(identity).toHaveLength(1);
    expect(shallow).toHaveLength(0);
    store.set({ ...store.value, volume: { level: 0.5, muted: false } }, 'drag');
    expect(shallow).toEqual([{ level: 0.5, muted: false }]);
    const never: unknown[] = [];
    store.subscribe((value) => never.push(value), {
      selector: (state) => state.currentTime,
      equality: () => true,
    });
    store.set({ ...store.value, currentTime: 9 });
    expect(never).toEqual([]);
  });

  it('compares against the last delivered selection across batches and reentrant writes', () => {
    const store = new ObservableStore<Media>(initial);
    const time: number[] = [];
    store.subscribe((value) => time.push(value), { selector: selectTime });
    store.batch(() => {
      store.set({ ...store.value, currentTime: 1 });
      store.set({ ...store.value, currentTime: 0 });
    });
    expect(time).toEqual([]);
    store.subscribe(
      (value) => {
        if (!value) store.update((state) => ({ ...state, currentTime: 2 }), 'idle');
      },
      { selector: (state) => state.paused },
    );
    store.set({ ...store.value, paused: false, currentTime: 1 }, 'gesture');
    expect(time).toEqual([1, 2]);
  });

  it('stops selected delivery after unsubscribe and supports one listener with two selections', () => {
    const store = new ObservableStore<Media>(initial);
    const seen: unknown[] = [];
    const listener = (value: unknown) => seen.push(value);
    const stopTime = store.subscribe(listener, { selector: (state) => state.currentTime });
    store.subscribe(listener, { selector: (state) => state.paused });
    store.set({ ...store.value, currentTime: 3, paused: false });
    expect(seen).toEqual([3, false]);
    stopTime();
    store.set({ ...store.value, currentTime: 4, paused: true });
    expect(seen).toEqual([3, false, true]);
  });

  it('shallowEqual compares own keys, symbols and kinds', () => {
    const symbol = Symbol('s');
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual(Number.NaN, Number.NaN)).toBe(true);
    expect(shallowEqual(0, -0)).toBe(false);
    expect(shallowEqual({ a: 1, [symbol]: 2 }, { a: 1, [symbol]: 2 })).toBe(true);
    expect(shallowEqual({ a: 1, [symbol]: 2 }, { a: 1, [symbol]: 3 })).toBe(false);
    expect(shallowEqual({ a: 1 }, { a: 1, b: undefined })).toBe(false);
    expect(shallowEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(false);
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowEqual([], {})).toBe(false);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual<unknown>('a', { 0: 'a' })).toBe(false);
  });
});
