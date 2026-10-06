import { Scheduler } from './services.js';

/** Foundation live announcer (`sec-1923-live-announcer`). */
export type AnnouncementPoliteness = 'polite' | 'assertive';

export interface AnnounceOptions {
  /** Region that speaks the message. Defaults to `polite`. */
  readonly politeness?: AnnouncementPoliteness;
  /**
   * Debounce delay in milliseconds. Absent or `0` announces immediately (in the
   * current batch). A newer message with the same key restarts the delay.
   */
  readonly debounce?: number;
  /**
   * Identity of the message. A newer message with the same key replaces a pending
   * one, whether it is still debouncing or waiting in the current batch. Defaults to
   * the message text.
   */
  readonly key?: string;
}

export interface AnnouncementContext {
  readonly politeness: AnnouncementPoliteness;
  readonly key: string;
  readonly debounced: boolean;
}

export interface LiveAnnouncerOptions {
  /** Owner document. Ignored when `root` resolves; defaults to the global document. */
  readonly document?: () => Document | null | undefined;
  /**
   * Parent for the regions. A document resolves to its body. Use an element inside
   * the owner (for example, a fullscreen container) to keep regions in its subtree.
   */
  readonly root?: () => Document | Element | ShadowRoot | null | undefined;
  /** Delay in milliseconds before spoken text is cleared. Defaults to 800. */
  readonly clearDelay?: number;
  /** Separator for messages announced together. Defaults to `". "`. */
  readonly separator?: string;
  /**
   * Suppresses a message when it returns true. Evaluated when the message is
   * requested and again when a debounced message becomes due.
   */
  readonly suppress?: (message: string, context: AnnouncementContext) => boolean;
}

/** Default delay before announced text is cleared. */
export const ANNOUNCEMENT_CLEAR_DELAY = 800;
/** Delay before writing into a region created in the same turn, so assistive technology observes it first. */
export const ANNOUNCEMENT_REGION_SETTLE_DELAY = 100;

const HIDDEN_STYLE: ReadonlyArray<readonly [string, string]> = [
  ['position', 'absolute'],
  ['width', '1px'],
  ['height', '1px'],
  ['padding', '0'],
  ['margin', '-1px'],
  ['overflow', 'hidden'],
  ['clip-path', 'inset(50%)'],
  ['white-space', 'nowrap'],
  ['border', '0'],
];

interface Entry {
  readonly key: string;
  readonly message: string;
}

interface RegionState {
  element: HTMLElement | undefined;
  batch: Entry[];
  flush: (() => void) | undefined;
  clear: (() => void) | undefined;
  /** Text most recently written, before the repeat marker. */
  spoken: string;
  toggle: boolean;
}

/**
 * Owns visually hidden polite and assertive live regions for status messages that
 * have no other accessible carrier. Regions are created lazily in the owner's
 * document (or the provided root), messages requested in the same turn are joined,
 * keyed messages may be debounced, text clears after a configurable delay and a
 * suppression predicate can veto messages. `dispose()` removes the regions.
 */
