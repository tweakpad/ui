/**
 * Parallax geometry shared by the carousel parallax effect and Image, plus the scroll-linked
 * fallback used where the host has no scroll-driven timelines (Foundation §18.17).
 */
import {
  canObserveIntersection,
  observeIntersection,
  observeResize,
  observeScroll,
  scrollEventTarget,
} from './observation.js';
import { composedParent } from './focus.js';
import { commonScrollContainer } from './scroll.js';

export type ParallaxDirection = 'up' | 'down' | 'left' | 'right';

/** The axis scroll progress is measured along: inline for a scroller that only scrolls sideways. */
export type ParallaxAxis = 'block' | 'inline';

/**
 * Media enlarged by `scale` inside a clipped frame can travel `travel` (a fraction of its own
 * extent) to either side of rest without exposing the frame edges.
 */
export function parallaxGeometry(depth: number): { scale: number; travel: number } {
  const value = Number.isFinite(depth) ? Math.max(0, depth) : 0;
  return { scale: 1 + value, travel: value / 2 };
}

/** Image depth: finite values clamped to 0 through 1. */
export function clampParallaxDepth(depth: number): number {
  return Number.isFinite(depth) ? Math.min(1, Math.max(0, depth)) : 0;
}

/**
 * Progress of a box through a visible extent, from -1 as its start edge enters at the extent's end
 * to 1 as its end edge leaves at the extent's start (the `cover` range of a view timeline).
 */
export function parallaxProgress(
  start: number,
  size: number,
  visibleStart: number,
  visibleEnd: number,
): number {
  const distance = visibleEnd - visibleStart + size;
  if (distance <= 0) return 0;
  const progress = (visibleEnd - start) / distance;
  return Math.min(1, Math.max(0, progress)) * 2 - 1;
}

/** Whether the host can drive parallax from a scroll-driven view timeline. */
export function supportsViewTimeline(view: Window | null | undefined): boolean {
  const css = (view as (Window & { CSS?: typeof CSS }) | null | undefined)?.CSS;
  return Boolean(css?.supports?.('animation-timeline: view()'));
}

/**
 * The scroll container a CSS view timeline binds to: the nearest ancestor whose overflow is not
 * visible or clip, across shadow boundaries, even when it cannot scroll (a clipping card, for
 * example). The root's overflow belongs to the viewport, which is the document scrolling element.
 */
export function timelineScrollContainer(element: Element): Element | null {
  const document = element.ownerDocument;
  for (let node = composedParent(element); node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const ancestor = node as Element;
    if (ancestor === document.documentElement || ancestor === document.body) break;
    const styles = document.defaultView?.getComputedStyle(ancestor);
    if (!styles || styles.display === 'contents') continue;
    if (/(hidden|auto|scroll|overlay)/.test(`${styles.overflowX} ${styles.overflowY}`))
      return ancestor;
  }
  return document.scrollingElement;
}

/**
 * How to drive parallax for `element`: from a CSS view timeline when the host supports one and it
 * would follow the container that actually scrolls; otherwise from shared scroll observation,
 * which skips clipping ancestors that cannot scroll.
 */
export function parallaxDriver(element: Element): 'timeline' | 'script' {
  if (!supportsViewTimeline(element.ownerDocument.defaultView)) return 'script';
  return timelineScrollContainer(element) === commonScrollContainer([element])
    ? 'timeline'
    : 'script';
}

/** Inline when `container` overflows only horizontally (a sideways strip), otherwise block. */
export function scrollAxis(container: Element): ParallaxAxis {
  const sideways = container.scrollWidth > container.clientWidth;
  const vertical = container.scrollHeight > container.clientHeight;
  return sideways && !vertical ? 'inline' : 'block';
}

/** The axis of the container that actually scrolls `element` (see `scrollAxis`). */
export function parallaxAxis(element: Element): ParallaxAxis {
  const container = commonScrollContainer([element]);
  return container ? scrollAxis(container) : 'block';
}

type ProgressWriter = (progress: number) => void;

/** The visible members of one scroll container, measured together once per frame. */
class ParallaxField {
  readonly members = new Map<Element, ProgressWriter>();
  readonly #view: Window;
  readonly #root: boolean;
  readonly #release: (() => void)[];
  #frame = 0;
  #axis: ParallaxAxis = 'block';
  #rtl = false;

  constructor(readonly container: HTMLElement) {
    this.#view = container.ownerDocument.defaultView!;
    this.#root = container === container.ownerDocument.scrollingElement;
    this.#measureContainer();
    this.#release = [
      observeScroll(scrollEventTarget(container), { scroll: () => this.flush() }),
      observeResize(this.#root ? container.ownerDocument.documentElement : container, () => {
        this.#measureContainer();
        this.schedule();
      }),
    ];
  }

  #measureContainer(): void {
    this.#axis = scrollAxis(this.container);
    this.#rtl = this.#view.getComputedStyle(this.container).direction === 'rtl';
  }

  schedule(): void {
    if (this.#frame) return;
    this.#frame = this.#view.requestAnimationFrame(() => {
      this.#frame = 0;
      this.flush();
    });
  }

  /** Reads every member's geometry before writing any progress, so a frame lays out once. */
  flush(): void {
    const inline = this.#axis === 'inline';
    let visibleStart = 0,
      visibleEnd = inline ? this.#view.innerWidth : this.#view.innerHeight;
    if (!this.#root) {
      const box = this.container.getBoundingClientRect();
      visibleStart = inline
        ? box.left + this.container.clientLeft
        : box.top + this.container.clientTop;
      visibleEnd =
        visibleStart + (inline ? this.container.clientWidth : this.container.clientHeight);
    }
    const measured = [...this.members].map(
      ([element, write]) => [write, element.getBoundingClientRect()] as const,
    );
    // Right-to-left strips scroll toward the left, so their content enters from that side.
    const sign = inline && this.#rtl ? -1 : 1;
    for (const [write, rect] of measured)
      write(
        sign *
          (inline
            ? parallaxProgress(rect.left, rect.width, visibleStart, visibleEnd)
            : parallaxProgress(rect.top, rect.height, visibleStart, visibleEnd)),
      );
  }

  dispose(): void {
    if (this.#frame) this.#view.cancelAnimationFrame(this.#frame);
    for (const release of this.#release) release();
  }
}

const fields = new WeakMap<HTMLElement, ParallaxField>();

/**
 * Reports `element`'s scroll progress (see `parallaxProgress`) to `write` while it is visible,
 * through one shared field per scroll container: one scroll subscription and one measurement pass
 * per frame for all visible members, and nothing at all for elements off screen.
 */
export function observeParallax(element: Element, write: ProgressWriter): () => void {
  let field: ParallaxField | undefined;
  let releaseSize: (() => void) | undefined;
  const join = () => {
    if (field) return;
    const container = commonScrollContainer([element]);
    if (!container) return;
    field = fields.get(container);
    if (!field) fields.set(container, (field = new ParallaxField(container)));
    field.members.set(element, write);
    const current = field;
    releaseSize = observeResize(element, () => current.schedule());
    field.schedule();
  };
  const leave = () => {
    if (!field) return;
    releaseSize?.();
    releaseSize = undefined;
    field.members.delete(element);
    if (!field.members.size) {
      field.dispose();
      fields.delete(field.container);
    }
    field = undefined;
  };
  const releaseVisibility = observeIntersection(element, (entry) =>
    entry.isIntersecting ? join() : leave(),
  );
  if (!canObserveIntersection(element)) join();
  return () => {
    releaseVisibility();
    leave();
  };
}
