import { CleanupScope, Scheduler } from './services.js';
import { OwnedStyles, leaseStyle } from './owned-styles.js';
import type { Orientation } from './types.js';

/** Shared Scroll Area geometry; Carousel compression adapted from Swiper 14.3.0
 * scrollbar.ts (e043db5462adc8cae0751ec148f5cd5cfb92f098), MIT. */
export function scrollbarMetrics(
  extent: number,
  viewport: number,
  total: number,
  progress: number,
  minimum = 16,
  explicit: number | 'auto' = 'auto',
) {
  const length = Math.min(
    extent,
    Math.max(
      minimum,
      explicit === 'auto' ? (total > 0 ? (extent * viewport) / total : extent) : explicit,
    ),
  );
  const travel = Math.max(0, extent - length);
  let position = travel * progress;
  let visibleLength = length;
  if (position < 0) {
    visibleLength += position;
    position = 0;
  } else if (position + length > extent) visibleLength = extent - position;
  return {
    length: Math.max(0, visibleLength),
    travel,
    position: Math.max(0, Math.min(extent, position)),
  };
}
export function scrollbarProgress(
  point: number,
  start: number,
  scale: number,
  grab: number,
  travel: number,
  rtl: boolean,
): number {
  if (travel <= 0 || !Number.isFinite(scale) || scale <= 0) return 0;
  const progress = Math.max(0, Math.min(1, ((point - start) / scale - grab) / travel));
  return rtl ? 1 - progress : progress;
}
export type ScrollbarVisibility = 'automatic' | 'always' | 'while-scrolling' | 'on-hover';
export interface ScrollbarConfiguration {
  track: HTMLElement | null;
  thumb: HTMLElement | null;
  orientation: Orientation;
  rtl: boolean;
  viewportExtent: number;
  contentExtent: number;
  progress: number;
  disabled: boolean;
  draggable: boolean;
  thumbSize?: number | 'auto';
  snapElement?: HTMLElement | null;
  visibility: ScrollbarVisibility;
  hideDelay: number;
  /** Carousel keeps its timed scrollbar visible under hover; Scroll Area retains its native policy. */
  retainOnHover?: boolean;
}
interface Geometry {
  track: HTMLElement;
  thumb: HTMLElement;
  orientation: Orientation;
  start: number;
  scale: number;
  length: number;
  travel: number;
  rtl: boolean;
}
/** One capture, coordinate, visibility and owned-style owner for both consumers.
 * The adapter alone decides continuous scrolling versus snap-on-release. */
