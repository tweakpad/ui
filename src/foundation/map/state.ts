/**
 * Map state model and store (`sec-1812-map` map-f-state, map-f-store).
 *
 * The store publishes a frozen snapshot once per microtask; selected subscribers are notified only
 * when their slice changes (default shallow equality). Camera updates are coalesced to at most one
 * snapshot per presentation frame by the controller before they reach the store.
 */
import { ObservableStore, shallowEqual, type StoreEquality } from '../store.js';
import type { ChangeReason } from '../types.js';
import type { MapScheme } from './engine.js';
import { DEFAULT_CAMERA, type MapBounds, type MapCamera } from './geo.js';

export type MapStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface MapState {
  readonly status: MapStatus;
  readonly camera: MapCamera;
  readonly bounds: MapBounds | null;
  readonly moving: boolean;
  readonly canZoomIn: boolean;
  readonly canZoomOut: boolean;
  readonly selectedPin: string | null;
  readonly scheme: MapScheme;
  readonly error: unknown;
  readonly pinCount: number;
}

export const DEFAULT_MAP_STATE: MapState = Object.freeze({
  status: 'idle',
  camera: DEFAULT_CAMERA,
  bounds: null,
  moving: false,
  canZoomIn: false,
  canZoomOut: false,
  selectedPin: null,
  scheme: 'light',
  error: null,
  pinCount: 0,
});

export interface MapSubscribeOptions<S> {
  readonly equality?: StoreEquality<S>;
  readonly signal?: AbortSignal;
}

export class MapStore {
  readonly #store = new ObservableStore<MapState>(DEFAULT_MAP_STATE);
  #pending: Partial<{ -readonly [K in keyof MapState]: MapState[K] }> | null = null;
  #reason: ChangeReason = 'programmatic';
  #scheduled = false;
  #disposed = false;

  /** The latest published snapshot. */
  get state(): MapState {
    return this.#store.value;
  }

  /** The snapshot including unpublished changes. */
  get current(): MapState {
    return this.#pending ? { ...this.#store.value, ...this.#pending } : this.#store.value;
  }

  /** Queues a patch; every patch in the same microtask publishes atomically. */
  patch(patch: Partial<MapState>, reason: ChangeReason = 'programmatic'): void {
    if (this.#disposed) return;
    this.#pending = { ...this.#pending, ...patch };
    this.#reason = reason;
    if (this.#scheduled) return;
    this.#scheduled = true;
    queueMicrotask(() => this.flush());
  }

  /** Publishes queued changes now. */
  flush(): void {
    this.#scheduled = false;
    const pending = this.#pending;
    this.#pending = null;
    if (!pending || this.#disposed) return;
    const next = { ...this.#store.value, ...pending };
    if (shallowEqual(next, this.#store.value)) return;
    this.#store.set(Object.freeze(next), this.#reason);
  }

  subscribe<S>(
    selector: (state: MapState) => S,
    callback: (selected: S) => void,
    options: MapSubscribeOptions<S> = {},
  ): () => void {
    if (options.signal?.aborted) return () => undefined;
    const unsubscribe = this.#store.subscribe<S>((selected) => callback(selected), {
      selector,
      equality: options.equality ?? shallowEqual,
    });
    options.signal?.addEventListener('abort', unsubscribe, { once: true });
    return unsubscribe;
  }

  dispose(): void {
    this.#disposed = true;
    this.#pending = null;
  }
}
