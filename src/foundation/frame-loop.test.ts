import { describe, expect, it, vi } from 'vitest';
import { ManualFrames } from './fakes.test.js';
import { FrameLoop, frameLoopFor, windowFrames } from './frame-loop.js';

describe('FrameLoop', () => {
  it('runs one frame per window for every pending subscriber and stops at rest', () => {
    const frames = new ManualFrames();
    const loop = new FrameLoop(frames);
    const first = vi.fn(() => true);
    const second = vi.fn(() => false);
    const a = loop.subscribe(first);
    const b = loop.subscribe(second);
    expect(loop.active).toBe(false);
    a.wake();
    b.wake();
    a.wake();
    expect(frames.pending).toBe(1);
    frames.tick(16);
    expect(first).toHaveBeenCalledWith(16, 16);
    expect(second).toHaveBeenCalledWith(16, 16);
    expect(frames.pending).toBe(1);
    frames.tick(16);
    expect(first).toHaveBeenCalledTimes(2);
    expect(second).toHaveBeenCalledTimes(1);
    first.mockReturnValue(false);
    frames.tick(16);
    expect(frames.pending).toBe(0);
    expect(loop.active).toBe(false);
  });

  it('measures elapsed time from the wake and never reports negative time', () => {
    const frames = new ManualFrames();
    const loop = new FrameLoop(frames);
    const calls: number[] = [];
    const subscription = loop.subscribe((elapsed) => {
      calls.push(elapsed);
      return true;
    });
    frames.time = 100;
    subscription.wake();
    frames.tick(10);
    frames.tick(30);
    expect(calls).toEqual([10, 30]);
    subscription.release();
    frames.tick(16);
    expect(calls).toHaveLength(2);
    expect(frames.pending).toBe(0);
  });

  it('ignores wakes after release and releases during a frame', () => {
    const frames = new ManualFrames();
    const loop = new FrameLoop(frames);
    const other = vi.fn(() => true);
    const otherSubscription = loop.subscribe(other);
    const self = loop.subscribe(() => {
      otherSubscription.release();
      return true;
    });
    self.wake();
    otherSubscription.wake();
    frames.tick(16);
    expect(other).not.toHaveBeenCalled();
    self.release();
    self.wake();
    expect(frames.pending).toBe(0);
  });

  it('keeps the loop alive when one subscriber throws', async () => {
    const frames = new ManualFrames();
    const loop = new FrameLoop(frames);
    const healthy = vi.fn(() => true);
    loop
      .subscribe(() => {
        throw new Error('boom');
      })
      .wake();
    loop.subscribe(healthy).wake();
    const errors: unknown[] = [];
    const handler = (event: unknown) => errors.push(event);
    process.once('uncaughtException', handler as never);
    frames.tick(16);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(healthy).toHaveBeenCalledTimes(1);
    expect(frames.pending).toBe(1);
  });
});

/** A window as far as its frames go: it records each call with the receiver it was made on. */
function frameWindow(time = 0) {
  const calls: string[] = [];
  const callbacks = new Map<number, FrameRequestCallback>();
  let next = 0;
  const view = {
    requestAnimationFrame(this: unknown, callback: FrameRequestCallback): number {
      calls.push(this === view ? 'request' : 'request unbound');
      callbacks.set(++next, callback);
      return next;
    },
    cancelAnimationFrame(this: unknown, handle: number): void {
      calls.push(this === view ? `cancel ${handle}` : 'cancel unbound');
      callbacks.delete(handle);
    },
    performance: {
      now(this: unknown): number {
        calls.push(this === view.performance ? 'now' : 'now unbound');
        return time;
      },
    },
  };
  return { view: view as unknown as Window, calls, callbacks };
}

describe('window frames', () => {
  it('cc-follower: windowFrames delegates to its window', () => {
    const { view, calls, callbacks } = frameWindow(42);
    const frames = windowFrames(view);
    const callback = vi.fn();
    const handle = frames.requestAnimationFrame(callback);
    callbacks.get(handle)!(58);
    expect(callback).toHaveBeenCalledWith(58);
    frames.cancelAnimationFrame(handle);
    expect(frames.now()).toBe(42);
    expect(calls).toEqual(['request', 'cancel 1', 'now']);
  });

  it('cc-follower: windowFrames is one frozen source per window', () => {
    const first = frameWindow(1).view;
    const frames = windowFrames(first);
    expect(windowFrames(first)).toBe(frames);
    expect(Object.isFrozen(frames)).toBe(true);
    expect(windowFrames(frameWindow(2).view)).not.toBe(frames);
  });

  it("cc-follower: frameLoopFor runs on its window's frames", () => {
    const { view, calls, callbacks } = frameWindow(42);
    const loop = frameLoopFor(view);
    expect(frameLoopFor(view)).toBe(loop);
    const seen: [number, number][] = [];
    const subscription = loop.subscribe((elapsed, now) => {
      seen.push([elapsed, now]);
      return false;
    });
    subscription.wake();
    subscription.wake();
    expect(calls).toEqual(['now', 'request']);
    callbacks.get(1)!(58);
    expect(seen).toEqual([[16, 58]]);
    expect(loop.active).toBe(false);
  });
});
