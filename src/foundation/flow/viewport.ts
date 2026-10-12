// Adapted from xyflow packages/system/src/utils/general.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
// Adapted from xyflow packages/system/src/xypanzoom/utils.ts at 3d35b5731 (MIT; see LICENSE.xyflow).
import { clamp, infiniteExtent } from './geometry.js';
import type { FlowExtent, FlowPoint, FlowRect, FlowSize, FlowViewport } from './types.js';

/**
 * Viewport math: screen ↔ flow conversion, fit-to-bounds with xyflow padding forms, zoom around
 * a screen point, d3-zoom-like translate constraints, wheel and auto-pan factors and log-linear
 * interpolation. Pure functions; the widget's pan/zoom owner drives them from pointer events.
 */

export interface FlowZoomLimits {
  minZoom: number;
  maxZoom: number;
}

/** A ratio (`0.1`), a pixel string (`'24px'`) or a percentage string (`'10%'`). */
export type FlowPaddingValue = number | string;

export interface FlowPaddingSides {
  top?: FlowPaddingValue;
  right?: FlowPaddingValue;
  bottom?: FlowPaddingValue;
  left?: FlowPaddingValue;
  x?: FlowPaddingValue;
  y?: FlowPaddingValue;
}

export type FlowFitPadding = FlowPaddingValue | FlowPaddingSides;

export interface FlowFitOptions extends FlowZoomLimits {
  padding?: FlowFitPadding;
}

export interface FlowClampOptions extends FlowZoomLimits {
  size: FlowSize;
  /** Flow-space rectangle the viewport may show (default infinite). */
  translateExtent?: FlowExtent;
}

export interface FlowWheelOptions {
  /** The wheel event carries `ctrlKey` (trackpad pinch). */
  pinch?: boolean;
  /** Pinch deltas on macOS are ten times finer. */
  mac?: boolean;
}

export interface FlowAutoPanOptions {
  /** Pixels per tick at the edge (default 15). */
  speed?: number;
  /** Distance from the pane edge where panning starts (default 40). */
  distance?: number;
}

export const IDENTITY_VIEWPORT: Readonly<FlowViewport> = { x: 0, y: 0, zoom: 1 };

export function screenToFlow(point: FlowPoint, viewport: FlowViewport): FlowPoint {
  return { x: (point.x - viewport.x) / viewport.zoom, y: (point.y - viewport.y) / viewport.zoom };
}

export function flowToScreen(point: FlowPoint, viewport: FlowViewport): FlowPoint {
  return { x: point.x * viewport.zoom + viewport.x, y: point.y * viewport.zoom + viewport.y };
}

/** The flow-space rectangle shown by `viewport` in a pane of `size`. */
export function visibleRect(viewport: FlowViewport, size: FlowSize): FlowRect {
  return {
    x: -viewport.x / viewport.zoom,
    y: -viewport.y / viewport.zoom,
    width: size.width / viewport.zoom,
    height: size.height / viewport.zoom,
  };
}

function parsePadding(padding: FlowPaddingValue, extent: number): number {
  if (typeof padding === 'number') {
    return Math.floor((extent - extent / (1 + padding)) * 0.5);
  }
  if (padding.endsWith('px')) {
    const value = parseFloat(padding);
    if (!Number.isNaN(value)) return Math.floor(value);
  }
  if (padding.endsWith('%')) {
    const value = parseFloat(padding);
    if (!Number.isNaN(value)) return Math.floor(extent * value * 0.01);
  }
  return 0;
}

export interface FlowResolvedPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
  x: number;
  y: number;
}

/** Resolves a padding form to pixels for a pane of `size` (xyflow `parsePaddings`). */
export function resolveFitPadding(padding: FlowFitPadding, size: FlowSize): FlowResolvedPadding {
  if (typeof padding === 'string' || typeof padding === 'number') {
    const paddingY = parsePadding(padding, size.height);
    const paddingX = parsePadding(padding, size.width);
    return {
      top: paddingY,
      right: paddingX,
      bottom: paddingY,
      left: paddingX,
      x: paddingX * 2,
      y: paddingY * 2,
    };
  }
  const top = parsePadding(padding.top ?? padding.y ?? 0, size.height);
  const bottom = parsePadding(padding.bottom ?? padding.y ?? 0, size.height);
  const left = parsePadding(padding.left ?? padding.x ?? 0, size.width);
  const right = parsePadding(padding.right ?? padding.x ?? 0, size.width);
  return { top, right, bottom, left, x: left + right, y: top + bottom };
}

