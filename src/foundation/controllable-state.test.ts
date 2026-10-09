import { fakeHost } from './fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import { ControllableState, orderedValuesEqual } from './controllable-state.js';
import { TpValueChangeEvent } from './events.js';

function setup<T>(initialValue: T, controlled?: T, defaultValue?: T) {
  let input = controlled;
  let initial = defaultValue;
  const host = fakeHost();
  const onCommit = vi.fn(),
    diagnostic = vi.fn(),
    onChange = vi.fn();
  const state = new ControllableState({
    host,
    initialValue,
    readControlledValue: () => input,
    readDefaultValue: () => initial,
    hasDefaultValue: () => initial !== undefined,
    onChange,
    onCommit,
    diagnostic,
  });
  return {
    state,
    host,
    onCommit,
    onChange,
    diagnostic,
    owner(value: T | undefined, sync = true) {
      input = value;
      if (sync) state.sync();
    },
    default(value: T) {
      initial = value;
    },
  };
}

describe('ControllableState', () => {
  it('publishes transactions atomically after every proposal sees the old snapshot', () => {
    const selection = setup<string | null>('selected');
    const input = setup('query');
    const snapshots: unknown[] = [];
    for (const lane of [selection, input]) {
      lane.onChange.mockImplementation(() =>
        snapshots.push([selection.state.value, input.state.value]),
      );
      lane.onCommit.mockImplementation(() =>
        snapshots.push([selection.state.value, input.state.value]),
      );
    }
    expect(
      ControllableState.transaction([
        selection.state.proposal(null, 'clear'),
        input.state.proposal('', 'clear'),
      ]),
    ).toBe(true);
    expect(snapshots).toEqual([
      ['selected', 'query'],
      ['selected', 'query'],
      [null, ''],
      [null, ''],
    ]);
  });

  it('requires every controlled lane to accept and consumes owner writes on an atomic veto', () => {
    const selection = setup<string | null>(null, 'selected');
    const input = setup('', 'query');
    selection.onChange.mockImplementation(() => selection.owner(null));
    const clear = () =>
      ControllableState.transaction([
        selection.state.proposal(null, 'clear'),
        input.state.proposal('', 'clear'),
      ]);
    expect(clear()).toBe(false);
    selection.state.hostUpdate();
    expect(selection.state.value).toBe('selected');
    expect(input.state.value).toBe('query');
    input.onChange.mockImplementation(() => input.owner(''));
    expect(clear()).toBe(true);
    expect(selection.state.value).toBe(null);
    expect(input.state.value).toBe('');
  });

  it('a canceled lane prevents uncontrolled commits and serializes reentrant work after publication', () => {
    const a = setup(1),
      b = setup(2);
    b.onChange.mockImplementation((event) => event.preventDefault());
    expect(
      ControllableState.transaction([a.state.proposal(0, 'input'), b.state.proposal(0, 'input')]),
    ).toBe(false);
    expect([a.state.value, b.state.value]).toEqual([1, 2]);
    b.onChange.mockImplementation(() => a.state.set(3, 'input'));
    expect(
      ControllableState.transaction([a.state.proposal(0, 'input'), b.state.proposal(0, 'input')]),
    ).toBe(true);
    expect([a.state.value, b.state.value]).toEqual([3, 0]);
    expect(a.onCommit.mock.calls.map((call) => call[0])).toEqual([0, 3]);
  });

  it('unchanged lanes do not propose and commit callbacks observe normalized owner values together', () => {
    const a = setup('same'),
      b = setup('', 'before');
    b.onChange.mockImplementation(() => b.owner('normalized'));
    b.onCommit.mockImplementation(() =>
      expect([a.state.value, b.state.value]).toEqual(['same', 'normalized']),
    );
    expect(
      ControllableState.transaction([
        a.state.proposal('same', 'input'),
        b.state.proposal('raw', 'input'),
      ]),
    ).toBe(true);
    expect(a.onChange).not.toHaveBeenCalled();
    expect(a.onCommit).not.toHaveBeenCalled();
  });

  it('uses a distinct text event channel with the common cancellation protocol', () => {
    const t = setup('before');
    const valueListener = vi.fn();
    t.host.addEventListener('tp-value-change', valueListener);
    t.host.addEventListener('tp-input-value-change', (event) => event.preventDefault());
    const text = new ControllableState({
      host: t.host,
      initialValue: 'before',
      eventFactory: (value, previous, reason, source, options) =>
        new TpValueChangeEvent(value, previous, reason, source, options, 'tp-input-value-change'),
    });
    expect(text.set('after', 'input')).toBe(false);
    expect(text.value).toBe('before');
    expect(valueListener).not.toHaveBeenCalled();
  });
  it('preserves a controlled null and serializes owner publication from onCommit', () => {
    const t = setup<string | null>('fallback', null);
    expect(t.state.value).toBe(null);
    t.state.hostUpdate();
    t.onCommit.mockImplementation((value) => {
      if (value === 'first') t.owner('second');
    });
    t.owner('first');
    expect(t.state.value).toBe('second');
    expect(t.onCommit.mock.calls.map((call) => call[0])).toEqual(['first', 'second']);
  });
  it('initializes the latest default once and commits proposals synchronously', () => {
    const t = setup(false);
    t.default(true);
    t.state.hostUpdate();
    expect(t.state.value).toBe(true);
    t.default(false);
    t.state.hostUpdate();
    expect(t.state.value).toBe(true);
    expect(t.state.set(false, 'trigger-press')).toBe(true);
    expect(t.state.value).toBe(false);
    expect(t.onCommit).toHaveBeenCalledWith(false, true, 'trigger-press');
    expect(t.onChange.mock.calls[0]![0].detail.sourceEvent).toBeInstanceOf(Event);
  });

  it('retains controlled value on rejection and accepts a synchronous owner rewrite', () => {
    const t = setup('', 'before');
    t.state.hostUpdate();
    t.state.set('proposed', 'input');
    expect(t.state.value).toBe('before');
    expect(t.onCommit).not.toHaveBeenCalled();
    t.onChange.mockImplementation(() => t.owner('normalized'));
    t.state.set('proposed', 'input');
    expect(t.state.value).toBe('normalized');
    expect(t.onCommit).toHaveBeenCalledWith('normalized', 'before', 'input');
  });

  it('publishes external controlled changes without emitting proposals', () => {
    const t = setup('', 'one');
    t.state.hostUpdate();
    t.owner('two', false);
    t.state.hostUpdate();
    expect(t.state.value).toBe('two');
    expect(t.onChange).not.toHaveBeenCalled();
    expect(t.onCommit).toHaveBeenCalledWith('two', 'one', 'programmatic');
  });

  it('discards canceled owner returns without replaying at hostUpdate', () => {
    const t = setup(false, false);
    t.state.hostUpdate();
    t.onChange.mockImplementation((event) => {
      t.owner(true);
      expect(t.state.value).toBe(false);
      event.preventDefault();
    });
    expect(t.state.set(true, 'trigger-press')).toBe(false);
    t.state.hostUpdate();
    expect(t.state.value).toBe(false);
    expect(t.onCommit).not.toHaveBeenCalled();
    t.owner(true);
    expect(t.state.value).toBe(true);
  });

  it('honors DOM cancellation and serializes reentrant proposals after commit', () => {
    const t = setup(0),
      observed: number[] = [];
    t.host.addEventListener('tp-value-change', (event) => {
      const next = (event as CustomEvent<{ value: number }>).detail.value;
      observed.push(t.state.value);
      if (next === 1) t.state.set(2, 'input');
      if (next === 3) event.preventDefault();
    });
    t.state.set(1, 'input');
    expect(t.state.value).toBe(2);
    expect(observed).toEqual([0, 1]);
    t.state.set(3, 'input');
    expect(t.state.value).toBe(2);
  });

  it('keeps lifetime mode coherent and diagnoses switching once', () => {
    const t = setup(false);
    t.state.hostUpdate();
    t.owner(true);
    t.state.hostUpdate();
    expect(t.state.controlled).toBe(false);
    expect(t.state.value).toBe(false);
    expect(t.diagnostic).toHaveBeenCalledTimes(1);
    const c = setup(false, true);
    c.state.hostUpdate();
    c.owner(undefined);
    expect(c.state.value).toBe(true);
    expect(c.state.controlled).toBe(true);
  });

  it('preserves source and thumb metadata for queued proposals and canceled commits', () => {
    const t = setup(0);
    const source = new Event('pointermove');
    const proposals: Array<{ value: number; previous: number; index: unknown; source: Event }> = [];
    t.host.addEventListener('tp-value-change', (event) => {
      const detail = (
        event as CustomEvent<{
          value: number;
          previousValue: number;
          metadata: Record<string, unknown>;
          sourceEvent: Event;
        }>
      ).detail;
      proposals.push({
        value: detail.value,
        previous: detail.previousValue,
        index: detail.metadata.activeThumbIndex,
        source: detail.sourceEvent,
      });
      if (detail.value === 1) t.state.set(2, 'drag', source, { metadata: { activeThumbIndex: 1 } });
      if (detail.value === 2) event.preventDefault();
    });
    t.state.set(1, 'drag', source, { metadata: { activeThumbIndex: 0 } });
    expect(proposals).toEqual([
      { value: 1, previous: 0, index: 0, source },
      { value: 2, previous: 1, index: 1, source },
    ]);
    expect(t.state.value).toBe(1);
    expect(t.onCommit.mock.calls).toEqual([[1, 0, 'drag']]);
  });

  it('resets only uncontrolled values with form-reset and latest default', () => {
    const t = setup('empty', undefined, 'first');
    t.state.hostUpdate();
    t.state.set('edited', 'input');
    t.default('second');
    t.state.reset();
    expect(t.state.value).toBe('second');
    expect(t.onChange.mock.calls.at(-1)![0].detail.reason).toBe('form-reset');
    const c = setup('', 'owner');
    c.state.reset();
    expect(c.state.value).toBe('owner');
    expect(c.onChange).not.toHaveBeenCalled();
  });

  it('compares ordered values without joining identifiers or mutating owner arrays', () => {
    const t = setup<readonly string[]>([]);
    const state = new ControllableState({
      host: t.host,
      initialValue: [] as readonly string[],
      equals: orderedValuesEqual,
    });
    const input = Object.freeze(['has space', 'other']);
    state.set(input, 'trigger-press');
    expect(state.value).toEqual(['has space', 'other']);
    expect(state.set(['has space', 'other'], 'trigger-press')).toBe(false);
    expect(state.set(['other', 'has space'], 'trigger-press')).toBe(true);
    expect(input).toEqual(['has space', 'other']);
  });
  it('reconciles an uncontrolled policy value without a proposal or value-change event', () => {
    const lane = setup<number>(0, undefined, 150);
    const changes = vi.fn();
    lane.host.addEventListener('tp-value-change', changes);
    lane.state.reconcile(100);
    expect(lane.state.value).toBe(100);
    expect(lane.onCommit).toHaveBeenCalledWith(100, 150, 'programmatic');
    expect(lane.onChange).not.toHaveBeenCalled();
    expect(changes).not.toHaveBeenCalled();
    lane.state.reconcile(100);
    expect(lane.onCommit).toHaveBeenCalledTimes(1);
  });

  it('leaves a controlled value owner-authoritative during reconciliation', () => {
    const lane = setup<number>(0, 40);
    lane.state.reconcile(10);
    expect(lane.state.value).toBe(40);
    expect(lane.onCommit).not.toHaveBeenCalled();
  });
});
