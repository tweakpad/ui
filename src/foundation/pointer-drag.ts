import { componentHandlingPrevented } from './part.js';
import { CleanupScope, Scheduler } from './services.js';

/**
 * Pointer-capture drag for two-dimensional and radial input surfaces (Widgets
 * Specification §5.2): the press captures the pointer, movement is coalesced to one
 * callback per animation frame, release ends the gesture once, and Escape, pointer
 * cancellation, lost capture or disposal abandon it so the owner restores its
 * pre-press value. One-dimensional Slider thumbs keep their own drag because thumb
 * selection and collision belong to the Slider contract.
 */
export interface PointerDragModifiers {
  readonly shift: boolean;
  readonly alt: boolean;
  readonly ctrl: boolean;
  readonly meta: boolean;
}

/** A pointer position relative to the surface box, in CSS pixels. */
export interface PointerDragPoint {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly modifiers: PointerDragModifiers;
}

export type PointerDragCancelReason = 'escape' | 'pointer' | 'disposed';

export interface PointerDragHandlers {
  /** Runs on press. Returning false leaves the press to other handlers of the surface. */
  begin?(point: PointerDragPoint, event: PointerEvent): boolean | undefined;
  /** Runs at most once per animation frame while the pointer is captured. */
  move(point: PointerDragPoint, event: PointerEvent): void;
  /** Runs on release; `dragged` tells whether movement exceeded the threshold. */
  end(point: PointerDragPoint, event: PointerEvent, dragged: boolean): void;
  /** Runs when the gesture is abandoned; the owner restores its pre-press value. */
  cancel(reason: PointerDragCancelReason, event: Event | null): void;
}

export interface PointerDragOptions {
  readonly element: HTMLElement;
  readonly handlers: PointerDragHandlers;
  /** Owner window for the Escape listener and frame scheduling; defaults to the element's view. */
  readonly owner?: Window | null;
  /** Returns true while presses must be ignored. */
  readonly disabled?: () => boolean;
  /** Movement in CSS pixels before a press counts as a drag. */
  readonly threshold?: number;
  /** Element to focus on press, so keyboard editing continues from the pointer gesture. */
  readonly focusTarget?: () => HTMLElement | null | undefined;
}

interface DragSession {
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly scope: CleanupScope;
  dragging: boolean;
  latest: PointerEvent;
  frame: (() => void) | undefined;
}

const DEFAULT_THRESHOLD = 2;

export class PointerDrag {
  readonly #options: PointerDragOptions;
  #connection: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #session: DragSession | null = null;

  constructor(options: PointerDragOptions) {
    this.#options = options;
  }

  get #owner(): Window | undefined {
    return this.#options.owner ?? this.#options.element.ownerDocument?.defaultView ?? undefined;
  }

  /** True between press and release or cancellation. */
  get active(): boolean {
    return this.#session !== null;
  }

  /** True once movement exceeded the threshold. */
  get dragging(): boolean {
    return this.#session?.dragging ?? false;
  }

  connect(): void {
    if (this.#connection) return;
    this.#connection = new CleanupScope();
    this.#scheduler = new Scheduler(this.#owner);
    this.#connection.add(() => this.#scheduler?.dispose());
    this.#connection.listen(this.#options.element, 'pointerdown', this.#pointerDown);
  }

  disconnect(): void {
    this.cancel('disposed', null);
    this.#connection?.dispose();
    this.#connection = undefined;
    this.#scheduler = undefined;
  }

  /** Abandons the current gesture, if any, and reports it to the owner. */
  cancel(reason: PointerDragCancelReason = 'disposed', event: Event | null = null): void {
    const session = this.#session;
    if (!session) return;
    this.#session = null;
    session.scope.dispose();
    this.#releaseCapture(session.pointerId);
    this.#options.handlers.cancel(reason, event);
  }

  #point(event: PointerEvent): PointerDragPoint {
    const rect = this.#options.element.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      modifiers: {
        shift: event.shiftKey,
        alt: event.altKey,
        ctrl: event.ctrlKey,
        meta: event.metaKey,
      },
    };
  }

  #releaseCapture(pointerId: number): void {
    const element = this.#options.element;
    try {
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    } catch {
      // The pointer may already be gone; nothing to release.
    }
  }

  #pointerDown = (event: PointerEvent): void => {
    if (
      event.button !== 0 ||
      this.#session ||
      this.#options.disabled?.() ||
      componentHandlingPrevented(event)
    )
      return;
    const point = this.#point(event);
    if (this.#options.handlers.begin?.(point, event) === false) return;
    event.preventDefault();
    const element = this.#options.element;
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Capture is unavailable for synthetic pointers; the gesture still runs on the element.
    }
    this.#options.focusTarget?.()?.focus({ preventScroll: true });
    const scope = new CleanupScope();
    const session: DragSession = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      scope,
      dragging: false,
      latest: event,
      frame: undefined,
    };
    this.#session = session;
    scope.add(() => session.frame?.());
    scope.listen(element, 'pointermove', this.#pointerMove);
    scope.listen(element, 'pointerup', this.#pointerUp);
    scope.listen(element, 'pointercancel', this.#pointerCancel);
    scope.listen(element, 'lostpointercapture', this.#pointerCancel);
    const owner = this.#owner;
    if (owner) scope.listen(owner, 'keydown', this.#keyDown, { capture: true });
  };

  #pointerMove = (event: PointerEvent): void => {
    const session = this.#session;
    if (!session || event.pointerId !== session.pointerId) return;
    session.latest = event;
    if (
      !session.dragging &&
      Math.hypot(event.clientX - session.startX, event.clientY - session.startY) >=
        (this.#options.threshold ?? DEFAULT_THRESHOLD)
    )
      session.dragging = true;
    if (session.frame || !this.#scheduler) return;
    session.frame = this.#scheduler.animationFrame(() => {
      session.frame = undefined;
      if (this.#session !== session) return;
      this.#options.handlers.move(this.#point(session.latest), session.latest);
    });
  };

  #pointerUp = (event: PointerEvent): void => {
    const session = this.#session;
    if (!session || event.pointerId !== session.pointerId) return;
    this.#session = null;
    session.scope.dispose();
    this.#releaseCapture(session.pointerId);
    this.#options.handlers.end(this.#point(event), event, session.dragging);
  };

  #pointerCancel = (event: PointerEvent): void => {
    if (event.pointerId === this.#session?.pointerId) this.cancel('pointer', event);
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this.#session) return;
    event.preventDefault();
    event.stopPropagation();
    this.cancel('escape', event);
  };
}
