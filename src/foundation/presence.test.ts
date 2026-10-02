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
  const host = {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
  } as unknown as ReactiveControllerHost;
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
