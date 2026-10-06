/**
 * Headless map behavior (`sec-1812-map`): engine mount lifecycle, the store, the single request
 * pipeline, camera animation and cancellation, home view, overlay placement across engine
 * replacement, and per-frame camera coalescing.
 *
 * The Lit root (`tp-map`) supplies a host adapter for DOM, events, configuration and selection;
 * this class never touches the DOM beyond the viewport element and overlay elements it is handed.
 */
import type { ChangeReason } from '../types.js';
import {
  type MapAnimationOptions,
  type MapEngine,
  type MapEngineContext,
  type MapEngineInstance,
  type MapOverlayHandle,
  type MapScheme,
} from './engine.js';
import {
  DEFAULT_CAMERA,
  type MapBounds,
  type MapCamera,
  type MapCameraTarget,
  type MapPadding,
  type MapPoint,
  type MapPosition,
  type ViewportSize,
  boundsContain,
  boundsOf,
  camerasEqual,
  fitCamera,
  mergeCamera,
  normalizePosition,
  projectFlat,
  unprojectFlat,
} from './geo.js';
import {
  ZOOM_STEP_DURATION,
  travelDuration,
  tweenCamera,
  type TweenFrameSource,
} from './camera.js';
import { MapStore, type MapState, type MapSubscribeOptions } from './state.js';
import { mapThemesEqual, type ResolvedMapTheme } from './theme.js';

export type MapRequestAction =
  | 'zoom-in'
  | 'zoom-out'
  | 'reset'
  | 'fly-to'
  | 'fit-bounds'
  | 'fit-pins'
  | 'select-pin'
  | 'reveal-pin';

export interface MapFitValue {
  readonly bounds: MapBounds;
  readonly padding?: MapPadding;
  readonly maxZoom?: number;
}

export interface MapRequestValues {
  'zoom-in': number | undefined;
  'zoom-out': number | undefined;
  reset: undefined;
  'fly-to': MapCameraTarget;
  'fit-bounds': MapFitValue;
  'fit-pins': { readonly padding?: MapPadding; readonly maxZoom?: number } | undefined;
  'select-pin': string | null;
  'reveal-pin': { readonly value: string; readonly zoom?: number };
}

export type MapRequestOutcome = 'completed' | 'cancelled';

export interface MapRequestOptions {
  readonly reason?: ChangeReason | undefined;
  readonly sourceEvent?: Event | undefined;
  readonly trigger?: Element | null | undefined;
  /** Animation duration override in milliseconds (camera actions only). */
  readonly duration?: number | undefined;
}

export interface MapRequestDetail {
  readonly action: MapRequestAction;
  readonly value: unknown;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event | undefined;
  readonly trigger: Element | null;
}

export interface MapRequestFailedDetail extends Omit<MapRequestDetail, 'sourceEvent' | 'trigger'> {
  readonly error: unknown;
}

export interface MapCameraDetail {
  readonly camera: MapCamera;
  readonly bounds: MapBounds | null;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event | undefined;
}

export interface MapPressDetail {
  readonly position: MapPosition;
  readonly point: MapPoint;
  readonly sourceEvent: Event | undefined;
}

export interface MapConfig {
  readonly defaultCenter: MapPosition | null;
  readonly defaultZoom: number;
  readonly defaultBounds: MapBounds | null;
  readonly minZoom: number;
  readonly maxZoom: number;
  readonly fitPadding: number;
  readonly revealZoom: number | null;
  readonly interactive: boolean;
  readonly cooperativeGestures: boolean;
  readonly disabled: boolean;
}