export class ScrollbarController {
  #geometry: (Geometry) | undefined;
  #styles: (OwnedStyles) | undefined;
  #trackStyles: (OwnedStyles) | undefined;
  #scheduler: (Scheduler) | undefined;
  #activityCancel: (() => void) | undefined;
  #gesture: {
    id: number;
    geometry: Geometry;
    grab: number;
    scope: CleanupScope;
    event: PointerEvent;
    reason: 'drag' | 'track-press';
  } | undefined;
  #scrolling = false;
  #hovered = false;
  #focused = false;
  constructor(
    readonly adapter: {
      read: () => ScrollbarConfiguration;
      move: (progress: number, event: PointerEvent, reason: 'drag' | 'track-press') => void;
      finish?: (cancelled: boolean, event: PointerEvent, reason: 'drag' | 'track-press') => void;
      changed: () => void;
      error?: (error: unknown) => void;
    },
  ) {}
  get dragging(): boolean {
    return !!this.#gesture;
  }
  get scrolling(): boolean {
    return this.#scrolling;
  }
  get visible(): boolean {
    const c = this.adapter.read();
    if (c.visibility === 'always') return true;
    if (c.contentExtent <= c.viewportExtent) return false;
    if (this.dragging || this.#focused) return true;
    return (
      c.visibility === 'automatic' ||
      (c.visibility === 'on-hover'
        ? this.#hovered
        : this.#scrolling || (!!c.retainOnHover && this.#hovered))
    );
  }
  hover(value: boolean): void {
    if (value === this.#hovered) return;
    this.#hovered = value;
    this.adapter.changed();
  }
  focus(value: boolean): void {
    if (value === this.#focused) return;
    this.#focused = value;
    this.adapter.changed();
  }
  activity(): void {
    const c = this.adapter.read();
    const view = c.track?.ownerDocument.defaultView;
    if (!view) return;
    this.#scheduler ??= new Scheduler(view);
    this.#activityCancel?.();
    this.#scrolling = true;
    this.#activityCancel = this.#scheduler.timeout(() => {
      this.#activityCancel = undefined;
      this.#scrolling = false;
      this.adapter.changed();
    }, c.hideDelay);
    this.adapter.changed();
  }
  measure(): void {
    const c = this.adapter.read(),
      { track, thumb } = c;
    if (
      !track ||
      !thumb ||
      this.#geometry?.track !== track ||
      this.#geometry?.thumb !== thumb ||
      this.#geometry?.orientation !== c.orientation
    ) {
      this.end(true);
      this.#styles?.dispose();
      this.#trackStyles?.dispose();
      this.#styles = thumb ? new OwnedStyles(thumb) : undefined;
      this.#trackStyles = track ? new OwnedStyles(track) : undefined;
      this.#geometry = undefined;
    }
    if (!track || !thumb) return;
    if (c.disabled || !c.draggable) this.end(true);
    const horizontal = c.orientation === 'horizontal';
    const view = track.ownerDocument.defaultView!;
    const style = view.getComputedStyle(track),
      rect = track.getBoundingClientRect();
    const numeric = (value: string) => Number.parseFloat(value) || 0;
    const outer = horizontal ? track.offsetWidth : track.offsetHeight;
    const scale = outer ? (horizontal ? rect.width : rect.height) / outer : 1;
    const paddingStart = numeric(horizontal ? style.paddingLeft : style.paddingTop);
    const paddingEnd = numeric(horizontal ? style.paddingRight : style.paddingBottom);
    const extent = Math.max(
      0,
      (horizontal ? track.clientWidth : track.clientHeight) - paddingStart - paddingEnd,
    );
    const dimension = horizontal ? 'width' : 'height';
    this.#styles!.set(dimension, '0px');
    const minimum = Math.max(16, horizontal ? thumb.offsetWidth : thumb.offsetHeight);
    const metrics = scrollbarMetrics(
      extent,
      c.viewportExtent,
      c.contentExtent,
      horizontal && c.rtl ? 1 - c.progress : c.progress,
      minimum,
      c.thumbSize,
    );
    this.#styles!.set(dimension, `${metrics.length}px`);
    this.#styles!.set('transform', `translate${horizontal ? 'X' : 'Y'}(${metrics.position}px)`);
    this.#trackStyles!.set(
      '--tp-scroll-area-thumb-width',
      `${horizontal ? metrics.length : thumb.offsetWidth}px`,
    );
    this.#trackStyles!.set(
      '--tp-scroll-area-thumb-height',
      `${horizontal ? thumb.offsetHeight : metrics.length}px`,
    );
    this.#geometry = {
      track,
      thumb,
      orientation: c.orientation,
      start:
        (horizontal ? rect.left + track.clientLeft * scale : rect.top + track.clientTop * scale) +
        paddingStart * scale,
      scale,
      length: metrics.length,
      travel: metrics.travel,
      rtl: horizontal && c.rtl,
    };
  }
  pointerDown = (event: PointerEvent): void => {
    const c = this.adapter.read();
    if (
      event.defaultPrevented ||
      c.disabled ||
      !c.draggable ||
      event.button !== 0 ||
      !event.isPrimary ||
      this.#gesture
    )
      return;
    this.measure();
    const g = this.#geometry;
    if (!g || g.travel <= 0 || c.contentExtent <= c.viewportExtent) return;
    const thumbPress = event.composedPath().includes(g.thumb),
      horizontal = g.orientation === 'horizontal';
    const rect = g.thumb.getBoundingClientRect(),
      point = horizontal ? event.clientX : event.clientY;
    const scope = new CleanupScope(this.adapter.error);
    this.#gesture = {
      id: event.pointerId,
      geometry: g,
      grab: thumbPress ? (point - (horizontal ? rect.left : rect.top)) / g.scale : g.length / 2,
      scope,
      event,
      reason: thumbPress ? 'drag' : 'track-press',
    };
    try {
      if (c.snapElement) scope.add(leaseStyle(c.snapElement, 'scroll-snap-type', 'none'));
      g.track.setPointerCapture(event.pointerId);
      scope.add(() => {
        if (g.track.hasPointerCapture(event.pointerId))
          g.track.releasePointerCapture(event.pointerId);
      });
      scope.listen(g.track.ownerDocument, 'pointermove', this.pointerMove, {
        capture: true,
        passive: false,
      });
      scope.listen(g.track.ownerDocument, 'pointerup', this.pointerEnd, { capture: true });
      scope.listen(g.track.ownerDocument, 'pointercancel', this.pointerEnd, { capture: true });
      scope.listen(g.track, 'lostpointercapture', this.pointerEnd);
      event.preventDefault();
      this.activity();
      if (!thumbPress) this.#move(event);
      this.adapter.changed();
    } catch (error) {
      this.end(true, event);
      this.adapter.error?.(error);
    }
  };
  pointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#gesture?.id) return;
    if (!event.buttons) {
      this.end(true, event);
      return;
    }
    try {
      if (event.cancelable) event.preventDefault();
      this.#move(event);
    } catch (error) {
      this.end(true, event);
      this.adapter.error?.(error);
    }
  };
  #move(event: PointerEvent): void {
    const g = this.#gesture;
    if (!g) return;
    g.event = event;
    this.adapter.move(
      scrollbarProgress(
        g.geometry.orientation === 'horizontal' ? event.clientX : event.clientY,
        g.geometry.start,
        g.geometry.scale,
        g.grab,
        g.geometry.travel,
        g.geometry.rtl,
      ),
      event,
      g.reason,
    );
    this.activity();
  }
  pointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.#gesture?.id) return;
    const cancelled = event.type !== 'pointerup';
    try {
      if (!cancelled) this.#move(event);
    } finally {
      this.end(cancelled, event);
    }
  };
  end(cancelled = true, event?: PointerEvent): void {
    const g = this.#gesture;
    this.#gesture = undefined;
    if (!g) return;
    g.scope.dispose();
    try {
      this.adapter.finish?.(cancelled, event ?? g.event, g.reason);
    } finally {
      this.adapter.changed();
    }
  }
  dispose(): void {
    try {
      this.end(true);
    } finally {
      this.#scheduler?.dispose();
      this.#scheduler = undefined;
      this.#activityCancel = undefined;
      this.#styles?.dispose();
      this.#trackStyles?.dispose();
      this.#geometry = undefined;
      this.#scrolling = this.#hovered = this.#focused = false;
    }
  }
}
