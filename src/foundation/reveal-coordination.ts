/**
 * Viewport reveal coordination (Foundation §18.18): the shared owner behind every element that
 * sequences the reveals of the components inside it (`tp-scroll-trigger`, `tp-image-group`), and
 * the membership protocol those components use. Members and coordinators import only this module,
 * so neither imports the other's class.
 */
import { composedParent } from './focus.js';
import { resolvesReducedMotion } from './motion.js';
import { canObserveIntersection } from './observation.js';
import { observeScrollProgress, type ScrollRange } from './scroll-progress.js';
import { ViewportTrigger } from './viewport-trigger.js';

export type StaggerFrom = 'first' | 'last' | 'center';

/** What a revealing component (or a nested coordinator) offers its coordinator. */
export interface RevealMember {
  readonly element: HTMLElement;
  /** Ready to reveal: an image once settled, a text once its fonts and pieces are ready. */
  ready(): boolean;
  /** Settled resource outcome, for counts; members without a resource omit it. */
  outcome?(): 'loaded' | 'failed' | 'pending' | 'none';
  /** Has an effect to play (its own, or the coordinator default). */
  revealing(): boolean;
  revealed(): boolean;
  held(): boolean;
  /** Start any loading now instead of waiting for the member's own visibility. */
  prepare(): void;
  /** Plays the reveal after `delay` ms; resolves once its motion has settled. */
  reveal(delay: number): Promise<void>;
  /** Returns instantly to the start state. */
  reset(): void;
  /** The coordinator default effect changed; re-render the start state. */
  refresh?(): void;
  /** The member's own full reveal in milliseconds, its internal stagger included. */
  duration?(): number;
  /**
   * Presents the reveal `time` milliseconds into it, following the scroll (0 is the start state,
   * the duration or more is rest); `null` returns to timed reveals.
   */
  scrub?(time: number | null): void;
}

/** A scrubbed time far enough past any reveal to present rest (reduced motion). */
const REST_TIME = 1e9;

/** What a coordinator offers the members inside it. */
export interface RevealCoordinatorHost {
  register(member: RevealMember): () => void;
  /** A member's readiness, effect or hold changed. */
  update(): void;
  /** The default reveal effect for members without their own. */
  readonly reveal: string;
}

export const revealCoordinatorHost = Symbol.for('tp-reveal-coordinator');

type CoordinatorElement = HTMLElement & { [revealCoordinatorHost]?: RevealCoordinatorHost };

/** Coordinator tags, recognised before their definitions load so members never reveal early. */
const COORDINATOR_TAGS = new Set(['tp-scroll-trigger', 'tp-image-group']);

/** The nearest coordinator ancestor of `element` across shadow boundaries, defined or not. */
export function nearestRevealCoordinator(element: Element): CoordinatorElement | null {
  for (let node = composedParent(element); node; node = composedParent(node)) {
    if (node.nodeType !== 1) continue;
    const candidate = node as CoordinatorElement;
    if (candidate[revealCoordinatorHost] || COORDINATOR_TAGS.has(candidate.localName))
      return candidate;
  }
  return null;
}

/** Stagger positions for `count` members numbered from `from` (center shares equal distances). */
export function staggerPositions(count: number, from: StaggerFrom = 'first'): number[] {
  const middle = (count - 1) / 2;
  return Array.from({ length: count }, (_, index) =>
    from === 'last'
      ? count - 1 - index
      : from === 'center'
        ? Math.floor(Math.abs(index - middle))
        : index,
  );
}

/** Stagger offsets, in milliseconds, for `count` members revealed in order. */
export function staggerDelays(count: number, stagger: number, from: StaggerFrom = 'first') {
  const step = Number.isFinite(stagger) ? Math.max(0, stagger) : 0;
  return staggerPositions(count, from).map((position) => position * step);
}

export function parseStaggerFrom(value: string | null | undefined): StaggerFrom {
  return value === 'last' || value === 'center' ? value : 'first';
}

/** Orders members by document position (composed trees compare within their own root). */
function documentOrder(a: RevealMember, b: RevealMember): number {
  const following = 4; // Node.DOCUMENT_POSITION_FOLLOWING
  return a.element.compareDocumentPosition(b.element) & following ? -1 : 1;
}

/**
 * Joins `element`'s nearest coordinator once it is defined. While a coordinator ancestor exists
 * but has not been defined yet, `pending` is true so the element does not reveal on its own.
 */
export class RevealMembership {
  #host: RevealCoordinatorHost | undefined;
  #leave: (() => void) | undefined;
  #pending = false;
  #generation = 0;

