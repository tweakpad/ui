import { interactiveTargetInPath } from './interactive-target.js';
import { CleanupScope, Scheduler } from './services.js';

/** Foundation tap gesture regions (`sec-1921-tap-gesture-regions`). */
export type TapGestureType = 'tap' | 'doubletap';
export type TapGesturePointer = 'mouse' | 'touch' | 'pen';
/** Physical horizontal regions of the surface; they do not mirror in right-to-left text. */
export type TapGestureRegion = 'left' | 'center' | 'right';

/** Maximum press duration, in milliseconds, for a tap. */
export const TAP_GESTURE_THRESHOLD = 250;
/** Window, in milliseconds, in which a second tap forms a double tap. */
export const DOUBLE_TAP_WINDOW = 200;

export interface TapGestureActivation {
  /** The pointer-up event that completed the gesture. */
  readonly event: PointerEvent;
  readonly type: TapGestureType;
  /** The matched region, or `null` for a whole-surface binding. */
  readonly region: TapGestureRegion | null;
  readonly pointerType: string;
  /** The opaque action tag supplied with the binding. */
  readonly action: string | undefined;
  readonly reason: 'gesture';
}

export interface TapGestureBinding {
  readonly type: TapGestureType;
  /** Restricts the binding to one pointer type. Absent matches every pointer type. */
  readonly pointer?: TapGesturePointer;
  /** Restricts the binding to one region. Absent binds the whole surface. */
  readonly region?: TapGestureRegion;
  /** Opaque tag reported to the handler and matched by `claimsTap`. */
  readonly action?: string;
  /**
   * Disables the binding while true. A disabled binding still claims its taps;
   * disabling opts out of the action rather than handing the tap to another owner.
   */
  readonly disabled?: boolean | (() => boolean);
  readonly handler: (activation: TapGestureActivation) => void;
}

export interface TapGestureOptions {
  /** Suppresses recognition while true (for example, an interaction-locked player). */
  readonly locked?: () => boolean;
  /** Receives handler failures. Defaults to `console.error`. */
  readonly onError?: (error: unknown) => void;
}

interface Press {
  readonly pointerId: number;
  readonly time: number;
}

interface PendingTap {
  readonly event: PointerEvent;
  readonly pointerType: string;
  readonly clientX: number;
  readonly time: number;
  readonly cancel: () => void;
}

const disabled = (binding: TapGestureBinding) =>
  typeof binding.disabled === 'function' ? binding.disabled() : binding.disabled === true;

const applies = (binding: TapGestureBinding, type: TapGestureType, pointerType: string) =>
  binding.type === type && (!binding.pointer || binding.pointer === pointerType);

/**
 * Resolves the region under a horizontal position for the set of active regions.
 *
 * `left` + `right` split the surface into halves; all three regions split it into
 * thirds; `center` alone covers the whole surface. A lone `left` or `right` covers
 * its half. Other partial sets use the same natural zones, and a position outside
 * every active zone resolves to `null` so a whole-surface binding can handle it.
 */
export function resolveTapRegion(
  clientX: number,
  rect: Pick<DOMRectReadOnly, 'left' | 'width'>,
  active: ReadonlySet<TapGestureRegion>,
): TapGestureRegion | null {
  if (!active.size || !(rect.width > 0)) return null;
  const ratio = (clientX - rect.left) / rect.width;
  if (active.size === 3) return ratio < 1 / 3 ? 'left' : ratio < 2 / 3 ? 'center' : 'right';
  if (active.size === 2 && active.has('left') && active.has('right'))
    return ratio < 0.5 ? 'left' : 'right';
  if (active.has('left') && ratio < 0.5) return 'left';
  if (active.has('right') && ratio >= 0.5) return 'right';
  if (active.has('center') && (active.size === 1 || (ratio >= 1 / 3 && ratio < 2 / 3)))
    return 'center';
  return null;
}

/**
 * Recognizes primary-button taps and double taps on a non-interactive surface and
 * routes them to region bindings. A tap is a press of at most 250 ms that starts and
 * ends outside interactive descendants. While any enabled double-tap binding applies
 * to the pointer type, a single tap waits for the 200 ms double-tap window. Bindings
 * are resolved when the gesture fires, and a region match beats a whole-surface match.
 *
 * Listeners attach while at least one binding exists. Timers use the surface's owner
 * window. Swipe and drag gestures are owned elsewhere.
 */
export class TapGestureRecognizer {
  readonly #surface: HTMLElement;
  readonly #options: TapGestureOptions;
  readonly #bindings: TapGestureBinding[] = [];
  #listeners: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #press: Press | undefined;
  #pending: PendingTap | undefined;
  #disposed = false;

  constructor(surface: HTMLElement, options: TapGestureOptions = {}) {
    this.#surface = surface;
    this.#options = options;
  }

  get surface(): HTMLElement {
    return this.#surface;
  }

  get bindings(): readonly TapGestureBinding[] {
    return this.#bindings;
  }

