import { fakeHost } from './fakes.test.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactiveControllerHost } from 'lit';
import { PresenceController } from './presence.js';

afterEach(() => {
  vi.unstubAllGlobals();
});
function setup() {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++id, callback);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (key: number) => frames.delete(key));
  vi.stubGlobal('window', globalThis);
  const host = fakeHost();
  const complete = vi.fn();
  let retained = false;
  const controller = new PresenceController(host, {
    keepMounted: () => retained,
    onComplete: complete,
  });
  const frame = async () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
    await Promise.resolve();
  };
  const settle = async () => {
    controller.hostUpdated();
    await frame();
    controller.hostUpdated();
    await frame();
  };
  return {
    controller,
    complete,
    frame,
    settle,
    retain: () => {
      retained = true;
    },
  };
}
describe('presence lifecycle', () => {
  it('settles without a transition and still animates later changes', async () => {
    const f = setup();
    f.controller.settle(true);
    expect(f.controller.state).toBe('open');
    await f.settle();
    expect(f.complete).not.toHaveBeenCalled();
    f.controller.setPresent(false);
    expect(f.controller.state).toBe('ending');
    await f.settle();
    expect(f.controller.state).toBe('absent');
    expect(f.complete.mock.calls).toEqual([[false]]);
    f.controller.settle(true);
    f.controller.settle(false);
    expect(f.controller.state).toBe('absent');
  });
  it('schedules and cancels with the allocating owner window across adoption', async () => {
    const makeWindow = () => {
      let id = 0;
      const frames = new Map<number, FrameRequestCallback>();
      const timers = new Map<number, () => void>();
      const view = {
        requestAnimationFrame: vi.fn((callback: FrameRequestCallback) => {
          frames.set(++id, callback);
          return id;
        }),
        cancelAnimationFrame: vi.fn((key: number) => frames.delete(key)),
        setTimeout: vi.fn((callback: () => void) => {
          timers.set(++id, callback);
          return id;
        }),
        clearTimeout: vi.fn((key: number) => timers.delete(key)),
      };
      return {
        view,
        frames,
        timers,
        frame: () => {
          const pending = [...frames.values()];
          frames.clear();
          pending.forEach((callback) => callback(0));
        },
      };
    };
    const first = makeWindow();
    const second = makeWindow();
    const host = fakeHost({ ownerDocument: { defaultView: first.view } });
    const completed = vi.fn();
    const controller = new PresenceController(host as unknown as ReactiveControllerHost, {
      onComplete: completed,
    });
    controller.setPresent(true);
    controller.hostUpdated();
    host.ownerDocument = { defaultView: second.view };
    controller.hostDisconnected();
    expect(first.view.cancelAnimationFrame).toHaveBeenCalledOnce();
    expect(first.frames.size).toBe(0);
    expect(second.view.cancelAnimationFrame).not.toHaveBeenCalled();
    controller.hostConnected();
    controller.hostUpdated();
    second.frame();
    const unfinished = new Promise<void>(() => {});
    controller.trackCompletion(unfinished);
    controller.hostUpdated();
    second.frame();
    expect(second.timers.size).toBe(1);
    host.ownerDocument = { defaultView: first.view };
    controller.hostDisconnected();
    expect(second.view.clearTimeout).toHaveBeenCalledOnce();
    expect(second.timers.size).toBe(0);
    expect(completed).not.toHaveBeenCalled();
    controller.hostConnected();
    controller.hostUpdated();
    first.frame();
    controller.hostUpdated();
    first.frame();
    await Promise.resolve();
    expect(completed.mock.calls).toEqual([[true]]);
  });
  it('completes each stable cycle once even after unrelated host updates', async () => {
    const f = setup();
    f.controller.setPresent(true);
    await f.settle();
    await f.settle();
    f.controller.setPresent(false);
    await f.settle();
    await f.settle();
    expect(f.complete.mock.calls).toEqual([[true], [false]]);
  });
  it('does not complete a superseded entry', async () => {
    const f = setup();
    f.controller.setPresent(true);
    f.controller.hostUpdated();
    f.controller.setPresent(false);
    await f.settle();
    expect(f.complete.mock.calls).toEqual([[false]]);
    expect(f.controller.state).toBe('absent');
  });
  it('invalidates queued completion on disconnect and starts a fresh reconnect cycle', async () => {
    const f = setup();
    f.controller.setPresent(true);
    f.controller.hostUpdated();
    f.controller.hostDisconnected();
    await f.frame();
    expect(f.complete).not.toHaveBeenCalled();
    f.controller.hostConnected();
    f.controller.setPresent(true);
    await f.settle();
    expect(f.complete.mock.calls).toEqual([[true]]);
  });
  it('releases retained mounting without repeating close completion', async () => {
    const f = setup();
    f.controller.setPresent(true);
    await f.settle();
    f.retain();
    f.controller.setPresent(false);
    await f.settle();
    expect(f.controller.state).toBe('retained');
    f.controller.releaseRetained();
    expect(f.controller.state).toBe('absent');
    expect(f.complete.mock.calls).toEqual([[true], [false]]);
  });
});
