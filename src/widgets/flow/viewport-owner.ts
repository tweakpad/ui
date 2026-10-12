import {
  PanZoomController,
  type PanZoomPolicy,
  type PanZoomReason,
} from '../../foundation/pan-zoom.js';
import { frameLoopFor } from '../../foundation/frame-loop.js';
import { viewportForBounds, type FlowFitPadding } from '../../foundation/flow/viewport.js';
import type { FlowPoint, FlowRect, FlowSize, FlowViewport } from '../../foundation/flow/types.js';
import type { ChangeReason } from '../../foundation/types.js';

export interface ViewportOwnerOptions {
  pane: () => HTMLElement | null;
  transformTarget: () => HTMLElement | null;
  viewport: () => FlowViewport;
  size: () => FlowSize;
  limits: () => { minZoom: number; maxZoom: number };
  policy: () => PanZoomPolicy;
  filter: (event: PointerEvent | WheelEvent | MouseEvent) => boolean;
  /** Proposes a viewport on the lane; returns whether it was accepted. */
  propose: (
    viewport: FlowViewport,
    reason: ChangeReason,
    sourceEvent: Event | null,
    animated: boolean,
  ) => boolean;
  /** Called after the transform was written, once per frame at most. */
  onFrame: () => void;
  onGestureStart?: (reason: PanZoomReason) => void;
  onGestureEnd?: (reason: PanZoomReason) => void;
  reducedMotion: () => boolean;
}

const REASONS: Record<PanZoomReason, ChangeReason> = {
  drag: 'drag',
  wheel: 'wheel',
  gesture: 'gesture',
  programmatic: 'imperative-action',
};

/**
 * Binds the shared pan/zoom owner to the pane (Widgets 6.3 Keyboard and pointer): gesture
 * viewports are proposed on the viewport lane once per frame; the accepted viewport is written
 * to the transformed container through the object model without a root update.
 */
export class ViewportOwner {
  readonly #options: ViewportOwnerOptions;
  #controller: PanZoomController | undefined;
  #applied: FlowViewport | undefined;
  #programmaticReason: ChangeReason | undefined;
  #animating = false;

  constructor(options: ViewportOwnerOptions) {
    this.#options = options;
  }

  get active(): boolean {
    return this.#controller?.active ?? false;
  }

  get animating(): boolean {
    return this.#animating;
  }

  connect(): void {
    const pane = this.#options.pane();
    if (!pane || this.#controller) return;
    const view = pane.ownerDocument.defaultView;
    this.#controller = new PanZoomController({
      element: pane,
      owner: view,
      viewport: () => this.#options.viewport(),
      limits: () => ({ ...this.#options.limits(), translateExtent: undefined }) as never,
      policy: () => this.#options.policy(),
      filter: (event) => this.#options.filter(event),
      size: () => this.#options.size(),
      ...(view ? { frameLoop: frameLoopFor(view) } : {}),
      handlers: {
        start: (reason) => this.#options.onGestureStart?.(reason),
        move: (viewport, reason, event) => {
          const changeReason =
            reason === 'programmatic'
              ? (this.#programmaticReason ?? 'imperative-action')
              : REASONS[reason];
          this.#options.propose(viewport, changeReason, event, this.#animating);
          // An accepted proposal already applied through the lane commit; a rejected one with a
          // stale transform (controlled owner wrote something else back) re-applies here.
          if (this.#options.viewport() !== this.#applied) this.apply(this.#options.viewport());
        },
        end: (reason) => this.#options.onGestureEnd?.(reason),
      },
    });
    this.#controller.connect();
    this.apply(this.#options.viewport());
  }

  disconnect(): void {
    this.#controller?.disconnect();
    this.#controller = undefined;
    this.#applied = undefined;
  }

  /** Writes the viewport transform (CSSOM) and runs the per-frame work. */
  apply(viewport: FlowViewport): void {
    const target = this.#options.transformTarget();
    if (target)
      target.style.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`;
    this.#applied = viewport;
    this.#options.onFrame();
  }

  screenToFlow(point: FlowPoint): FlowPoint {
    const viewport = this.#options.viewport();
    return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
  }

  flowToScreen(point: FlowPoint): FlowPoint {
    const viewport = this.#options.viewport();
    return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
  }

  /** Pointer position relative to the pane, in screen pixels. */
  paneOffset(event: { clientX: number; clientY: number }): FlowPoint {
    const pane = this.#options.pane();
    const rect = pane?.getBoundingClientRect();
    return { x: event.clientX - (rect?.left ?? 0), y: event.clientY - (rect?.top ?? 0) };
  }

  async animateTo(
    viewport: FlowViewport,
    reason: ChangeReason,
    duration: number,
  ): Promise<boolean> {
    const controller = this.#controller;
    if (!controller) {
      const accepted = this.#options.propose(viewport, reason, null, false);
      if (accepted) this.apply(this.#options.viewport());
      return accepted;
    }
    const effective = this.#options.reducedMotion() ? 0 : duration;
    this.#programmaticReason = reason;
    // `metadata.animated` tells owners a tween is in flight; an instant apply is not one.
    this.#animating = effective > 0;
    try {
      return await controller.animateTo(viewport, { duration: effective });
    } finally {
      this.#animating = false;
      this.#programmaticReason = undefined;
    }
  }

  fitViewport(bounds: FlowRect, padding: FlowFitPadding, maxZoom?: number): FlowViewport {
    const limits = this.#options.limits();
    return viewportForBounds(bounds, this.#options.size(), {
      minZoom: limits.minZoom,
      maxZoom: maxZoom === undefined ? limits.maxZoom : Math.max(limits.minZoom, maxZoom),
      padding,
    });
  }

  autoPan(screenPoint: FlowPoint): void {
    this.#programmaticReason = 'drag';
    this.#controller?.autoPan(screenPoint);
  }

  stopAutoPan(): void {
    this.#controller?.stopAutoPan();
    this.#programmaticReason = undefined;
  }

  cancelAnimation(): void {
    this.#controller?.cancelAnimation();
  }
}