export class LiveAnnouncer {
  readonly #options: LiveAnnouncerOptions;
  readonly #regions: Record<AnnouncementPoliteness, RegionState> = {
    polite: LiveAnnouncer.#state(),
    assertive: LiveAnnouncer.#state(),
  };
  readonly #debounced = new Map<string, () => void>();
  #scheduler: Scheduler | undefined;
  #schedulerWindow: Window | undefined;
  #clearDelay: number;
  #disposed = false;

  constructor(options: LiveAnnouncerOptions = {}) {
    this.#options = options;
    this.#clearDelay = LiveAnnouncer.#delay(options.clearDelay, ANNOUNCEMENT_CLEAR_DELAY);
  }

  static #state(): RegionState {
    return {
      element: undefined,
      batch: [],
      flush: undefined,
      clear: undefined,
      spoken: '',
      toggle: false,
    };
  }

  static #delay(value: number | undefined, fallback: number): number {
    return value !== undefined && Number.isFinite(value) && value >= 0 ? value : fallback;
  }

  get clearDelay(): number {
    return this.#clearDelay;
  }

  set clearDelay(value: number) {
    this.#clearDelay = LiveAnnouncer.#delay(value, ANNOUNCEMENT_CLEAR_DELAY);
  }

  /** The created region for a politeness, if any. */
  region(politeness: AnnouncementPoliteness = 'polite'): HTMLElement | undefined {
    return this.#regions[politeness].element;
  }

  /** Creates the regions ahead of the first message, so the first one is not missed. */
  prepare(politeness?: AnnouncementPoliteness): void {
    if (this.#disposed) return;
    for (const value of politeness ? [politeness] : (['polite', 'assertive'] as const))
      this.#ensure(value);
  }

  announce(message: string, options: AnnounceOptions = {}): void {
    if (this.#disposed) return;
    const text = message.trim();
    if (!text) return;
    const politeness = options.politeness ?? 'polite';
    const key = options.key ?? text;
    const delay = LiveAnnouncer.#delay(options.debounce, 0);
    const context: AnnouncementContext = { politeness, key, debounced: delay > 0 };
    if (this.#suppressed(text, context)) return;
    const slot = `${politeness}\u0000${key}`;
    this.#debounced.get(slot)?.();
    this.#debounced.delete(slot);
    if (!delay) {
      this.#enqueue(politeness, { key, message: text });
      return;
    }
    const cancel = this.#timers().timeout(() => {
      this.#debounced.delete(slot);
      if (this.#disposed || this.#suppressed(text, context)) return;
      this.#enqueue(politeness, { key, message: text });
    }, delay);
    this.#debounced.set(slot, cancel);
  }

  /** Cancels pending (debounced or batched) messages, optionally only one key. */
  cancel(key?: string): void {
    for (const [slot, cancel] of [...this.#debounced]) {
      if (key !== undefined && slot.slice(slot.indexOf('\u0000') + 1) !== key) continue;
      cancel();
      this.#debounced.delete(slot);
    }
    for (const state of Object.values(this.#regions)) {
      state.batch = key === undefined ? [] : state.batch.filter((entry) => entry.key !== key);
      if (!state.batch.length) {
        state.flush?.();
        state.flush = undefined;
      }
    }
  }

  /** Cancels pending messages and empties both regions. */
  clear(): void {
    this.cancel();
    for (const state of Object.values(this.#regions)) this.#empty(state);
  }

  dispose(): void {
    if (this.#disposed) return;
    this.clear();
    this.#disposed = true;
    for (const state of Object.values(this.#regions)) {
      state.element?.remove();
      state.element = undefined;
    }
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
  }

  #suppressed(message: string, context: AnnouncementContext): boolean {
    return this.#options.suppress?.(message, context) === true;
  }

  #parent(): { document: Document; parent: ParentNode } | undefined {
    const root = this.#options.root?.();
    if (root) {
      if (root.nodeType === 9) {
        const document = root as Document;
        return document.body ? { document, parent: document.body } : undefined;
      }
      const document = root.ownerDocument;
      return document ? { document, parent: root as Element | ShadowRoot } : undefined;
    }
    const document = this.#options.document?.() ?? globalThis.document;
    return document?.body ? { document, parent: document.body } : undefined;
  }

  #timers(): Scheduler {
    const view = this.#parent()?.document.defaultView ?? undefined;
    if (!this.#scheduler || view !== this.#schedulerWindow) {
      // Pending work belongs to the previous owner window; it is released with it.
      this.#scheduler?.dispose();
      this.#debounced.clear();
      for (const state of Object.values(this.#regions)) {
        state.flush = undefined;
        state.clear = undefined;
      }
      this.#scheduler = new Scheduler(view);
      this.#schedulerWindow = view;
    }
    return this.#scheduler;
  }

  /** Returns the region, creating or moving it; `created` is true when it is new. */
  #ensure(
    politeness: AnnouncementPoliteness,
  ): { element: HTMLElement; created: boolean } | undefined {
    const target = this.#parent();
    if (!target) return undefined;
    const state = this.#regions[politeness];
    let element = state.element;
    let created = false;
    if (!element || element.ownerDocument !== target.document) {
      element?.remove();
      element = target.document.createElement('div');
      element.setAttribute('data-tp-live-region', politeness);
      if (politeness === 'polite') element.setAttribute('role', 'status');
      element.setAttribute('aria-live', politeness);
      element.setAttribute('aria-atomic', 'true');
      for (const [property, value] of HIDDEN_STYLE) element.style.setProperty(property, value);
      state.element = element;
      state.spoken = '';
      created = true;
    }
    if (element.parentNode !== target.parent) {
      target.parent.append(element);
      created = true;
    }
    return { element, created };
  }

  #enqueue(politeness: AnnouncementPoliteness, entry: Entry): void {
    const state = this.#regions[politeness];
    const scheduler = this.#timers();
    state.batch = state.batch.filter((pending) => pending.key !== entry.key);
    state.batch.push(entry);
    if (state.flush) return;
    const region = this.#ensure(politeness);
    if (!region) {
      state.batch = [];
      return;
    }
    const write = () => {
      state.flush = undefined;
      this.#write(politeness);
    };
    state.flush = region.created
      ? scheduler.timeout(write, ANNOUNCEMENT_REGION_SETTLE_DELAY)
      : scheduler.microtask(write);
  }

  #write(politeness: AnnouncementPoliteness): void {
    const state = this.#regions[politeness];
    const entries = state.batch;
    state.batch = [];
    const element = state.element;
    if (!entries.length || !element || this.#disposed) return;
    const text = entries.map((entry) => entry.message).join(this.#options.separator ?? '. ');
    // Identical consecutive text is varied so assistive technology announces it again.
    state.toggle = text === state.spoken ? !state.toggle : false;
    state.spoken = text;
    element.textContent = state.toggle ? `${text}\u00a0` : text;
    state.clear?.();
    state.clear = this.#scheduler?.timeout(() => {
      state.clear = undefined;
      this.#empty(state);
    }, this.#clearDelay);
  }

  #empty(state: RegionState): void {
    state.clear?.();
    state.clear = undefined;
    state.spoken = '';
    state.toggle = false;
    if (state.element) state.element.textContent = '';
  }
}
