/**
 * Parallax geometry shared by the carousel parallax effect and Image, plus the scroll-linked
 * fallback used where the host has no scroll-driven timelines (Foundation §18.17). Progress is
 * measured by the shared scroll field in `scroll-progress.ts`.
 */
import { composedParent } from './focus.js';
import { commonScrollContainer } from './scroll.js';
import {
  clampScrollSmoothing,
  observeScrollProgress,
  rangeProgress,
  scrollAxis,
  type ScrollAxis,
} from './scroll-progress.js';

export { scrollAxis, smoothProgress } from './scroll-progress.js';

export type ParallaxDirection = 'up' | 'down' | 'left' | 'right';

/** The axis scroll progress is measured along: inline for a scroller that only scrolls sideways. */
export type ParallaxAxis = ScrollAxis;

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
  if (visibleEnd - visibleStart + size <= 0) return 0;
  return rangeProgress('cover', start, size, visibleStart, visibleEnd) * 2 - 1;
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
export function parallaxDriver(
  element: Element,
  options: { readonly smoothing?: number } = {},
): 'timeline' | 'script' {
  // A view timeline is locked to the scroll; trailing motion needs frame-driven progress.
  if (clampParallaxSmoothing(options.smoothing ?? 0) > 0) return 'script';
  if (!supportsViewTimeline(element.ownerDocument.defaultView)) return 'script';
  return timelineScrollContainer(element) === commonScrollContainer([element])
    ? 'timeline'
    : 'script';
}

/** The axis of the container that actually scrolls `element` (see `scrollAxis`). */
export function parallaxAxis(element: Element): ParallaxAxis {
  const container = commonScrollContainer([element]);
  return container ? scrollAxis(container) : 'block';
}

/** Smoothing: finite values clamped to 0 through 0.98 (1 would never move). */
export function clampParallaxSmoothing(smoothing: number): number {
  return clampScrollSmoothing(smoothing);
}

/**
 * Reports `element`'s parallax progress (see `parallaxProgress`, -1 through 1) to `write` through
 * the shared scroll field of its scroller (see `observeScrollProgress`).
 */
export function observeParallax(
  element: Element,
  write: (progress: number) => void,
  /** `smoothing` makes progress trail the scroll (see `smoothProgress`); default 0. */
  options: { readonly smoothing?: number } = {},
): () => void {
  return observeScrollProgress(element, (progress) => write(progress * 2 - 1), {
    range: 'cover',
    smoothing: options.smoothing ?? 0,
  });
}
