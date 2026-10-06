import { interactiveTargetInPath } from '../interactive-target.js';
import { ReasonLeases } from '../reason-leases.js';
import { CleanupScope, Scheduler } from '../services.js';
import type { ChangeReason } from '../types.js';

/**
 * Activity and idle owner (`sec-1922-activity-and-idle`). Tracks user activity on a surface,
 * marks it inactive after an idle delay, and holds reason leases that keep auxiliary controls
 * visible. It never moves focus; hiding is published through `onChange` so the host can close
 * owned popups with reason `idle` and update its visibility state.
 */
export const DEFAULT_IDLE_DELAY = 2000;
/** Maximum touch press duration, in milliseconds, that toggles visibility. */
export const ACTIVITY_TAP_THRESHOLD = 250;
/** Window after touch in which synthetic `mouseleave` and `focusin` are ignored. */
export const TOUCH_SETTLE_DELAY = 500;
/** Window after pointer-capture release in which an in-bounds `mouseleave` is spurious (Safari). */
export const CAPTURE_RELEASE_DELAY = 100;

export type ActivityLeaseReason = 'lock' | 'popup' | 'drag' | 'focus' | 'hover' | (string & {});

export interface ActivityState {
  readonly userActive: boolean;
  /** At least one lease is held. */
  readonly locked: boolean;
}

export interface ActivityChange extends ActivityState {
  readonly reason: ChangeReason;
  readonly sourceEvent?: Event;
}

export interface ActivityOwnerOptions {
  /** Idle delay in milliseconds; `≤ 0` disables hiding. Defaults to 2000. */
  readonly idleDelay?: () => number | undefined;
  /** Publishes activity changes. */
  readonly onChange?: (change: ActivityChange) => void;
  /** Whether auxiliary controls are currently visible (the tap toggle inverts this). */
  readonly visible?: () => boolean;
  /** Whether a gesture binding claims a touch tap, which then owns the toggle. */
  readonly claimsTap?: (event: PointerEvent) => boolean;
  /** Clock in milliseconds; defaults to the surface window's `performance.now()`. */
  readonly now?: () => number;
}

/** Whether a mouse event's position lies inside an element's box. */
function pointInside(element: Element, event: MouseEvent): boolean {
  if (typeof element.getBoundingClientRect !== 'function') return false;
  const rect = element.getBoundingClientRect();
  return (
    event.clientX >= rect.left &&
    event.clientX <= rect.right &&
    event.clientY >= rect.top &&
    event.clientY <= rect.bottom
  );
}

export class ActivityOwner {
  readonly #options: ActivityOwnerOptions;
  readonly #leases: ReasonLeases<ActivityLeaseReason>;
  #surface: HTMLElement | null = null;
  #scope: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #idle: (() => void) | undefined;
  #userActive = true;
  #lastTouch = Number.NEGATIVE_INFINITY;
  #lastCaptureRelease = Number.NEGATIVE_INFINITY;
  #press: { readonly time: number; readonly pointerId: number } | undefined;
  #lockedPublished = false;
  #silent = false;
  #disposed = false;

