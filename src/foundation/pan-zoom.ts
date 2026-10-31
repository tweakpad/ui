import { frameLoopFor } from './frame-loop.js';
import { kbdPlatform } from './key-notation.js';
import { resolveMotionTiming } from './motion.js';
import { parseEasing } from './motion-easing.js';
import { componentHandlingPrevented } from './part.js';
import { CleanupScope, Scheduler } from './services.js';

/**
 * Pan and zoom owner for canvas surfaces (Flow, future graph editors) on raw pointer and wheel
 * events. `PointerDrag` has the wrong semantics for a camera: it is single-pointer, primary
 * button only and Escape restores the pre-press value. A camera gesture instead admits the
 * buttons its policy allows, folds a second pointer into a pinch, settles where the last
 * movement left it when the capture is lost, and never restores on Escape.
 *
 * The owner keeps no viewport of its own: it reads the model through `viewport()` and reports
 * every computed viewport through `handlers.move`, clamped to the zoom range and the translate
 * extent. Pointer movement is coalesced to one `move` per animation
 * frame; wheel movement applies per event (the browser already paces wheels per frame) with a
 * synthesized start and a 150 ms debounced end. Programmatic steps
 * (`panBy`, `zoomAround`, `animateTo`, `autoPan`) go through the same clamp and handler.
 *
 * Wheels latch like the browser's own wheel scrolling: the first wheel of a stream decides
 * whether the surface or the content under the pointer owns it (the filter, a content handler
 * that prevented the default, the policy), and every later wheel of the stream goes to the same
 * owner. A surface-owned stream is taken in the capture phase, so content that the pan slides
 * under a stationary pointer never interrupts it. A stream ends when wheels pause for
 * `WHEEL_LATCH_TIMEOUT`, the pointer leaves the first wheel's slop region, or the zoom modifier
 * changes (a pinch after a scroll is a new gesture).
 *
 * Surfaces that pan on touch need `touch-action: none`; a handled press prevents the default
 * action (text selection, compatibility mouse events) so focus belongs to `handlers.start`.
 * Keyboard panning is not handled here.
 */
