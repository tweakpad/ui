/**
 * Scroll progress (Foundation §18.17 `img-parallax`, §18.18 `vr-scrub`): how far an element has
 * travelled through the visible extent of its scroll container, measured by one shared field per
 * container. Parallax and scroll-linked reveals both read it, so a page measures once per frame
 * however many images and texts follow the scroll.
 */
import {
  observeIntersection,
  observeResize,
  observeScroll,
  scrollEventTarget,
} from './observation.js';
import { commonScrollContainer } from './scroll.js';

/** The axis progress is measured along: inline for a scroller that only scrolls sideways. */
export type ScrollAxis = 'block' | 'inline';

/**
 * The part of an element's travel that maps to 0 through 1 (the view-timeline range names):
 * `cover` from entering to leaving, `contain` while it fills the visible extent (for an element
 * taller than it, from its start edge at the visible start to its end edge at the visible end),
 * `entry` while entering and `exit` while leaving.
 */
export type ScrollRange = 'cover' | 'contain' | 'entry' | 'exit';

export function parseScrollRange(value: string | null | undefined): ScrollRange {
  return value === 'cover' || value === 'entry' || value === 'exit' ? value : 'contain';
}

const clamp = (value: number) => Math.min(1, Math.max(0, value));

/**
 * Progress 0 through 1 of a box at `start` of `size` through the visible extent from
 * `visibleStart` to `visibleEnd`, over `range`.
 */
export function rangeProgress(
  range: ScrollRange,
  start: number,
  size: number,
  visibleStart: number,
  visibleEnd: number,
): number {
  const visible = visibleEnd - visibleStart;
  const end = start + size;
  const shorter = Math.min(size, visible);
  if (range === 'cover') {
    const distance = visible + size;
    return distance > 0 ? clamp((visibleEnd - start) / distance) : 0;
  }
  if (range === 'entry') return shorter > 0 ? clamp((visibleEnd - start) / shorter) : 0;
  if (range === 'exit') return shorter > 0 ? clamp((visibleStart + shorter - end) / shorter) : 0;
  // contain
  if (size <= visible) {
    const distance = visible - size;
    return distance > 0 ? clamp((visibleEnd - end) / distance) : start <= visibleStart ? 1 : 0;
  }
  return clamp((visibleStart - start) / (size - visible));
}

/** A point of a named range: `fraction` 0 is its start, 1 its end (`entry 20%` is 0.2). */
export interface ScrollRangePoint {
  readonly name: ScrollRange;
  readonly fraction: number;
}

/** Progress runs from `start` to `end`, each a point of a named range (`entry 20% contain 50%`). */
export interface ScrollRangeSpan {
  readonly start: ScrollRangePoint;
  readonly end: ScrollRangePoint;
}

const RANGE_NAMES = new Set<ScrollRange>(['cover', 'contain', 'entry', 'exit']);

/**
 * Parses a scroll range in the grammar of CSS `animation-range`: a range name alone spans that
 * range (`entry`); a name with a percentage is a start point that ends at 100% of that range
 * (`entry 20%`); two points give the start and the end (`entry 20% contain 50%`), a start without
 * a percentage meaning 0% and an end without one 100%. Anything unparsable is `contain`.
 */
export function parseScrollRangeSpan(value: string | null | undefined): ScrollRangeSpan {
  const tokens = (value ?? '').trim().split(/\s+/).filter(Boolean);
  const points: { name: ScrollRange; fraction?: number }[] = [];
  for (const token of tokens) {
    if (RANGE_NAMES.has(token as ScrollRange)) points.push({ name: token as ScrollRange });
    else if (
      /^-?\d+(\.\d+)?%$/.test(token) &&
      points.length &&
      points.at(-1)!.fraction === undefined
    )
      points.at(-1)!.fraction = Number.parseFloat(token) / 100;
    else return whole('contain');
  }
  const [start, end] = points;
  if (!start || points.length > 2) return whole('contain');
  if (!end)
    return start.fraction === undefined
      ? whole(start.name)
      : {
          start: { name: start.name, fraction: start.fraction },
          end: { name: start.name, fraction: 1 },
        };
  return {
    start: { name: start.name, fraction: start.fraction ?? 0 },
    end: { name: end.name, fraction: end.fraction ?? 1 },
  };
}

function whole(name: ScrollRange): ScrollRangeSpan {
  return { start: { name, fraction: 0 }, end: { name, fraction: 1 } };
}

/** The position of the box's start edge at which `point` of its range is reached. */
function pointPosition(
  point: ScrollRangePoint,
  size: number,
  visibleStart: number,
  visibleEnd: number,
): number {
  const visible = visibleEnd - visibleStart;
  const shorter = Math.min(size, visible);
  const { name, fraction } = point;
  if (name === 'cover') return visibleEnd - fraction * (visible + size);
  if (name === 'entry') return visibleEnd - fraction * shorter;
  if (name === 'exit') return visibleStart + shorter - size - fraction * shorter;
  return size <= visible
    ? visibleEnd - size - fraction * (visible - size)
    : visibleStart - fraction * (size - visible);
}

