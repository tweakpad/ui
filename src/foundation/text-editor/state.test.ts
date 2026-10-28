import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualFrames } from '../fakes.test.js';
import type { TextEditorEngineState, TextEditorMarkState } from './model.js';
import { preReadyState, TextEditorStore } from './state.js';

const INITIAL = preReadyState({ editable: true, empty: true });

/** A deep-frozen engine state: the initial state with a version and the given members. */
function engineState(
  version: number,
  members: Partial<TextEditorEngineState> = {},
): TextEditorEngineState {
  return Object.freeze({ ...INITIAL, version, ...members });
}

function marks(members: Partial<TextEditorMarkState>): TextEditorMarkState {
  return Object.freeze({ ...INITIAL.marks, ...members });
}

function setup(initial: TextEditorEngineState = INITIAL) {
  const frames = new ManualFrames();
  return { frames, store: new TextEditorStore(frames, initial) };
}

/** Every object reachable from `value`, `value` included. */
function objects(value: unknown): object[] {
  if (typeof value !== 'object' || value === null) return [];
  return [value, ...Object.values(value).flatMap(objects)];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TextEditorStore (uwg-te-req-perf-1, uwg-te-req-prop-2)', () => {
  it('publishes at most once per frame, the state staged last', () => {
    const { frames, store } = setup();
    const versions: number[] = [];
    store.subscribe(
      (state) => state.version,
      (version) => versions.push(version),
    );

    for (const version of [1, 2, 3, 4, 5]) store.stage(engineState(version));
    expect(frames.pending).toBe(1);
    expect(store.state).toBe(INITIAL);
    expect(versions).toEqual([]);

    frames.tick();
    expect(store.state.version).toBe(5);
    expect(versions).toEqual([5]);
    expect(frames.pending).toBe(0);

    frames.tick();
    expect(versions).toEqual([5]);
    store.stage(engineState(6));
    store.stage(engineState(7));
    expect(frames.pending).toBe(1);
    frames.tick();
    expect(versions).toEqual([5, 7]);
  });

  it('calls a subscriber at most once per publication, when its slice changes under shallow equality', () => {
    const { frames, store } = setup();
    const bold = vi.fn();
    const markSlice = vi.fn();
    const pair = vi.fn();
    const every = vi.fn();
    store.subscribe((state) => state.marks.bold, bold);
    store.subscribe((state) => state.marks, markSlice);
    store.subscribe((state) => [state.editable, state.focused], pair);
    store.subscribe((state) => state, every);

    // New objects with the same members: only the whole-state slice changes.
    store.stage(engineState(1, { marks: marks({}) }));
    frames.tick();
    for (const callback of [bold, markSlice, pair]) expect(callback).not.toHaveBeenCalled();
    expect(every).toHaveBeenCalledTimes(1);

    // Several updates in one frame: each subscriber runs once, with the latest slice.
    store.stage(engineState(2, { marks: marks({ bold: 'mixed' }) }));
    store.stage(engineState(3, { marks: marks({ bold: 'on' }), focused: true }));
    frames.tick();
    expect(bold.mock.calls).toEqual([['on']]);
    expect(markSlice).toHaveBeenCalledTimes(1);
    expect(markSlice.mock.calls[0]![0]).toMatchObject({ bold: 'on' });
    expect(pair.mock.calls).toEqual([[[true, true]]]);
    expect(every).toHaveBeenCalledTimes(2);
    expect(every.mock.calls[1]![0]).toBe(store.state);
  });

  it('derives tool values from each publication (uwg-te-req-tools-2)', () => {
    const { frames, store } = setup(preReadyState({ editable: false, empty: true }));
    const derive = (state: TextEditorEngineState) => ({
      enabled: state.editable,
      active: state.marks.bold === 'on',
    });
    const seen: ReturnType<typeof derive>[] = [];
    store.subscribe(derive, (tool) => seen.push(tool));

    store.stage(engineState(1, { editable: true }));
    frames.tick();
    store.stage(engineState(2, { editable: true }));
    frames.tick();
    store.stage(engineState(3, { editable: true, marks: marks({ bold: 'on' }) }));
    frames.tick();
    expect(seen).toEqual([
      { enabled: true, active: false },
      { enabled: true, active: true },
    ]);
  });

  it('keeps the same snapshot object until the next publication', () => {
    const { frames, store } = setup();
    expect(store.state).toBe(INITIAL);

    const first = engineState(1);
    store.stage(first);
    expect(store.state).toBe(INITIAL);
    expect(store.current).toBe(first);
    frames.tick();
    expect(store.state).toBe(first);
    expect(store.state).toBe(store.state);
    expect(store.current).toBe(first);

    const second = engineState(2);
    store.stage(second);
    expect(store.state).toBe(first);
    frames.tick();
    expect(store.state).toBe(second);
  });

  it('publishes nothing for a staged state that equals the published one', () => {
    const { frames, store } = setup();
    const every = vi.fn();
    store.subscribe((state) => state, every);

    store.stage(Object.freeze({ ...INITIAL }));
    frames.tick();
    store.stage(preReadyState({ editable: true, empty: true }));
    frames.tick();
    expect(store.state).toBe(INITIAL);
    expect(every).not.toHaveBeenCalled();
  });

  it('flush publishes the staged state at once and cancels its frame', () => {
    const { frames, store } = setup();
    const versions: number[] = [];
    store.subscribe(
      (state) => state.version,
      (version) => versions.push(version),
    );

    store.flush();
    expect(store.state).toBe(INITIAL);

    const staged = engineState(1);
    store.stage(staged);
    store.flush();
    expect(store.state).toBe(staged);
    expect(versions).toEqual([1]);
    expect(frames.pending).toBe(0);
    frames.tick();
    expect(versions).toEqual([1]);
  });

  it('publishes a state staged during a publication at the next frame', () => {
    const { frames, store } = setup();
    const versions: number[] = [];
    store.subscribe(
      (state) => state.version,
      (version) => {
        versions.push(version);
        if (version === 1) store.stage(engineState(2));
      },
    );

    store.stage(engineState(1));
    frames.tick();
    expect(versions).toEqual([1]);
    expect(frames.pending).toBe(1);
    frames.tick();
    expect(versions).toEqual([1, 2]);
  });

  it('ends a subscription when its function is called, also during a running publication', () => {
    const { frames, store } = setup();
    const second = vi.fn();
    let endSecond = (): void => undefined;
    const endFirst = store.subscribe(
      (state) => state.version,
      () => endSecond(),
    );
    endSecond = store.subscribe((state) => state.version, second);

    store.stage(engineState(1));
    frames.tick();
    expect(second).not.toHaveBeenCalled();

    const third = vi.fn();
    const endThird = store.subscribe((state) => state.version, third);
    endFirst();
    endThird();
    store.stage(engineState(2));
    frames.tick();
    expect(third).not.toHaveBeenCalled();
  });

  it('reports a throwing selector or callback outside the publication, so the others still run', () => {
    const reported: (() => void)[] = [];
    vi.stubGlobal('queueMicrotask', (task: () => void) => reported.push(task));
    const { frames, store } = setup();
    const after = vi.fn();
    store.subscribe(
      (state) => {
        if (state.version === 1) throw new Error('selector failed');
        return state.version;
      },
      () => undefined,
    );
    store.subscribe(
      (state) => state.version,
      () => {
        throw new Error('callback failed');
      },
    );
    store.subscribe((state) => state.version, after);

    store.stage(engineState(1));
    expect(() => frames.tick()).not.toThrow();
    expect(after.mock.calls).toEqual([[1]]);
    expect(store.state.version).toBe(1);
    expect(reported).toHaveLength(2);
    expect(() => reported[0]!()).toThrow('selector failed');
    expect(() => reported[1]!()).toThrow('callback failed');

    // The first selection runs at once, so its error reaches the caller.
    expect(() =>
      store.subscribe(
        (state) => state.table!.rows,
        () => undefined,
      ),
    ).toThrow(TypeError);
  });

  it('dispose cancels the pending frame and ignores later states', () => {
    const { frames, store } = setup();
    const every = vi.fn();
    store.subscribe((state) => state, every);

    store.stage(engineState(1));
    store.dispose();
    expect(frames.pending).toBe(0);
    store.stage(engineState(2));
    expect(frames.pending).toBe(0);
    store.flush();
    frames.tick();
    expect(store.state).toBe(INITIAL);
    expect(store.current).toBe(INITIAL);
    expect(every).not.toHaveBeenCalled();
  });

  it('pause cancels the pending frame and requests none; resume publishes the state staged last at the next frame', () => {
    const { frames, store } = setup();
    const versions: number[] = [];
    store.subscribe(
      (state) => state.version,
      (version) => versions.push(version),
    );

    store.stage(engineState(1));
    store.pause();
    expect(frames.pending).toBe(0);
    store.stage(engineState(2));
    expect([frames.pending, store.current.version]).toEqual([0, 2]);
    frames.tick();
    expect(versions).toEqual([]);

    store.resume();
    store.resume();
    expect(frames.pending).toBe(1);
    frames.tick();
    expect(versions).toEqual([2]);
    // A flush while paused still publishes at once.
    store.pause();
    store.stage(engineState(3));
    store.flush();
    expect(versions).toEqual([2, 3]);
    store.resume();
    expect(frames.pending).toBe(0);
  });
});