export interface PanZoomViewport {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export interface PanZoomPoint {
  readonly x: number;
  readonly y: number;
}

export interface PanZoomSize {
  readonly width: number;
  readonly height: number;
}

/** A flow-space rectangle the viewport may not leave: `[[minX, minY], [maxX, maxY]]`. */
export type PanZoomExtent = readonly [readonly [number, number], readonly [number, number]];

export interface PanZoomLimits {
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly translateExtent?: PanZoomExtent;
}

export interface PanZoomPolicy {
  /** Mouse and pen buttons that start a pan (`0` primary, `1` auxiliary, `2` secondary). */
  readonly panButtons: readonly number[];
  /** What an unmodified wheel does; `ctrl`/`meta` wheels (trackpad pinch) always zoom. */
  readonly wheel: 'pan' | 'zoom' | 'none';
  /** Whether a second pointer pinches and `ctrl`/`meta` wheels zoom. */
  readonly pinch: boolean;
  readonly doubleClickZoom: boolean;
  /** Plain wheels scroll the page; only modified wheels reach the surface. */
  readonly cooperative: boolean;
  /** The pan activation key (Space) is held: any button pans. */
  readonly activationHeld: boolean;
  /** Whether a single touch pans. */
  readonly panOnTouch: boolean;
}

export type PanZoomReason = 'drag' | 'wheel' | 'gesture' | 'programmatic';

export interface PanZoomHandlers {
  /** A pointer, wheel or double-click gesture began. */
  start?(reason: PanZoomReason, event: Event): void;
  /** A clamped viewport to apply; `event` is null for programmatic and frame-driven steps. */
  move(viewport: PanZoomViewport, reason: PanZoomReason, event: Event | null): void;
  /** The gesture settled; the model holds the last reported viewport. */
  end?(reason: PanZoomReason, event: Event | null): void;
  /** The pointer gesture was abandoned (`pointercancel`, disposal). */
  cancel?(): void;
}

export interface PanZoomFrameSubscription {
  wake(): void;
  release(): void;
}

export interface PanZoomFrameLoop {
  subscribe(callback: (elapsed: number, now: number) => boolean): PanZoomFrameSubscription;
}

export interface PanZoomOptions {
  readonly element: HTMLElement;
  /**
   * The element whose wheels the owner reads, defaulting to `element`. A surface whose content
   * is a sibling of the pane (a transformed node layer) passes their common container, so wheels
   * over the content reach the latch; pointer gestures still start on `element` only.
   */
  readonly wheelElement?: HTMLElement;
  /** Owner window for timers and frames; defaults to the element's view. */
  readonly owner?: Window | null;
  /** The current viewport (read model). */
  readonly viewport: () => PanZoomViewport;
  readonly limits: () => PanZoomLimits;
  readonly policy: () => PanZoomPolicy;
  /** Returning false leaves the event alone (presses on nodes, ports, panels, interactive targets). */
  readonly filter?: (event: PointerEvent | WheelEvent | MouseEvent) => boolean;
  readonly handlers: PanZoomHandlers;
  /** Frame source for animations and auto-pan; defaults to the owner window's shared loop. */
  readonly frameLoop?: PanZoomFrameLoop;
  /**
   * The element's size in CSS pixels when the owner already tracks it (resize observer); it
   * spares a forced layout per clamp. Defaults to the element's bounding rect.
   */
  readonly size?: () => PanZoomSize;
}

export interface PanZoomAnimationOptions {
  /** Milliseconds; `0` applies the target at once. */
  readonly duration?: number;
  readonly easing?: (t: number) => number;
}

/** Debounce after the last wheel event before the wheel gesture ends. */
export const WHEEL_SETTLE_DELAY = 150;
/**
 * Pause after which the next wheel starts a new stream with a new owner (Chrome's mouse-wheel
 * latching transaction).
 */
export const WHEEL_LATCH_TIMEOUT = 500;
/** Pointer travel from the stream's first wheel, in CSS pixels, that ends the latch (Chrome). */
export const WHEEL_LATCH_SLOP = 10;
/** Distance from the element edge, in CSS pixels, within which `autoPan` moves. */
export const AUTO_PAN_EDGE = 40;
/** Auto-pan speed at the edge, in CSS pixels per frame. */
export const AUTO_PAN_SPEED = 15;
/** Zoom factor of a double click. */
export const DOUBLE_CLICK_ZOOM_FACTOR = 1.2;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/**
 * The zoom multiplier of a wheel event: line and page deltas count more
 * than pixel deltas, and a macOS trackpad pinch (a `ctrl` wheel) counts ten times more.
 */
export function wheelZoomFactor(
  deltaY: number,
  deltaMode: number,
  options: { pinch?: boolean; mac?: boolean } = {},
): number {
  const scale = deltaMode === 1 ? 0.05 : deltaMode === 2 ? 1 : 0.002;
  return 2 ** (-deltaY * scale * (options.pinch && options.mac ? 10 : 1));
}

/**
 * Clamps the zoom to the limits and shifts the translation so the visible area, `size` at the
 * element origin, stays inside the translate extent: an extent smaller
 * than the view is centered, otherwise the view is pushed back inside.
 */
export function clampViewport(
  viewport: PanZoomViewport,
  limits: PanZoomLimits,
  size: PanZoomSize,
): PanZoomViewport {
  const zoom = clamp(viewport.zoom, limits.minZoom, limits.maxZoom);
  let { x, y } = viewport;
  const extent = limits.translateExtent;
  if (extent && zoom > 0) {
    const dx0 = -x / zoom - extent[0][0];
    const dx1 = (size.width - x) / zoom - extent[1][0];
    const dy0 = -y / zoom - extent[0][1];
    const dy1 = (size.height - y) / zoom - extent[1][1];
    x += zoom * (dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1));
    y += zoom * (dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1));
  }
  return { x, y, zoom };
}

/** The viewport at `zoom` (clamped) that keeps the flow point under `screenPoint` where it is. */
export function zoomToPoint(
  viewport: PanZoomViewport,
  zoom: number,
  screenPoint: PanZoomPoint,
  limits: PanZoomLimits,
): PanZoomViewport {
  const next = clamp(zoom, limits.minZoom, limits.maxZoom);
  const flowX = (screenPoint.x - viewport.x) / viewport.zoom;
  const flowY = (screenPoint.y - viewport.y) / viewport.zoom;
  return { x: screenPoint.x - flowX * next, y: screenPoint.y - flowY * next, zoom: next };
}