  constructor(
    private readonly element: HTMLElement,
    private readonly member: RevealMember,
    private readonly changed: () => void,
  ) {}

  /** The coordinator this element belongs to, once joined. */
  get host(): RevealCoordinatorHost | undefined {
    return this.#host;
  }

  /** A coordinator ancestor exists but is not defined yet. */
  get pending(): boolean {
    return this.#pending;
  }

  /** Coordinated: joined, or waiting for an ancestor coordinator to be defined. */
  get coordinated(): boolean {
    return Boolean(this.#host) || this.#pending;
  }

  connect(): void {
    if (this.#host) return;
    const generation = ++this.#generation;
    const coordinator = nearestRevealCoordinator(this.element);
    if (!coordinator) {
      this.#pending = false;
      return;
    }
    const host = coordinator[revealCoordinatorHost];
    if (!host) {
      this.#pending = true;
      const registry = this.element.ownerDocument.defaultView?.customElements;
      void registry?.whenDefined(coordinator.localName).then(() => {
        if (generation !== this.#generation || !this.element.isConnected) return;
        this.#pending = false;
        if (nearestRevealCoordinator(this.element) === coordinator) this.connect();
        this.changed();
      });
      return;
    }
    this.#pending = false;
    this.#host = host;
    this.#leave = host.register(this.member);
    this.changed();
  }

  disconnect(): void {
    this.#generation++;
    this.#leave?.();
    this.#leave = undefined;
    this.#host = undefined;
    this.#pending = false;
  }

  /** Tells the coordinator that readiness, effect or hold changed. */
  update(): void {
    this.#host?.update();
  }
}

export interface CoordinatorStatus {
  readonly status: 'idle' | 'loading' | 'ready';
  readonly ready: number;
  readonly loaded: number;
  readonly failed: number;
  readonly total: number;
}

/** Aggregate readiness of `members`. */
export function coordinatorStatus(members: readonly RevealMember[]): CoordinatorStatus {
  const total = members.length;
  const ready = members.filter((member) => member.ready()).length;
  const loaded = members.filter((member) => member.outcome?.() === 'loaded').length;
  const failed = members.filter((member) => member.outcome?.() === 'failed').length;
  const status = total === 0 ? 'idle' : ready === total ? 'ready' : 'loading';
  return { status, ready, loaded, failed, total };
}

export interface RevealCoordinatorConfig {
  stagger(): number;
  staggerFrom(): StaggerFrom;
  repeat(): boolean;
  hold(): boolean;
  /** The coordinator's own default effect (may be empty). */
  reveal(): string;
  /** Reflect `data-in-view` while the coordinator observes its own entry. */
  readonly marker?: boolean;
  /** Dispatches an event from the coordinator element. */
  emit(type: string, detail: unknown): void;
  /** Called after each evaluation with the aggregate status, to report it. */
  status(status: CoordinatorStatus, members: readonly RevealMember[]): void;
  /** Follow the scroll position instead of playing over time (Foundation §18.18 `vr-scrub`). */
  scrub?(): boolean;
  /** The scroll range mapped to progress while scrubbing. */
  range?(): ScrollRange;
  /** How far scrubbed progress trails the scroll. */
  smoothing?(): number;
}

/**
 * Coordinates the reveals of the members whose nearest coordinator is `element`. Standalone it
 * follows its own viewport trigger; inside another coordinator it is a member of it, ready when
 * all its members are and playing its sequence offset by the delay it is given.
 */
export class RevealCoordinator {
  readonly #members = new Set<RevealMember>();
  readonly #element: HTMLElement;
  readonly #config: RevealCoordinatorConfig;
  readonly #trigger: ViewportTrigger;
  readonly #membership: RevealMembership;
  readonly #member: RevealMember;
  #revealed = false;
  #sequence = 0;
  #scheduled = false;
  #prepared = false;
  #connected = false;
  /** Scrubbing: the subscription, its settings, the presented progress and the timeline. */
  #releaseScrub: (() => void) | undefined;
  #scrubKey: string | undefined;
  #progress = 0;
  #highest = 0;
  #complete = false;
  #timeline: { members: RevealMember[]; offsets: number[]; total: number } = {
    members: [],
    offsets: [],
    total: 0,
  };

  /** Offered to descendants through `[revealCoordinatorHost]`. */
  readonly host: RevealCoordinatorHost;

  constructor(element: HTMLElement, config: RevealCoordinatorConfig) {
    this.#element = element;
    this.#config = config;
    const host = {
      register: (member: RevealMember) => {
        this.#members.add(member);
        if (this.#prepared) member.prepare();
        this.schedule();
        return () => {
          this.#members.delete(member);
          this.schedule();
        };
      },
      update: () => this.schedule(),
    };
    // The default effect is read live: the coordinator's own, or its outer coordinator's.
    Object.defineProperty(host, 'reveal', {
      get: () => this.#config.reveal() || this.#membership.host?.reveal || '',
    });
    this.host = host as RevealCoordinatorHost;
    this.#trigger = new ViewportTrigger(element, {
      repeat: () => config.repeat(),
      near: true,
      marker: config.marker ?? false,
      changed: () => this.schedule(),
      left: () => {
        if (config.repeat() && !this.#scrubbing()) this.#reset();
      },
    });
    // This coordinator as a member of an outer one.
    this.#member = {
      element,
      ready: () => coordinatorStatus(this.members).status !== 'loading',
      revealing: () => true,
      revealed: () => this.#revealed,
      held: () => this.#held(this.members),
      prepare: () => this.#prepare(),
      reveal: (delay) => this.#play(this.members, delay, this.#immediate()),
      reset: () => this.#reset(),
      refresh: () => {
        for (const member of this.#members) member.refresh?.();
      },
      duration: () => this.#measureTimeline(this.members).total,
      scrub: (time) => {
        if (time === null) this.#endScrub();
        else this.#presentTime(time);
      },
    };
    this.#membership = new RevealMembership(element, this.#member, () => {
      this.#syncTrigger();
      this.schedule();
    });
  }

