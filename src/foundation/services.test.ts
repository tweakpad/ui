import { afterEach, describe, expect, it, vi } from 'vitest';
import { ManualFrames } from './fakes.test.js';
import { CleanupScope, Scheduler, deferRelease, reportDiagnostic } from './services.js';

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

describe('deferRelease (map-f-lifecycle, mp-f-lifecycle)', () => {
  afterEach(() => vi.useRealTimers());

  it('V-835: releases after two frames and cancels on reconnection', () => {
    const frames = new ManualFrames();
    const release = vi.fn();
    const cancel = deferRelease(frames, release);
    frames.tick();
    expect(release).not.toHaveBeenCalled();
    cancel();
    cancel();
    frames.run(3);
    expect(release).not.toHaveBeenCalled();
    expect(frames.pending).toBe(0);
    const late = deferRelease(frames, release);
    frames.tick();
    expect(release).not.toHaveBeenCalled();
    frames.tick();
    expect(release).toHaveBeenCalledTimes(1);
    late();
    frames.run(2);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('uses window frames when requestAnimationFrame exists', () => {
    const frames = new Map<number, FrameRequestCallback>();
    let next = 0;
    const owner = {
      requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
        frames.set(++next, callback);
        return next;
      }),
      cancelAnimationFrame: vi.fn((id: number) => frames.delete(id)),
      setTimeout: vi.fn(),
      clearTimeout: vi.fn(),
    } as unknown as Window;
    const tick = () => {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(0);
    };
    const release = vi.fn();
    deferRelease(owner, release);
    tick();
    expect(release).not.toHaveBeenCalled();
    tick();
    expect(release).toHaveBeenCalledTimes(1);
    const cancel = deferRelease(owner, release);
    tick();
    cancel();
    expect(owner.cancelAnimationFrame).toHaveBeenCalledTimes(1);
    expect(frames.size).toBe(0);
    expect(owner.requestAnimationFrame).toHaveBeenCalledTimes(4);
    expect(owner.setTimeout).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('falls back to two 16 ms timeouts', () => {
    vi.useFakeTimers();
    const owner = {
      setTimeout: vi.fn((callback: () => void, delay: number) =>
        globalThis.setTimeout(callback, delay),
      ),
      clearTimeout: vi.fn((id: number) => globalThis.clearTimeout(id)),
    } as unknown as Window;
    const release = vi.fn();
    const cancel = deferRelease(owner, release);
    vi.advanceTimersByTime(16);
    expect(release).not.toHaveBeenCalled();
    cancel();
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(100);
    expect(release).not.toHaveBeenCalled();
    deferRelease(owner, release);
    vi.advanceTimersByTime(31);
    expect(release).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(release).toHaveBeenCalledTimes(1);
    // Two timeouts per deferral, the cancelled one included: the window's timers, not the global ones.
    expect(owner.setTimeout).toHaveBeenCalledTimes(4);
    for (const view of [undefined, null]) {
      const viewless = vi.fn();
      deferRelease(view, viewless);
      vi.advanceTimersByTime(16);
      expect(viewless).not.toHaveBeenCalled();
      vi.advanceTimersByTime(16);
      expect(viewless).toHaveBeenCalledTimes(1);
    }
  });
});

describe('reportDiagnostic', () => {
  it('dispatches a bubbling, composed tp-diagnostic carrying exactly code, message and severity', () => {
    const host = new EventTarget();
    const seen: unknown[] = [];
    host.addEventListener('tp-diagnostic', (event) =>
      seen.push([(event as CustomEvent).detail, event.bubbles, event.composed]),
    );
    expect(
      reportDiagnostic(host, {
        code: 'tabs-missing-panel',
        message: 'No panel.',
        severity: 'warning',
      }),
    ).toBe(true);
    expect(seen).toEqual([
      [{ code: 'tabs-missing-panel', message: 'No panel.', severity: 'warning' }, true, true],
    ]);
  });

  it('reports a code once per dedupe set', () => {
    const host = new EventTarget();
    const listener = vi.fn();
    host.addEventListener('tp-diagnostic', listener);
    const once = new Set<string>();
    const detail = { code: 'x-dup', message: 'Duplicate.', severity: 'error' as const };
    expect(reportDiagnostic(host, detail, { once })).toBe(true);
    expect(reportDiagnostic(host, detail, { once })).toBe(false);
    expect(reportDiagnostic(host, { ...detail, code: 'x-other' }, { once })).toBe(true);
    expect(listener).toHaveBeenCalledTimes(2);
    expect([...once]).toEqual(['x-dup', 'x-other']);
  });

  it('creates the event in the host window realm', () => {
    class RealmEvent<T> extends CustomEvent<T> {}
    const host = Object.assign(new EventTarget(), {
      ownerDocument: { defaultView: { CustomEvent: RealmEvent } },
    });
    const seen: Event[] = [];
    host.addEventListener('tp-diagnostic', (event) => seen.push(event));
    reportDiagnostic(host, { code: 'a', message: 'b', severity: 'info' });
    expect(seen[0]).toBeInstanceOf(RealmEvent);
  });
});