/** The viewport that shows `bounds` centered inside `size` with `padding` (xyflow `getViewportForBounds`). */
export function viewportForBounds(
  bounds: FlowRect,
  size: FlowSize,
  options: FlowFitOptions,
): FlowViewport {
  const padding = resolveFitPadding(options.padding ?? 0, size);
  const xZoom = (size.width - padding.x) / bounds.width;
  const yZoom = (size.height - padding.y) / bounds.height;
  const zoom = clamp(Math.min(xZoom, yZoom), options.minZoom, options.maxZoom);

  const boundsCenterX = bounds.x + bounds.width / 2;
  const boundsCenterY = bounds.y + bounds.height / 2;
  const x = size.width / 2 - boundsCenterX * zoom;
  const y = size.height / 2 - boundsCenterY * zoom;

  const viewport = { x, y, zoom };
  const topLeft = flowToScreen(bounds, viewport);
  const bottomRight = flowToScreen(
    { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    viewport,
  );
  const applied = {
    left: Math.floor(topLeft.x),
    top: Math.floor(topLeft.y),
    right: Math.floor(size.width - bottomRight.x),
    bottom: Math.floor(size.height - bottomRight.y),
  };
  const offset = {
    left: Math.min(applied.left - padding.left, 0),
    top: Math.min(applied.top - padding.top, 0),
    right: Math.min(applied.right - padding.right, 0),
    bottom: Math.min(applied.bottom - padding.bottom, 0),
  };
  return { x: x - offset.left + offset.right, y: y - offset.top + offset.bottom, zoom };
}

/** Sets `zoom` while keeping the flow point under `screenPoint` in place. */
export function zoomToPoint(
  viewport: FlowViewport,
  zoom: number,
  screenPoint: FlowPoint,
  limits?: FlowZoomLimits,
): FlowViewport {
  const next = limits ? clamp(zoom, limits.minZoom, limits.maxZoom) : zoom;
  const anchor = screenToFlow(screenPoint, viewport);
  return { x: screenPoint.x - anchor.x * next, y: screenPoint.y - anchor.y * next, zoom: next };
}

export function zoomBy(
  viewport: FlowViewport,
  factor: number,
  screenPoint: FlowPoint,
  limits?: FlowZoomLimits,
): FlowViewport {
  return zoomToPoint(viewport, viewport.zoom * factor, screenPoint, limits);
}

export function panBy(viewport: FlowViewport, delta: FlowPoint): FlowViewport {
  return { x: viewport.x + delta.x, y: viewport.y + delta.y, zoom: viewport.zoom };
}

/** The viewport that centers the flow `point` in a pane of `size` at `zoom`. */
export function centerOn(point: FlowPoint, size: FlowSize, zoom: number): FlowViewport {
  return { x: size.width / 2 - point.x * zoom, y: size.height / 2 - point.y * zoom, zoom };
}

/**
 * Clamps the zoom to its limits and the translation to `translateExtent` with d3-zoom's
 * `constrain` semantics: an extent smaller than the pane is centered, a larger one may not
 * leave empty space at a pane edge.
 */
export function clampViewport(viewport: FlowViewport, options: FlowClampOptions): FlowViewport {
  const zoom = clamp(viewport.zoom, options.minZoom, options.maxZoom);
  const extent = options.translateExtent ?? infiniteExtent;
  const { width, height } = options.size;
  const invertX = (screenX: number): number => (screenX - viewport.x) / zoom;
  const invertY = (screenY: number): number => (screenY - viewport.y) / zoom;
  const dx0 = invertX(0) - extent[0][0];
  const dx1 = invertX(width) - extent[1][0];
  const dy0 = invertY(0) - extent[0][1];
  const dy1 = invertY(height) - extent[1][1];
  const tx = dx1 > dx0 ? (dx0 + dx1) / 2 : Math.min(0, dx0) || Math.max(0, dx1);
  const ty = dy1 > dy0 ? (dy0 + dy1) / 2 : Math.min(0, dy0) || Math.max(0, dy1);
  return { x: viewport.x + zoom * tx, y: viewport.y + zoom * ty, zoom };
}

/**
 * The zoom factor for a wheel event:
 * `2 ** (−deltaY · (line 0.05 | page 1 | 0.002) · (pinch && mac ? 10 : 1))`.
 */
export function wheelZoomFactor(
  deltaY: number,
  deltaMode: number,
  options: FlowWheelOptions = {},
): number {
  const unit = deltaMode === 1 ? 0.05 : deltaMode ? 1 : 0.002;
  const factor = options.pinch && options.mac ? 10 : 1;
  return 2 ** (-deltaY * unit * factor);
}

function autoPanAxis(value: number, min: number, max: number): number {
  if (value < min) return clamp(Math.abs(value - min), 1, min) / min;
  if (value > max) return -clamp(Math.abs(value - max), 1, min) / min;
  return 0;
}

/** Pan velocity (screen px per tick) while `point` is near the edges of a pane of `size` (xyflow `calcAutoPan`). */
export function autoPanVelocity(
  point: FlowPoint,
  size: FlowSize,
  options: FlowAutoPanOptions = {},
): FlowPoint {
  const speed = options.speed ?? 15;
  const distance = options.distance ?? 40;
  return {
    x: autoPanAxis(point.x, distance, size.width - distance) * speed,
    y: autoPanAxis(point.y, distance, size.height - distance) * speed,
  };
}

/** Linear translation with log-linear zoom, so equal steps feel equal at every scale. */
export function interpolateViewport(from: FlowViewport, to: FlowViewport, t: number): FlowViewport {
  const progress = clamp(t, 0, 1);
  const zoom =
    from.zoom > 0 && to.zoom > 0
      ? from.zoom * (to.zoom / from.zoom) ** progress
      : from.zoom + (to.zoom - from.zoom) * progress;
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress,
    zoom,
  };
}

export function viewportsEqual(a: FlowViewport, b: FlowViewport, epsilon = 0): boolean {
  return (
    Math.abs(a.x - b.x) <= epsilon &&
    Math.abs(a.y - b.y) <= epsilon &&
    Math.abs(a.zoom - b.zoom) <= epsilon
  );
}
