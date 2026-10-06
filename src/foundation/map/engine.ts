/**
 * Map engine contract (`sec-1812-map` map-f-engine-intro, map-f-engine, map-f-placement).
 *
 * A map engine is a consumer-supplied adapter. The map never imports an engine package: adapters
 * such as `createMapLibreEngine` receive the engine namespace from the consumer. Optional
 * capabilities may be absent; the store then uses the shared fallback or reports `unsupported`.
 */
import type { ChangeReason } from '../types.js';
import type {
  MapBounds,
  MapCamera,
  MapCameraTarget,
  MapPadding,
  MapPoint,
  MapPosition,
} from './geo.js';
import type { ResolvedMapTheme } from './theme.js';

export type MapScheme = 'light' | 'dark';

export interface MapAnimationOptions {
  /** Milliseconds. Engines may choose their own duration when omitted. */
  readonly duration?: number;
  /** Aborts the animation; the engine stops where it is. */
  readonly signal?: AbortSignal;
}

export interface MapFitOptions {
  readonly padding?: MapPadding;
  readonly maxZoom?: number;
}

/** Handle for an element placed at a geographic position (map-f-placement). */
export interface MapOverlayHandle {
  setPosition(position: MapPosition): void;
  /** Idempotent. */
  remove(): void;
}

/** Notifications the engine sends to the map (mount context). */
export interface MapEngineNotifications {
  /** The engine finished loading and can render. */
  ready(): void;
  /**
   * The camera changed. Engine-originated changes (gestures, inertia, engine keyboard handling)
   * use reason `engine`; changes caused by the map's own requests may pass any reason, which
   * the map ignores in favor of the request's reason.
   */
  camera(reason?: ChangeReason, sourceEvent?: Event): void;
  /** Movement ended. */
  cameraEnd(reason?: ChangeReason, sourceEvent?: Event): void;
  /** A press on the basemap (not on a placed element). */
  press(position: MapPosition, point: MapPoint, sourceEvent?: Event): void;
  /** A fatal engine error (for example a failed style or authorization). */
  error(error: unknown): void;
}

export interface MapEngineContext extends MapEngineNotifications {
  /** The initial camera on the 256-pixel zoom scale. */
  readonly initialCamera: MapCamera;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly interactive: boolean;
  readonly cooperativeGestures: boolean;
  readonly scheme: MapScheme;
  /** Theme role colors resolved for `scheme`, or `null`. */
  readonly theme: ResolvedMapTheme | null;
  /** Whether reduced motion currently resolves for the map. */
  reducedMotion(): boolean;
  /** Adopts engine stylesheet text into the viewport's tree scope; returns the removal. */
  adoptStyles(cssText: string): () => void;
  /** Aborted when the map destroys this instance. */
  readonly signal: AbortSignal;
}

export interface MapEngineInstance {
  // Required capabilities.
  getCamera(): MapCamera;
  getBounds(): MapBounds | null;
  jumpTo(camera: MapCamera): void;
  project(position: MapPosition): MapPoint;
  unproject(point: MapPoint): MapPosition;
  attachOverlay(element: HTMLElement, position: MapPosition): MapOverlayHandle;
  destroy(): void;
  // Optional capabilities.
  easeTo?(camera: MapCamera, options: MapAnimationOptions): Promise<void>;
  stop?(): void;
  cameraForBounds?(bounds: MapBounds, options: MapFitOptions): MapCamera | null;
  setZoomRange?(minimum: number, maximum: number): void;
  setInteractive?(enabled: boolean): void;
  setCooperativeGestures?(enabled: boolean): void;
  setAppearance?(scheme: MapScheme, theme: ResolvedMapTheme | null): void | Promise<void>;
  resize?(): void;
  /** The engine's native map object (escape hatch). */
  readonly native?: unknown;
}

export interface MapEngine {
  /** Optional identifier used in diagnostics only; never part of the public contract. */
  readonly name?: string;
  mount(
    viewport: HTMLElement,
    context: MapEngineContext,
  ): MapEngineInstance | Promise<MapEngineInstance>;
}

export type MapCapability =
  | 'animation'
  | 'fit'
  | 'zoom-range'
  | 'interaction'
  | 'cooperative-gestures'
  | 'appearance'
  | 'resize';

/** Whether an instance implements an optional capability. */
export function engineSupports(
  instance: MapEngineInstance | null,
  capability: MapCapability,
): boolean {
  if (!instance) return false;
  switch (capability) {
    case 'animation':
      return typeof instance.easeTo === 'function';
    case 'fit':
      return typeof instance.cameraForBounds === 'function';
    case 'zoom-range':
      return typeof instance.setZoomRange === 'function';
    case 'interaction':
      return typeof instance.setInteractive === 'function';
    case 'cooperative-gestures':
      return typeof instance.setCooperativeGestures === 'function';
    case 'appearance':
      return typeof instance.setAppearance === 'function';
    case 'resize':
      return typeof instance.resize === 'function';
  }
}

export type { MapCameraTarget };