  constructor(options: ActivityOwnerOptions = {}) {
    this.#options = options;
    this.#leases = new ReasonLeases<ActivityLeaseReason>({
      onChange: ({ held }) => {
        if (this.#silent || held === this.#lockedPublished) return;
        this.#lockedPublished = held;
        if (held) {
          this.#clearIdle();
          this.#publish('programmatic');
        } else {
          // The last lease restarts the full idle window.
          this.#markActive('programmatic', undefined, true);
        }
      },
    });
  }

  get userActive(): boolean {
    return this.#userActive;
  }

  get locked(): boolean {
    return this.#leases.active;
  }

  get state(): ActivityState {
    return { userActive: this.#userActive, locked: this.#leases.active };
  }

  /** Held lease reasons. */
  get reasons(): readonly ActivityLeaseReason[] {
    return this.#leases.reasons;
  }

  get surface(): HTMLElement | null {
    return this.#surface;
  }

  /** The configured idle delay in milliseconds (`≤ 0` disables hiding). */
  get idleDelay(): number {
    const value = this.#options.idleDelay?.();
    return value === undefined || Number.isNaN(value) ? DEFAULT_IDLE_DELAY : value;
  }

  /** Observes `surface` (the container). Replaces any previous surface; leases are kept. */
  attach(surface: HTMLElement): void {
    if (this.#disposed) return;
    if (surface === this.#surface) return;
    this.#detachListeners();
    this.#surface = surface;
    const scope = (this.#scope = new CleanupScope());
    this.#scheduler = new Scheduler(surface.ownerDocument?.defaultView ?? undefined);
    scope.listen(surface, 'pointermove', (event) => this.#pointerMove(event));
    scope.listen(surface, 'pointerdown', (event) => this.#pointerDown(event));
    scope.listen(surface, 'pointerup', (event) => this.#pointerUp(event));
    scope.listen(surface, 'pointercancel', () => (this.#press = undefined));
    scope.listen(surface, 'lostpointercapture', () => (this.#lastCaptureRelease = this.#now()));
    scope.listen(surface, 'keydown', (event) => this.#markActive('keyboard', event));
    scope.listen(surface, 'keyup', (event) => this.#markActive('keyboard', event));
    scope.listen(surface, 'focusin', (event) => {
      if (this.#recentTouch()) return;
      this.#markActive('focus', event);
    });
    scope.listen(surface, 'mouseleave', (event) => this.#mouseLeave(event));
    this.#scheduleIdle();
  }

  /** Stops observing the surface. Leases survive (a re-attach keeps them). */
  detach(): void {
    this.#detachListeners();
    this.#surface = null;
  }

  /**
   * Acquires a visibility lease and returns its idempotent release. Releasing one reason never
   * clears another; releasing the last lease restarts the full idle delay.
   */
  requestLock(reason: ActivityLeaseReason = 'lock'): () => void {
    if (this.#disposed) return () => undefined;
    return this.#leases.acquire(reason);
  }

  /**
   * Holds a `focus` lease while focus is inside `element` (a focused control never disappears).
   * Returns the cleanup that removes the listeners and releases the lease.
   */
  trackFocusWithin(element: HTMLElement): () => void {
    let release: (() => void) | undefined;
    const scope = new CleanupScope();
    scope.listen(element, 'focusin', () => {
      release ??= this.requestLock('focus');
    });
    scope.listen(element, 'focusout', (event) => {
      const next = event.relatedTarget as Node | null;
      if (next && containsComposed(element, next)) return;
      release?.();
      release = undefined;
    });
    scope.add(() => {
      release?.();
      release = undefined;
    });
    return () => scope.dispose();
  }

  /**
   * Holds a `hover` lease while a mouse or pen pointer is over `element` (the controls region,
   * unless the host opts out). Touch never holds it.
   */
  trackHover(element: HTMLElement): () => void {
    let release: (() => void) | undefined;
    const scope = new CleanupScope();
    scope.listen(element, 'pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      release ??= this.requestLock('hover');
    });
    scope.listen(element, 'pointerleave', () => {
      release?.();
      release = undefined;
    });
    scope.add(() => {
      release?.();
      release = undefined;
    });
    return () => scope.dispose();
  }

  /**
   * Shows (`force` true), hides (`false`) or toggles visibility (`toggle-controls`). Hiding while a
   * lease is held only clears `userActive`; leases still keep controls visible. Returns the
   * resulting activity.
   */
  toggle(force?: boolean, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    const show = force ?? !(this.#options.visible?.() ?? this.#userActive);
    if (show) this.#markActive(reason, sourceEvent, true);
    else this.#markInactive(reason, sourceEvent, true);
    return this.#userActive;
  }

  /** Restarts the idle delay without changing activity (for example, when playback starts). */
  restart(): void {
    if (this.#userActive) this.#scheduleIdle();
  }

  /** Releases every lease and resets activity to `true` without publishing. */
  reset(): void {
    this.#clearIdle();
    this.#userActive = true;
    this.#silent = true;
    try {
      this.#leases.clear();
    } finally {
      this.#silent = false;
    }
    this.#lockedPublished = false;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#detachListeners();
    this.#disposed = true;
    this.#silent = true;
    this.#leases.clear();
    this.#surface = null;
  }

  #detachListeners(): void {
    this.#clearIdle();
    this.#press = undefined;
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
  }

  #now(): number {
    if (this.#options.now) return this.#options.now();
    const performance = this.#surface?.ownerDocument?.defaultView?.performance;
    return performance ? performance.now() : Date.now();
  }

  #recentTouch(): boolean {
    return this.#now() - this.#lastTouch < TOUCH_SETTLE_DELAY;
  }

  #publish(reason: ChangeReason, sourceEvent?: Event): void {
    if (this.#disposed) return;
    this.#options.onChange?.({
      userActive: this.#userActive,
      locked: this.#leases.active,
      reason,
      ...(sourceEvent ? { sourceEvent } : {}),
    });
  }

  #clearIdle(): void {
    this.#idle?.();
    this.#idle = undefined;
  }

  #scheduleIdle(): void {
    this.#clearIdle();
    const delay = this.idleDelay;
    if (this.#leases.active || delay <= 0 || !this.#scheduler) return;
    this.#idle = this.#scheduler.timeout(() => {
      this.#idle = undefined;
      this.#markInactive('idle');
    }, delay);
  }

  #markActive(reason: ChangeReason, sourceEvent?: Event, forcePublish = false): void {
    const changed = !this.#userActive;
    this.#userActive = true;
    this.#scheduleIdle();
    if (changed || forcePublish) this.#publish(reason, sourceEvent);
  }

  #markInactive(reason: ChangeReason, sourceEvent?: Event, explicit = false): void {
    this.#clearIdle();
    // An idle delay of zero or less disables hiding; an explicit toggle still applies.
    if (!explicit && this.idleDelay <= 0) return;
    if (!this.#userActive) return;
    this.#userActive = false;
    this.#publish(reason, sourceEvent);
  }

  #pointerMove(event: PointerEvent): void {
    if (event.pointerType === 'touch') {
      // Touch movement only keeps the idle delay alive; it never flips visibility mid-gesture.
      if (this.#userActive) this.#scheduleIdle();
      return;
    }
    this.#markActive('pointer', event);
  }

  #pointerDown(event: PointerEvent): void {
    this.#press = { time: this.#now(), pointerId: event.pointerId };
    if (event.pointerType !== 'touch') {
      this.#markActive('pointer', event);
      return;
    }
    // A touch press activates on release: activating here would let a deferred tap toggle (a
    // gesture waiting for the double-tap window) read the flashed state and invert it.
    this.#lastTouch = this.#now();
  }

  #pointerUp(event: PointerEvent): void {
    const press = this.#press;
    this.#press = undefined;
    if (event.pointerType !== 'touch') {
      this.#markActive('pointer', event);
      return;
    }
    this.#lastTouch = this.#now();
    const surface = this.#surface;
    const tap =
      press !== undefined &&
      press.pointerId === event.pointerId &&
      this.#now() - press.time <= ACTIVITY_TAP_THRESHOLD;
    if (!tap || !surface) {
      this.#markActive('pointer', event);
      return;
    }
    // A claimed tap belongs to the gesture layer, which owns the toggle.
    if (this.#options.claimsTap?.(event)) return;
    if (interactiveTargetInPath(event, surface)) {
      // Tapping a control keeps the surface active.
      this.#markActive('pointer', event);
      return;
    }
    if (this.#options.visible?.() ?? this.#userActive) this.#markInactive('pointer', event, true);
    else this.#markActive('pointer', event, true);
  }

  #mouseLeave(event: Event): void {
    if (this.#recentTouch()) return;
    const surface = this.#surface;
    if (
      surface &&
      this.#now() - this.#lastCaptureRelease < CAPTURE_RELEASE_DELAY &&
      typeof (event as MouseEvent).clientX === 'number' &&
      pointInside(surface, event as MouseEvent)
    )
      return;
    this.#markInactive('pointer', event);
  }
}

/** `contains` across shadow boundaries (following hosts of shadow roots). */
function containsComposed(ancestor: Node, node: Node): boolean {
  for (let current: Node | null = node; current;) {
    if (current === ancestor) return true;
    const parent: Node | null = current.parentNode;
    current = parent ?? ((current as ShadowRoot).host as Node | undefined) ?? null;
  }
  return false;
}
