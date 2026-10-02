import { describe, expect, it, vi } from 'vitest';
import { ControllableState, orderedValuesEqual } from './controllable-state.js';

function setup<T>(initialValue: T, controlled?: T, defaultValue?: T) {
  let input = controlled;
  let initial = defaultValue;
  const host = Object.assign(new EventTarget(), {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
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
});
