/**
 * Scroll spy (Foundation §18.15): which supplied targets a reader has reached inside a scroll
 * container, from layout geometry alone. Targets are never inferred from tag names, heading
 * levels, nesting or document order; extent and nesting follow from where boxes sit.
 */
import { resolvesReducedMotion } from './motion.js';
import {
  observeResize,
  observeScroll,
  observeSubtree,
  scrollEventTarget,
  type ScrollTiming,
} from './observation.js';
import {
  SCROLL_SETTLE_MS,
  commonScrollContainer,
  isDocumentScroller,
  scrollport,
} from './scroll.js';

/** A target's box along the block axis, relative to the scroll root's visible start edge. */
export interface SpyBox {
  /** Block-start edge minus the target's scroll-margin-block-start. */
  readonly start: number;
  /** Block-end edge of the border box. */
  readonly end: number;
}

export interface SpyRegion {
  /** Index of the target in the supplied order. */
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Regions ordered by start (ties keep the supplied order). Each spans from its start to the larger
 * of its own end and the next start; the last extends to `contentEnd`.
 */
export function spyRegions(boxes: readonly SpyBox[], contentEnd: number): SpyRegion[] {
  const order = boxes
    .map((box, index) => ({ box, index }))
    .sort((a, b) => a.box.start - b.box.start || a.index - b.index);
  return order.map(({ box, index }, position) => {
    const next = order[position + 1];
    return {
      index,
      start: box.start,
      end: Math.max(box.end, next ? next.box.start : contentEnd),
    };
  });
}

export interface ReadingLineInput {
  /** Current scroll offset along the block axis. */
  readonly scrollTop: number;
  /** Visible block size of the scroll root. */
  readonly clientSize: number;
  /** Total scrollable block size. */
  readonly scrollSize: number;
  /** Activation offset from the visible start edge. */
  readonly offset: number;
}

/**
 * The reading line relative to the visible start edge. It sits at the offset and, over the final
 * scroll distance, moves to the visible end edge so targets that cannot reach the offset still
 * become current in order. A root that cannot scroll puts it at the end edge.
 */
export function readingLine({ scrollTop, clientSize, scrollSize, offset }: ReadingLineInput) {
  const end = Math.max(0, clientSize - 0.5);
  const line = Math.min(Math.max(0, offset), end);
  const max = scrollSize - clientSize;
  if (max <= 0.5) return end;
  const tail = Math.min(max, end - line);
  if (tail <= 0) return line;
  const progress = Math.min(1, Math.max(0, (scrollTop - (max - tail)) / tail));
  return line + progress * (end - line);
}

/**
 * Supplied-order indices of the regions containing `line`, ordered by start, and the current one:
 * the active region with the latest start (the innermost). A line before the first region makes
 * the first target current, so the start edge always has one; null only without regions.
 */
export function activeRegions(
  regions: readonly SpyRegion[],
  line: number,
): { active: number[]; current: number | null } {
  const first = regions[0];
  if (first && line < first.start) return { active: [first.index], current: first.index };
  const active = regions.filter((region) => region.start <= line && line < region.end);
  return {
    active: active.map((region) => region.index),
    current: active.length ? active[active.length - 1]!.index : null,
  };
}

/** Parses an activation offset: CSS pixels, `px` or a percentage of the client size. */
export function parseActivationOffset(
  value: string | number | null | undefined,
  clientSize: number,
): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = value.trim();
  const amount = parseFloat(text);
  if (!Number.isFinite(amount)) return null;
  return text.endsWith('%') ? (amount / 100) * clientSize : amount;
}

export interface ScrollSpyResult<K> {
  /** Active keys ordered by region start. */
  readonly active: readonly K[];
  /** The innermost active key, or the navigated key while a navigation holds. */
  readonly current: K | null;
  /** The event behind the change: a scroll, a navigation's source event, or null for layout. */
  readonly sourceEvent: Event | null;
}

export interface ScrollSpyEntry<K> {
  readonly key: K;
  readonly element: Element;
}

export interface ScrollSpyOptions<K> {
  /** Element whose document and lifetime the spy follows. */
  readonly host: Element;
  /** Resolved targets, read whenever layout is measured. */
  readonly entries: () => readonly ScrollSpyEntry<K>[];
  /** Explicit scroll root, or null to resolve it from the targets. */
  readonly root?: () => Element | null;
  /** Explicit activation offset, or null for scroll padding plus one pixel. */
  readonly offset?: () => string | number | null;
  /** Scroll timing on the shared scroll source; once per frame by default. */
  readonly timing?: () => ScrollTiming;
  readonly onChange: (result: ScrollSpyResult<K>) => void;
}

export interface ScrollSpyNavigation {
  /** Scrolls the scroll root to the target; otherwise the caller already did. */
  readonly scroll?: boolean;
  /** `smooth`, `instant`, or `auto` for the root's CSS; reduced motion is always instant. */
  readonly behavior?: ScrollBehavior;
  readonly sourceEvent?: Event | null;
}

