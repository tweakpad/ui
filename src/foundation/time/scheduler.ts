/** A registered refresh target; it reschedules itself after refreshing. */
export interface TimeRefreshTarget {
  refreshTime(): void;
}

export interface TimeClock {
  now(): number;
}

const schedulers = new WeakMap<Window, TimeRefreshScheduler>();

/**
 * One timer per owner window for every Time instance. Delays are recomputed by each target
 * from the current clock, work stops while the document is hidden, and every target refreshes
 * when the document becomes visible or the language environment changes.
 */
export class TimeRefreshScheduler {
  static for(owner: Window): TimeRefreshScheduler {
    let scheduler = schedulers.get(owner);
    if (!scheduler) {
      scheduler = new TimeRefreshScheduler(owner);
      schedulers.set(owner, scheduler);
    }
    return scheduler;
  }

  readonly #owner: Window;
  readonly #clock: TimeClock;
  readonly #due = new Map<TimeRefreshTarget, number>();
  readonly #members = new Set<TimeRefreshTarget>();
  #timer: number | undefined;
  #timerDue = Number.POSITIVE_INFINITY;
  #observer: MutationObserver | undefined;

  constructor(owner: Window, clock: TimeClock = { now: () => Date.now() }) {
    this.#owner = owner;
    this.#clock = clock;
  }

  now(): number {
    return this.#clock.now();
  }

  /** Join environment refreshes; returns idempotent cleanup that also cancels scheduled work. */
  register(target: TimeRefreshTarget): () => void {
    this.#members.add(target);
    if (this.#members.size === 1) this.#listen();
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#members.delete(target);
      this.cancel(target);
      if (!this.#members.size) this.#unlisten();
    };
  }

  /** Replace the target's pending refresh with one after delay milliseconds. */
  schedule(target: TimeRefreshTarget, delay: number): void {
    this.#due.set(target, this.#clock.now() + delay);
    this.#arm();
  }

  cancel(target: TimeRefreshTarget): void {
    if (this.#due.delete(target)) this.#arm();
  }

  get hidden(): boolean {
    return this.#owner.document.visibilityState === 'hidden';
  }

  #arm(): void {
    if (this.hidden || !this.#due.size) {
      this.#clear();
      return;
    }
    const next = Math.min(...this.#due.values());
    if (this.#timer !== undefined && next >= this.#timerDue) return;
    this.#clear();
    this.#timerDue = next;
    this.#timer = this.#owner.setTimeout(this.#fire, Math.max(0, next - this.#clock.now()));
  }

  #clear(): void {
    if (this.#timer !== undefined) this.#owner.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#timerDue = Number.POSITIVE_INFINITY;
  }

  #fire = (): void => {
    this.#timer = undefined;
    this.#timerDue = Number.POSITIVE_INFINITY;
    // Small tolerance so targets due within the same frame refresh together.
    const now = this.#clock.now() + 16;
    const due = [...this.#due].filter(([, time]) => time <= now).map(([target]) => target);
    for (const target of due) this.#due.delete(target);
    for (const target of due) this.#refresh(target);
    this.#arm();
  };

  #refresh(target: TimeRefreshTarget): void {
    try {
      target.refreshTime();
    } catch (error) {
      this.#owner.reportError?.(error);
    }
  }

  #refreshAll = (): void => {
    if (this.hidden) {
      this.#clear();
      return;
    }
    for (const target of [...this.#members]) {
      this.#due.delete(target);
      this.#refresh(target);
    }
    this.#arm();
  };

  #listen(): void {
    this.#owner.document.addEventListener('visibilitychange', this.#refreshAll);
    this.#owner.addEventListener('languagechange', this.#refreshAll);
    const Observer = (this.#owner as Window & { MutationObserver?: typeof MutationObserver })
      .MutationObserver;
    if (Observer) {
      const observer = new Observer(this.#refreshAll);
      this.#observer = observer;
      observer.observe(this.#owner.document.documentElement, {
        subtree: true,
        attributes: true,
        attributeFilter: ['lang'],
      });
    }
  }

  #unlisten(): void {
    this.#owner.document.removeEventListener('visibilitychange', this.#refreshAll);
    this.#owner.removeEventListener('languagechange', this.#refreshAll);
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#clear();
  }
}
