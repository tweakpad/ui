import { composedContains } from '../../foundation/focus.js';
import { ObservableStore } from '../../foundation/store.js';

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
/** Headless native-scroll owner shared by the root, rows and edge controls. Distances are CSS pixels. */
export class MessageScrollerProvider {
  readonly scrollable = new ObservableStore({ start: false, end: false });
  mode: ScrollMode = 'free-scrolling';
  pendingScroll = true;
  #viewport: HTMLElement | undefined;
  #spacer: HTMLElement | undefined;
  #resize: ResizeObserver | undefined;
  #mutation: MutationObserver | undefined;
  #frame = 0;
  #opening = true;
  #seen = new Set<string>();
  #rows: TranscriptRow[] = [];
  #saved: { id: string; offset: number } | undefined;
  #anchor: string | undefined;
  #anchorMargin = 0;
  #lastTop = 0;
  #waitToLeaveEnd = false;
  #programTop: number | undefined;
  #listeners = new Set<(value: ScrollVisibility) => void>();
  #visibility: ScrollVisibility = emptyVisibility;
  #diagnosed = new Set<string>();
  #command:
    | { id: string; options: ScrollOptions; resolve: (v: 'completed' | 'superseded') => void }
    | undefined;
  #settledFrames = 0;
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
    this.schedule();
    return () => {
      this.#listeners.delete(listener);
      if (!this.#listeners.size) this.#visibility = emptyVisibility;
    };
  }
  connect(
    viewport: HTMLElement,
    content: HTMLElement,
    spacer: HTMLElement,
    source: HTMLElement,
  ): void {
    this.disconnect();
    this.#viewport = viewport;
    this.#spacer = spacer;
    const win = viewport.ownerDocument.defaultView!;
    const listen = (type: string, handler: EventListener, target: EventTarget = viewport) => {
      target.addEventListener(type, handler, { passive: true });
      this.#cleanup.push(() => target.removeEventListener(type, handler));
    };
    listen('scroll', this.#scroll);
    listen('wheel', this.#intent);
    listen('touchstart', this.#intent);
    listen('pointerdown', this.#intent);
    listen('keydown', (event) => {
      const e = event as KeyboardEvent;
      if (
        ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key) &&
        e.target === viewport
      )
        this.#intent(e);
    });
    listen('click', (event) => {
      if (event.composedPath().some((node) => node instanceof Element && node.localName === 'a'))
        this.#intent(event);
    });
    listen(
      'selectionchange',
      (event) => {
        const selection = viewport.ownerDocument.getSelection();
        if (selection && !selection.isCollapsed && composedContains(source, selection.anchorNode))
          this.#intent(event);
      },
      viewport.ownerDocument,
    );
    this.#resize = new win.ResizeObserver(() => this.schedule());
    this.#resize.observe(viewport);
    this.#resize.observe(content);
    this.#mutation = new win.MutationObserver(() => this.schedule());
    this.#mutation.observe(source, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['message-id', 'scroll-anchor', 'hidden'],
    });
    this.schedule();
  }
  disconnect(): void {
    if (this.#frame) this.#viewport?.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
    this.#resize?.disconnect();
    this.#mutation?.disconnect();
    for (const cleanup of this.#cleanup.splice(0)) cleanup();
    this.#supersede();
    this.#viewport = undefined;
    this.#spacer = undefined;
    this.#opening = true;
    this.pendingScroll = true;
    this.#seen.clear();
    this.#rows = [];
    this.#saved = undefined;
    this.#anchor = undefined;
    this.#programTop = undefined;
    this.#visibility = emptyVisibility;
    this.#settledFrames = 0;
  }
  schedule = (): void => {
    if (this.#frame || !this.#viewport) return;
    this.#frame = this.#viewport.ownerDocument.defaultView!.requestAnimationFrame(() => {
      this.#frame = 0;
      this.#reconcile();
    });
  };
  #top(row: TranscriptRow) {
    const v = this.#viewport!;
    return (
      row.element.getBoundingClientRect().top -
      v.getBoundingClientRect().top -
      v.clientTop +
      v.scrollTop
    );
  }
  #move(top: number, behavior: ScrollBehavior = 'instant') {
    const v = this.#viewport!;
    const bounded = Math.max(0, Math.min(top, v.scrollHeight - v.clientHeight));
    this.#programTop = bounded;
    if (Math.abs(v.scrollTop - bounded) > 0.5)
      v.scrollTo({ top: bounded, behavior: this.options.reducedMotion() ? 'instant' : behavior });
  }
  #end() {
    return Math.max(0, this.#viewport!.scrollHeight - this.#viewport!.clientHeight);
  }
  #clearSpacer() {
    if (!this.#spacer) return;
    const peek = Math.max(0, this.options.returnControlPeek());
    this.#spacer.style.display = peek ? 'block' : 'none';
    this.#spacer.style.blockSize = `${peek}px`;
  }
  #holdAnchor(row: TranscriptRow) {
    const v = this.#viewport!,
      spacer = this.#spacer!;
    const top = Math.max(0, this.#top(row) - this.#anchorMargin);
    spacer.style.display = 'block';
    const existing = spacer.getBoundingClientRect().height;
    const baseHeight = v.scrollHeight - existing;
    spacer.style.blockSize = `${Math.max(0, top + v.clientHeight - baseHeight)}px`;
    this.#move(top);
  }
  #intent = (event: Event): void => {
    if (!this.#viewport) return;
    const before = this.#viewport.scrollTop;
    if (!this.options.pin(false, event)) {
      this.schedule();
      return;
    }
    this.#supersede();
    this.mode = 'free-scrolling';
    this.#waitToLeaveEnd = this.#end() - before <= this.options.threshold();
    this.#anchor = undefined;
    this.#viewport.scrollTo({ top: before, behavior: 'instant' });
    this.#programTop = undefined;
    this.#capture();
    this.schedule();
  };
  #scroll = (): void => {
    const v = this.#viewport!;
    if (this.mode === 'settling-jump') {
      this.schedule();
      return;
    }
    if (this.#programTop !== undefined && Math.abs(v.scrollTop - this.#programTop) < 1)
      this.#programTop = undefined;
    else if (this.mode === 'free-scrolling' && Math.abs(v.scrollTop - this.#lastTop) > 0.5) {
      const atEnd = this.#end() - v.scrollTop <= Math.max(0, this.options.threshold());
      if (!atEnd) this.#waitToLeaveEnd = false;
      const pinned = atEnd && !this.#waitToLeaveEnd && this.options.follow();
      if (this.options.pin(pinned)) this.mode = pinned ? 'following-bottom' : 'free-scrolling';
      else if (this.options.pinned()) this.mode = 'following-bottom';
      if (this.mode === 'free-scrolling') this.#anchor = undefined;
    }
    this.#capture();
    this.schedule();
  };
  #capture() {
    const v = this.#viewport!;
    this.#lastTop = v.scrollTop;
    const row = this.#rows.find(
      (row) => this.#top(row) + row.element.getBoundingClientRect().height > v.scrollTop,
    );
    this.#saved = row ? { id: row.id, offset: this.#top(row) - v.scrollTop } : undefined;
  }
  #reconcile() {
    const v = this.#viewport!;
    const seen = new Set<string>();
    const rows = this.options.rows().filter((row) => {
      if (!row.id || !row.element.isConnected) return false;
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
    for (const old of this.#rows)
      if (!rows.some((r) => r.element === old.element)) this.#resize?.unobserve(old.element);
    for (const row of rows)
      if (!this.#rows.some((r) => r.element === row.element)) this.#resize?.observe(row.element);
    const oldLast = this.#rows.at(-1)?.id;
    const oldLastIndex = rows.findIndex((r) => r.id === oldLast);
    const appended = rows.filter(
      (r, i) => !this.#seen.has(r.id) && (oldLastIndex < 0 || i > oldLastIndex),
    );
    this.#rows = rows;
    if (!v.clientHeight) return; // Hidden panels defer opening until ResizeObserver reports a viewport.
    if (this.#command && this.mode !== 'settling-jump') {
      if (rows.some((r) => r.id === this.#command!.id)) this.#execute();
    } else if (this.mode === 'settling-jump') {
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
          this.#end() - v.scrollTop <= this.options.threshold() && this.options.follow()
            ? 'following-bottom'
            : 'free-scrolling';
        this.options.pin(this.mode === 'following-bottom');
        command?.resolve('completed');
      } else this.schedule();
    } else if (this.#opening) {
      this.#clearSpacer();
      this.pendingScroll = false;
      if (rows.length) {
        this.#opening = false;
        const initial = this.options.initialPosition();
        const anchor = rows.filter((r) => r.anchor).at(-1);
        if (
          (initial === 'last-anchor' || initial === 'preserve') &&
          anchor &&
          v.scrollHeight - this.#top(anchor) > v.clientHeight
        ) {
          this.#anchor = anchor.id;
          this.#anchorMargin = this.options.readingLine() + this.options.previousItemPeek();
          this.mode = 'anchored-to-message';
          this.#holdAnchor(anchor);
        } else if (initial !== 'start' && this.options.pinned()) {
          this.mode = 'following-bottom';
          this.#move(this.#end());
        } else {
          this.mode = 'free-scrolling';
          this.options.pin(false);
          this.#move(0);
        }
      }
    } else {
      const anchors = appended.filter((r) => r.anchor);
      if (anchors.length === 1 && this.mode !== 'free-scrolling') {
        this.#anchor = anchors[0]!.id;
        this.#anchorMargin = this.options.readingLine() + this.options.previousItemPeek();
        this.mode = 'anchored-to-message';
      } else if (anchors.length > 1 && this.options.pinned()) {
        this.#anchor = undefined;
        this.mode = 'following-bottom';
      }
      const anchor = rows.find((r) => r.id === this.#anchor);
      if (this.mode === 'anchored-to-message' && anchor) this.#holdAnchor(anchor);
      else if (this.mode === 'following-bottom' && this.options.pinned() && this.options.follow()) {
        this.#clearSpacer();
        this.#move(this.#end());
      } else if (this.options.preserveOnPrepend() && this.#saved) {
        const survivor = rows.find((r) => r.id === this.#saved!.id);
        if (survivor) this.#move(this.#top(survivor) - this.#saved.offset);
      }
    }
    this.#seen = seen;
    this.#capture();
    const threshold = Math.max(0, this.options.threshold());
    const next = { start: v.scrollTop > threshold, end: this.#end() - v.scrollTop > threshold };
    if (next.start !== this.scrollable.value.start || next.end !== this.scrollable.value.end)
      this.scrollable.set(next);
    if (this.#listeners.size) {
      const visible = rows
        .filter(
          (r) =>
            this.#top(r) + r.element.getBoundingClientRect().height > v.scrollTop &&
            this.#top(r) < v.scrollTop + v.clientHeight,
        )
        .map((r) => r.id);
      const anchor =
        rows
          .filter(
            (r) =>
              r.anchor &&
              this.#top(r) <=
                v.scrollTop + this.options.readingLine() + this.options.previousItemPeek() + 0.5,
          )
          .at(-1)?.id ?? null;
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
    }
    this.options.changed();
  }
  #supersede() {
    this.#command?.resolve('superseded');
    this.#command = undefined;
  }
  scrollToStart(options: ScrollOptions = {}) {
    return this.#request('@start', options);
  }
  scrollToEnd(options: ScrollOptions = {}) {
    return this.#request('@end', options);
  }
  scrollToMessage(id: string, options: ScrollOptions = {}) {
    return this.#request(id, options);
  }
  #request(id: string, options: ScrollOptions): ScrollCommand {
    const row = this.options.rows().find((r) => r.id === id);
    const mounted = !!row || id === '@start' || id === '@end';
    if (!this.#viewport || (!mounted && !this.options.knownIds().includes(id)))
      return { status: 'rejected', finished: Promise.resolve('rejected') };
    const desiredPin = id === '@end';
    if (!this.options.pin(desiredPin))
      return { status: 'rejected', finished: Promise.resolve('rejected') };
    this.#supersede();
    this.#opening = false;
    this.pendingScroll = false;
    let resolve!: (v: 'completed' | 'superseded') => void;
    const finished = new Promise<'completed' | 'superseded'>((r) => {
      resolve = r;
    });
    this.#command = { id, options, resolve };
    this.mode = 'free-scrolling';
    if (mounted) this.#execute();
    return { status: mounted ? 'accepted' : 'pending', finished };
  }
  #execute() {
    const { id, options } = this.#command!,
      v = this.#viewport!;
    const row = this.options.rows().find((r) => r.id === id);
    this.#anchor = undefined;
    this.#clearSpacer();
    let target = id === '@end' ? this.#end() : 0;
    if (row) {
      const margin = Math.max(0, options.scrollMargin ?? this.options.readingLine());
      const top = this.#top(row),
        height = row.element.getBoundingClientRect().height;
      target =
        options.align === 'end'
          ? top + height - v.clientHeight + margin
          : options.align === 'center'
            ? top - (v.clientHeight - height) / 2
            : top - margin;
      if (
        options.align === 'nearest' &&
        top >= v.scrollTop &&
        top + height <= v.scrollTop + v.clientHeight
      )
        target = v.scrollTop;
    }
    this.mode = 'settling-jump';
    this.#settledFrames = 0;
    this.#move(target, options.behavior ?? 'instant');
    this.schedule();
  }
}
