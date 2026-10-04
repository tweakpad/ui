import type { TpScrollArea } from './scroll-area.js';
import { initialScrollAreaState, type OverflowEdge, type ScrollAreaState } from './types.js';

type Axis = 'x' | 'y';
interface Geometry {
  track: HTMLElement;
  thumb: HTMLElement;
  axis: Axis;
  extent: number;
  range: number;
  length: number;
  travel: number;
  start: number;
  scale: number;
  rtl: boolean;
}
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
const numeric = (value: string) => Number.parseFloat(value) || 0;
/** Mirrors a native viewport. Both axes share observation, capture and cleanup. */
export class ScrollAreaController {
  #resize?: ResizeObserver;
  #mutations?: MutationObserver;
  #frame: number | undefined;
  #viewport: HTMLElement | null = null;
  #observed = new Set<Element>();
  #geometry = new Map<Axis, Geometry>();
  #state = { ...initialScrollAreaState };
  #offsets = { x: 0, y: 0 };
  #timers: Partial<Record<Axis, number>> = {};
  #gesture:
    | {
        id: number;
        geometry: Geometry;
        grab: number;
        snap: string;
        priority: string;
        viewport: HTMLElement;
      }
    | undefined;
  constructor(readonly host: TpScrollArea) {}
  connect(): void {
    const view = this.host.ownerDocument.defaultView!;
    this.#resize = new view.ResizeObserver(this.schedule);
    this.#mutations = new view.MutationObserver(this.schedule);
    this.#mutations.observe(this.host, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
    });
    this.host.addEventListener('load', this.schedule, true);
    this.host.addEventListener('transitionend', this.schedule, true);
    this.host.addEventListener('animationend', this.schedule, true);
    this.schedule();
  }
  sync(): void {
    const viewport = this.host.viewportElement;
    if (this.#viewport !== viewport) {
      this.end();
      this.#viewport?.removeEventListener('scroll', this.#scroll);
      this.#viewport = viewport;
      viewport?.addEventListener('scroll', this.#scroll, { passive: true });
      this.#offsets = { x: viewport?.scrollLeft ?? 0, y: viewport?.scrollTop ?? 0 };
    }
    const nodes = new Set<Element>([
      this.host,
      ...this.host.renderRoot.querySelectorAll<HTMLElement>('.viewport, .content, .track, .thumb'),
    ]);
    for (const node of this.#observed) if (!nodes.has(node)) this.#resize?.unobserve(node);
    for (const node of nodes) if (!this.#observed.has(node)) this.#resize?.observe(node);
    this.#observed = nodes;
    if (this.#gesture && (this.host.disabled || !nodes.has(this.#gesture.geometry.track)))
      this.end();
    this.schedule();
  }
  schedule = (): void => {
    if (!this.host.isConnected || this.#frame !== undefined) return;
    this.#frame = this.host.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.measure();
    });
  };
  #scroll = (): void => {
    const viewport = this.#viewport;
    if (!viewport) return;
    const view = this.host.ownerDocument.defaultView!;
    for (const axis of ['x', 'y'] as const) {
      const offset = axis === 'x' ? viewport.scrollLeft : viewport.scrollTop;
      if (offset !== this.#offsets[axis]) {
        this.#offsets[axis] = offset;
        this.#state[axis === 'x' ? 'scrollingX' : 'scrollingY'] = true;
        view.clearTimeout(this.#timers[axis]);
        this.#timers[axis] = view.setTimeout(() => {
          this.#state[axis === 'x' ? 'scrollingX' : 'scrollingY'] = false;
          this.measure();
        }, 500);
      }
    }
    this.measure();
  };
  measure(): void {
    const viewport = this.#viewport;
    if (!viewport || !this.host.isConnected) return;
    const rtl = this.host.direction === 'rtl';
    const ranges = {
      x: Math.max(0, viewport.scrollWidth - viewport.clientWidth),
      y: Math.max(0, viewport.scrollHeight - viewport.clientHeight),
    };
    const offsets = {
      x: clamp(rtl ? -viewport.scrollLeft : viewport.scrollLeft, ranges.x),
      y: clamp(viewport.scrollTop, ranges.y),
    };
    const state: ScrollAreaState = { ...this.#state, x: ranges.x > 0, y: ranges.y > 0 };
    for (const edge of ['xStart', 'xEnd', 'yStart', 'yEnd'] as const) {
      const axis = edge[0] as Axis;
      const distance = edge.endsWith('Start') ? offsets[axis] : ranges[axis] - offsets[axis];
      const threshold = this.#threshold(edge);
      state[edge] = distance > threshold;
      viewport.style.setProperty(
        `--tp-scroll-area-overflow-${axis}-${edge.endsWith('Start') ? 'start' : 'end'}`,
        `${distance}px`,
      );
    }
    this.#state = state;
    this.host.setScrollState(state);
    const tracks = [...this.host.renderRoot.querySelectorAll<HTMLElement>('.track')];
    const horizontal = tracks.find((track) => track.dataset.orientation === 'horizontal');
    const vertical = tracks.find((track) => track.dataset.orientation === 'vertical');
    const visible = (track?: HTMLElement) =>
      !!track && !track.hidden && track.dataset.visible === 'true';
    const cornerWidth = visible(vertical) && visible(horizontal) ? vertical!.offsetWidth : 0;
    const cornerHeight = visible(vertical) && visible(horizontal) ? horizontal!.offsetHeight : 0;
    for (const [name, value] of [
      ['width', cornerWidth],
      ['height', cornerHeight],
    ] as const) {
      const key = `--tp-scroll-area-corner-${name}`;
      if (this.host.style.getPropertyValue(key) !== `${value}px`)
        this.host.style.setProperty(key, `${value}px`);
    }
    this.#geometry.clear();
    for (const track of tracks) {
      const thumb = track.querySelector<HTMLElement>('.thumb');
      if (!thumb) continue;
      const axis = track.dataset.orientation === 'horizontal' ? 'x' : 'y';
      const horizontal = axis === 'x';
      const style = getComputedStyle(track);
      const rect = track.getBoundingClientRect();
      const outer = horizontal ? track.offsetWidth : track.offsetHeight;
      const scale = outer ? (horizontal ? rect.width : rect.height) / outer : 1;
      const paddingStart = numeric(horizontal ? style.paddingLeft : style.paddingTop);
      const paddingEnd = numeric(horizontal ? style.paddingRight : style.paddingBottom);
      const extent = Math.max(
        0,
        (horizontal ? track.clientWidth : track.clientHeight) - paddingStart - paddingEnd,
      );
      const nativeExtent = horizontal ? viewport.clientWidth : viewport.clientHeight;
      const total = horizontal ? viewport.scrollWidth : viewport.scrollHeight;
      // Resolve the theme's CSS minimum in the actual containing block, including
      // percentages on tiny tracks. No temporary scroll-container change is made.
      thumb.style[horizontal ? 'width' : 'height'] = '0px';
      const minimum = Math.max(16, horizontal ? thumb.offsetWidth : thumb.offsetHeight);
      const length = Math.min(
        extent,
        Math.max(minimum, total ? (extent * nativeExtent) / total : extent),
      );
      const travel = Math.max(0, extent - length);
      const progress = ranges[axis] ? offsets[axis] / ranges[axis] : 0;
      const position = travel * (horizontal && rtl ? 1 - progress : progress);
      track.style.setProperty(
        '--tp-scroll-area-thumb-width',
        `${horizontal ? length : thumb.offsetWidth}px`,
      );
      track.style.setProperty(
        '--tp-scroll-area-thumb-height',
        `${horizontal ? thumb.offsetHeight : length}px`,
      );
      thumb.style[horizontal ? 'width' : 'height'] = `${length}px`;
      thumb.style.transform = horizontal
        ? `translateX(${position}px)`
        : `translateY(${position}px)`;
      const start =
        (horizontal ? rect.left + track.clientLeft * scale : rect.top + track.clientTop * scale) +
        paddingStart * scale;
      this.#geometry.set(axis, {
        track,
        thumb,
        axis,
        range: ranges[axis],
        extent,
        length,
        travel,
        start,
        scale,
        rtl: horizontal && rtl,
      });
    }
  }
  #threshold(edge: OverflowEdge): number {
    const source = this.host.overflowEdgeThreshold;
    const value = typeof source === 'number' ? source : source?.[edge];
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
  }
  pointerDown = (event: PointerEvent): void => {
    if (this.host.disabled || event.button !== 0 || !event.isPrimary || this.#gesture) return;
    this.measure();
    const track = event.currentTarget as HTMLElement;
    const geometry = [...this.#geometry.values()].find((item) => item.track === track);
    const viewport = this.#viewport;
    if (!geometry || !viewport || geometry.travel <= 0 || geometry.range <= 0) return;
    event.preventDefault();
    const thumbPress = event.composedPath().includes(geometry.thumb);
    const rect = geometry.thumb.getBoundingClientRect();
    const point = geometry.axis === 'x' ? event.clientX : event.clientY;
    const grab = thumbPress
      ? (point - (geometry.axis === 'x' ? rect.left : rect.top)) / geometry.scale
      : geometry.length / 2;
    this.#gesture = {
      id: event.pointerId,
      geometry,
      grab,
      viewport,
      snap: viewport.style.getPropertyValue('scroll-snap-type'),
      priority: viewport.style.getPropertyPriority('scroll-snap-type'),
    };
    viewport.style.setProperty('scroll-snap-type', 'none');
    track.setPointerCapture(event.pointerId);
    if (!thumbPress) this.#move(event);
  };
  pointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#gesture?.id) return;
    if (event.buttons === 0) {
      this.end();
      return;
    }
    this.#move(event);
  };
  #move(event: PointerEvent): void {
    const gesture = this.#gesture;
    if (!gesture) return;
    const { geometry, viewport, grab } = gesture;
    const coordinate = geometry.axis === 'x' ? event.clientX : event.clientY;
    const position = clamp((coordinate - geometry.start) / geometry.scale - grab, geometry.travel);
    const progress = position / geometry.travel;
    const offset = geometry.range * (geometry.rtl ? 1 - progress : progress);
    if (geometry.axis === 'x') viewport.scrollLeft = geometry.rtl ? -offset : offset;
    else viewport.scrollTop = offset;
  }
  pointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.#gesture?.id) this.end();
  };
  end(): void {
    const gesture = this.#gesture;
    this.#gesture = undefined;
    if (!gesture) return;
    if (gesture.geometry.track.hasPointerCapture(gesture.id))
      gesture.geometry.track.releasePointerCapture(gesture.id);
    if (gesture.snap)
      gesture.viewport.style.setProperty('scroll-snap-type', gesture.snap, gesture.priority);
    else gesture.viewport.style.removeProperty('scroll-snap-type');
  }
  wheel = (event: WheelEvent): void => {
    if (event.ctrlKey || this.host.disabled) return;
    const track = event.currentTarget as HTMLElement;
    const horizontal = track.dataset.orientation === 'horizontal';
    const viewport = this.#viewport;
    if (!viewport) return;
    const raw = horizontal ? event.deltaX : event.deltaY;
    const page = horizontal ? viewport.clientWidth : viewport.clientHeight;
    const line =
      numeric(getComputedStyle(viewport).lineHeight) ||
      numeric(getComputedStyle(viewport).fontSize);
    const delta = raw * (event.deltaMode === 2 ? page : event.deltaMode === 1 ? line : 1);
    const max = horizontal
      ? viewport.scrollWidth - viewport.clientWidth
      : viewport.scrollHeight - viewport.clientHeight;
    const current = horizontal ? viewport.scrollLeft : viewport.scrollTop;
    const rtl = horizontal && this.host.direction === 'rtl';
    const next = rtl ? -clamp(-current - delta, max) : clamp(current + delta, max);
    if (next === current) return;
    event.preventDefault();
    if (horizontal) viewport.scrollLeft = next;
    else viewport.scrollTop = next;
  };
  disconnect(): void {
    this.end();
    this.#resize?.disconnect();
    this.#mutations?.disconnect();
    this.#observed.clear();
    this.#viewport?.removeEventListener('scroll', this.#scroll);
    this.#viewport = null;
    this.host.removeEventListener('load', this.schedule, true);
    this.host.removeEventListener('transitionend', this.schedule, true);
    this.host.removeEventListener('animationend', this.schedule, true);
    const view = this.host.ownerDocument.defaultView!;
    if (this.#frame !== undefined) view.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
    for (const timer of Object.values(this.#timers)) view.clearTimeout(timer);
    this.#timers = {};
    this.#state = { ...initialScrollAreaState };
  }
}
