import { ObservableStore } from '../../foundation/store.js';
import {
  canObserveIntersection,
  observeIntersection,
  observeScroll,
} from '../../foundation/observation.js';
import {
  nonnegative,
  scrollEdges,
  scrollTarget,
  readingVisibility,
  type RowGeometry,
} from './geometry.js';

export type ScrollMode =
  'following-bottom' | 'free-scrolling' | 'anchored-to-message' | 'settling-jump';
export interface ScrollOptions {
  align?: 'start' | 'center' | 'end' | 'nearest';
  behavior?: ScrollBehavior;
  scrollMargin?: number;
}
export interface ScrollCommand {
  status: 'accepted' | 'pending' | 'rejected';
  finished: Promise<'completed' | 'superseded' | 'rejected'>;
}
export interface TranscriptRow {
  id: string;
  element: HTMLElement;
  anchor: boolean;
  addressable?: boolean;
}
export interface ScrollVisibility {
  visibleMessageIds: readonly string[];
  currentAnchorId: string | null;
}
const emptyVisibility: ScrollVisibility = Object.freeze({
  visibleMessageIds: Object.freeze([]),
  currentAnchorId: null,
});
export interface MessageScrollerOptions {
  rows(): TranscriptRow[];
  knownIds(): readonly string[];
  pinned(): boolean;
  pin(value: boolean, event?: Event): boolean;
  follow(): boolean;
  initialPosition(): 'start' | 'end' | 'preserve' | 'last-anchor';
  threshold(): number;
  readingLine(): number;
  previousItemPeek(): number;
  returnControlPeek(): number;
  preserveOnPrepend(): boolean;
  reducedMotion(): boolean;
  changed(): void;
}
interface PendingCommand {
  kind: 'start' | 'end' | 'message';
  id: string | undefined;
  options: ScrollOptions;
  resolve: (value: 'completed' | 'superseded') => void;
}
/** One headless owner for native scroll policy. Reconciliation is coalesced; rows never rerender on scroll. */
export class MessageScrollerProvider {
  readonly scrollable = new ObservableStore({ start: false, end: false });
  mode: ScrollMode = 'free-scrolling';
  pendingScroll = true;
  autoscrolling = false;
  #viewport: HTMLElement | undefined;
  #content: HTMLElement | undefined;
  #spacer: HTMLElement | undefined;
  #resize: ResizeObserver | undefined;
  #mutation: MutationObserver | undefined;
  /** Row subscriptions to the shared intersection service, while visibility is observed. */
  #intersection: Map<HTMLElement, () => void> | undefined;
  #intersectionMargin = '';
  #frame = 0;
  #visibilityFrame = 0;
  #autoTimer = 0;
  #opening = true;
  #rows: TranscriptRow[] = [];
  #handledAnchors = new WeakSet<HTMLElement>();
  #saved: { id: string; offset: number } | undefined;
  #anchor: string | undefined;
  #tailHeight = 0;
  #lastTop = 0;
  #waitToLeaveEnd = false;
  #lastFollow = false;
  #userMoved = false;
  #programTop: number | undefined;
  #command: PendingCommand | undefined;
  #settledFrames = 0;
  #lastSnapshot = '';
  #geometry = new Map<HTMLElement, RowGeometry>();
  #diagnosed = new Set<string>();
  #listeners = new Set<(value: ScrollVisibility) => void>();
  #visibility: ScrollVisibility = emptyVisibility;
  #intersections = new Set<HTMLElement>();
  #cleanup: (() => void)[] = [];
  constructor(readonly options: MessageScrollerOptions) {}
  get viewport() {
    return this.#viewport;
  }
  get visibility() {
    return this.#visibility;
  }
  subscribeVisibility(listener: (value: ScrollVisibility) => void): () => void {
    this.#listeners.add(listener);
    this.#observeVisibility();
    this.schedule();
    return () => {
      this.#listeners.delete(listener);
      if (!this.#listeners.size) this.#stopVisibility();
    };
  }
  connect(
    viewport: HTMLElement,
    content: HTMLElement,
    spacer: HTMLElement,
    source: HTMLElement,
  ): void {
    // A known pre-mount target survives the first bind, but never an actual disconnect.
    const pending = !this.#viewport ? this.#command : undefined;
    if (pending) this.#command = undefined;
    this.disconnect();
    this.#command = pending;
    if (pending) this.#opening = false;
    this.#viewport = viewport;
    this.#content = content;
    this.#spacer = spacer;
    const win = viewport.ownerDocument.defaultView!;
    const listen = (type: string, handler: EventListener, target: EventTarget = viewport) => {
      target.addEventListener(type, handler, { passive: true });
      this.#cleanup.push(() => target.removeEventListener(type, handler));
    };
    this.#cleanup.push(
      observeScroll(viewport, {
        scroll: () => {
          this.#userMoved = true;
          this.schedule();
        },
        userScroll: this.#intent,
        timing: { immediate: true },
      }),
    );
    listen('pointerdown', (event) => {
      if (event.composedPath()[0] === viewport) this.#intent(event);
    });
    listen('keydown', (event) => {
      const e = event as KeyboardEvent;
      if (
        event.composedPath()[0] === viewport &&
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)
      )
        this.#intent(e);
    });
    if (win.ResizeObserver) {
      this.#resize = new win.ResizeObserver(this.schedule);
      this.#resize.observe(viewport);
      this.#resize.observe(content);
    }
    this.#mutation = new win.MutationObserver(this.schedule);
    this.#mutation.observe(source, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['message-id', 'scroll-anchor', 'hidden'],
    });
    this.#observeVisibility();
    this.schedule();
  }
  disconnect(): void {
    const win = this.#viewport?.ownerDocument.defaultView;
    if (this.#frame) win?.cancelAnimationFrame(this.#frame);
    if (this.#autoTimer) win?.clearTimeout(this.#autoTimer);
    this.#frame = this.#autoTimer = 0;
    this.#resize?.disconnect();
    this.#mutation?.disconnect();
    this.#stopVisibility();
    for (const release of this.#cleanup.splice(0)) release();
    this.#supersede();
    this.#viewport = this.#content = this.#spacer = undefined;
    this.#opening = this.pendingScroll = true;
    this.autoscrolling = false;
    this.mode = 'free-scrolling';
    this.#rows = [];
    this.#handledAnchors = new WeakSet();
    this.#geometry.clear();
    this.#saved = this.#anchor = this.#programTop = undefined;
    this.#settledFrames = this.#tailHeight = this.#lastTop = 0;
    this.#waitToLeaveEnd = this.#userMoved = false;
    this.#lastFollow = this.options.follow();
    this.#lastSnapshot = '';
    this.#diagnosed.clear();
    if (this.scrollable.value.start || this.scrollable.value.end)
      this.scrollable.set({ start: false, end: false });
  }
  schedule = (): void => {
    if (this.#frame || !this.#viewport) return;
    this.#frame = this.#viewport.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#frame = 0;
      this.#geometry.clear();
      this.#reconcile();
      this.#geometry.clear();
    });
  };
  #measure(row: Pick<TranscriptRow, 'element'>): RowGeometry {
    let geometry = this.#geometry.get(row.element);
    if (!geometry) {
      const v = this.#viewport!,
        rect = row.element.getBoundingClientRect(),
        viewportRect = v.getBoundingClientRect();
      const scale = viewportRect.height / (v.offsetHeight || viewportRect.height) || 1;
      geometry = {
        top: (rect.top - viewportRect.top) / scale - v.clientTop + v.scrollTop,
        height: rect.height / scale,
      };
      this.#geometry.set(row.element, geometry);
    }
    return geometry;
  }
  #padding() {
    const s = this.#content!.ownerDocument.defaultView!.getComputedStyle(this.#content!);
    return {
      start: parseFloat(s.paddingBlockStart) || 0,
      end: parseFloat(s.paddingBlockEnd) || 0,
      gap: parseFloat(s.rowGap) || 0,
    };
  }
  #bottom() {
    const padding = this.#padding();
    // Match the source's content-child extent, not its addressable ID registry.
    // Native prose, duplicate rows and an external virtualizer's spacers count;
    // only our own following spacer is excluded. Flatten Lit's slot boundaries.
    const children = [...this.#content!.children].flatMap((element) =>
      element.localName === 'slot'
        ? (element as HTMLSlotElement).assignedElements({ flatten: true })
        : [element],
    );
    return children.reduce((bottom, element) => {
      if (element === this.#spacer || !(element instanceof HTMLElement) || element.hidden)
        return bottom;
      const r = this.#measure({ element });
      return Math.max(bottom, r.top + r.height + padding.end);
    }, padding.start + padding.end);
  }
  #end() {
    return Math.max(0, this.#viewport!.scrollHeight - this.#viewport!.clientHeight);
  }
  #setSpacer(height: number) {
    const spacer = this.#spacer!;
    const next = Math.max(0, Math.ceil(height));
    this.#tailHeight = next;
    spacer.hidden = next === 0;
    spacer.style.blockSize = `${next}px`;
    spacer.style.marginBlockStart = next ? `${-this.#padding().gap}px` : '';
  }
  #clearSpacer() {
    this.#setSpacer(nonnegative(this.options.returnControlPeek()));
  }
  #move(top: number, behavior: ScrollBehavior = 'instant') {
    const v = this.#viewport!;
    const target = Math.max(0, Math.min(top, this.#end()));
    this.#programTop = target;
    if (Math.abs(v.scrollTop - target) > 0.5)
      v.scrollTo({ top: target, behavior: this.options.reducedMotion() ? 'instant' : behavior });
  }
  #hold(row: TranscriptRow) {
    const top = Math.max(
      0,
      this.#measure(row).top -
        this.#padding().start -
        nonnegative(this.options.readingLine()) -
        nonnegative(this.options.previousItemPeek()),
    );
    this.#setSpacer(top + this.#viewport!.clientHeight - this.#bottom());
    this.#move(top);
  }
  #intent = (event: Event): void => {
    if (!this.#viewport) return;
    if (!this.options.pin(false, event)) {
      this.schedule();
      return;
    }
    const top = this.#viewport.scrollTop;
    this.#supersede();
    this.mode = 'free-scrolling';
    this.#anchor = undefined;
    this.#waitToLeaveEnd = this.#end() - top <= nonnegative(this.options.threshold());
    this.#viewport.scrollTo({ top, behavior: 'instant' });
    this.#programTop = undefined;
    this.#userMoved = true;
    this.schedule();
  };
  #capture() {
    const v = this.#viewport!;
    this.#lastTop = v.scrollTop;
    const row = this.#rows.find((row) => {
      const r = this.#measure(row);
      return r.top + r.height > v.scrollTop && r.top < v.scrollTop + v.clientHeight;
    });
    this.#saved = row ? { id: row.id, offset: this.#measure(row).top - v.scrollTop } : undefined;
  }
  #reconcile() {
    const v = this.#viewport!;
    const seen = new Set<string>();
    const rows = this.options.rows().filter((row) => {
      if (!row.id || !row.element.isConnected || row.element.hidden) return false;
      if (seen.has(row.id)) {
        if (!this.#diagnosed.has(row.id)) {
          this.#diagnosed.add(row.id);
          console.warn(`Duplicate messageId: ${row.id}`);
        }
        return false;
      }
      seen.add(row.id);
      return true;
    });
    const oldRows = this.#rows,
      oldElements = new Set(oldRows.map((row) => row.element)),
      elements = new Set(rows.map((row) => row.element));
    for (const row of oldRows)
      if (!elements.has(row.element)) {
        this.#resize?.unobserve(row.element);
        this.#unwatchRow(row.element);
      }
    for (const row of rows)
      if (!oldElements.has(row.element)) {
        this.#resize?.observe(row.element);
        this.#watchRow(row.element);
      }
    this.#rows = rows;
    if (!v.clientHeight) return;
    const threshold = nonnegative(this.options.threshold());
    const follow = this.options.follow();
    if (
      follow &&
      !this.#lastFollow &&
      !this.#opening &&
      this.mode === 'free-scrolling' &&
      !this.#command &&
      this.#bottom() - v.scrollTop - v.clientHeight <= threshold &&
      this.options.pin(true)
    )
      this.mode = 'following-bottom';
    this.#lastFollow = follow;
    const userMoved = this.#userMoved;
    this.#userMoved = false;
    const expected = this.#programTop !== undefined && Math.abs(v.scrollTop - this.#programTop) < 1;
    if (userMoved && !expected && this.mode !== 'settling-jump') {
      const atEnd = this.#bottom() - v.scrollTop - v.clientHeight <= threshold;
      if (!atEnd) this.#waitToLeaveEnd = false;
      if (this.mode === 'following-bottom' && v.scrollTop < this.#lastTop - 0.5 && !atEnd) {
        if (this.options.pin(false)) this.mode = 'free-scrolling';
      } else if (
        this.mode === 'free-scrolling' &&
        atEnd &&
        !this.#waitToLeaveEnd &&
        this.options.follow() &&
        this.options.pin(true)
      )
        this.mode = 'following-bottom';
    }
    if (this.#command && this.mode !== 'settling-jump') this.#execute();
    else if (this.mode === 'settling-jump') {
      if (
        this.#programTop !== undefined &&
        Math.abs(v.scrollTop - Math.min(this.#programTop, this.#end())) < 1
      )
        this.#settledFrames++;
      else this.#settledFrames = 0;
      if (this.#settledFrames >= 2) {
        const command = this.#command;
        this.#command = undefined;
        this.mode =
          command?.kind === 'end' && this.options.follow() && this.options.pinned()
            ? 'following-bottom'
            : 'free-scrolling';
        command?.resolve('completed');
        this.#programTop = undefined;
      } else this.schedule();
    } else if (this.#opening) {
      this.#clearSpacer();
      this.pendingScroll = false;
      if (rows.length) {
        this.#opening = false;
        const initial = this.options.initialPosition(),
          anchor = rows.filter((row) => row.anchor).at(-1);
        if (
          (initial === 'last-anchor' || initial === 'preserve') &&
          anchor &&
          this.#bottom() - this.#measure(anchor).top > v.clientHeight
        ) {
          this.#anchor = anchor.id;
          this.mode = 'anchored-to-message';
          this.#hold(anchor);
        } else if (initial !== 'start') {
          this.mode =
            this.options.follow() && this.options.pinned() ? 'following-bottom' : 'free-scrolling';
          this.#move(this.#end());
        } else {
          this.mode = 'free-scrolling';
          this.options.pin(false);
          this.#move(0);
        }
      }
    } else {
      const oldFirstIndex = rows.findIndex((row) => row.element === oldRows[0]?.element);
      const prepended = oldFirstIndex > 0;
      const newAnchors = rows.filter((row) => row.anchor && !this.#handledAnchors.has(row.element));
      let freshAnchor = false;
      if (!prepended && newAnchors.length) {
        if (newAnchors.length > 1 && this.mode === 'following-bottom' && this.options.follow()) {
          this.#anchor = undefined;
        } else {
          this.#anchor = newAnchors[0]!.id;
          this.mode = 'anchored-to-message';
          freshAnchor = true;
        }
      }
      const anchor = rows.find((row) => row.id === this.#anchor);
      if (this.mode === 'anchored-to-message' && anchor) {
        const previous = this.#tailHeight;
        this.#hold(anchor);
        if (
          !freshAnchor &&
          previous > 0 &&
          this.#tailHeight === 0 &&
          this.options.follow() &&
          this.options.pin(true)
        ) {
          this.mode = 'following-bottom';
          this.#anchor = undefined;
          this.#clearSpacer();
          this.#move(this.#end());
        }
      } else if (
        this.mode === 'following-bottom' &&
        this.options.pinned() &&
        this.options.follow()
      ) {
        this.#clearSpacer();
        this.#move(this.#end());
      } else {
        if (this.mode === 'anchored-to-message') {
          this.mode = 'free-scrolling';
          this.#anchor = undefined;
        }
        if (!userMoved && this.options.preserveOnPrepend() && this.#saved) {
          const row = rows.find((row) => row.id === this.#saved!.id);
          if (row) this.#move(this.#measure(row).top - this.#saved.offset);
        }
      }
    }
    for (const row of rows) if (row.anchor) this.#handledAnchors.add(row.element);
    this.#capture();
    const next = scrollEdges(
      v.scrollTop,
      this.#bottom(),
      v.clientHeight,
      threshold,
      this.mode === 'following-bottom' && this.options.follow(),
    );
    if (next.start !== this.scrollable.value.start || next.end !== this.scrollable.value.end)
      this.scrollable.set(next);
    this.#observeVisibility();
    this.#scheduleVisibility();
    this.#publish();
  }
  #publish() {
    const key = `${this.mode}/${this.pendingScroll}/${this.autoscrolling}/${this.scrollable.value.start}/${this.scrollable.value.end}/${this.options.pinned()}`;
    if (key !== this.#lastSnapshot) {
      this.#lastSnapshot = key;
      this.options.changed();
    }
  }
  #observeVisibility() {
    const v = this.#viewport;
    if (!v || !this.#listeners.size) return;
    const margin = `${-(nonnegative(this.options.readingLine()) + nonnegative(this.options.previousItemPeek()))}px 0px 0px 0px`;
    if (this.#intersection && margin !== this.#intersectionMargin) this.#releaseRows();
    if (!this.#intersection && canObserveIntersection(v)) {
      this.#intersectionMargin = margin;
      this.#intersection = new Map();
      for (const row of this.#rows) this.#watchRow(row.element);
    }
  }
  #watchRow(element: HTMLElement) {
    const v = this.#viewport;
    if (!v || !this.#intersection || this.#intersection.has(element)) return;
    this.#intersection.set(
      element,
      observeIntersection(
        element,
        (entry) => {
          if (entry.isIntersecting) this.#intersections.add(element);
          else this.#intersections.delete(element);
          this.#scheduleVisibility();
        },
        { root: v, rootMargin: this.#intersectionMargin, threshold: [0, 0.01, 0.5, 1] },
      ),
    );
  }
  #unwatchRow(element: HTMLElement) {
    this.#intersection?.get(element)?.();
    this.#intersection?.delete(element);
    this.#intersections.delete(element);
  }
  #releaseRows() {
    for (const release of this.#intersection?.values() ?? []) release();
    this.#intersection = undefined;
    this.#intersections.clear();
  }
  #stopVisibility() {
    if (this.#visibilityFrame)
      this.#viewport?.ownerDocument.defaultView?.cancelAnimationFrame(this.#visibilityFrame);
    this.#visibilityFrame = 0;
    this.#releaseRows();
    this.#visibility = emptyVisibility;
  }
  #scheduleVisibility() {
    const v = this.#viewport;
    if (!v || !this.#listeners.size || this.#visibilityFrame) return;
    this.#visibilityFrame = v.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#visibilityFrame = 0;
      if (!this.#listeners.size || !this.#viewport) return;
      this.#geometry.clear();
      const line =
        v.scrollTop +
        nonnegative(this.options.readingLine()) +
        nonnegative(this.options.previousItemPeek());
      const { visibleMessageIds: visible, currentAnchorId: anchor } = readingVisibility(
        this.#rows,
        (row) => this.#measure(row),
        line,
        v.scrollTop + v.clientHeight,
        this.#intersection ? (row) => this.#intersections.has(row.element) : undefined,
      );
      if (
        anchor !== this.#visibility.currentAnchorId ||
        visible.join('\0') !== this.#visibility.visibleMessageIds.join('\0')
      ) {
        this.#visibility = Object.freeze({
          visibleMessageIds: Object.freeze(visible),
          currentAnchorId: anchor,
        });
        for (const listener of this.#listeners) listener(this.#visibility);
      }
      this.#geometry.clear();
    });
  }
  #supersede() {
    this.#command?.resolve('superseded');
    this.#command = undefined;
  }
  scrollToStart(options: ScrollOptions = {}) {
    return this.#request('start', undefined, options);
  }
  scrollToEnd(options: ScrollOptions = {}) {
    return this.#request('end', undefined, options);
  }
  scrollToMessage(id: string, options: ScrollOptions = {}) {
    return this.#request('message', id, options);
  }
  #request(
    kind: PendingCommand['kind'],
    id: string | undefined,
    options: ScrollOptions,
  ): ScrollCommand {
    const row = kind === 'message' ? this.options.rows().find((row) => row.id === id) : undefined;
    if (kind === 'message' && !row && !this.options.knownIds().includes(id!))
      return { status: 'rejected', finished: Promise.resolve('rejected') };
    if (!this.options.pin(kind === 'end'))
      return { status: 'rejected', finished: Promise.resolve('rejected') };
    this.#supersede();
    this.#opening = false;
    let resolve!: PendingCommand['resolve'];
    const finished = new Promise<'completed' | 'superseded'>((done) => {
      resolve = done;
    });
    this.#command = { kind, id, options, resolve };
    this.mode = 'free-scrolling';
    const executed = this.#execute();
    this.schedule();
    this.#publish();
    return { status: executed ? 'accepted' : 'pending', finished };
  }
  #execute(): boolean {
    if (!this.#viewport?.clientHeight || !this.#command || !this.#content || !this.#spacer)
      return false;
    const { kind, id, options } = this.#command;
    const row = kind === 'message' ? this.options.rows().find((row) => row.id === id) : undefined;
    if (kind === 'message' && !row) return false;
    this.#geometry.clear();
    this.#anchor = undefined;
    this.#clearSpacer();
    this.pendingScroll = false;
    let target = kind === 'end' ? this.#end() : 0;
    if (row) {
      const p = this.#padding();
      target = Math.max(
        0,
        scrollTarget(
          this.#measure(row),
          this.#viewport.scrollTop,
          this.#viewport.clientHeight,
          p.start,
          p.end,
          options.align,
          nonnegative(options.scrollMargin ?? this.options.readingLine()),
        ),
      );
      this.#setSpacer(target + this.#viewport.clientHeight - this.#bottom());
    }
    this.mode = 'settling-jump';
    this.#settledFrames = 0;
    if (kind === 'end' && options.behavior === 'smooth' && !this.options.reducedMotion()) {
      const win = this.#viewport.ownerDocument.defaultView!;
      this.autoscrolling = true;
      if (this.#autoTimer) win.clearTimeout(this.#autoTimer);
      this.#autoTimer = win.setTimeout(() => {
        this.#autoTimer = 0;
        this.autoscrolling = false;
        this.#publish();
      }, 180);
    }
    this.#move(target, options.behavior ?? 'instant');
    this.schedule();
    return true;
  }
}