/** Auto-pan velocity along one axis: ramps from 1/40 to full speed. */
function autoPanVelocity(value: number, size: number): number {
  const min = AUTO_PAN_EDGE;
  const max = size - AUTO_PAN_EDGE;
  if (value < min) return (clamp(Math.abs(value - min), 1, min) / min) * AUTO_PAN_SPEED;
  if (value > max) return (-clamp(Math.abs(value - max), 1, min) / min) * AUTO_PAN_SPEED;
  return 0;
}

interface PointerGesture {
  readonly scope: CleanupScope;
  /** Element-relative positions of the pointers in the gesture. */
  readonly pointers: Map<number, PanZoomPoint>;
  /** The viewport and pointer geometry the current phase (single pointer or pinch) measures from. */
  base: PanZoomViewport;
  baseCenter: PanZoomPoint;
  baseDistance: number;
  /** The last viewport reported for this gesture. */
  current: PanZoomViewport;
  latest: Event;
  frame: (() => void) | undefined;
  /** Pointer movement since the last reported viewport. */
  moved: boolean;
}

interface WheelGesture {
  settle: () => void;
}

/** The owner of the current wheel stream. */
interface WheelLatch {
  readonly owner: 'surface' | 'content';
  readonly x: number;
  readonly y: number;
  readonly zoom: boolean;
  release: () => void;
}

interface Animation {
  readonly from: PanZoomViewport;
  readonly to: PanZoomViewport;
  readonly duration: number;
  readonly easing: (t: number) => number;
  readonly resolve: (settled: boolean) => void;
  elapsed: number;
}

export class PanZoomController {
  readonly #options: PanZoomOptions;
  #connection: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #gesture: PointerGesture | null = null;
  #wheel: WheelGesture | null = null;
  #latch: WheelLatch | null = null;
  #animation: Animation | null = null;
  #animationFrames: PanZoomFrameSubscription | undefined;
  #autoPanPoint: PanZoomPoint | null = null;
  #autoPanFrames: PanZoomFrameSubscription | undefined;
  readonly #mac: boolean;

  constructor(options: PanZoomOptions) {
    this.#options = options;
    this.#mac = kbdPlatform('auto', this.#owner?.navigator) === 'mac';
  }