interface MeasuredEntry<K> {
  readonly key: K;
  readonly element: Element;
}

const px = (value: string) => parseFloat(value) || 0;

/**
 * Observes one scroll root through the shared observation services and publishes the active
 * targets. Target geometry is measured only after layout changes, in the root's content
 * coordinates; a scroll recomputes from the scroll position alone.
 */
export class ScrollSpyController<K> {
  readonly #options: ScrollSpyOptions<K>;
  #connected = false;
  #root: HTMLElement | null = null;
  #rootCleanup: Array<() => void> = [];
  #scrollCleanup: (() => void) | null = null;
  #targets = new Map<Element, () => void>();
  #entries: MeasuredEntry<K>[] = [];
  #regions: SpyRegion[] = [];
  #padding = 0;
  #scrollSize = 0;
  #dirty = true;
  #frame = 0;
  #event: Event | null = null;
  #hold: { key: K; settled: boolean; timer: ReturnType<typeof setTimeout> | undefined } | null =
    null;
  #last: { active: readonly K[]; current: K | null } = { active: [], current: null };

  constructor(options: ScrollSpyOptions<K>) {
    this.#options = options;
  }

  get root(): HTMLElement | null {
    return this.#root;
  }

  get result(): { active: readonly K[]; current: K | null } {
    return this.#last;
  }

  connect(): void {
    if (this.#connected) return;
    this.#connected = true;
    this.invalidate();
  }

  disconnect(): void {
    if (!this.#connected) return;
    this.#connected = false;
    if (this.#frame)
      this.#options.host.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#detachRoot();
    for (const release of this.#targets.values()) release();
    this.#targets.clear();
    this.#release();
    this.#dirty = true;
  }

  /** Layout changed: targets are measured again in the next frame. */
  invalidate = (): void => {
    this.#dirty = true;
    this.#request();
  };

  /** Recalculates in the next frame without measuring targets. */
  schedule = (event: Event | null = null): void => {
    if (event) this.#event = event;
    this.#request();
  };

  /** Applies a new scroll timing to this spy's subscription. */
  updateTiming(): void {
    if (this.#root) this.#subscribeScroll(this.#root);
  }

  /**
   * Makes `key` current, with the chain of targets containing it, until scrolling begins after
   * the navigation's own scrolling settles; optionally scrolls the root (and only the root).
   */
  navigate(
    key: K,
    { scroll = false, behavior = 'auto', sourceEvent = null }: ScrollSpyNavigation = {},
  ) {
    if (this.#dirty) this.#measure();
    const index = this.#entries.findIndex((entry) => Object.is(entry.key, key));
    const region = this.#regions.find((candidate) => candidate.index === index);
    const root = this.#root;
    if (!region || !root) return false;
    this.#release();
    this.#hold = { key, settled: false, timer: undefined };
    this.#armSettle();
    if (scroll) {
      const top = Math.max(0, region.start - this.#padding);
      const resolved: ScrollBehavior = resolvesReducedMotion(this.#options.host)
        ? 'instant'
        : behavior;
      if (isDocumentScroller(root))
        root.ownerDocument.defaultView?.scrollTo({ top, behavior: resolved });
      else root.scrollTo({ top, behavior: resolved });
    }
    this.#publish(this.#held(key)!, sourceEvent);
    return true;
  }

  /** Whether `key` names a measured target that can be navigated to. */
  has(key: K): boolean {
    if (this.#dirty) this.#measure();
    return this.#entries.some((entry) => Object.is(entry.key, key));
  }

  #request(): void {
    if (!this.#connected || this.#frame) return;
    const view = this.#options.host.ownerDocument.defaultView;
    if (!view) return;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      this.#update();
    });
  }

  #armSettle(): void {
    const hold = this.#hold;
    if (!hold) return;
    clearTimeout(hold.timer);
    hold.timer = setTimeout(() => {
      if (this.#hold === hold) hold.settled = true;
    }, SCROLL_SETTLE_MS);
  }

  #release(): void {
    if (this.#hold) clearTimeout(this.#hold.timer);
    this.#hold = null;
  }

  /** Every scroll event, immediately: keeps a navigation hold until its scrolling settles. */
  #onRawScroll = (event: Event): void => {
    const hold = this.#hold;
    if (!hold) return;
    if (!hold.settled) this.#armSettle();
    else {
      this.#release();
      this.schedule(event);
    }
  };

  #onScrollEnd = (): void => {
    if (this.#hold) {
      clearTimeout(this.#hold.timer);
      this.#hold.settled = true;
    }
  };

  /** Direct user scrolling input ends a navigation hold at once. */
  #onUserScroll = (event: Event): void => {
    if (!this.#hold) return;
    this.#release();
    this.schedule(event);
  };

  /** Timed scroll delivery: already inside a frame or timer, so compute directly. */
  #onTimedScroll = (event: Event): void => {
    this.#event = event;
    this.#update();
  };

  #subscribeScroll(root: HTMLElement): void {
    this.#scrollCleanup?.();
    this.#scrollCleanup = observeScroll(scrollEventTarget(root), {
      scroll: this.#onTimedScroll,
      timing: this.#options.timing?.() ?? {},
    });
  }

  #attachRoot(root: HTMLElement): void {
    const target = scrollEventTarget(root);
    this.#subscribeScroll(root);
    this.#rootCleanup = [
      observeScroll(target, {
        scroll: this.#onRawScroll,
        scrollEnd: this.#onScrollEnd,
        userScroll: this.#onUserScroll,
        timing: { immediate: true },
      }),
      observeResize(root, this.invalidate),
      observeSubtree(root, this.invalidate),
    ];
  }

