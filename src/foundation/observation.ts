/**
 * Shared observation services (Foundation §12.3): one native scroll listener per event type on
 * each scroll target, one ResizeObserver per window and one subtree MutationObserver per root,
 * however many components subscribe. Each is released when its last subscriber leaves.
 */

/**
 * When a scroll subscriber runs. Default: once per animation frame, shared by every frame-timed
 * subscriber of the target. `immediate` runs inside the native event (for consumers with their
 * own frame scheduling); `throttle` runs at most once per interval with a trailing call;
 * `debounce` runs once scrolling has been quiet for the interval and wins over `throttle`.
 */
export interface ScrollTiming {
  readonly immediate?: boolean;
  readonly throttle?: number;
  readonly debounce?: number;
}

export interface ScrollSubscription {
  /** Scroll, delivered with the subscriber's timing and the latest scroll event. */
  readonly scroll?: (event: Event) => void;
  /** `scrollend`, delivered immediately. */
  readonly scrollEnd?: (event: Event) => void;
  /** Direct user scrolling input (`wheel`, `touchmove`), delivered immediately. */
  readonly userScroll?: (event: Event) => void;
  readonly timing?: ScrollTiming;
}

interface Subscriber {
  readonly subscription: ScrollSubscription;
  pending: boolean;
  last: number;
  event: Event | null;
  timer: ReturnType<typeof setTimeout> | undefined;
}

const viewOf = (target: EventTarget): Window | null => {
  if ((target as Window).window === target) return target as Window;
  if ((target as Document).nodeType === 9) return (target as Document).defaultView;
  if ((target as Node).nodeType) return (target as Node).ownerDocument?.defaultView ?? null;
  return null;
};

class ScrollSource {
  readonly #target: EventTarget;
  readonly #view: Window;
  readonly #subscribers = new Set<Subscriber>();
  readonly #listening = new Set<string>();
  #frame = 0;

  constructor(target: EventTarget, view: Window) {
    this.#target = target;
    this.#view = view;
  }

  get size(): number {
    return this.#subscribers.size;
  }

  add(subscriber: Subscriber): void {
    this.#subscribers.add(subscriber);
    this.#sync();
  }

  delete(subscriber: Subscriber): void {
    clearTimeout(subscriber.timer);
    this.#subscribers.delete(subscriber);
    this.#sync();
    if (!this.#subscribers.size && this.#frame) {
      this.#view.cancelAnimationFrame(this.#frame);
      this.#frame = 0;
    }
  }

