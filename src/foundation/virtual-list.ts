import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { observeResize, observeScroll, scrollEventTarget } from './observation.js';
import { scrollableAncestors } from './scroll.js';
import { ExtentIndex, virtualRange, type VirtualRange } from './virtual-range.js';

export interface VirtualListOptions {
  /** Element containing the rows; offsets are measured from its block start. */
  list: () => HTMLElement | null;
  /** Explicit scroll container; defaults to the nearest overflowing scroll container. */
  viewport?: () => HTMLElement | null;
  /** Estimated extent of an unmeasured item, in CSS pixels. */
  estimate: () => number;
  /** Items mounted beyond each edge of the visible range. */
  overscan: () => number;
  /** When false every item is mounted. */
  enabled: () => boolean;
}

type ScrollBlock = 'nearest' | 'start' | 'center';

export type VirtualSlot =
  { kind: 'item'; index: number } | { kind: 'space'; extent: number; key: string };

/**
 * Virtual list window (Foundation §19.24): mounts the items that intersect the scroll viewport
 * plus an overscan margin and pinned items, keeping the scroll extent of the complete list.
 * Items are identified by key, so measured extents survive insertion and removal.
 */
export class VirtualList implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: VirtualListOptions;
  #keys: readonly string[] = [];
  #positions = new Map<string, number>();
  #measured = new Map<string, number>();
  #index = new ExtentIndex();
  #range: VirtualRange = { from: 0, to: 0, before: 0, after: 0 };
  #viewport: HTMLElement | null = null;
  #stopScroll: (() => void) | null = null;
  #stopResize: (() => void) | null = null;
  #observed = new Map<string, { element: Element; stop: () => void }>();
  #connected = false;
  #frame = 0;
  #frameView: Window | null = null;
  #userScrolling = false;
  /** A size changed: the scrolling container may be a different one now. */
  #stale = true;
  #scrollIdle: ReturnType<typeof setTimeout> | undefined;
  /**
   * A requested reveal, re-applied while measurements replace estimated extents around it, until
   * the user scrolls or it holds.
   */
  #target: { key: string; block: ScrollBlock; attempts: number } | null = null;

  constructor(host: ReactiveControllerHost, options: VirtualListOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  get enabled(): boolean {
    return this.#options.enabled();
  }

  get range(): VirtualRange {
    return this.#range;
  }

  get viewport(): HTMLElement | null {
    return this.#viewport;
  }

  /** Total extent of every item. */
  get total(): number {
    return this.#index.total;
  }

  /** Replace the item keys, keeping measured extents of keys that remain. */
  setKeys(keys: readonly string[]): void {
    if (keys === this.#keys) return;
    this.#keys = keys;
    const estimate = this.#estimate();
    const extents = new Float64Array(keys.length);
    this.#positions = new Map();
    for (let index = 0; index < keys.length; index++) {
      const key = keys[index]!;
      this.#positions.set(key, index);
      extents[index] = this.#measured.get(key) ?? estimate;
    }
    this.#index = new ExtentIndex(extents);
    for (const [key, observed] of [...this.#observed])
      if (!this.#positions.has(key)) {
        observed.stop();
        this.#observed.delete(key);
      }
    this.#compute();
  }

  /** Mounted slots in order: items, with spaces standing in for the unmounted ones. */
  slots(pinned: Iterable<number> = []): VirtualSlot[] {
    const count = this.#keys.length;
    if (!this.enabled)
      return Array.from({ length: count }, (_, index) => ({ kind: 'item', index }));
    const mounted = new Set<number>();
    for (let index = this.#range.from; index < this.#range.to; index++) mounted.add(index);
    for (const index of pinned) if (index >= 0 && index < count) mounted.add(index);
    const order = [...mounted].sort((a, b) => a - b);
    const result: VirtualSlot[] = [];
    let next = 0;
    for (const index of order) {
      if (index > next) {
        const extent = this.#index.offset(index) - this.#index.offset(next);
        result.push({ kind: 'space', extent, key: `space-${next}` });
      }
      result.push({ kind: 'item', index });
      next = index + 1;
    }
    if (next < count) {
      const extent = this.#index.total - this.#index.offset(next);
      result.push({ kind: 'space', extent, key: `space-${next}` });
    }
    return result;
  }

  isMounted(index: number): boolean {
    return !this.enabled || (index >= this.#range.from && index < this.#range.to);
  }

  offsetOf(index: number): number {
    return this.#index.offset(index);
  }

  /** Measure a mounted item and follow its size. Call with `null` when it unmounts. */
  observe(key: string, element: Element | null): void {
    const current = this.#observed.get(key);
    if (current?.element === element) return;
    current?.stop();
    this.#observed.delete(key);
    if (!element || !this.enabled) return;
    const stop = observeResize(element, (entry) => {
      const size = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      this.#record(key, size);
    });
    this.#observed.set(key, { element, stop });
  }

  /**
   * Scroll the viewport by the nearest necessary distance (or to start/centre) so the item is
   * visible. Returns false when nothing scrolls.
   */
  scrollToIndex(index: number, block: ScrollBlock = 'nearest'): boolean {
    const key = this.#keys[index];
    this.#target = key === undefined ? null : { key, block, attempts: 0 };
    return this.#reveal(index, block);
  }

  #reveal(index: number, block: ScrollBlock): boolean {
    const viewport = this.#resolveViewport();
    const list = this.#options.list();
    if (!viewport || !list || index < 0 || index >= this.#keys.length) return false;
    const listStart = this.#listStart(viewport, list);
    const top = listStart + this.#index.offset(index);
    const bottom = top + this.#index.extent(index);
    const height = this.#clientHeight(viewport);
    const scrollTop = viewport.scrollTop;
    let target = scrollTop;
    if (block === 'start') target = top;
    else if (block === 'center') target = top - (height - (bottom - top)) / 2;
    else if (top < scrollTop) target = top;
    else if (bottom > scrollTop + height) target = bottom - height;
    if (Math.abs(target - scrollTop) < 0.5) return false;
    viewport.scrollTop = target;
    this.#compute();
    return true;
  }

  /** Recompute the mounted range (layout changed outside the observed elements). */
  refresh(): void {
    this.#compute();
  }

  hostConnected(): void {
    this.#connected = true;
  }

  hostUpdated(): void {
    if (!this.#connected) return;
    // Resolving walks computed styles: only when unbound or after a layout change.
    if (this.#viewport?.isConnected && !this.#stale) return;
    this.#stale = false;
    const viewport = this.#resolveViewport();
    if (viewport !== this.#viewport) this.#bind(viewport);
  }

  hostDisconnected(): void {
    this.#connected = false;
    this.#bind(null);
    for (const observed of this.#observed.values()) observed.stop();
    this.#observed.clear();
    if (this.#frame) this.#frameView?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    clearTimeout(this.#scrollIdle);
  }

  #estimate(): number {
    const estimate = this.#options.estimate();
    return Number.isFinite(estimate) && estimate > 0 ? estimate : 32;
  }

  #record(key: string, size: number): void {
    if (!(size > 0) || this.#measured.get(key) === size) return;
    this.#measured.set(key, size);
    const index = this.#positions.get(key) ?? -1;
    if (index < 0) return;
    const delta = this.#index.set(index, size);
    // Keep the first visible item still when an item above it changes size (§19.24 stability).
    const viewport = this.#viewport;
    if (delta && viewport && !this.#userScrolling && index < this.#range.from)
      viewport.scrollTop += delta;
    this.#schedule();
  }

  #resolveViewport(): HTMLElement | null {
    const explicit = this.#options.viewport?.();
    if (explicit) return explicit;
    // The nearest container that actually scrolls: an unconstrained list scrolls with the page.
    const list = this.#options.list();
    return list ? (scrollableAncestors(list, true)[0] ?? null) : null;
  }

  #bind(viewport: HTMLElement | null): void {
    this.#stopScroll?.();
    this.#stopResize?.();
    this.#stopScroll = this.#stopResize = null;
    this.#viewport = viewport;
    if (!viewport) return;
    this.#stopScroll = observeScroll(scrollEventTarget(viewport), {
      scroll: () => this.#compute(),
      userScroll: () => {
        this.#target = null;
        this.#userScrolling = true;
        clearTimeout(this.#scrollIdle);
        this.#scrollIdle = setTimeout(() => (this.#userScrolling = false), 150);
      },
    });
    const list = this.#options.list();
    const resized = () => {
      this.#stale = true;
      this.#schedule();
    };
    const stopViewport = observeResize(viewport, resized);
    const stopList = list ? observeResize(list, resized) : () => {};
    this.#stopResize = () => {
      stopViewport();
      stopList();
    };
    this.#compute();
  }

  #schedule(): void {
    if (this.#frame) return;
    if (this.#stale) this.#host.requestUpdate();
    const view = this.#options.list()?.ownerDocument.defaultView;
    if (!view) return this.#compute();
    this.#frameView = view;
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      if (this.#target) this.#retarget();
      this.#compute();
    });
  }

  /** Measurements moved the revealed item: scroll to it again; a bounded number of times. */
  #retarget(): void {
    const target = this.#target!;
    const index = this.#positions.get(target.key);
    if (index === undefined || ++target.attempts > 8 || !this.#reveal(index, target.block))
      this.#target = null;
  }

  #listStart(viewport: HTMLElement, list: HTMLElement): number {
    const document = viewport.ownerDocument;
    const listTop = list.getBoundingClientRect().top;
    const viewportTop =
      viewport === document.scrollingElement ? 0 : viewport.getBoundingClientRect().top;
    const border = viewport === document.scrollingElement ? 0 : viewport.clientTop;
    return listTop - viewportTop - border + viewport.scrollTop;
  }

  #clientHeight(viewport: HTMLElement): number {
    const document = viewport.ownerDocument;
    return viewport === document.scrollingElement
      ? (document.defaultView?.innerHeight ?? viewport.clientHeight)
      : viewport.clientHeight;
  }

  #compute(): void {
    const previous = this.#range;
    let next: VirtualRange;
    if (!this.enabled) {
      next = { from: 0, to: this.#keys.length, before: 0, after: 0 };
    } else {
      const viewport = this.#viewport ?? this.#resolveViewport();
      const list = this.#options.list();
      if (!viewport || !list) {
        // Before layout: mount what an estimated first screen needs.
        const guess = Math.ceil(800 / this.#estimate()) + this.#options.overscan();
        next = virtualRange(this.#index, 0, guess * this.#estimate(), 0);
      } else {
        const start = viewport.scrollTop - this.#listStart(viewport, list);
        const end = start + this.#clientHeight(viewport);
        next = virtualRange(
          this.#index,
          Math.max(0, start),
          Math.max(0, end),
          this.#options.overscan(),
        );
      }
    }
    this.#range = next;
    if (
      next.from !== previous.from ||
      next.to !== previous.to ||
      next.before !== previous.before ||
      next.after !== previous.after
    )
      this.#host.requestUpdate();
  }
}
