import { describe, expect, it, vi } from 'vitest';
import { CleanupScope, Scheduler } from './services.js';

describe('cleanup ownership (drag-drop V-17/A11)', () => {
  it('releases every resource once in reverse order despite disposer and reporter failures', () => {
    const order: number[] = [];
    const report = vi.fn(() => {
      throw new Error('reporter');
    });
    const scope = new CleanupScope(report);
    const early = scope.add(() => order.push(0));
    scope.add(() => order.push(1));
    scope.add(() => {
      order.push(2);
      throw new Error('disposer');
    });
    scope.add(() => order.push(3));
    early();
    early();
    scope.dispose();
    scope.dispose();
    scope.add(() => order.push(4));
    expect(order).toEqual([0, 3, 2, 1, 4]);
    expect(report).toHaveBeenCalledTimes(1);
  });
  it('removes listeners even when a subsequently acquired disposer fails', () => {
    const target = new EventTarget();
    const handler = vi.fn();
    const scope = new CleanupScope(() => undefined);
    scope.listen(target, 'click', handler);
    scope.add(() => {
      throw new Error('failed');
    });
    target.dispatchEvent(new Event('click'));
    scope.dispose();
    target.dispatchEvent(new Event('click'));
    expect(handler).toHaveBeenCalledTimes(1);
  });
});

describe('owner scheduling (drag-drop V-12/V-41/V-65)', () => {
  it('uses and releases the supplied window services, not global browser services', () => {
    const timeouts = new Map<number, () => void>();
    const frames = new Map<number, FrameRequestCallback>();
    let next = 0;
    const owner = {
      setTimeout: vi.fn((cb: () => void) => {
        timeouts.set(++next, cb);
        return next;
      }),
      clearTimeout: vi.fn((id: number) => timeouts.delete(id)),
      requestAnimationFrame: vi.fn((cb: FrameRequestCallback) => {
        frames.set(++next, cb);
        return next;
      }),
      cancelAnimationFrame: vi.fn((id: number) => frames.delete(id)),
      setInterval: vi.fn(() => ++next),
      clearInterval: vi.fn(),
    } as unknown as Window;
    const scheduler = new Scheduler(owner);
    const callback = vi.fn();
    scheduler.timeout(callback, 10);
    scheduler.animationFrame(callback);
    const stop = scheduler.interval(callback, 10);
    stop();
    stop();
    scheduler.dispose();
    expect(timeouts.size).toBe(0);
    expect(frames.size).toBe(0);
    expect(owner.clearInterval).toHaveBeenCalledTimes(1);
    expect(callback).not.toHaveBeenCalled();
  });
  it('cancels microtasks after destruction and permits SSR construction', async () => {
    const scheduler = new Scheduler();
    const callback = vi.fn();
    scheduler.microtask(callback);
    scheduler.dispose();
    scheduler.microtask(callback);
    await Promise.resolve();
    expect(callback).not.toHaveBeenCalled();
  });
});