/** Progress 0 through 1 of a box at `start` of `size` between the two points of `span`. */
export function spanProgress(
  span: ScrollRangeSpan,
  start: number,
  size: number,
  visibleStart: number,
  visibleEnd: number,
): number {
  if (span.start.name === span.end.name && span.start.fraction === 0 && span.end.fraction === 1)
    return rangeProgress(span.start.name, start, size, visibleStart, visibleEnd);
  const from = pointPosition(span.start, size, visibleStart, visibleEnd);
  const to = pointPosition(span.end, size, visibleStart, visibleEnd);
  if (from === to) return start <= from ? 1 : 0;
  return clamp((from - start) / (from - to));
}

/** Inline when `container` overflows only horizontally (a sideways strip), otherwise block. */
export function scrollAxis(container: Element): ScrollAxis {
  const sideways = container.scrollWidth > container.clientWidth;
  const vertical = container.scrollHeight > container.clientHeight;
  return sideways && !vertical ? 'inline' : 'block';
}

/** Smoothing: finite values clamped to 0 through 0.98 (1 would never move). */
export function clampScrollSmoothing(smoothing: number): number {
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
  const factor = clampScrollSmoothing(smoothing);
  if (factor === 0 || elapsed <= 0) return factor === 0 ? target : current;
  return target - (target - current) * factor ** (elapsed / FRAME);
}

type ProgressWriter = (progress: number) => void;

interface FieldMember {
  readonly write: ProgressWriter;
  readonly range: ScrollRangeSpan;
  readonly smoothing: number;
  /** Undefined until measured: an unmeasured member is never written. */
  target: number | undefined;
  /** Undefined until first written, so a joining member starts at rest on its target. */
  current: number | undefined;
}

/** Distance below which trailing motion has settled. */
const SETTLED = 0.00025;

/**
 * How far beyond the visible area a member joins and leaves its field, so it is measured and
 * placed before it shows and keeps moving until it is gone.
 */
const FIELD_MARGIN = '25%';

/**
 * The members of one scroll container. One animation frame at a time measures every member (when
 * scrolling or layout changed), then writes every member's progress; frames that only finish
 * trailing motion read no layout, and the loop stops once everything settles.
 */
class ScrollField {
  readonly members = new Map<Element, FieldMember>();
  readonly #view: Window;
  readonly #root: boolean;
  readonly #release: (() => void)[];
  #frame = 0;
  #measure = false;
  #lastFrame = 0;
  #axis: ScrollAxis = 'block';
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
    const mirrored = inline && this.#rtl;
    for (const [member, rect] of measured) {
      const progress = inline
        ? spanProgress(member.range, rect.left, rect.width, visibleStart, visibleEnd)
        : spanProgress(member.range, rect.top, rect.height, visibleStart, visibleEnd);
      member.target = mirrored ? 1 - progress : progress;
    }
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

const fields = new WeakMap<HTMLElement, ScrollField>();

/**
 * Reports `element`'s progress (0 through 1 over `range`, default `cover`) through its scroll
 * container to `write` while it is near the visible area, through one shared field per scroll
 * container: one measurement pass and one write pass per frame for all its members, and nothing for
 * elements far off screen. A member is placed before it shows (it joins at subscription and within
 * a margin of the visible area), and leaving snaps it to the end it left by, which is where it
 * reappears.
 */
export function observeScrollProgress(
  element: Element,
  write: ProgressWriter,
  /** `smoothing` makes progress trail the scroll (see `smoothProgress`); default 0. */
  options: { readonly range?: ScrollRange | ScrollRangeSpan; readonly smoothing?: number } = {},
): () => void {
  const smoothing = clampScrollSmoothing(options.smoothing ?? 0);
  const range = typeof options.range === 'object' ? options.range : whole(options.range ?? 'cover');
  let field: ScrollField | undefined;
  let releaseSize: (() => void) | undefined;
  const join = () => {
    if (field) return;
    const container = commonScrollContainer([element]);
    if (!container) return;
    field = fields.get(container);
    if (!field) fields.set(container, (field = new ScrollField(container)));
    field.members.set(element, { write, range, smoothing, target: undefined, current: undefined });
    const current = field;
    releaseSize = observeResize(element, () => current.schedule());
    field.schedule();
  };
  const leave = () => {
    if (!field) return;
    const member = field.members.get(element);
    // Off screen by the margin, so the snap is invisible; the element returns through that end.
    if (member?.target !== undefined) write(member.target < 0.5 ? 0 : 1);
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
    { rootMargin: FIELD_MARGIN, scrollMargin: FIELD_MARGIN },
  );
  // Measured in the next frame, before the element first paints; visibility then takes over.
  join();
  return () => {
    releaseVisibility();
    leave();
  };
}
