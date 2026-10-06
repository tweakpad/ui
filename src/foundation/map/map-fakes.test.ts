import { describe, expect, it } from 'vitest';
/** Fakes for map tests: a manual frame source, a recording engine and a controller host. */
import type { ChangeReason } from '../types.js';
import type { TweenFrameSource } from './camera.js';
import type {
  MapAnimationOptions,
  MapEngine,
  MapEngineContext,
  MapEngineInstance,
  MapScheme,
} from './engine.js';
import {
  DEFAULT_CAMERA,
  type MapCamera,
  type MapPosition,
  type ViewportSize,
  projectFlat,
  unprojectFlat,
} from './geo.js';
import {
  MapController,
  type MapCameraDetail,
  type MapConfig,
  type MapControllerHost,
  type MapRequestDetail,
} from './controller.js';
import type { ResolvedMapTheme } from './theme.js';

export class ManualFrames implements TweenFrameSource {
  time = 0;
  #next = 1;
  readonly #callbacks = new Map<number, (time: number) => void>();
  requestAnimationFrame(callback: (time: number) => void): number {
    const handle = this.#next++;
    this.#callbacks.set(handle, callback);
    return handle;
  }
  cancelAnimationFrame(handle: number): void {
    this.#callbacks.delete(handle);
  }
  now(): number {
    return this.time;
  }
  get pending(): number {
    return this.#callbacks.size;
  }
  /** Runs one frame `ms` later. */
  tick(ms = 16): void {
    this.time += ms;
    const callbacks = [...this.#callbacks.values()];
    this.#callbacks.clear();
    for (const callback of callbacks) callback(this.time);
  }
  run(frames: number, ms = 16): void {
    for (let index = 0; index < frames; index++) this.tick(ms);
  }
}

export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

export interface FakeEngineOptions {
  readonly animate?: boolean;
  readonly fit?: boolean;
  readonly async?: boolean;
  readonly autoReady?: boolean;
  readonly failMount?: unknown;
}

/** A flat-projection engine that records every call. */
export class FakeEngine implements MapEngine {
  readonly name = 'fake';
  readonly calls: string[] = [];
  readonly instances: FakeInstance[] = [];
  context: MapEngineContext | null = null;
  constructor(
    readonly options: FakeEngineOptions = {},
    readonly size: ViewportSize = { width: 400, height: 300 },
  ) {}
  mount(
    _viewport: HTMLElement,
    context: MapEngineContext,
  ): MapEngineInstance | Promise<MapEngineInstance> {
    this.calls.push('mount');
    this.context = context;
    if (this.options.failMount) {
      if (this.options.async) return Promise.reject(this.options.failMount);
      throw this.options.failMount;
    }
    const instance = new FakeInstance(this, context);
    this.instances.push(instance);
    if (this.options.autoReady !== false) queueMicrotask(() => context.ready());
    return this.options.async ? Promise.resolve(instance) : instance;
  }
}

export class FakeInstance implements MapEngineInstance {
  camera: MapCamera;
  destroyed = false;
  readonly overlays = new Map<HTMLElement, MapPosition>();
  readonly appearance: Array<[MapScheme, ResolvedMapTheme | null]> = [];
  easeCalls: Array<{ camera: MapCamera; options: MapAnimationOptions; resolve: () => void }> = [];
  easeTo?: (camera: MapCamera, options: MapAnimationOptions) => Promise<void>;
  constructor(
    readonly engine: FakeEngine,
    readonly context: MapEngineContext,
  ) {
    this.camera = context.initialCamera;
    if (engine.options.animate)
      this.easeTo = (camera, options) =>
        new Promise<void>((resolve) => {
          this.easeCalls.push({ camera, options, resolve: () => resolve() });
          options.signal?.addEventListener('abort', () => resolve(), { once: true });
        });
  }
  /** Completes the last easeTo at its target. */
  finishEase(): void {
    const call = this.easeCalls.shift();
    if (!call) return;
    this.camera = call.camera;
    this.context.camera(undefined);
    call.resolve();
  }
  getCamera() {
    return this.camera;
  }
  getBounds() {
    return { south: -1, west: -1, north: 1, east: 1 };
  }
  jumpTo(camera: MapCamera) {
    this.engine.calls.push(`jumpTo:${camera.zoom.toFixed(3)}`);
    this.camera = camera;
  }
  stop() {
    this.engine.calls.push('stop');
  }
  project(position: MapPosition) {
    return projectFlat(position, this.camera, this.engine.size);
  }
  unproject(point: { x: number; y: number }) {
    return unprojectFlat(point, this.camera, this.engine.size);
  }
  attachOverlay(element: HTMLElement, position: MapPosition) {
    this.overlays.set(element, position);
    return {
      setPosition: (next: MapPosition) => void this.overlays.set(element, next),
      remove: () => void this.overlays.delete(element),
    };
  }
  setAppearance(scheme: MapScheme, theme: ResolvedMapTheme | null) {
    this.appearance.push([scheme, theme]);
  }
  destroy() {
    this.destroyed = true;
    this.engine.calls.push('destroy');
  }
  /** Simulates a user gesture inside the engine. */
  gesture(camera: MapCamera) {
    this.camera = camera;
    this.context.camera('engine', new Event('pointermove'));
  }
}

export interface HostRecord {
  type: string;
  detail?: unknown;
}

export function createHost(overrides: Partial<MapConfig> = {}) {
  const frames = new ManualFrames();
  const records: HostRecord[] = [];
  const config: { -readonly [K in keyof MapConfig]: MapConfig[K] } = {
    defaultCenter: null,
    defaultZoom: 1,
    defaultBounds: null,
    minZoom: 0,
    maxZoom: 20,
    fitPadding: 0,
    revealZoom: null,
    interactive: true,
    cooperativeGestures: false,
    disabled: false,
    ...overrides,
  };
  const pins = new Map<string, MapPosition | null>();
  const host = {
    size: { width: 400, height: 300 } as ViewportSize,
    reduced: false,
    cancel: false,
    selection: null as string | null,
    appearance: { scheme: 'light' as MapScheme, theme: null as ResolvedMapTheme | null },
    viewportElement: {} as HTMLElement,
  };
  const controllerHost: MapControllerHost = {
    viewport: () => host.viewportElement,
    viewportSize: () => host.size,
    config: () => config,
    appearance: () => host.appearance,
    pinPositions: () => [...pins.values()].filter((p): p is MapPosition => p !== null),
    pinPosition: (value) => (pins.has(value) ? pins.get(value)! : undefined),
    select: (value: string | null, reason: ChangeReason) => {
      records.push({ type: 'select', detail: { value, reason } });
      host.selection = value;
      return true;
    },
    reducedMotion: () => host.reduced,
    adoptStyles: () => () => undefined,
    frames: () => frames,
    dispatchRequest: (detail: MapRequestDetail) => {
      records.push({ type: 'request', detail });
      return !host.cancel;
    },
    requestFailed: (detail) => void records.push({ type: 'request-failed', detail }),
    ready: () => void records.push({ type: 'ready' }),
    failed: (error) => void records.push({ type: 'error', detail: error }),
    cameraChanged: (detail: MapCameraDetail) =>
      void records.push({ type: 'camera-change', detail }),
    cameraCommitted: (detail: MapCameraDetail) =>
      void records.push({ type: 'camera-commit', detail }),
    pressed: (detail) => void records.push({ type: 'press', detail }),
    frame: () => void records.push({ type: 'frame' }),
    diagnostic: (code) => void records.push({ type: 'diagnostic', detail: code }),
  };
  const controller = new MapController(controllerHost);
  return {
    controller,
    frames,
    records,
    config,
    pins,
    host,
    of: (type: string) => records.filter((r) => r.type === type),
  };
}

export { DEFAULT_CAMERA };

describe('map fakes', () => {
  it('run manual frames in order and allow cancellation', () => {
    const frames = new ManualFrames();
    const seen: number[] = [];
    frames.requestAnimationFrame((time) => seen.push(time));
    const cancelled = frames.requestAnimationFrame(() => seen.push(-1));
    frames.cancelAnimationFrame(cancelled);
    frames.tick(10);
    expect(seen).toEqual([10]);
    expect(frames.pending).toBe(0);
  });
});