  get #owner(): Window | undefined {
    return this.#options.owner ?? this.#options.element.ownerDocument?.defaultView ?? undefined;
  }

  /** True while a pointer or wheel gesture is in progress. */
  get active(): boolean {
    return this.#gesture !== null || this.#wheel !== null;
  }

  /** True while two pointers scale the view. */
  get pinching(): boolean {
    return (this.#gesture?.pointers.size ?? 0) >= 2;
  }

  connect(): void {
    if (this.#connection) return;
    const scope = (this.#connection = new CleanupScope());
    this.#scheduler = new Scheduler(this.#owner);
    scope.add(() => this.#scheduler?.dispose());
    const element = this.#options.element;
    scope.listen(element, 'pointerdown', this.#pointerDown);
    const wheelElement = this.#options.wheelElement ?? element;
    scope.listen(wheelElement, 'wheel', this.#latchedWheel, { passive: false, capture: true });
    scope.listen(wheelElement, 'wheel', this.#wheelEvent, { passive: false });
    scope.listen(element, 'dblclick', this.#doubleClick);
  }

  disconnect(): void {
    this.#cancelGesture();
    this.#settleWheel(null);
    this.#releaseLatch();
    this.cancelAnimation();
    this.stopAutoPan();
    this.#animationFrames?.release();
    this.#animationFrames = undefined;
    this.#autoPanFrames?.release();
    this.#autoPanFrames = undefined;
    this.#connection?.dispose();
    this.#connection = undefined;
    this.#scheduler = undefined;
  }

  /** Shifts the viewport by a screen delta. */
  panBy(delta: PanZoomPoint, reason: PanZoomReason = 'programmatic'): void {
    const viewport = this.#options.viewport();
    this.#apply(
      { x: viewport.x + delta.x, y: viewport.y + delta.y, zoom: viewport.zoom },
      reason,
      null,
    );
  }

  /** Multiplies the zoom by `factor`, keeping the flow point under `screenPoint` fixed. */
  zoomAround(
    screenPoint: PanZoomPoint,
    factor: number,
    reason: PanZoomReason = 'programmatic',
  ): void {
    const viewport = this.#options.viewport();
    this.#apply(
      zoomToPoint(viewport, viewport.zoom * factor, screenPoint, this.#options.limits()),
      reason,
      null,
    );
  }

  /**
   * Tweens to `viewport` with one `move` per frame (reason `programmatic`). Resolves true once
   * settled and false when a gesture, another animation, `cancelAnimation` or disposal
   * interrupted it. The zoom interpolates geometrically and the view center moves straight
   * through flow space, so the path reads as one motion.
   */
  animateTo(viewport: PanZoomViewport, options: PanZoomAnimationOptions = {}): Promise<boolean> {
    this.cancelAnimation();
    const to = this.#clamp(viewport);
    // Unset timing follows the element's normal duration and standard easing (CL §5.3).
    const timing =
      options.duration === undefined || !options.easing
        ? resolveMotionTiming(this.#options.element)
        : undefined;
    const duration = options.duration ?? timing!.duration;
    const loop = this.#frameLoop();
    if (!(duration > 0) || !loop) {
      this.#apply(to, 'programmatic', null);
      return Promise.resolve(true);
    }
    return new Promise<boolean>((resolve) => {
      this.#animation = {
        from: this.#options.viewport(),
        to,
        duration,
        easing: options.easing ?? parseEasing(timing!.easing),
        resolve,
        elapsed: 0,
      };
      this.#animationFrames ??= loop.subscribe(this.#animationFrame);
      this.#animationFrames.wake();
    });
  }

  /** Stops a running animation where it is; its promise resolves false. */
  cancelAnimation(): void {
    const animation = this.#animation;
    if (!animation) return;
    this.#animation = null;
    animation.resolve(false);
  }

  /** The flow point under an element-relative screen point. */
  screenToFlow(point: PanZoomPoint): PanZoomPoint {
    const viewport = this.#options.viewport();
    return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
  }

  /** The element-relative screen point of a flow point. */
  flowToScreen(point: PanZoomPoint): PanZoomPoint {
    const viewport = this.#options.viewport();
    return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
  }

  /**
   * Pans each frame while `screenPoint` (element-relative, from a node drag or marquee) is
   * within 40 px of an edge; the speed ramps up to 15 px per frame at the edge. A point inside
   * the margin stops the auto-pan.
   */
  autoPan(screenPoint: PanZoomPoint): void {
    this.#autoPanPoint = screenPoint;
    const velocity = this.#autoPanVelocity();
    if (!velocity) {
      this.stopAutoPan();
      return;
    }
    const loop = this.#frameLoop();
    if (!loop) return;
    this.#autoPanFrames ??= loop.subscribe(this.#autoPanFrame);
    this.#autoPanFrames.wake();
  }

  stopAutoPan(): void {
    this.#autoPanPoint = null;
  }

  #frameLoop(): PanZoomFrameLoop | undefined {
    if (this.#options.frameLoop) return this.#options.frameLoop;
    const owner = this.#owner;
    return owner ? frameLoopFor(owner) : undefined;
  }

  #size(): PanZoomSize {
    const tracked = this.#options.size?.();
    if (tracked && (tracked.width > 0 || tracked.height > 0)) return tracked;
    const rect = this.#options.element.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  #relative(event: { clientX: number; clientY: number }): PanZoomPoint {
    const rect = this.#options.element.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  #clamp(viewport: PanZoomViewport): PanZoomViewport {
    return clampViewport(viewport, this.#options.limits(), this.#size());
  }

  #apply(viewport: PanZoomViewport, reason: PanZoomReason, event: Event | null): PanZoomViewport {
    const next = this.#clamp(viewport);
    this.#options.handlers.move(next, reason, event);
    return next;
  }

  #allowed(event: PointerEvent | WheelEvent | MouseEvent): boolean {
    return !componentHandlingPrevented(event) && this.#options.filter?.(event) !== false;
  }

  readonly #animationFrame = (elapsed: number): boolean => {
    const animation = this.#animation;
    if (!animation) return false;
    animation.elapsed += elapsed;
    const t = Math.min(1, animation.elapsed / animation.duration);
    if (t >= 1) {
      this.#animation = null;
      this.#apply(animation.to, 'programmatic', null);
      animation.resolve(true);
      return false;
    }
    this.#apply(this.#interpolate(animation, animation.easing(t)), 'programmatic', null);
    return true;
  };

  #interpolate(animation: Animation, t: number): PanZoomViewport {
    const { from, to } = animation;
    const { width, height } = this.#size();
    const centerX = width / 2;
    const centerY = height / 2;
    const zoom = from.zoom * (to.zoom / from.zoom) ** t;
    const fromCenter = { x: (centerX - from.x) / from.zoom, y: (centerY - from.y) / from.zoom };
    const toCenter = { x: (centerX - to.x) / to.zoom, y: (centerY - to.y) / to.zoom };
    const flowX = fromCenter.x + (toCenter.x - fromCenter.x) * t;
    const flowY = fromCenter.y + (toCenter.y - fromCenter.y) * t;
    return { x: centerX - flowX * zoom, y: centerY - flowY * zoom, zoom };
  }

  #autoPanVelocity(): PanZoomPoint | null {
    const point = this.#autoPanPoint;
    if (!point) return null;
    const { width, height } = this.#size();
    const x = autoPanVelocity(point.x, width);
    const y = autoPanVelocity(point.y, height);
    return x || y ? { x, y } : null;
  }

  readonly #autoPanFrame = (): boolean => {
    const velocity = this.#autoPanVelocity();
    if (!velocity) {
      this.#autoPanPoint = null;
      return false;
    }
    this.panBy(velocity, 'drag');
    return true;
  };

  // Pointer gestures

  #allowsPress(event: PointerEvent, policy: PanZoomPolicy): boolean {
    if (policy.activationHeld) return true;
    if (event.pointerType === 'touch') return policy.panOnTouch;
    // Ctrl-modified mouse presses are left alone (macOS context menu, Ctrl+wheel pinch).
    if (event.pointerType === 'mouse' && event.ctrlKey) return false;
    return policy.panButtons.includes(event.button);
  }

  #capture(pointerId: number): void {
    try {
      this.#options.element.setPointerCapture(pointerId);
    } catch {
      // Capture is unavailable for synthetic pointers; the gesture still runs on the element.
    }
  }

  #releaseCapture(pointerId: number): void {
    const element = this.#options.element;
    try {
      if (element.hasPointerCapture(pointerId)) element.releasePointerCapture(pointerId);
    } catch {
      // The pointer may already be gone; nothing to release.
    }
  }

  readonly #pointerDown = (event: PointerEvent): void => {
    const gesture = this.#gesture;
    if (gesture) {
      if (gesture.pointers.has(event.pointerId) || !this.#allowed(event)) return;
      if (gesture.pointers.size >= 2) {
        this.#finish(gesture, event);
        return;
      }
      if (!this.#options.policy().pinch) return;
      event.preventDefault();
      this.#capture(event.pointerId);
      this.#flush(gesture);
      gesture.pointers.set(event.pointerId, this.#relative(event));
      this.#rebase(gesture);
      return;
    }
    if (!this.#allowsPress(event, this.#options.policy()) || !this.#allowed(event)) return;
    event.preventDefault();
    this.cancelAnimation();
    this.#capture(event.pointerId);
    const element = this.#options.element;
    const scope = new CleanupScope();
    const viewport = this.#options.viewport();
    const point = this.#relative(event);
    const session: PointerGesture = {
      scope,
      pointers: new Map([[event.pointerId, point]]),
      base: viewport,
      baseCenter: point,
      baseDistance: 0,
      current: viewport,
      latest: event,
      frame: undefined,
      moved: false,
    };
    this.#gesture = session;
    scope.add(() => session.frame?.());
    scope.listen(element, 'pointermove', this.#pointerMove);
    scope.listen(element, 'pointerup', this.#pointerUp);
    scope.listen(element, 'pointercancel', this.#pointerCancel);
    scope.listen(element, 'lostpointercapture', this.#lostCapture);
    this.#options.handlers.start?.('drag', event);
  };

  /** Measures the next phase from the current viewport and pointer geometry. */
  #rebase(gesture: PointerGesture): void {
    const points = [...gesture.pointers.values()];
    gesture.base = gesture.current;
    if (points.length >= 2) {
      const [a, b] = points as [PanZoomPoint, PanZoomPoint];
      gesture.baseCenter = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      gesture.baseDistance = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    } else {
      gesture.baseCenter = points[0] ?? gesture.baseCenter;
      gesture.baseDistance = 0;
    }
  }

  /** The viewport implied by the pointers' current positions relative to the phase base. */
  #measure(gesture: PointerGesture): PanZoomViewport {
    const points = [...gesture.pointers.values()];
    const { base, baseCenter } = gesture;
    if (points.length >= 2) {
      const [a, b] = points as [PanZoomPoint, PanZoomPoint];
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const distance = Math.hypot(b.x - a.x, b.y - a.y) || gesture.baseDistance;
      const zoom = base.zoom * (distance / gesture.baseDistance);
      const flowX = (baseCenter.x - base.x) / base.zoom;
      const flowY = (baseCenter.y - base.y) / base.zoom;
      return { x: center.x - flowX * zoom, y: center.y - flowY * zoom, zoom };
    }
    const point = points[0] ?? baseCenter;
    return {
      x: base.x + (point.x - baseCenter.x),
      y: base.y + (point.y - baseCenter.y),
      zoom: base.zoom,
    };
  }

  #emit(gesture: PointerGesture, event: Event | null): void {
    gesture.moved = false;
    gesture.current = this.#apply(this.#measure(gesture), 'drag', event);
  }

  /** Reports unreported movement now, so the gesture settles where the pointers last were. */
  #flush(gesture: PointerGesture): void {
    gesture.frame?.();
    gesture.frame = undefined;
    if (gesture.moved) this.#emit(gesture, gesture.latest);
  }

  #finish(gesture: PointerGesture, event: Event | null): void {
    this.#flush(gesture);
    this.#gesture = null;
    gesture.scope.dispose();
    for (const pointerId of gesture.pointers.keys()) this.#releaseCapture(pointerId);
    this.#options.handlers.end?.('drag', event);
  }

  #cancelGesture(): void {
    const gesture = this.#gesture;
    if (!gesture) return;
    this.#gesture = null;
    gesture.scope.dispose();
    for (const pointerId of gesture.pointers.keys()) this.#releaseCapture(pointerId);
    this.#options.handlers.cancel?.();
  }

  readonly #pointerMove = (event: PointerEvent): void => {
    const gesture = this.#gesture;
    if (!gesture?.pointers.has(event.pointerId)) return;
    gesture.pointers.set(event.pointerId, this.#relative(event));
    gesture.latest = event;
    gesture.moved = true;
    if (event.buttons === 0) {
      // No button is pressed any more: another handler consumed the release.
      this.#finish(gesture, event);
      return;
    }
    if (gesture.frame || !this.#scheduler) return;
    gesture.frame = this.#scheduler.animationFrame(() => {
      gesture.frame = undefined;
      if (this.#gesture === gesture) this.#emit(gesture, gesture.latest);
    });
  };

  readonly #pointerUp = (event: PointerEvent): void => {
    const gesture = this.#gesture;
    if (!gesture?.pointers.has(event.pointerId)) return;
    if (gesture.pointers.size === 1) {
      this.#finish(gesture, event);
      return;
    }
    // One pinch pointer lifted: continue as a single-pointer pan from here.
    this.#flush(gesture);
    gesture.pointers.delete(event.pointerId);
    this.#releaseCapture(event.pointerId);
    this.#rebase(gesture);
  };

  /** Capture lost before the release: settle where the pointers last were. */
  readonly #lostCapture = (event: PointerEvent): void => {
    const gesture = this.#gesture;
    if (gesture?.pointers.has(event.pointerId)) this.#finish(gesture, event);
  };

  readonly #pointerCancel = (event: PointerEvent): void => {
    if (this.#gesture?.pointers.has(event.pointerId)) this.#cancelGesture();
  };

  // Wheel

  /** Capture phase: a latched stream keeps its owner whatever is now under the pointer. */
  readonly #latchedWheel = (event: WheelEvent): void => {
    const latch = this.#latch;
    if (!latch) return;
    if (
      Math.hypot(event.clientX - latch.x, event.clientY - latch.y) > WHEEL_LATCH_SLOP ||
      (event.ctrlKey || event.metaKey) !== latch.zoom
    ) {
      this.#releaseLatch();
      return;
    }
    this.#renewLatch(latch);
    if (latch.owner === 'content' || this.#gesture) return;
    // The content under the pointer never sees a surface-owned wheel.
    if (this.#applyWheel(event)) event.stopPropagation();
    else this.#releaseLatch();
  };

  /** Bubble phase: the first wheel of a stream, after the content had its say, picks the owner. */
  readonly #wheelEvent = (event: WheelEvent): void => {
    if (this.#latch || this.#gesture) return;
    const surface = !event.defaultPrevented && this.#allowed(event) && this.#applyWheel(event);
    const latch: WheelLatch = {
      owner: surface ? 'surface' : 'content',
      x: event.clientX,
      y: event.clientY,
      zoom: event.ctrlKey || event.metaKey,
      release: () => undefined,
    };
    this.#latch = latch;
    this.#renewLatch(latch);
  };

  #renewLatch(latch: WheelLatch): void {
    latch.release();
    latch.release =
      this.#scheduler?.timeout(() => {
        if (this.#latch === latch) this.#latch = null;
      }, WHEEL_LATCH_TIMEOUT) ?? (() => undefined);
  }

  #releaseLatch(): void {
    this.#latch?.release();
    this.#latch = null;
  }

  /** Pans or zooms for one wheel under the policy; false leaves the wheel to the page. */
  #applyWheel(event: WheelEvent): boolean {
    const policy = this.#options.policy();
    const point = this.#relative(event);
    const limits = this.#options.limits();
    const viewport = this.#options.viewport();
    let next: PanZoomViewport;
    if (event.ctrlKey || event.metaKey) {
      // macOS reports a trackpad pinch as a ctrl wheel; a modified wheel is the cooperative zoom.
      if (!policy.pinch) return false;
      const factor = wheelZoomFactor(event.deltaY, event.deltaMode, {
        pinch: true,
        mac: this.#mac,
      });
      next = zoomToPoint(viewport, viewport.zoom * factor, point, limits);
    } else if (policy.wheel === 'none' || policy.cooperative) {
      return false;
    } else if (policy.wheel === 'zoom') {
      const factor = wheelZoomFactor(event.deltaY, event.deltaMode);
      next = zoomToPoint(viewport, viewport.zoom * factor, point, limits);
    } else {
      const lines = event.deltaMode === 1 ? 20 : 1;
      let deltaX = event.deltaX * lines;
      let deltaY = event.deltaY * lines;
      // Shift scrolls sideways; macOS already swaps the axes, other platforms report deltaY.
      if (event.shiftKey && deltaX === 0 && deltaY !== 0) {
        deltaX = deltaY;
        deltaY = 0;
      }
      next = { x: viewport.x - deltaX, y: viewport.y - deltaY, zoom: viewport.zoom };
    }
    event.preventDefault();
    this.cancelAnimation();
    if (!this.#wheel) {
      this.#wheel = { settle: () => undefined };
      this.#options.handlers.start?.('wheel', event);
    }
    this.#apply(next, 'wheel', event);
    this.#wheel.settle();
    this.#wheel.settle =
      this.#scheduler?.timeout(() => this.#settleWheel(event), WHEEL_SETTLE_DELAY) ??
      (() => undefined);
    return true;
  }

  #settleWheel(event: Event | null): void {
    const wheel = this.#wheel;
    if (!wheel) return;
    this.#wheel = null;
    wheel.settle();
    this.#options.handlers.end?.('wheel', event);
  }

  // Double click

  readonly #doubleClick = (event: MouseEvent): void => {
    if (this.#gesture || !this.#options.policy().doubleClickZoom || !this.#allowed(event)) return;
    event.preventDefault();
    this.cancelAnimation();
    const viewport = this.#options.viewport();
    // Shift zooms out.
    const factor = event.shiftKey ? 1 / DOUBLE_CLICK_ZOOM_FACTOR : DOUBLE_CLICK_ZOOM_FACTOR;
    const next = zoomToPoint(
      viewport,
      viewport.zoom * factor,
      this.#relative(event),
      this.#options.limits(),
    );
    this.#options.handlers.start?.('gesture', event);
    this.#apply(next, 'gesture', event);
    this.#options.handlers.end?.('gesture', event);
  };
}
