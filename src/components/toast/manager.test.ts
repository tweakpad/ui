import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastManager } from './manager.js';
import type { ToastCause, ToastClock } from './types.js';

const clock: ToastClock = {
  now: () => Date.now(),
  setTimeout: (callback, delay) => globalThis.setTimeout(callback, delay) as unknown as number,
  clearTimeout: (handle) => globalThis.clearTimeout(handle),
};
afterEach(() => vi.useRealTimers());

describe('ToastManager family ownership', () => {
  it('publishes immutable newest-first snapshots; update/upsert preserve identity and merge data', () => {
    const manager = new ToastManager<{ a?: number; b?: number }>({ timeout: 0 });
    manager.add({ identifier: 'a', title: 'First', data: { a: 1 } });
    manager.add({ identifier: 'b', title: 'Second' });
    manager.update('a', { description: 'Updated', data: { b: 2 } });
    expect(manager.toasts.map((toast) => toast.identifier)).toEqual(['b', 'a']);
    expect(manager.toasts[1]).toMatchObject({ updateKey: 1, data: { a: 1, b: 2 } });
    manager.add({ identifier: 'a', title: 'Upsert' });
    expect(manager.toasts.map((toast) => toast.identifier)).toEqual(['b', 'a']);
    expect(manager.toasts[1]).toMatchObject({ title: 'Upsert', updateKey: 2 });
    expect(Object.isFrozen(manager.toasts)).toBe(true);
    expect(Object.isFrozen(manager.toasts[0])).toBe(true);
  });
  it('queues reentrant mutations after a coherent publication', () => {
    const manager = new ToastManager({ timeout: 0 });
    const snapshots: string[][] = [];
    manager.subscribe((toasts) => {
      snapshots.push(toasts.map((toast) => toast.identifier));
      if (toasts.length === 1) manager.add({ identifier: 'b' });
    }, false);
    manager.add({ identifier: 'a' });
    expect(snapshots).toEqual([['a'], ['b', 'a']]);
  });
  it('recomputes every limited marker and excludes ending items from active capacity', () => {
    const manager = new ToastManager({ timeout: 0, limit: 2 });
    ['a', 'b', 'c'].forEach((identifier) => manager.add({ identifier }));
    expect(manager.toasts.map((toast) => toast.limited)).toEqual([false, false, true]);
    manager.close('c');
    expect(manager.toasts.find((toast) => toast.identifier === 'a')?.limited).toBe(false);
    manager.configure({ limit: 0 });
    expect(
      manager.toasts
        .filter((toast) => toast.transitionStatus !== 'ending')
        .every((toast) => toast.limited),
    ).toBe(true);
    manager.configure({ limit: 3 });
    expect(
      manager.toasts
        .filter((toast) => toast.transitionStatus !== 'ending')
        .every((toast) => !toast.limited),
    ).toBe(true);
  });
  it('preserves exact remaining time across repeated composed pause/resume cycles', () => {
    vi.useFakeTimers();
    const manager = new ToastManager({ clock, timeout: 5000 });
    manager.add({ identifier: 'a' });
    for (let index = 0; index < 2; index++) {
      vi.advanceTimersByTime(1000);
      manager.pause('hover');
      manager.pause('focus');
      vi.advanceTimersByTime(1000);
      manager.resume('hover');
      vi.advanceTimersByTime(1000);
      manager.resume('focus');
    }
    vi.advanceTimersByTime(2999);
    expect(manager.toasts[0]?.transitionStatus).not.toBe('ending');
    vi.advanceTimersByTime(1);
    expect(manager.toasts[0]?.cause).toBe('timeout');
  });
  it('keeps replacement timers paused and starts settled loading lifetimes', () => {
    vi.useFakeTimers();
    const manager = new ToastManager({ clock, timeout: 100 });
    manager.pause('hover');
    manager.add({ identifier: 'loading', type: 'loading' });
    manager.add({ identifier: 'a' });
    manager.update('a', { timeout: 200 });
    vi.advanceTimersByTime(1000);
    expect(manager.toasts.every((toast) => toast.transitionStatus !== 'ending')).toBe(true);
    manager.resume('hover');
    vi.advanceTimersByTime(199);
    expect(manager.toasts.find((toast) => toast.identifier === 'a')?.transitionStatus).not.toBe(
      'ending',
    );
    vi.advanceTimersByTime(1);
    expect(manager.toasts.find((toast) => toast.identifier === 'a')?.cause).toBe('timeout');
    manager.update('loading', { type: 'success' });
    vi.advanceTimersByTime(100);
    expect(manager.toasts.find((toast) => toast.identifier === 'loading')?.cause).toBe('timeout');
  });
  it('restarts after throttled clocks without immediate mass dismissal', () => {
    vi.useFakeTimers();
    const manager = new ToastManager({ clock, timeout: 1000 });
    manager.add({ identifier: 'a' });
    vi.setSystemTime(Date.now() + 60000);
    manager.pause('window');
    manager.resume('window');
    vi.advanceTimersByTime(999);
    expect(manager.toasts[0]?.transitionStatus).not.toBe('ending');
    vi.advanceTimersByTime(1);
    expect(manager.toasts[0]?.cause).toBe('timeout');
  });
  it('reports identical lifecycle cause once at close and once after removal', () => {
    const manager = new ToastManager({ timeout: 0 });
    const callbacks: [string, ToastCause][] = [];
    manager.add({
      identifier: 'a',
      onClose: (cause) => callbacks.push(['close', cause]),
      onRemove: (cause) => callbacks.push(['remove', cause]),
    });
    manager.close('a', 'swipe');
    manager.close('a', 'programmatic');
    manager.update('a', { title: 'Ignored' });
    expect(callbacks).toEqual([['close', 'swipe']]);
    manager.remove('a');
    manager.remove('a');
    expect(callbacks).toEqual([
      ['close', 'swipe'],
      ['remove', 'swipe'],
    ]);
  });
  it('reopens only through same-ID add and ignores stale completion', () => {
    const manager = new ToastManager({ timeout: 0 });
    const removed = vi.fn();
    manager.add({ identifier: 'a', title: 'Old', onRemove: removed });
    const key = manager.toasts[0]!.lifecycleKey;
    manager.close('a');
    manager.update('a', { title: 'Not reopened' });
    expect(manager.toasts[0]?.title).toBe('Old');
    manager.add({ identifier: 'a', title: 'New' });
    manager.remove('a', key);
    expect(manager.toasts[0]?.title).toBe('New');
    expect(removed).not.toHaveBeenCalled();
  });
  it('returns the original promise outcome and cannot revive a removed or destroyed toast', async () => {
    const manager = new ToastManager({ timeout: 0 });
    let resolve!: (value: number) => void;
    const handled = manager.promise(
      new Promise<number>((done) => {
        resolve = done;
      }),
      { loading: 'Loading', success: (value) => `Value ${value}`, error: 'Error' },
    );
    const id = manager.toasts[0]!.identifier;
    manager.close(id);
    manager.remove(id);
    resolve(7);
    await expect(handled).resolves.toBe(7);
    expect(manager.toasts).toHaveLength(0);
    const error = new Error('failure');
    const rejected = manager.promise(Promise.reject(error), {
      loading: 'Loading',
      success: 'Done',
      error: (value) => ({ description: String(value) }),
    });
    await expect(rejected).rejects.toBe(error);
    expect(manager.toasts[0]).toMatchObject({ type: 'error', description: 'Error: failure' });
    manager.destroy();
  });
  it('destruction cancels work and reports callbacks; reconnect starts a fresh lifetime', async () => {
    vi.useFakeTimers();
    const manager = new ToastManager({ clock, timeout: 100 });
    const callbacks: ToastCause[] = [];
    manager.add({
      identifier: 'a',
      onClose: (cause) => callbacks.push(cause),
      onRemove: (cause) => callbacks.push(cause),
    });
    manager.destroy();
    manager.destroy();
    vi.advanceTimersByTime(1000);
    expect(callbacks).toEqual(['provider-destroyed', 'provider-destroyed']);
    expect(manager.toasts).toHaveLength(0);
    manager.reconnect();
    manager.add({ identifier: 'b' });
    vi.advanceTimersByTime(100);
    expect(manager.toasts[0]?.cause).toBe('timeout');
  });
  it('diagnoses unknown updates and allows subscribers to unsubscribe', () => {
    const diagnostic = vi.fn();
    const listener = vi.fn();
    const manager = new ToastManager({ timeout: 0, diagnostic });
    const unsubscribe = manager.subscribe(listener, false);
    manager.update('missing', { title: 'Ignored' });
    expect(diagnostic).toHaveBeenCalledOnce();
    manager.add({ identifier: 'a' });
    unsubscribe();
    manager.add({ identifier: 'b' });
    expect(listener).toHaveBeenCalledOnce();
  });
  it('settles a promise created from a reentrant subscriber after its queued add commits', async () => {
    const manager = new ToastManager({ timeout: 0 });
    let pending: Promise<number> | undefined;
    manager.subscribe((toasts) => {
      if (toasts.length === 1 && toasts[0]?.identifier === 'outer') {
        pending = manager.promise(Promise.resolve(4), {
          loading: 'Loading',
          success: (value) => `Result ${value}`,
          error: 'Error',
        });
      }
    }, false);
    manager.add({ identifier: 'outer' });
    await expect(pending).resolves.toBe(4);
    expect(manager.toasts[0]).toMatchObject({ title: 'Result 4', type: 'success' });
  });
  it('contains subscriber exceptions and continues notifying coherent snapshots', () => {
    const diagnostic = vi.fn();
    const manager = new ToastManager({ timeout: 0, diagnostic });
    manager.subscribe(() => {
      throw new Error('subscriber');
    }, false);
    const snapshots: string[][] = [];
    manager.subscribe((toasts) => snapshots.push(toasts.map((toast) => toast.identifier)), false);
    manager.add({ identifier: 'a' });
    manager.add({ identifier: 'b' });
    expect(snapshots).toEqual([['a'], ['b', 'a']]);
    expect(diagnostic).toHaveBeenCalledTimes(2);
  });
});
