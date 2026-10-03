import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { PopupViewportController } from './popup-viewport.js';

afterEach(() => vi.unstubAllGlobals());

function fixture() {
  let id = 0;
  const frames = new Map<number, FrameRequestCallback>();
  const controllers: ReactiveController[] = [];
  vi.stubGlobal('window', {
    requestAnimationFrame(callback: FrameRequestCallback) {
      frames.set(++id, callback);
      return id;
    },
    cancelAnimationFrame(key: number) {
      frames.delete(key);
    },
  });
  const host = {
    addController(controller: ReactiveController) {
      controllers.push(controller);
    },
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
  } as unknown as ReactiveControllerHost;
  const viewport = new PopupViewportController(host, () => null);
  const frame = async () => {
    controllers.forEach((controller) => controller.hostUpdated?.());
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach((callback) => callback(0));
    await Promise.resolve();
  };
  return { viewport, frame };
}

describe('popup content viewport ownership', () => {
  it('retains the actual prior payload until its exit completes, without duplicating keys', async () => {
    const { viewport, frame } = fixture();
    const a = { nativePayload: 'A' },
      b = { nativePayload: 'B' };
    viewport.set('a', a);
    viewport.set('b', b);
    expect(viewport.entries.map((entry) => entry.key)).toEqual(['a', 'b']);
    expect(viewport.previous?.content).toBe(a);
    expect(viewport.state).toMatchObject({
      current: 'b',
      previous: 'a',
      transitioning: true,
      activationDirection: 'forward',
    });
    await frame();
    expect(viewport.entries).toEqual([{ key: 'b', content: b }]);
    expect(viewport.state.transitioning).toBe(false);
  });

  it('reuses the retained payload on a rapid reverse and discards a superseded completion', async () => {
    const { viewport, frame } = fixture();
    const a = {},
      b = {};
    viewport.set('a', a);
    viewport.set('b', b);
    viewport.set('a', { shouldNotReplaceRetainedIdentity: true }, 'backward');
    expect(viewport.current?.content).toBe(a);
    expect(viewport.previous?.content).toBe(b);
    expect(viewport.state.activationDirection).toBe('backward');
    await frame();
    expect(viewport.entries).toEqual([{ key: 'a', content: a }]);
  });

  it('clears a closed viewport without allowing pending work to revive retired content', async () => {
    const { viewport, frame } = fixture();
    viewport.set('a', {});
    viewport.set('b', {});
    viewport.reset();
    await frame();
    expect(viewport.entries).toEqual([]);
    expect(viewport.state).toMatchObject({ current: null, previous: null, transitioning: false });
    viewport.set('c', {});
    expect(viewport.state.current).toBe('c');
  });
});
