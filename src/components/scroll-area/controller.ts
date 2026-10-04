import { ScrollbarController } from '../../foundation/scrollbar.js';
import type { TpScrollArea } from './scroll-area.js';
import { initialScrollAreaState, type OverflowEdge, type ScrollAreaState } from './types.js';

type Axis = 'x' | 'y';
const clamp = (value: number, max: number) => Math.max(0, Math.min(max, value));
const numeric = (value: string) => Number.parseFloat(value) || 0;
/** Mirrors a native viewport. Both axes share observation, capture and cleanup. */
export class ScrollAreaController {
  #resize?: ResizeObserver;
  #mutations?: MutationObserver;
  #frame: number | undefined;
  #viewport: HTMLElement | null = null;
  #observed = new Set<Element>();
  #state = { ...initialScrollAreaState };
  #offsets = { x: 0, y: 0 };
  readonly #bars: Record<Axis, ScrollbarController>;
  constructor(readonly host: TpScrollArea) {
    const create = (axis: Axis) =>
      new ScrollbarController({
        read: () => {
          const viewport = this.#viewport,
            horizontal = axis === 'x';
          const orientation = horizontal ? 'horizontal' : 'vertical';
          const track =
            this.host.renderRoot?.querySelector<HTMLElement>(
              `.track[data-orientation="${orientation}"]`,
            ) ?? null;
          const nativeExtent = viewport
            ? horizontal
              ? viewport.clientWidth
              : viewport.clientHeight
            : 0;
          const total = viewport ? (horizontal ? viewport.scrollWidth : viewport.scrollHeight) : 0;
          const range = Math.max(0, total - nativeExtent);
          const rtl = horizontal && this.host.direction === 'rtl';
          const offset = viewport
            ? horizontal
              ? rtl
                ? -viewport.scrollLeft
                : viewport.scrollLeft
              : viewport.scrollTop
            : 0;
          const settings = this.host.scrollbars?.find((bar) => bar.orientation === orientation);
          return {
            track,
            thumb: track?.querySelector<HTMLElement>('.thumb') ?? null,
            orientation,
            rtl,
            viewportExtent: nativeExtent,
            contentExtent: total,
            progress: range ? clamp(offset, range) / range : 0,
            disabled: this.host.disabled,
            draggable: true,
            snapElement: viewport,
            visibility: settings?.visibility ?? this.host.scrollbarVisibility,
            hideDelay: 500,
          };
        },
        move: (progress) => {
          const viewport = this.#viewport;
          if (!viewport) return;
          if (axis === 'x')
            viewport.scrollLeft =
              progress *
              Math.max(0, viewport.scrollWidth - viewport.clientWidth) *
              (this.host.direction === 'rtl' ? -1 : 1);
          else
            viewport.scrollTop =
              progress * Math.max(0, viewport.scrollHeight - viewport.clientHeight);
        },
        changed: () => {
          this.measure();
          this.host.requestUpdate();
        },
      });
    this.#bars = { x: create('x'), y: create('y') };
  }
  scrollbar(axis: Axis): ScrollbarController {
    return this.#bars[axis];
  }
  hover(value: boolean): void {
    this.#bars.x.hover(value);
    this.#bars.y.hover(value);
  }
  end(): void {
    this.#bars.x.end();
    this.#bars.y.end();
  }
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
    for (const axis of ['x', 'y'] as const) {
      const offset = axis === 'x' ? viewport.scrollLeft : viewport.scrollTop;
      if (offset !== this.#offsets[axis]) {
        this.#offsets[axis] = offset;
        this.#bars[axis].activity();
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
    const state: ScrollAreaState = {
      ...this.#state,
      x: ranges.x > 0,
      y: ranges.y > 0,
      scrollingX: this.#bars.x.scrolling,
      scrollingY: this.#bars.y.scrolling,
    };
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
    this.#bars.x.measure();
    this.#bars.y.measure();
  }
  #threshold(edge: OverflowEdge): number {
    const source = this.host.overflowEdgeThreshold;
    const value = typeof source === 'number' ? source : source?.[edge];
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
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
    this.#bars.x.dispose();
    this.#bars.y.dispose();
    this.#state = { ...initialScrollAreaState };
  }
}
