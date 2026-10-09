import { FakeIntersectionObserver } from './fakes.test.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { canObserveIntersection, observeIntersection, observeScroll } from './observation.js';

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

function intersectionWindow() {
  const view = { IntersectionObserver: FakeIntersectionObserver };
  const element = () => ({ ownerDocument: { defaultView: view } }) as unknown as Element;
  return { view, element };
}

describe('shared intersection observer', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
  });

  it('shares one observer per root and option set', () => {
    const { element } = intersectionWindow();
    const releases = Array.from({ length: 100 }, () => observeIntersection(element(), () => {}));
    expect(FakeIntersectionObserver.instances).toHaveLength(1);
    expect(FakeIntersectionObserver.instances[0]!.targets.size).toBe(100);
    observeIntersection(element(), () => {}, { rootMargin: '10px', threshold: [0.5, 0] });
    expect(FakeIntersectionObserver.instances).toHaveLength(2);
    expect(FakeIntersectionObserver.instances[1]!.options.threshold).toEqual([0, 0.5]);
    for (const release of releases) release();
    expect(FakeIntersectionObserver.instances[0]!.disconnected).toBe(true);
  });

  it('delivers entries only to the subscribers of their element', () => {
    const { element } = intersectionWindow();
    const a = element(),
      b = element();
    const seenA = vi.fn(),
      seenB = vi.fn();
    observeIntersection(a, seenA);
    observeIntersection(b, seenB);
    FakeIntersectionObserver.instances[0]!.report(a, true);
    expect(seenA).toHaveBeenCalledTimes(1);
    expect(seenB).not.toHaveBeenCalled();
  });

  it('replays the latest entry to a later subscriber of the same element', async () => {
    const { element } = intersectionWindow();
    const target = element();
    observeIntersection(target, () => {});
    FakeIntersectionObserver.instances[0]!.report(target, true);
    const late = vi.fn();
    observeIntersection(target, late);
    await Promise.resolve();
    expect(late).toHaveBeenCalledWith(expect.objectContaining({ isIntersecting: true }));
  });

  it('unobserves an element when its last subscriber leaves', () => {
    const { element } = intersectionWindow();
    const target = element(),
      other = element();
    const first = observeIntersection(target, () => {});
    const second = observeIntersection(target, () => {});
    observeIntersection(other, () => {});
    const observer = FakeIntersectionObserver.instances[0]!;
    first();
    expect(observer.targets.has(target)).toBe(true);
    second();
    second();
    expect(observer.targets.has(target)).toBe(false);
    expect(observer.disconnected).toBe(false);
  });

  it('reports unsupported windows and observes nothing there', () => {
    const element = { ownerDocument: { defaultView: {} } } as unknown as Element;
    expect(canObserveIntersection(element)).toBe(false);
    expect(() => observeIntersection(element, () => {})()).not.toThrow();
  });
});
