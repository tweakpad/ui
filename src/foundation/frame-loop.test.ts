import { describe, expect, it, vi } from 'vitest';
import { ManualFrames } from './fakes.test.js';
import { FrameLoop } from './frame-loop.js';

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