  /** Registers a binding and returns its idempotent removal. */
  add(binding: TapGestureBinding): () => void {
    if (this.#disposed) return () => undefined;
    // Copy so the same descriptor can be registered twice and removed independently.
    const entry = { ...binding };
    this.#bindings.push(entry);
    this.#connect();
    let removed = false;
    return () => {
      if (removed) return;
      removed = true;
      const index = this.#bindings.indexOf(entry);
      if (index >= 0) this.#bindings.splice(index, 1);
      if (!this.#bindings.length) this.#disconnect();
    };
  }

  /**
   * Whether this recognizer owns a pointer-up on the surface, so an activity owner
   * leaves it alone. Locked surfaces claim every tap; interactive targets are never
   * claimed. Otherwise a tap is claimed when a tap binding (enabled or disabled)
   * applies to its pointer type and, when given, carries `action`.
   */
  claimsTap(event: PointerEvent, action?: string): boolean {
    if (this.#locked()) return true;
    if (interactiveTargetInPath(event, this.#surface)) return false;
    return this.#bindings.some(
      (binding) =>
        applies(binding, 'tap', event.pointerType) &&
        (action === undefined || binding.action === action),
    );
  }

  /** Cancels an in-progress press and any single tap waiting for the double-tap window. */
  reset(): void {
    this.#press = undefined;
    this.#pending?.cancel();
    this.#pending = undefined;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#bindings.length = 0;
    this.#disconnect();
  }

  #locked(): boolean {
    return this.#options.locked?.() === true;
  }

  #window(): Window | undefined {
    return this.#surface.ownerDocument?.defaultView ?? undefined;
  }

  #now(): number {
    const performance = this.#window()?.performance;
    return performance ? performance.now() : Date.now();
  }

  #connect(): void {
    if (this.#listeners) return;
    const scope = (this.#listeners = new CleanupScope());
    this.#scheduler = new Scheduler(this.#window());
    scope.listen(this.#surface, 'pointerdown', (event) => this.#down(event));
    scope.listen(this.#surface, 'pointerup', (event) => this.#up(event));
    scope.listen(this.#surface, 'pointercancel', (event) => {
      if (this.#press?.pointerId === event.pointerId) this.#press = undefined;
    });
  }

  #disconnect(): void {
    this.reset();
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
    this.#listeners?.dispose();
    this.#listeners = undefined;
  }

  #down(event: PointerEvent): void {
    const previous = this.#press;
    // A second concurrent pointer (pinch, multi-touch) cancels the tap. A press whose
    // release happened outside the surface is stale and is simply replaced.
    if (
      previous &&
      previous.pointerId !== event.pointerId &&
      this.#now() - previous.time <= TAP_GESTURE_THRESHOLD
    ) {
      this.#press = undefined;
      return;
    }
    this.#press = undefined;
    if (event.button !== 0 || event.isPrimary === false || this.#locked()) return;
    if (interactiveTargetInPath(event, this.#surface)) return;
    this.#press = { pointerId: event.pointerId, time: this.#now() };
  }

  #up(event: PointerEvent): void {
    const press = this.#press;
    if (!press || press.pointerId !== event.pointerId) return;
    this.#press = undefined;
    if (event.button !== 0 || this.#locked()) return;
    const time = this.#now();
    if (time - press.time > TAP_GESTURE_THRESHOLD) return;
    if (interactiveTargetInPath(event, this.#surface)) return;
    this.#tap(event, time);
  }

  #tap(event: PointerEvent, time: number): void {
    const pointerType = event.pointerType;
    const clientX = event.clientX;
    const waits = this.#bindings.some(
      (binding) => applies(binding, 'doubletap', pointerType) && !disabled(binding),
    );
    const pending = this.#pending;
    if (pending && pending.pointerType === pointerType && time - pending.time < DOUBLE_TAP_WINDOW) {
      const match = this.#match('doubletap', pointerType, clientX);
      if (match) {
        pending.cancel();
        this.#pending = undefined;
        this.#fire(match.binding, event, 'doubletap', match.region);
        return;
      }
    }
    // A waiting tap that did not become a double tap is resolved now, before the next one.
    if (pending) this.#flushPending();
    if (!waits) {
      this.#resolveAndFire(event, 'tap', pointerType, clientX);
      return;
    }
    const cancel = this.#scheduler!.timeout(() => {
      if (this.#pending?.event !== event) return;
      this.#pending = undefined;
      this.#resolveAndFire(event, 'tap', pointerType, clientX);
    }, DOUBLE_TAP_WINDOW);
    this.#pending = { event, pointerType, clientX, time, cancel };
  }

  #flushPending(): void {
    const pending = this.#pending;
    if (!pending) return;
    this.#pending = undefined;
    pending.cancel();
    this.#resolveAndFire(pending.event, 'tap', pending.pointerType, pending.clientX);
  }

  #resolveAndFire(
    event: PointerEvent,
    type: TapGestureType,
    pointerType: string,
    clientX: number,
  ): void {
    if (this.#locked()) return;
    const match = this.#match(type, pointerType, clientX);
    if (match) this.#fire(match.binding, event, type, match.region);
  }

  /** Resolves the first enabled binding for the type, pointer and position. */
  #match(
    type: TapGestureType,
    pointerType: string,
    clientX: number,
  ): { binding: TapGestureBinding; region: TapGestureRegion | null } | undefined {
    const candidates = this.#bindings.filter(
      (binding) => applies(binding, type, pointerType) && !disabled(binding),
    );
    if (!candidates.length) return undefined;
    const active = new Set<TapGestureRegion>();
    for (const binding of candidates) if (binding.region) active.add(binding.region);
    const region = active.size
      ? resolveTapRegion(clientX, this.#surface.getBoundingClientRect(), active)
      : null;
    const binding = candidates.find((candidate) =>
      region ? candidate.region === region : !candidate.region,
    );
    return binding ? { binding, region } : undefined;
  }

  #fire(
    binding: TapGestureBinding,
    event: PointerEvent,
    type: TapGestureType,
    region: TapGestureRegion | null,
  ): void {
    try {
      binding.handler({
        event,
        type,
        region,
        pointerType: event.pointerType,
        action: binding.action,
        reason: 'gesture',
      });
    } catch (error) {
      (this.#options.onError ?? ((failure) => console.error(failure)))(error);
    }
  }
}