  /** One native listener per event type, only while some subscriber needs it. */
  #sync(): void {
    const needed = new Set<string>();
    for (const { subscription } of this.#subscribers) {
      if (subscription.scroll) needed.add('scroll');
      if (subscription.scrollEnd) needed.add('scrollend');
      if (subscription.userScroll) needed.add('wheel').add('touchmove');
    }
    for (const type of this.#listening)
      if (!needed.has(type)) this.#target.removeEventListener(type, this.#handle);
    for (const type of needed)
      if (!this.#listening.has(type))
        this.#target.addEventListener(type, this.#handle, { passive: true });
    this.#listening.clear();
    for (const type of needed) this.#listening.add(type);
  }

  #handle = (event: Event): void => {
    if (event.type === 'scrollend') {
      for (const { subscription } of [...this.#subscribers]) subscription.scrollEnd?.(event);
      return;
    }
    if (event.type !== 'scroll') {
      for (const { subscription } of [...this.#subscribers]) subscription.userScroll?.(event);
      return;
    }
    const now = this.#view.performance.now();
    for (const subscriber of [...this.#subscribers]) {
      const { scroll, timing } = subscriber.subscription;
      if (!scroll) continue;
      subscriber.event = event;
      if (timing?.immediate) scroll(event);
      else if (timing?.debounce) {
        clearTimeout(subscriber.timer);
        subscriber.timer = setTimeout(() => {
          subscriber.timer = undefined;
          if (this.#subscribers.has(subscriber)) scroll(subscriber.event!);
        }, timing.debounce);
      } else if (timing?.throttle) {
        const wait = timing.throttle - (now - subscriber.last);
        if (wait <= 0) {
          subscriber.last = now;
          subscriber.pending = true;
        } else if (subscriber.timer === undefined)
          subscriber.timer = setTimeout(() => {
            subscriber.timer = undefined;
            subscriber.last = this.#view.performance.now();
            if (this.#subscribers.has(subscriber)) scroll(subscriber.event!);
          }, wait);
      } else subscriber.pending = true;
    }
    if (!this.#frame && [...this.#subscribers].some((subscriber) => subscriber.pending))
      this.#frame = this.#view.requestAnimationFrame(this.#flush);
  };

  #flush = (): void => {
    this.#frame = 0;
    for (const subscriber of [...this.#subscribers]) {
      if (!subscriber.pending) continue;
      subscriber.pending = false;
      subscriber.subscription.scroll?.(subscriber.event!);
    }
  };
}

const scrollSources = new WeakMap<EventTarget, ScrollSource>();

/**
 * Subscribes to scrolling of `target` (an element, a document or a window) through its shared
 * source. Returns the unsubscribe function.
 */
export function observeScroll(
  target: EventTarget,
  subscription: ScrollSubscription,
  /** Required for targets that are not nodes or windows, such as a VisualViewport. */
  view: Window | null = viewOf(target),
): () => void {
  if (!view) return () => {};
  let source = scrollSources.get(target);
  if (!source) scrollSources.set(target, (source = new ScrollSource(target, view)));
  const subscriber: Subscriber = {
    subscription,
    pending: false,
    last: -Infinity,
    event: null,
    timer: undefined,
  };
  source.add(subscriber);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    source.delete(subscriber);
    if (!source.size) scrollSources.delete(target);
  };
}

/** The element whose scroll events report scrolling of `root` (the document for the viewport). */
export function scrollEventTarget(root: Element): EventTarget {
  return root === root.ownerDocument.scrollingElement ? root.ownerDocument : root;
}

type ResizeCallback = (entry: ResizeObserverEntry) => void;
interface ResizeRegistry {
  readonly observer: ResizeObserver;
  readonly callbacks: Map<Element, Set<ResizeCallback>>;
}
const resizeRegistries = new WeakMap<Window, ResizeRegistry>();

/** Observes `element`'s size through the window's single shared ResizeObserver. */
export function observeResize(element: Element, callback: ResizeCallback): () => void {
  const view = element.ownerDocument.defaultView;
  if (!view?.ResizeObserver) return () => {};
  let registry = resizeRegistries.get(view);
  if (!registry) {
    const callbacks = new Map<Element, Set<ResizeCallback>>();
    const observer = new view.ResizeObserver((entries) => {
      for (const entry of entries)
        for (const notify of [...(callbacks.get(entry.target) ?? [])]) notify(entry);
    });
    resizeRegistries.set(view, (registry = { observer, callbacks }));
  }
  const { observer, callbacks } = registry;
  let set = callbacks.get(element);
  if (!set) {
    callbacks.set(element, (set = new Set()));
    observer.observe(element);
  }
  set.add(callback);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    set.delete(callback);
    if (set.size) return;
    callbacks.delete(element);
    observer.unobserve(element);
  };
}

interface SubtreeRegistry {
  readonly observer: MutationObserver;
  readonly callbacks: Set<() => void>;
}
const subtreeRegistries = new WeakMap<Node, SubtreeRegistry>();

/**
 * Observes structural changes under `root` (children, `id`, `hidden`, `open`) through one shared
 * MutationObserver per root.
 */
export function observeSubtree(root: Node, callback: () => void): () => void {
  const view = (root.ownerDocument ?? (root as Document)).defaultView;
  if (!view?.MutationObserver) return () => {};
  let registry = subtreeRegistries.get(root);
  if (!registry) {
    const callbacks = new Set<() => void>();
    const observer = new view.MutationObserver(() => {
      for (const notify of [...callbacks]) notify();
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['id', 'hidden', 'open'],
    });
    subtreeRegistries.set(root, (registry = { observer, callbacks }));
  }
  const { observer, callbacks } = registry;
  callbacks.add(callback);
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    callbacks.delete(callback);
    if (callbacks.size) return;
    observer.disconnect();
    subtreeRegistries.delete(root);
  };
}
