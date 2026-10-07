import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeScroll } from './observation.js';

class CountingTarget extends EventTarget {
  added = 0;
  removed = 0;
  override addEventListener(...args: Parameters<EventTarget['addEventListener']>): void {
    this.added += 1;
    super.addEventListener(...args);
  }
  override removeEventListener(...args: Parameters<EventTarget['removeEventListener']>): void {
    this.removed += 1;
    super.removeEventListener(...args);
  }
}

function fakeView() {
  let frames: FrameRequestCallback[] = [];
  const view = {
    performance: { now: () => Date.now() },
    requestAnimationFrame: (callback: FrameRequestCallback) => frames.push(callback),
    cancelAnimationFrame: () => {},
    flush() {
      const pending = frames;
      frames = [];
      for (const callback of pending) callback(0);
    },
    get frames() {
      return frames.length;
    },
  };
  return view;
}

describe('shared scroll source', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('installs one native listener per event type for any number of subscribers', () => {
    const target = new CountingTarget();
    const view = fakeView();
    const releases = Array.from({ length: 50 }, () =>
      observeScroll(target, { scroll: () => {}, userScroll: () => {} }, view as never),
    );
    expect(target.added).toBe(3); // scroll, wheel, touchmove
    for (const release of releases) release();
    expect(target.removed).toBe(3);
  });

  it('runs frame-timed subscribers together in one frame with the latest event', () => {
    const target = new CountingTarget();
    const view = fakeView();
    const seen: Event[] = [];
    observeScroll(target, { scroll: (event) => seen.push(event) }, view as never);
    observeScroll(target, { scroll: (event) => seen.push(event) }, view as never);
    const first = new Event('scroll'),
      last = new Event('scroll');
    target.dispatchEvent(first);
    target.dispatchEvent(last);
    expect(view.frames).toBe(1);
    expect(seen).toEqual([]);
    view.flush();
    expect(seen).toEqual([last, last]);
  });

  it('delivers immediate subscribers inside the native event', () => {
    const target = new CountingTarget();
    const calls = vi.fn();
    observeScroll(target, { scroll: calls, timing: { immediate: true } }, fakeView() as never);
    target.dispatchEvent(new Event('scroll'));
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('debounces until scrolling is quiet', () => {
    const target = new CountingTarget();
    const calls = vi.fn();
    observeScroll(target, { scroll: calls, timing: { debounce: 100 } }, fakeView() as never);
    for (let index = 0; index < 5; index += 1) {
      target.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(50);
    }
    expect(calls).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(calls).toHaveBeenCalledTimes(1);
  });

  it('throttles with a leading frame call and a trailing call', () => {
    const target = new CountingTarget();
    const view = fakeView();
    const calls = vi.fn();
    observeScroll(target, { scroll: calls, timing: { throttle: 100 } }, view as never);
    target.dispatchEvent(new Event('scroll'));
    view.flush();
    expect(calls).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(20);
    target.dispatchEvent(new Event('scroll'));
    target.dispatchEvent(new Event('scroll'));
    view.flush();
    expect(calls).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(100);
    expect(calls).toHaveBeenCalledTimes(2);
  });

  it('stops delivering after release', () => {
    const target = new CountingTarget();
    const calls = vi.fn();
    const release = observeScroll(
      target,
      { scroll: calls, timing: { debounce: 10 } },
      fakeView() as never,
    );
    target.dispatchEvent(new Event('scroll'));
    release();
    vi.advanceTimersByTime(50);
    expect(calls).not.toHaveBeenCalled();
  });
});
