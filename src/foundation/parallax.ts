/**
 * Parallax geometry shared by the carousel parallax effect and Image, plus the scroll-linked
 * fallback used where the host has no scroll-driven timelines (Foundation §18.17).
 */
import {
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

/** Smoothing: finite values clamped to 0 through 0.98 (1 would never move). */
export function clampParallaxSmoothing(smoothing: number): number {
  return Number.isFinite(smoothing) ? Math.min(0.98, Math.max(0, smoothing)) : 0;
}

/** One 60 Hz frame; smoothing is the share of the remaining distance left after it. */
const FRAME = 1000 / 60;

/**
 * Moves `current` toward `target` for `elapsed` milliseconds of trailing motion: `smoothing` is the
 * share of the remaining distance still left after one 60 Hz frame, so 0 snaps to the target and
 * the result does not depend on the frame rate.
 */
export function smoothProgress(
  current: number,
  target: number,
  smoothing: number,
  elapsed: number,
): number {
  const factor = clampParallaxSmoothing(smoothing);
  if (factor === 0 || elapsed <= 0) return factor === 0 ? target : current;
  return target - (target - current) * factor ** (elapsed / FRAME);
}

type ProgressWriter = (progress: number) => void;

interface ParallaxMember {
  readonly write: ProgressWriter;
  readonly smoothing: number;
  /** Undefined until measured: an unmeasured member is never written. */
  target: number | undefined;
  /** Undefined until first written, so a joining member starts at rest on its target. */
  current: number | undefined;
}

/** Distance below which trailing motion has settled. */
const SETTLED = 0.0005;

/**
 * How far beyond the visible area a member joins and leaves its field, so it is measured and
 * placed before it shows and keeps moving until it is gone.
 */
const PARALLAX_MARGIN = '25%';

/**
 * The members of one scroll container. One animation frame at a time measures every member (when
 * scrolling or layout changed), then writes every member's progress; frames that only finish
 * trailing motion read no layout, and the loop stops once everything settles.
 */
class ParallaxField {
  readonly members = new Map<Element, ParallaxMember>();
  readonly #view: Window;
  readonly #root: boolean;
  readonly #release: (() => void)[];
  #frame = 0;
  #measure = false;
  #lastFrame = 0;
  #axis: ParallaxAxis = 'block';
  #rtl = false;

  constructor(readonly container: HTMLElement) {
    this.#view = container.ownerDocument.defaultView!;
    this.#root = container === container.ownerDocument.scrollingElement;
    this.#measureContainer();
    this.#release = [
      // The field owns its frame; the shared source only reports that scrolling happened.
      observeScroll(scrollEventTarget(container), {
        scroll: () => this.schedule(),
        timing: { immediate: true },
      }),
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

  /** Requests a frame; `measure` (the default) re-reads geometry in it. */
  schedule(measure = true): void {
    this.#measure ||= measure;
    if (this.#frame) return;
    this.#frame = this.#view.requestAnimationFrame((time) => {
      this.#frame = 0;
      if (this.#measure) this.#read();
      this.#write(time);
    });
  }

  /** Reads every member's geometry before any progress is written, so a frame lays out once. */
  #read(): void {
    this.#measure = false;
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
      ([element, member]) => [member, element.getBoundingClientRect()] as const,
    );
    // Right-to-left strips scroll toward the left, so their content enters from that side.
    const sign = inline && this.#rtl ? -1 : 1;
    for (const [member, rect] of measured)
      member.target =
        sign *
        (inline
          ? parallaxProgress(rect.left, rect.width, visibleStart, visibleEnd)
          : parallaxProgress(rect.top, rect.height, visibleStart, visibleEnd));
  }

  /** Writes every measured member, trailing members moving toward their target. */
  #write(now: number): void {
    const elapsed = this.#lastFrame ? Math.min(now - this.#lastFrame, 100) : FRAME;
    let moving = false;
    for (const member of this.members.values()) {
      if (member.target === undefined) continue;
      const current =
        member.current === undefined
          ? member.target
          : smoothProgress(member.current, member.target, member.smoothing, elapsed);
      const settled = Math.abs(member.target - current) < SETTLED;
      member.current = settled ? member.target : current;
      member.write(member.current);
      moving ||= !settled;
    }
    this.#lastFrame = moving ? now : 0;
    if (moving) this.schedule(false);
  }

  dispose(): void {
    if (this.#frame) this.#view.cancelAnimationFrame(this.#frame);
    for (const release of this.#release) release();
  }
}

const fields = new WeakMap<HTMLElement, ParallaxField>();

/**
 * Reports `element`'s scroll progress (see `parallaxProgress`) to `write` while it is near the
 * visible area of its scroller, through one shared field per scroll container: one measurement
 * pass and one write pass per frame for all its members, and nothing for elements far off screen.
 * A member is placed before it shows (it joins at subscription and within a margin of the visible
 * area), and leaving snaps it to the edge it left by, which is where it reappears.
 */
export function observeParallax(
  element: Element,
  write: ProgressWriter,
  /** `smoothing` makes progress trail the scroll (see `smoothProgress`); default 0. */
  options: { readonly smoothing?: number } = {},
): () => void {
  const smoothing = clampParallaxSmoothing(options.smoothing ?? 0);
  let field: ParallaxField | undefined;
  let releaseSize: (() => void) | undefined;
  const join = () => {
    if (field) return;
    const container = commonScrollContainer([element]);
    if (!container) return;
    field = fields.get(container);
    if (!field) fields.set(container, (field = new ParallaxField(container)));
    field.members.set(element, { write, smoothing, target: undefined, current: undefined });
    const current = field;
    releaseSize = observeResize(element, () => current.schedule());
    field.schedule();
  };
  const leave = () => {
    if (!field) return;
    const member = field.members.get(element);
    // Off screen by the margin, so the snap is invisible; the image returns through that edge.
    if (member?.target !== undefined) write(member.target < 0 ? -1 : 1);
    releaseSize?.();
    releaseSize = undefined;
    field.members.delete(element);
    if (!field.members.size) {
      field.dispose();
      fields.delete(field.container);
    }
    field = undefined;
  };
  const releaseVisibility = observeIntersection(
    element,
    (entry) => (entry.isIntersecting ? join() : leave()),
    { rootMargin: PARALLAX_MARGIN, scrollMargin: PARALLAX_MARGIN },
  );
  // Measured in the next frame, before the element first paints; visibility then takes over.
  join();
  return () => {
    releaseVisibility();
    leave();
  };
}