export interface MapControllerHost {
  /** The element handed to the engine; `null` before render. */
  viewport(): HTMLElement | null;
  viewportSize(): ViewportSize;
  config(): MapConfig;
  appearance(): { scheme: MapScheme; theme: ResolvedMapTheme | null };
  /** Positions of enabled placed pins in document order (home view and fit-pins). */
  pinPositions(): readonly MapPosition[];
  /** A registered selectable pin's position, `null` when unplaced, `undefined` when unknown. */
  pinPosition(value: string): MapPosition | null | undefined;
  /** Proposes a selection; returns whether it committed. */
  select(value: string | null, reason: ChangeReason, sourceEvent?: Event): boolean;
  reducedMotion(): boolean;
  adoptStyles(cssText: string): () => void;
  frames(): TweenFrameSource;
  /** Dispatches the cancelable request event; returns `false` when cancelled. */
  dispatchRequest(detail: MapRequestDetail): boolean;
  requestFailed(detail: MapRequestFailedDetail): void;
  ready(native: unknown): void;
  failed(error: unknown): void;
  cameraChanged(detail: MapCameraDetail): void;
  cameraCommitted(detail: MapCameraDetail): void;
  pressed(detail: MapPressDetail): void;
  /** Called once per frame while the camera moves (overlay re-positioning). */
  frame(): void;
  diagnostic(code: string, message: string): void;
}

const ZOOM_EPSILON = 0.001;

function domError(name: string, message: string): Error {
  try {
    return new DOMException(message, name);
  } catch {
    const error = new Error(message);
    error.name = name;
    return error;
  }
}

interface OverlayRecord {
  position: MapPosition;
  handle: MapOverlayHandle | null;
}

export class MapController {
  readonly store = new MapStore();
  readonly #host: MapControllerHost;
  #engine: MapEngine | null = null;
  #instance: MapEngineInstance | null = null;
  #mounting: AbortController | null = null;
  #camera: MapCamera = DEFAULT_CAMERA;
  #homeApplied = false;
  /** A camera request arrived after the mount context captured the camera. */
  #cameraDirty = false;
  #animation: AbortController | null = null;
  #pending: Array<{ resolve: (outcome: MapRequestOutcome) => void }> = [];
  readonly #overlays = new Map<HTMLElement, OverlayRecord>();
  #frameHandle = 0;
  #frameReason: ChangeReason = 'engine';
  #frameEvent: Event | undefined;
  #requestReason: ChangeReason | null = null;
  #connected = false;
  #destroyTimer: { cancel(): void } | null = null;
  #appearance: { scheme: MapScheme; theme: ResolvedMapTheme | null } | null = null;
  #config: MapConfig | null = null;

  constructor(host: MapControllerHost) {
    this.#host = host;
  }

  get state(): MapState {
    return this.store.state;
  }

  get instance(): MapEngineInstance | null {
    return this.#status() === 'ready' ? this.#instance : null;
  }

  get native(): unknown {
    return this.#instance?.native ?? null;
  }

  get engine(): MapEngine | null {
    return this.#engine;
  }

  subscribe<S>(
    selector: (state: MapState) => S,
    callback: (selected: S) => void,
    options?: MapSubscribeOptions<S>,
  ): () => void {
    return this.store.subscribe(selector, callback, options);
  }

