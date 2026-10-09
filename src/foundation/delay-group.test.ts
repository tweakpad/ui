import { describe, expect, it, vi } from 'vitest';
import { DelayGroup } from './delay-group.js';

describe('tooltip provider', () => {
  it('cancels earlier pending participants and closes the active sibling', () => {
    const group = new DelayGroup();
    const first = { close: vi.fn() },
      second = { close: vi.fn() },
      cancel = vi.fn();
    group.reserve(first, cancel);
    group.reserve(second, vi.fn());
    expect(cancel).toHaveBeenCalledOnce();
    group.activate(first);
    group.activate(second);
    expect(first.close).toHaveBeenCalledOnce();
    expect(group.instant).toBe(true);
  });
  it('retains instant switching only for the configured rest interval', () => {
    vi.useFakeTimers();
    const group = new DelayGroup({ restTimeout: 400, openDelay: 0 });
    const owner = { close: vi.fn() };
    expect(group.openDelay).toBe(0);
    group.activate(owner);
    group.release(owner);
    vi.advanceTimersByTime(399);
    expect(group.instant).toBe(true);
    vi.advanceTimersByTime(1);
    expect(group.instant).toBe(false);
    group.reserve(owner, owner.close);
    group.destroy();
    expect(owner.close).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
