import { keyEvent } from './fakes.test.js';
import { describe, expect, it, vi } from 'vitest';
import { TabsSelection } from './tabs-selection.js';
import { TpValueChangeEvent } from './events.js';
import { SyntheticPress } from './synthetic-press.js';

const items = (...values: unknown[]) => values.map((value) => ({ value, disabled: false }));
describe('Tabs selection ownership', () => {
  it('honors an existing implicit zero without emitting a no-op change', () => {
    const notify = vi.fn();
    const state = new TabsSelection(undefined, undefined, notify);
    state.reconcile(items('a', 0, 'b'));
    state.reconcile(items('a', 0, 'b'));
    expect(state.value).toBe(0);
    expect(notify).not.toHaveBeenCalled();
  });
  it('reports an initial fallback exactly once', () => {
    const notify = vi.fn();
    const state = new TabsSelection(undefined, undefined, notify);
    state.reconcile(items('a', 'b'));
    state.reconcile(items('a', 'b'));
    expect(notify).toHaveBeenCalledExactlyOnceWith('a', 0, 'initial');
  });
  it('falls back from an implicit disabled zero, but honors an explicit disabled default', () => {
    const collection = [{ value: 0, disabled: true }, ...items('b')];
    const implicit = new TabsSelection(undefined, undefined, vi.fn());
    implicit.reconcile(collection);
    expect(implicit.value).toBe('b');
    const explicit = new TabsSelection(undefined, 0, vi.fn());
    explicit.reconcile(collection);
    expect(explicit.value).toBe(0);
    explicit.reconcile(items(0, 'b'));
    explicit.reconcile(collection);
    expect(explicit.value).toBe('b');
  });
  it('uses successor then predecessor after removal or disabling and can become empty', () => {
    const notify = vi.fn();
    const state = new TabsSelection(undefined, 'b', notify);
    state.reconcile(items('a', 'b', 'c', 'd'));
    state.reconcile(items('a', 'c', 'd'));
    expect(state.value).toBe('c');
    expect(notify).toHaveBeenLastCalledWith('c', 'b', 'missing');
    state.reconcile([
      { value: 'a', disabled: false },
      { value: 'c', disabled: true },
      { value: 'd', disabled: true },
    ]);
    expect(state.value).toBe('a');
    expect(notify).toHaveBeenLastCalledWith('a', 'c', 'disabled');
    state.reconcile([]);
    expect(state.value).toBe(null);
  });
  it('honors explicit empty defaults and reports missing explicit defaults', () => {
    const notify = vi.fn();
    const empty = new TabsSelection(undefined, null, notify);
    empty.reconcile(items('a'));
    expect(empty.value).toBe(null);
    expect(notify).not.toHaveBeenCalled();
    const missing = new TabsSelection(undefined, 'z', notify);
    missing.reconcile(items('a'));
    expect(notify).toHaveBeenCalledExactlyOnceWith('a', 'z', 'missing');
  });
  it('keeps controlled missing/disabled values and requires an accepted owner response', () => {
    const state = new TabsSelection('missing', undefined, vi.fn());
    state.reconcile(items('a'));
    expect(state.value).toBe('missing');
    state.request('a', () => true);
    expect(state.value).toBe('missing');
    state.request('a', () => {
      state.external('a');
      return true;
    });
    expect(state.value).toBe('a');
    state.reconcile([{ value: 'a', disabled: true }]);
    expect(state.value).toBe('a');
    state.request(null, () => {
      state.external(null);
      return false;
    });
    expect(state.value).toBe('a');
    state.external(null);
    expect(state.value).toBe(null);
  });
  it('uses comparable identities rather than stringifying property values', () => {
    const a = {},
      b = {};
    const state = new TabsSelection(undefined, a, vi.fn());
    state.reconcile(items(a, b));
    expect(state.value).toBe(a);
    state.request(b, () => true);
    expect(state.value).toBe(b);
  });
  it('cancels user proposals and serializes reentrant proposals', () => {
    const state = new TabsSelection(undefined, 'a', vi.fn());
    state.reconcile(items('a', 'b', 'c'));
    state.request('b', () => false);
    expect(state.value).toBe('a');
    state.request('b', () => {
      state.request('c', () => true);
      return true;
    });
    expect(state.value).toBe('c');
  });
  it('structural value notifications cannot be canceled', () => {
    const event = new TpValueChangeEvent(null, 'a', 'missing', undefined, { cancelable: false });
    event.preventDefault();
    expect(event.defaultPrevented).toBe(false);
    expect(event.detail.cancelled).toBe(false);
  });
});

describe('shared synthetic press', () => {
  it('activates Enter once, Space on release and cancels a pending Space on blur', () => {
    const activate = vi.fn(),
      press = new SyntheticPress(activate);
    press.keyDown(keyEvent('Enter'));
    press.keyDown(keyEvent('Enter', { repeat: true }));
    expect(activate).toHaveBeenCalledTimes(1);
    press.keyDown(keyEvent(' '));
    expect(activate).toHaveBeenCalledTimes(1);
    press.keyUp(keyEvent(' '));
    expect(activate).toHaveBeenCalledTimes(2);
    press.keyDown(keyEvent(' '));
    press.reset();
    press.keyUp(keyEvent(' '));
    expect(activate).toHaveBeenCalledTimes(2);
  });
  it('respects canceled initiating input', () => {
    const activate = vi.fn(),
      press = new SyntheticPress(activate),
      event = keyEvent('Enter');
    event.preventDefault();
    press.keyDown(event);
    expect(activate).not.toHaveBeenCalled();
  });
});