  #status() {
    return this.store.current.status;
  }

  // Lifecycle --------------------------------------------------------------------------------

  setEngine(engine: MapEngine | null): void {
    if (engine === this.#engine) return;
    if (this.#instance) this.#camera = this.#readCamera();
    this.#teardown();
    this.#engine = engine;
    this.#mount();
  }

  connect(): void {
    this.#connected = true;
    if (this.#destroyTimer) {
      // Reconnection within two frames cancels deferred destruction (map-f-lifecycle).
      this.#destroyTimer.cancel();
      this.#destroyTimer = null;
      this.#instance?.resize?.();
      return;
    }
    this.#mount();
  }

  disconnect(): void {
    this.#connected = false;
    this.#cancelAnimation();
    this.#cancelFrame();
    const frames = this.#host.frames();
    let handle = frames.requestAnimationFrame(() => {
      handle = frames.requestAnimationFrame(() => {
        this.#destroyTimer = null;
        if (!this.#connected) {
          if (this.#instance) this.#camera = this.#readCamera();
          this.#teardown();
        }
      });
    });
    this.#destroyTimer = { cancel: () => frames.cancelAnimationFrame(handle) };
  }

  /** Re-checks mounting (for example after the viewport gains size). */
  refresh(): void {
    if (!this.#instance && !this.#mounting) this.#mount();
    else this.#instance?.resize?.();
    this.#syncDerived();
  }

  #mount(): void {
    const engine = this.#engine;
    const viewport = this.#host.viewport();
    if (!this.#connected || !engine || !viewport || this.#instance || this.#mounting) {
      if (!engine) this.store.patch({ status: 'idle', error: null, bounds: null, moving: false });
      this.#syncDerived();
      return;
    }
    const size = this.#host.viewportSize();
    if (size.width <= 0 || size.height <= 0) return; // map-f-viewport: defer while zero-size.
    if (!this.#homeApplied) {
      this.#camera = this.#clampCamera(this.homeCamera() ?? this.#camera);
      this.#homeApplied = true;
    }
    const config = (this.#config = this.#host.config());
    const appearance = (this.#appearance = this.#host.appearance());
    const mounting = (this.#mounting = new AbortController());
    let readyReported = false;
    const live = () => this.#mounting === mounting || this.#instanceSignal === mounting.signal;
    const context: MapEngineContext = {
      initialCamera: this.#camera,
      minZoom: config.minZoom,
      maxZoom: config.maxZoom,
      interactive: config.interactive && !config.disabled,
      cooperativeGestures: config.cooperativeGestures,
      scheme: appearance.scheme,
      theme: appearance.theme,
      signal: mounting.signal,
      reducedMotion: () => this.#host.reducedMotion(),
      adoptStyles: (cssText) => this.#host.adoptStyles(cssText),
      ready: () => {
        if (!live() || readyReported) return;
        readyReported = true;
        if (this.#instance) this.#ready();
      },
      camera: (reason, sourceEvent) => {
        if (live()) this.#engineCamera(reason ?? 'engine', sourceEvent);
      },
      cameraEnd: (reason, sourceEvent) => {
        if (live()) this.#engineCameraEnd(reason ?? 'engine', sourceEvent);
      },
      press: (position, point, sourceEvent) => {
        if (live() && this.#status() === 'ready')
          this.#host.pressed({ position: normalizePosition(position), point, sourceEvent });
      },
      error: (error) => {
        if (live()) this.#fail(error);
      },
    };
    this.#cameraDirty = false;
    this.store.patch({ status: 'loading', error: null });
    let result: MapEngineInstance | Promise<MapEngineInstance>;
    try {
      result = engine.mount(viewport, context);
    } catch (error) {
      this.#mounting = null;
      this.#fail(error);
      return;
    }
    void Promise.resolve(result).then(
      (instance) => {
        if (this.#mounting !== mounting) {
          instance.destroy();
          return;
        }
        this.#mounting = null;
        this.#instance = instance;
        this.#instanceSignal = mounting.signal;
        this.#instanceAbort = mounting;
        for (const [element, record] of this.#overlays)
          record.handle = this.#attach(instance, element, record.position);
        if (readyReported) this.#ready();
      },
      (error) => {
        if (this.#mounting !== mounting) return;
        this.#mounting = null;
        this.#fail(error);
      },
    );
  }

  #instanceSignal: AbortSignal | null = null;
  #instanceAbort: AbortController | null = null;

  #ready(): void {
    const instance = this.#instance;
    if (!instance) return;
    if (this.#cameraDirty) instance.jumpTo(this.#camera);
    this.#cameraDirty = false;
    this.#camera = this.#readCamera();
    this.store.patch({
      status: 'ready',
      error: null,
      camera: this.#camera,
      bounds: instance.getBounds(),
    });
    this.#syncDerived();
    this.#host.ready(instance.native ?? null);
    for (const { resolve } of this.#pending.splice(0)) resolve('completed');
  }

  #fail(error: unknown): void {
    const instance = this.#instance;
    this.#instance = null;
    this.#instanceAbort?.abort();
    this.#instanceAbort = null;
    this.#instanceSignal = null;
    this.#mounting?.abort();
    this.#mounting = null;
    for (const record of this.#overlays.values()) {
      record.handle?.remove();
      record.handle = null;
    }
    try {
      instance?.destroy();
    } catch {
      /* the engine already failed */
    }
    this.store.patch({ status: 'error', error, moving: false, bounds: null });
    this.#syncDerived();
    this.#host.failed(error);
  }

  #teardown(): void {
    this.#cancelAnimation();
    this.#cancelFrame();
    this.#mounting?.abort();
    this.#mounting = null;
    for (const record of this.#overlays.values()) {
      record.handle?.remove();
      record.handle = null;
    }
    const instance = this.#instance;
    this.#instance = null;
    this.#instanceAbort?.abort();
    this.#instanceAbort = null;
    this.#instanceSignal = null;
    instance?.destroy();
    for (const { resolve } of this.#pending.splice(0)) resolve('cancelled');
    this.store.patch({ status: 'idle', moving: false, bounds: null });
    this.#syncDerived();
  }

  /** Final cleanup when the root is gone for good. */
  dispose(): void {
    this.#destroyTimer?.cancel();
    this.#destroyTimer = null;
    this.#engine = null;
    this.#teardown();
    this.#overlays.clear();
    this.store.dispose();
  }

  // Configuration and appearance -------------------------------------------------------------

  /** Pushes configuration changes to the engine (zoom range, interaction, disabled). */
  updateConfig(): void {
    const next = this.#host.config();
    const previous = this.#config;
    this.#config = next;
    const instance = this.#instance;
    if (instance && previous) {
      if (next.minZoom !== previous.minZoom || next.maxZoom !== previous.maxZoom) {
        instance.setZoomRange?.(next.minZoom, next.maxZoom);
        const clamped = this.#clampCamera(this.#readCamera());
        if (!camerasEqual(clamped, this.#readCamera())) instance.jumpTo(clamped);
      }
      const interactive = next.interactive && !next.disabled;
      if (interactive !== (previous.interactive && !previous.disabled))
        instance.setInteractive?.(interactive);
      if (next.cooperativeGestures !== previous.cooperativeGestures)
        instance.setCooperativeGestures?.(next.cooperativeGestures);
    }
    if (!this.#instance && !this.#homeApplied) this.#camera = this.homeCamera() ?? this.#camera;
    this.#syncDerived();
  }

  /** Pushes the resolved scheme and theme when they changed (map-f-appearance). */
  updateAppearance(): void {
    const next = this.#host.appearance();
    const previous = this.#appearance;
    this.#appearance = next;
    this.store.patch({ scheme: next.scheme });
    if (
      this.#instance &&
      previous &&
      (previous.scheme !== next.scheme || !mapThemesEqual(previous.theme, next.theme))
    ) {
      const instance = this.#instance;
      void Promise.resolve(instance.setAppearance?.(next.scheme, next.theme)).catch((error) =>
        this.#host.diagnostic(
          'map-appearance',
          `The engine rejected an appearance change: ${String(error)}`,
        ),
      );
    }
  }

  // Overlays ---------------------------------------------------------------------------------

  /** Places `element` at `position`; survives engine replacement. Returns the removal. */
  placeOverlay(element: HTMLElement, position: MapPosition): () => void {
    const normalized = normalizePosition(position);
    const existing = this.#overlays.get(element);
    if (existing) {
      existing.position = normalized;
      existing.handle?.setPosition(normalized);
    } else {
      const record: OverlayRecord = { position: normalized, handle: null };
      this.#overlays.set(element, record);
      if (this.#instance) record.handle = this.#attach(this.#instance, element, normalized);
    }
    if (!this.#instance && !this.#homeApplied) this.#camera = this.homeCamera() ?? this.#camera;
    return () => this.removeOverlay(element);
  }

  removeOverlay(element: HTMLElement): void {
    const record = this.#overlays.get(element);
    if (!record) return;
    this.#overlays.delete(element);
    record.handle?.remove();
  }

  #attach(instance: MapEngineInstance, element: HTMLElement, position: MapPosition) {
    try {
      return instance.attachOverlay(element, position);
    } catch (error) {
      this.#host.diagnostic(
        'map-overlay',
        `The engine could not place an overlay: ${String(error)}`,
      );
      return null;
    }
  }

  // Geometry ---------------------------------------------------------------------------------

  project(position: MapPosition): MapPoint {
    const instance = this.instance;
    return instance
      ? instance.project(normalizePosition(position))
      : projectFlat(position, this.#camera, this.#host.viewportSize());
  }

  unproject(point: MapPoint): MapPosition {
    const instance = this.instance;
    return instance
      ? normalizePosition(instance.unproject(point))
      : unprojectFlat(point, this.#camera, this.#host.viewportSize());
  }

  /** Whether `position` lies inside the viewport inset by `padding`. */
  isVisible(position: MapPosition, padding = 0): boolean {
    const size = this.#host.viewportSize();
    if (!this.instance) {
      const bounds = this.store.current.bounds;
      return bounds ? boundsContain(bounds, position) : false;
    }
    const point = this.project(position);
    return (
      point.x >= padding &&
      point.y >= padding &&
      point.x <= size.width - padding &&
      point.y <= size.height - padding
    );
  }

  /** The home view (map-f-home), or `null` when the viewport has no size to fit into. */
  homeCamera(): MapCamera | null {
    const config = this.#host.config();
    const size = this.#host.viewportSize();
    const fit = (bounds: MapBounds) =>
      size.width > 0 && size.height > 0
        ? this.#fitCameraFor(bounds, { padding: config.fitPadding })
        : null;
    if (config.defaultBounds) return fit(config.defaultBounds);
    if (config.defaultCenter)
      return this.#clampCamera(
        mergeCamera(DEFAULT_CAMERA, { center: config.defaultCenter, zoom: config.defaultZoom }),
      );
    const pins = boundsOf(this.#host.pinPositions());
    if (pins) return fit(pins);
    return this.#clampCamera(DEFAULT_CAMERA);
  }

  #fitCameraFor(bounds: MapBounds, options: { padding?: MapPadding; maxZoom?: number }): MapCamera {
    const config = this.#host.config();
    const maxZoom = Math.min(options.maxZoom ?? config.maxZoom, config.maxZoom);
    const camera =
      this.instance?.cameraForBounds?.(bounds, {
        padding: options.padding ?? config.fitPadding,
        maxZoom,
      }) ??
      fitCamera(bounds, this.#host.viewportSize(), {
        padding: options.padding ?? config.fitPadding,
        minZoom: config.minZoom,
        maxZoom,
      });
    return this.#clampCamera(camera);
  }

  #clampCamera(camera: MapCamera): MapCamera {
    const { minZoom, maxZoom } = this.#host.config();
    const zoom = Math.min(maxZoom, Math.max(minZoom, camera.zoom));
    return zoom === camera.zoom ? camera : mergeCamera(camera, { zoom });
  }

  #readCamera(): MapCamera {
    return this.#instance ? this.#instance.getCamera() : this.#camera;
  }

  #syncDerived(): void {
    const config = this.#host.config();
    const state = this.store.current;
    const ready = state.status === 'ready' && !config.disabled;
    const zoom = state.camera.zoom;
    this.store.patch({
      canZoomIn: ready && zoom < config.maxZoom - ZOOM_EPSILON,
      canZoomOut: ready && zoom > config.minZoom + ZOOM_EPSILON,
      pinCount: this.#host.pinPositions().length,
    });
  }

  /** Publishes the pre-mount camera (home view changes while idle). */
  syncPendingCamera(): void {
    if (this.#instance) return;
    if (!this.#homeApplied) this.#camera = this.#clampCamera(this.homeCamera() ?? this.#camera);
    this.store.patch({ camera: this.#camera });
    this.#syncDerived();
  }

  // Engine notifications ---------------------------------------------------------------------

  #engineCamera(reason: ChangeReason, sourceEvent: Event | undefined): void {
    // A gesture inside the engine cancels an in-flight request animation (map-f-motion).
    if (reason === 'engine' && this.#animation && sourceEvent) this.#cancelAnimation();
    this.#frameReason = this.#requestReason ?? reason;
    this.#frameEvent = sourceEvent;
    if (this.#frameHandle) return;
    const frames = this.#host.frames();
    this.#frameHandle = frames.requestAnimationFrame(() => {
      this.#frameHandle = 0;
      this.#publishCamera(true);
    });
  }

  #engineCameraEnd(reason: ChangeReason, sourceEvent: Event | undefined): void {
    this.#cancelFrame();
    // A request animation publishes its own commit when it settles.
    if (this.#animation) return;
    this.#frameReason = reason;
    this.#frameEvent = sourceEvent ?? this.#frameEvent;
    this.#publishCamera(false);
    this.#commit();
  }

  #publishCamera(moving: boolean): void {
    const instance = this.#instance;
    if (!instance) return;
    this.#camera = instance.getCamera();
    this.store.patch(
      {
        camera: this.#camera,
        bounds: instance.getBounds(),
        moving: moving || this.#animation !== null,
      },
      this.#frameReason,
    );
    this.#syncDerived();
    this.#host.frame();
    if (moving) this.#host.cameraChanged(this.#cameraDetail());
  }

  /** Emits one commit per settled camera; engines that also report their own settle are deduplicated. */
  #commit(): void {
    if (this.#committed && camerasEqual(this.#committed, this.#camera)) return;
    this.#committed = this.#camera;
    this.#host.cameraCommitted(this.#cameraDetail());
  }

  #committed: MapCamera | null = null;

  #cameraDetail(): MapCameraDetail {
    return Object.freeze({
      camera: this.#camera,
      bounds: this.#instance?.getBounds() ?? null,
      reason: this.#frameReason,
      sourceEvent: this.#frameEvent,
    });
  }

  #cancelFrame(): void {
    if (!this.#frameHandle) return;
    this.#host.frames().cancelAnimationFrame(this.#frameHandle);
    this.#frameHandle = 0;
  }

  #cancelAnimation(): void {
    const animation = this.#animation;
    this.#animation = null;
    if (!animation) return;
    animation.abort();
    this.#instance?.stop?.();
  }

  // Requests ---------------------------------------------------------------------------------

  /** The single request pipeline (map-f-request). */
  request<A extends MapRequestAction>(
    action: A,
    value: MapRequestValues[A],
    options: MapRequestOptions = {},
  ): Promise<MapRequestOutcome> {
    const reason = options.reason ?? 'programmatic';
    const detail: MapRequestDetail = Object.freeze({
      action,
      value,
      reason,
      sourceEvent: options.sourceEvent,
      trigger: options.trigger ?? null,
    });
    if (!this.#host.dispatchRequest(detail)) return Promise.resolve('cancelled');
    const fail = (error: unknown): Promise<never> => {
      this.#host.requestFailed(Object.freeze({ action, value, reason, error }));
      return Promise.reject(error);
    };
    if (this.#host.config().disabled)
      return fail(domError('NotSupportedError', 'The map is disabled.'));
    try {
      return this.#execute(action, value, reason, options).catch(fail);
    } catch (error) {
      return fail(error);
    }
  }

  async #execute<A extends MapRequestAction>(
    action: A,
    value: MapRequestValues[A],
    reason: ChangeReason,
    options: MapRequestOptions,
  ): Promise<MapRequestOutcome> {
    const config = this.#host.config();
    switch (action) {
      case 'select-pin': {
        const pin = value as string | null;
        if (pin !== null && this.#host.pinPosition(pin) === undefined)
          throw domError('NotFoundError', `No pin has the value "${pin}".`);
        return this.#host.select(pin, reason, options.sourceEvent) ? 'completed' : 'cancelled';
      }
      case 'reveal-pin': {
        const { value: pin, zoom } = value as MapRequestValues['reveal-pin'];
        const position = this.#host.pinPosition(pin);
        if (position === undefined)
          throw domError('NotFoundError', `No pin has the value "${pin}".`);
        if (position === null) return 'completed';
        const current = this.#readCamera();
        return this.#moveTo(
          mergeCamera(current, {
            center: position,
            zoom: zoom ?? config.revealZoom ?? current.zoom,
          }),
          reason,
          options.duration,
        );
      }
      case 'zoom-in':
      case 'zoom-out': {
        const step = typeof value === 'number' && Number.isFinite(value) ? Math.abs(value) : 1;
        const current = this.#readCamera();
        const zoom = current.zoom + (action === 'zoom-in' ? step : -step);
        return this.#moveTo(
          mergeCamera(current, { zoom }),
          reason,
          options.duration ?? ZOOM_STEP_DURATION,
        );
      }
      case 'reset': {
        const home = this.homeCamera();
        return home ? this.#moveTo(home, reason, options.duration) : 'completed';
      }
      case 'fly-to':
        return this.#moveTo(
          mergeCamera(this.#readCamera(), value as MapCameraTarget),
          reason,
          options.duration,
        );
      case 'fit-bounds': {
        const fit = value as MapFitValue;
        return this.#moveTo(this.#fitCameraFor(fit.bounds, fit), reason, options.duration);
      }
      case 'fit-pins': {
        const bounds = boundsOf(this.#host.pinPositions());
        if (!bounds) return 'completed';
        const fit = (value ?? {}) as NonNullable<MapRequestValues['fit-pins']>;
        return this.#moveTo(this.#fitCameraFor(bounds, fit), reason, options.duration);
      }
    }
    throw domError('NotSupportedError', `Unknown map action "${String(action)}".`);
  }

  /** Moves the camera, animated unless reduced motion resolves (map-f-motion, map-f-pre-ready). */
  async #moveTo(
    target: MapCamera,
    reason: ChangeReason,
    duration?: number,
  ): Promise<MapRequestOutcome> {
    const camera = this.#clampCamera(target);
    const instance = this.instance;
    if (!instance) {
      // Before ready: update the pending camera and resolve once applied at mount.
      this.#camera = camera;
      this.#cameraDirty = true;
      this.#homeApplied = true;
      this.store.patch({ camera }, reason);
      this.#syncDerived();
      if (!this.#engine) return 'completed';
      return new Promise((resolve) => this.#pending.push({ resolve }));
    }
    this.#cancelAnimation();
    const from = instance.getCamera();
    const animation = (this.#animation = new AbortController());
    const signal = animation.signal;
    this.#requestReason = reason;
    this.store.patch({ moving: true }, reason);
    try {
      const reduced = this.#host.reducedMotion();
      const ms = reduced
        ? 0
        : (duration ?? travelDuration(from, camera, this.#host.viewportSize()));
      if (ms <= 0 || camerasEqual(from, camera)) {
        instance.jumpTo(camera);
      } else if (instance.easeTo) {
        const options: MapAnimationOptions = { duration: ms, signal };
        await instance.easeTo(camera, options);
      } else {
        await tweenCamera(
          from,
          camera,
          ms,
          (step) => {
            instance.jumpTo(step);
            this.#engineCamera(reason, undefined);
          },
          this.#host.frames(),
          signal,
        );
      }
    } finally {
      if (this.#animation === animation) this.#animation = null;
      this.#requestReason = null;
    }
    if (signal.aborted) return 'cancelled';
    if (this.#instance === instance) {
      this.#cancelFrame();
      this.#frameReason = reason;
      this.#frameEvent = undefined;
      this.#publishCamera(false);
      this.#commit();
    }
    return 'completed';
  }
}