  /** Members in document order. */
  get members(): RevealMember[] {
    return [...this.#members].sort(documentOrder);
  }

  get revealed(): boolean {
    return this.#revealed;
  }

  /** Scrubbed progress, 0 through 1 (0 when not scrubbing). */
  get progress(): number {
    return this.#progress;
  }

  /** Whether this coordinator is a member of an outer one (or waiting to become one). */
  get nested(): boolean {
    return this.#membership.coordinated;
  }

  connect(): void {
    this.#connected = true;
    this.#membership.connect();
    this.#syncTrigger();
    this.schedule();
  }

  disconnect(): void {
    this.#connected = false;
    this.#membership.disconnect();
    this.#trigger.release();
    this.#releaseScrub?.();
    this.#releaseScrub = undefined;
    this.#scrubKey = undefined;
    this.#prepared = false;
  }

  /** Re-reads configuration (repeat, effect) after a property change. */
  configChanged(revealChanged = false): void {
    this.#syncTrigger();
    if (revealChanged) for (const member of this.#members) member.refresh?.();
    this.schedule();
  }

  /** Batches notifications into one evaluation per microtask. */
  schedule(): void {
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => {
      this.#scheduled = false;
      if (this.#connected && this.#element.isConnected) this.#evaluate();
    });
  }

  #syncTrigger(): void {
    // A nested coordinator follows its outer coordinator, never its own visibility.
    this.#trigger.sync(this.#connected && !this.#membership.coordinated);
    this.#syncScrub();
  }

  /** Scrubbing applies to an outermost coordinator only; a nested one follows its outer one. */
  #scrubbing(): boolean {
    return Boolean(this.#config.scrub?.()) && this.#connected && !this.#membership.coordinated;
  }

  /** Follows the scroll while scrubbing; leaving scrub mode returns members to timed reveals. */
  #syncScrub(): void {
    if (!this.#scrubbing()) {
      if (this.#releaseScrub) {
        this.#releaseScrub();
        this.#releaseScrub = undefined;
        this.#scrubKey = undefined;
        this.#endScrub();
      }
      return;
    }
    const range = this.#config.range?.() ?? 'contain';
    const smoothing = this.#config.smoothing?.() ?? 0;
    const key = `${range}|${smoothing}`;
    if (key === this.#scrubKey) return;
    this.#releaseScrub?.();
    this.#scrubKey = key;
    this.#releaseScrub = observeScrollProgress(
      this.#element,
      (progress) => this.#scrolled(progress),
      {
        range,
        smoothing,
      },
    );
  }

  /** Every member back to timed reveals, from the start state. */
  #endScrub(): void {
    for (const member of this.#members) member.scrub?.(null);
    this.#progress = this.#highest = 0;
    this.#complete = false;
    if (this.#revealed) {
      this.#revealed = false;
      this.#element.removeAttribute('data-revealed');
    }
    this.schedule();
  }

