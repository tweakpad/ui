import { FakeIntersectionObserver } from './fakes.test.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import {
  canObserveIntersection,
  observeFonts,
  observeIntersection,
  observeLanguage,
  observeMediaQuery,
  observeResize,
  observeScroll,
  observeSubtree,
} from './observation.js';

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

describe('shared language observation', () => {
  it('installs one listener per window and releases it with the last subscriber', () => {
    const view = Object.assign(new CountingTarget(), {
      document: { documentElement: {} },
    }) as unknown as Window & CountingTarget;
    const calls: string[] = [];
    const releaseA = observeLanguage(view, () => calls.push('a'));
    const releaseB = observeLanguage(view, () => calls.push('b'));
    expect(view.added).toBe(1);
    view.dispatchEvent(new Event('languagechange'));
    expect(calls).toEqual(['a', 'b']);
    releaseA();
    releaseA();
    expect(view.removed).toBe(0);
    releaseB();
    expect(view.removed).toBe(1);
    view.dispatchEvent(new Event('languagechange'));
    expect(calls).toEqual(['a', 'b']);
  });
});

describe('media query observation', () => {
  function mediaWindow(matches = false) {
    const lists = new Map<string, CountingTarget & { matches: boolean }>();
    const view = {
      matchMedia: (query: string) => {
        let list = lists.get(query);
        if (!list) lists.set(query, (list = Object.assign(new CountingTarget(), { matches })));
        return list;
      },
    };
    const change = (query: string, next: boolean) => {
      const list = lists.get(query)!;
      list.matches = next;
      list.dispatchEvent(Object.assign(new Event('change'), { matches: next }));
    };
    return { view: view as unknown as Window, lists, change };
  }

  it('reports each change with its match state and releases the listener once', () => {
    const { view, lists, change } = mediaWindow();
    const seen: boolean[] = [];
    const release = observeMediaQuery(view, '(hover: hover)', (matches) => seen.push(matches));
    expect(seen).toEqual([]);
    expect(lists.get('(hover: hover)')!.added).toBe(1);
    change('(hover: hover)', true);
    change('(hover: hover)', false);
    expect(seen).toEqual([true, false]);
    release();
    release();
    expect(lists.get('(hover: hover)')!.removed).toBe(1);
    change('(hover: hover)', true);
    expect(seen).toEqual([true, false]);
  });

  it('delivers the current state at once when asked, with no event', () => {
    const { view, change } = mediaWindow(true);
    const calls: [boolean, MediaQueryListEvent | null][] = [];
    observeMediaQuery(view, '(pointer: fine)', (matches, event) => calls.push([matches, event]), {
      immediate: true,
    });
    expect(calls).toEqual([[true, null]]);
    change('(pointer: fine)', false);
    expect(calls).toHaveLength(2);
    expect(calls[1]![0]).toBe(false);
    expect(calls[1]![1]).toBeInstanceOf(Event);
  });

  it('observes nothing where the view or media query matching is missing', () => {
    const callback = vi.fn();
    expect(() =>
      observeMediaQuery(null, '(hover: hover)', callback, { immediate: true })(),
    ).not.toThrow();
    expect(() => observeMediaQuery(undefined, '(hover: hover)', callback)()).not.toThrow();
    expect(() =>
      observeMediaQuery({} as unknown as Window, '(hover: hover)', callback, { immediate: true })(),
    ).not.toThrow();
    expect(callback).not.toHaveBeenCalled();
  });
});

describe('shared registries keep no subscriber (V-585)', () => {
  setFlagsFromString('--expose-gc');
  const collect = runInNewContext('gc') as () => void;

  /** An observer that keeps its callback, as a native one does while it observes anything. */
  class KeepingObserver {
    constructor(readonly callback: unknown) {}
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }

  it('the first subscriber of every registry is collected after it leaves while others stay', async () => {
    const fonts = Object.assign(new EventTarget(), { status: 'loaded' });
    const view = Object.assign(new EventTarget(), {
      ResizeObserver: KeepingObserver,
      IntersectionObserver: KeepingObserver,
      MutationObserver: KeepingObserver,
    });
    const document = { nodeType: 9, defaultView: view, documentElement: {}, fonts };
    Object.assign(view, { document });
    const node = () => ({ nodeType: 1, ownerDocument: document }) as unknown as Element;
    const subscriptions: Record<string, (subscriber: Element) => () => void> = {
      resize: (subscriber) => observeResize(subscriber, () => void subscriber),
      intersection: (subscriber) => observeIntersection(subscriber, () => void subscriber),
      subtree: (subscriber) => observeSubtree(document as unknown as Node, () => void subscriber),
      language: (subscriber) => observeLanguage(view as unknown as Window, () => void subscriber),
      fonts: (subscriber) => observeFonts(document as unknown as Document, () => void subscriber),
    };
    const firsts = new Map<string, WeakRef<Element>>();
    const stay: (() => void)[] = [];
    for (const [name, subscribe] of Object.entries(subscriptions)) {
      // The first subscriber creates the registry and leaves; a second one keeps it alive.
      firsts.set(
        name,
        (() => {
          const first = node();
          subscribe(first)();
          return new WeakRef(first);
        })(),
      );
      stay.push(subscribe(node()));
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    collect();
    for (const [name, first] of firsts) expect(first.deref(), name).toBeUndefined();
    for (const release of stay) release();
  });
});
