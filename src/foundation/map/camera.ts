/**
 * Shared camera motion (`sec-1812-map` map-f-motion): the fallback tween for engines without
 * native animation, and the default durations.
 */
import {
  type MapCamera,
  type MapPoint,
  type ViewportSize,
  mergeCamera,
  toWorld,
  fromWorld,
  wrapBearing,
} from './geo.js';

export const ZOOM_STEP_DURATION = 250;
export const MIN_TRAVEL_DURATION = 600;
export const MAX_TRAVEL_DURATION = 1500;

/** Travel duration scaled by on-screen distance and zoom change (600–1500 ms). */
export function travelDuration(from: MapCamera, to: MapCamera, size: ViewportSize): number {
  const scale = 2 ** Math.min(from.zoom, to.zoom);
  const a = toWorld(from.center);
  const b = toWorld(to.center);
  const diagonal = Math.hypot(size.width, size.height) || 1;
  const screens = (Math.hypot(b.x - a.x, b.y - a.y) * scale) / diagonal;
  const zoomDelta = Math.abs(to.zoom - from.zoom);
  const t = Math.min(1, (screens + zoomDelta / 4) / 4);
  return Math.round(MIN_TRAVEL_DURATION + (MAX_TRAVEL_DURATION - MIN_TRAVEL_DURATION) * t);
}

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;

/**
 * Interpolates two cameras at `t` in [0, 1]. Zoom interpolates on the zoom scale; the center moves
 * in world space at the interpolated scale so the path stays visually straight; bearing takes the
 * shortest turn.
 */
export function interpolateCamera(from: MapCamera, to: MapCamera, t: number): MapCamera {
  const zoom = from.zoom + (to.zoom - from.zoom) * t;
  const a = toWorld(from.center);
  let b: MapPoint = toWorld(to.center);
  // Cross the antimeridian when that is shorter.
  if (b.x - a.x > 128) b = { x: b.x - 256, y: b.y };
  else if (a.x - b.x > 128) b = { x: b.x + 256, y: b.y };
  const fromScale = 2 ** from.zoom;
  const toScale = 2 ** to.zoom;
  const scale = 2 ** zoom;
  // Screen-linear progress: u(t) solves the pan so it appears uniform while zooming.
  const u =
    fromScale === toScale
      ? t
      : (1 / fromScale - 1 / scale) / (1 / fromScale - 1 / toScale || Number.EPSILON);
  const center = fromWorld({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u });
  let turn = wrapBearing(to.bearing) - wrapBearing(from.bearing);
  if (turn > 180) turn -= 360;
  if (turn < -180) turn += 360;
  return mergeCamera(from, {
    center,
    zoom,
    bearing: from.bearing + turn * t,
    pitch: from.pitch + (to.pitch - from.pitch) * t,
  });
}

export interface TweenFrameSource {
  requestAnimationFrame(callback: (time: number) => void): number;
  cancelAnimationFrame(handle: number): void;
  now(): number;
}

export function windowFrameSource(view: Window): TweenFrameSource {
  return {
    requestAnimationFrame: (callback) => view.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle) => view.cancelAnimationFrame(handle),
    now: () => view.performance.now(),
  };
}

/**
 * Animates with `apply` once per frame from `from` to `to`. Resolves `true` when it reached the
 * target and `false` when `signal` aborted it (the camera stays where it was).
 */
export function tweenCamera(
  from: MapCamera,
  to: MapCamera,
  duration: number,
  apply: (camera: MapCamera) => void,
  frames: TweenFrameSource,
  signal?: AbortSignal,
): Promise<boolean> {
  if (duration <= 0 || signal?.aborted) {
    if (!signal?.aborted) apply(to);
    return Promise.resolve(!signal?.aborted);
  }
  return new Promise((resolve) => {
    const start = frames.now();
    let handle = 0;
    const abort = () => {
      frames.cancelAnimationFrame(handle);
      resolve(false);
    };
    signal?.addEventListener('abort', abort, { once: true });
    const step = (time: number) => {
      const t = Math.min(1, Math.max(0, (time - start) / duration));
      apply(t >= 1 ? to : interpolateCamera(from, to, easeInOut(t)));
      if (t >= 1) {
        signal?.removeEventListener('abort', abort);
        resolve(true);
      } else handle = frames.requestAnimationFrame(step);
    };
    handle = frames.requestAnimationFrame(step);
  });
}