describe('pre-ready state (uwg-te-req-prop-2, uwg-te-req-engine-4)', () => {
  it('reports the editability of the mount, the emptiness, every mark off and nothing else', () => {
    expect(preReadyState({ editable: false, empty: true })).toEqual({
      version: 0,
      contentVersion: 0,
      editable: false,
      focused: false,
      composing: false,
      empty: true,
      selection: { kind: 'none' },
      marks: {
        bold: 'off',
        italic: 'off',
        underline: 'off',
        strike: 'off',
        code: 'off',
        superscript: 'off',
        subscript: 'off',
        textColor: null,
        highlight: null,
      },
      block: null,
      blockKinds: [],
      align: null,
      link: null,
      table: null,
      caret: null,
      emptyBlock: null,
      history: { undo: false, redo: false },
    });

    // Pending content that is not empty, pending native JSON included, reports no empty document.
    const pending = preReadyState({ editable: true, empty: false, version: 12, contentVersion: 4 });
    expect([pending.editable, pending.empty, pending.version, pending.contentVersion]).toEqual([
      true,
      false,
      12,
      4,
    ]);
  });

  it('is deep-frozen, with the same nested parts in every pre-ready state', () => {
    const state = preReadyState({ editable: true, empty: true });
    expect(objects(state).length).toBeGreaterThan(1);
    expect(objects(state).every((value) => Object.isFrozen(value))).toBe(true);
    expect(() => {
      (state as { editable: boolean }).editable = false;
    }).toThrow(TypeError);
    expect(() => {
      (state.blockKinds as string[]).push('paragraph');
    }).toThrow(TypeError);

    const other = preReadyState({ editable: false, empty: false });
    for (const key of ['selection', 'marks', 'blockKinds', 'history'] as const)
      expect(other[key], key).toBe(state[key]);
  });
});