  /** New measured progress: forward only unless repeating, then events and presentation. */
  #scrolled(measured: number): void {
    const repeat = this.#config.repeat();
    this.#highest = repeat ? measured : Math.max(this.#highest, measured);
    const progress = this.#highest;
    if (progress === this.#progress && this.#revealed === progress > 0) return;
    this.#progress = progress;
    this.#config.emit('tp-scroll-progress', { progress });
    if (progress > 0 && !this.#revealed) {
      this.#revealed = true;
      this.#element.toggleAttribute('data-revealed', true);
      this.#config.emit('tp-reveal-change', { revealed: true });
    } else if (progress === 0 && this.#revealed && repeat) {
      this.#revealed = false;
      this.#element.removeAttribute('data-revealed');
      this.#config.emit('tp-reveal-change', { revealed: false });
    }
    if (progress >= 1 && !this.#complete) {
      this.#complete = true;
      this.#config.emit('tp-reveal-change-complete', { revealed: true });
    } else if (progress < 1 && this.#complete && repeat) this.#complete = false;
    this.#presentTime(progress * this.#timeline.total);
  }

  /**
   * The timed choreography laid out for scrubbing: each revealing member starts at its stagger
   * offset and lasts its own duration; the total is the latest end.
   */
  #measureTimeline(members: readonly RevealMember[]) {
    const revealing = members.filter((member) => member.revealing());
    const offsets = staggerDelays(
      revealing.length,
      this.#config.stagger(),
      this.#config.staggerFrom(),
    );
    const total = Math.max(
      0,
      ...revealing.map((member, index) => offsets[index]! + (member.duration?.() ?? 0)),
    );
    this.#timeline = { members: revealing, offsets, total };
    return this.#timeline;
  }

  /** Presents `time` of the choreography on every member (held: the start state). */
  #presentTime(time: number): void {
    const { members, offsets } = this.#timeline;
    const held = this.#held(this.members);
    const reduced = resolvesReducedMotion(this.#element);
    members.forEach((member, index) => {
      const local = held ? 0 : reduced ? REST_TIME : time - offsets[index]!;
      if (member.scrub) member.scrub(local);
      else if (local > 0 && !member.revealed() && member.ready()) void member.reveal(0);
    });
  }

  #immediate(): boolean {
    return !canObserveIntersection(this.#element) || resolvesReducedMotion(this.#element);
  }

  #held(members: readonly RevealMember[]): boolean {
    return this.#config.hold() || members.some((member) => member.held());
  }

  #evaluate(): void {
    const members = this.members;
    const status = coordinatorStatus(members);
    this.#config.status(status, members);
    const nested = this.#membership.coordinated;
    if (nested) this.#membership.update();
    else if (this.#trigger.near || this.#immediate()) this.#prepare();
    if (this.#scrubbing()) {
      // The scroll is authoritative: lay out the choreography and present the current progress.
      this.#measureTimeline(members);
      this.#presentTime(this.#progress * this.#timeline.total);
      return;
    }
    if (this.#held(members)) return;
    if (!this.#revealed) {
      if (nested) return;
      const immediate = this.#immediate();
      if (status.status !== 'loading' && (this.#trigger.inView || immediate))
        void this.#play(members, 0, immediate);
      return;
    }
    // Already revealed: members that joined later reveal as soon as they are ready.
    for (const member of members)
      if (member.revealing() && !member.revealed() && member.ready()) void member.reveal(0);
  }

  #prepare(): void {
    this.#prepared = true;
    for (const member of this.#members) member.prepare();
  }

  #play(members: readonly RevealMember[], base: number, immediate: boolean): Promise<void> {
    const sequence = ++this.#sequence;
    this.#revealed = true;
    this.#element.toggleAttribute('data-revealed', true);
    const revealing = members.filter((member) => member.revealing() && !member.revealed());
    const delays = staggerDelays(
      revealing.length,
      immediate ? 0 : this.#config.stagger(),
      this.#config.staggerFrom(),
    );
    this.#config.emit('tp-reveal-change', { revealed: true });
    return Promise.all(
      revealing.map((member, index) => member.reveal(base + (delays[index] ?? 0))),
    ).then(() => {
      if (sequence === this.#sequence && this.#revealed)
        this.#config.emit('tp-reveal-change-complete', { revealed: true });
    });
  }

  #reset(): void {
    if (!this.#revealed) return;
    const sequence = ++this.#sequence;
    this.#revealed = false;
    this.#element.removeAttribute('data-revealed');
    for (const member of this.#members) member.reset();
    this.#config.emit('tp-reveal-change', { revealed: false });
    queueMicrotask(() => {
      if (sequence === this.#sequence)
        this.#config.emit('tp-reveal-change-complete', { revealed: false });
    });
  }
}