  #detachRoot(): void {
    this.#scrollCleanup?.();
    this.#scrollCleanup = null;
    for (const release of this.#rootCleanup) release();
    this.#rootCleanup = [];
    this.#root = null;
  }

  #observeTargets(elements: readonly Element[]): void {
    const next = new Set(elements);
    for (const [element, release] of this.#targets)
      if (!next.has(element)) {
        release();
        this.#targets.delete(element);
      }
    for (const element of next)
      if (!this.#targets.has(element))
        this.#targets.set(element, observeResize(element, this.invalidate));
  }

  /** Resolves the root and measures every target in the root's content coordinates. */
  #measure(): void {
    this.#dirty = false;
    const entries = this.#options
      .entries()
      .filter((entry) => entry.element.getClientRects().length > 0);
    const explicit = this.#options.root?.() ?? null;
    const root = (explicit ??
      commonScrollContainer(entries.map((entry) => entry.element))) as HTMLElement | null;
    if (root !== this.#root) {
      this.#detachRoot();
      if (root && this.#connected) this.#attachRoot(root);
      this.#root = root;
    }
    this.#observeTargets(entries.map((entry) => entry.element));
    this.#entries = entries;
    if (!root) {
      this.#regions = [];
      return;
    }
    const view = root.ownerDocument.defaultView!;
    const { top: visibleStart, scrollTop } = scrollport(root);
    this.#scrollSize = root.scrollHeight;
    this.#padding = px(view.getComputedStyle(root).scrollPaddingBlockStart);
    const boxes = entries.map(({ element }) => {
      const rect = element.getBoundingClientRect();
      const margin = px(view.getComputedStyle(element).scrollMarginBlockStart);
      return {
        start: rect.top - visibleStart + scrollTop - margin,
        end: rect.bottom - visibleStart + scrollTop,
      };
    });
    this.#regions = spyRegions(boxes, this.#scrollSize);
  }

  #held(key: K): { active: K[]; current: K } | null {
    const index = this.#entries.findIndex((entry) => Object.is(entry.key, key));
    const region = this.#regions.find((candidate) => candidate.index === index);
    if (!region) return null;
    const chain = activeRegions(this.#regions, region.start).active.filter(
      (other) =>
        this.#regions.find((candidate) => candidate.index === other)!.start <= region.start,
    );
    return { active: chain.map((other) => this.#entries[other]!.key), current: key };
  }

  #update(): void {
    const root = this.#root;
    // Content above the targets that grows or shrinks changes the scroll size: measure again.
    if (!this.#dirty && root && root.scrollHeight !== this.#scrollSize) this.#dirty = true;
    if (this.#dirty) this.#measure();
    const event = this.#event;
    this.#event = null;
    const hold = this.#hold;
    if (hold) {
      const held = this.#held(hold.key);
      if (held) {
        this.#publish(held, event);
        return;
      }
      this.#release();
    }
    if (!this.#root || !this.#entries.length) {
      this.#publish({ active: [], current: null }, event);
      return;
    }
    const { height: clientSize, scrollTop } = scrollport(this.#root);
    const offset =
      parseActivationOffset(this.#options.offset?.() ?? null, clientSize) ?? this.#padding + 1;
    // Overscroll past either end keeps the line inside the content, so both edges stay current.
    const line = Math.min(
      scrollTop + readingLine({ scrollTop, clientSize, scrollSize: this.#scrollSize, offset }),
      this.#scrollSize - 0.5,
    );
    const { active, current: index } = activeRegions(this.#regions, line);
    this.#publish(
      {
        active: active.map((other) => this.#entries[other]!.key),
        current: index === null ? null : this.#entries[index]!.key,
      },
      event,
    );
  }

  #publish(result: { active: readonly K[]; current: K | null }, event: Event | null): void {
    const previous = this.#last;
    if (
      Object.is(previous.current, result.current) &&
      previous.active.length === result.active.length &&
      previous.active.every((key, index) => Object.is(key, result.active[index]))
    )
      return;
    this.#last = result;
    this.#options.onChange({ ...result, sourceEvent: event });
  }
}
