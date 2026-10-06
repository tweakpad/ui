import { CleanupScope, Scheduler, type Diagnostic } from '../services.js';
import {
  ObservableStore,
  shallowEqual,
  type SelectedStoreSubscriber,
  type StoreChange,
  type StoreEquality,
} from '../store.js';
import type { ChangeReason } from '../types.js';
import { ActivityOwner, DEFAULT_IDLE_DELAY } from './activity.js';
import type { MediaAvailability } from './availability.js';
import type {
  MediaAttachTarget,
  MediaRequestDetail,
  MediaRequestFailedDetail,
  MediaStoreHooks,
} from './events.js';
import type { MediaFeature, MediaFeatureContext } from './features/context.js';
import { errorFeature } from './features/error.js';
import { liveFeature } from './features/live.js';
import { metadataFeature } from './features/metadata.js';
import { playbackFeature } from './features/playback.js';
import {
  fullscreenFeature,
  orientationTarget,
  pictureInPictureFeature,
} from './features/presentation.js';
import { rateFeature } from './features/rate.js';
import { remotePlaybackFeature } from './features/remote.js';
import { bufferFeature, sourceFeature } from './features/source.js';
import { textTrackFeature } from './features/text-tracks.js';
import { timeFeature } from './features/time.js';
import { audioTrackFeature, qualityFeature } from './features/tracks.js';
import { probeVolume, volumeFeature } from './features/volume.js';
import { MediaPresentation } from './presentation.js';
import {
  MediaRequests,
  normalizePlaybackRates,
  type MediaRequestAction,
  type MediaRequestArgs,
  type MediaRequestContext,
  type MediaRequestOutcome,
} from './requests.js';
import {
  DEFAULT_MEDIA_CONFIG,
  DEFAULT_MEDIA_SOURCE,
  DEFAULT_PLAYBACK_RATES,
  deriveMediaState,
  freezeMediaValue,
  sameMediaValue,
  type MediaOrientationLock,
  type MediaSourcePatch,
  type MediaSourceState,
  type MediaState,
  type MediaStateChange,
  type MediaStateKey,
  type MediaStoreConfig,
  type MediaStreamTypeConfig,
} from './state.js';
import {
  isMediaAudioTrackCapable,
  isMediaBufferCapable,
  isMediaContentDataCapable,
  isMediaErrorCapable,
  isMediaLiveCapable,
  isMediaMutedCapable,
  isMediaPictureInPictureCapable,
  isMediaPlaybackCapable,
  isMediaRateCapable,
  isMediaRemotePlaybackCapable,
  isMediaSeekCapable,
  isMediaSourceCapable,
  isMediaStreamTypeCapable,
  isMediaTextTrackCapable,
  isMediaVideoDimensionsCapable,
  isMediaVideoRenditionCapable,
  isMediaVolumeCapable,
  isWebKitAirPlayCapable,
  mediaOwnerDocument,
  type MediaTarget,
  type MediaTracksAdapter,
} from './target.js';

/** Every feature slice, in attach order. */
export const MEDIA_FEATURES: readonly MediaFeature[] = Object.freeze([
  sourceFeature,
  bufferFeature,
  playbackFeature,
  timeFeature,
  volumeFeature,
  rateFeature,
  errorFeature,
  metadataFeature,
  fullscreenFeature,
  pictureInPictureFeature,
  remotePlaybackFeature,
  textTrackFeature,
  audioTrackFeature,
  qualityFeature,
  liveFeature,
]);

/** Which capability groups the attached target implements. */
export interface MediaCapabilities {
  readonly playback: boolean;
  readonly seek: boolean;
  readonly source: boolean;
  readonly buffer: boolean;
  readonly volume: boolean;
  readonly muted: boolean;
  readonly rate: boolean;
  readonly error: boolean;
  readonly textTracks: boolean;
  readonly audioTracks: boolean;
  readonly videoRenditions: boolean;
  readonly pictureInPicture: boolean;
  readonly remotePlayback: boolean;
  readonly streamType: boolean;
  readonly live: boolean;
  readonly contentData: boolean;
  readonly videoDimensions: boolean;
}

export const NO_MEDIA_CAPABILITIES: MediaCapabilities = Object.freeze({
  playback: false,
  seek: false,
  source: false,
  buffer: false,
  volume: false,
  muted: false,
  rate: false,
  error: false,
  textTracks: false,
  audioTracks: false,
  videoRenditions: false,
  pictureInPicture: false,
  remotePlayback: false,
  streamType: false,
  live: false,
  contentData: false,
  videoDimensions: false,
});

export function mediaCapabilities(
  media: MediaTarget,
  adapter: MediaTracksAdapter | null = null,
  view?: Window | null,
): MediaCapabilities {
  return Object.freeze({
    playback: isMediaPlaybackCapable(media),
    seek: isMediaSeekCapable(media),
    source: isMediaSourceCapable(media),
    buffer: isMediaBufferCapable(media),
    volume: isMediaVolumeCapable(media),
    muted: isMediaMutedCapable(media),
    rate: isMediaRateCapable(media),
    error: isMediaErrorCapable(media),
    textTracks: isMediaTextTrackCapable(media),
    audioTracks: Boolean(adapter?.audioTracks) || isMediaAudioTrackCapable(media),
    videoRenditions: Boolean(adapter?.videoRenditions) || isMediaVideoRenditionCapable(media),
    pictureInPicture: isMediaPictureInPictureCapable(media),
    remotePlayback: isMediaRemotePlaybackCapable(media) || isWebKitAirPlayCapable(media, view),
    streamType: isMediaStreamTypeCapable(media),
    live: isMediaLiveCapable(media),
    contentData: isMediaContentDataCapable(media),
    videoDimensions: isMediaVideoDimensionsCapable(media),
  });
}

/** Configuration input; `playbackRates` is validated (invalid entries produce a diagnostic). */
export interface MediaStoreConfigInput {
  readonly contentTitle?: string | null | undefined;
  readonly poster?: string | null | undefined;
  readonly playbackRates?: readonly unknown[] | null | undefined;
  readonly streamType?: MediaStreamTypeConfig | undefined;
  readonly orientationLock?: MediaOrientationLock | undefined;
}

export interface MediaStoreTarget extends MediaAttachTarget {
  readonly adapter?: MediaTracksAdapter | null;
}

export interface MediaStoreOptions {
  /** Event dispatch and diagnostics; see `createMediaEventHooks`. Missing hooks are no-ops. */
  readonly hooks?: Partial<MediaStoreHooks>;
  readonly config?: MediaStoreConfigInput;
  /** Idle delay in milliseconds (`≤ 0` disables autohide). Defaults to 2000. */
  readonly idleDelay?: number;
  /** Locale used for caption locale matching. */
  readonly locale?: () => string | undefined;
  /** Whether a gesture binding claims a touch tap (the activity owner then leaves it alone). */
  readonly claimsTap?: (event: PointerEvent) => boolean;
  /** Overrides the volume probe (tests, custom platforms). */
  readonly probeVolume?: ((document: Document | undefined) => MediaAvailability) | undefined;
  /** Overrides the feature slices (tests). */
  readonly features?: readonly MediaFeature[];
  /** Clock in milliseconds. Defaults to `Date.now`. */
  readonly now?: () => number;
  /** How long after a request settles its element-originated changes keep its reason. */
  readonly attributionGrace?: number;
}

/** Selected subscription; `equality` defaults to `shallowEqual`. */
export interface MediaSelectOptions<S> {
  readonly selector: (state: MediaState) => S;
  readonly equality?: StoreEquality<S>;
  readonly emitCurrent?: boolean;
}

interface Attribution {
  readonly reason: ChangeReason;
  expires: number;
}

interface PendingBatch {
  readonly reasons: Map<MediaStateKey, ChangeReason>;
  reason: ChangeReason | undefined;
}

const noop = () => undefined;

/**
 * One media store per player (`mp-f-scope`, `mp-f-store`). It mirrors the attached media into a
 * frozen snapshot whose source and derived values change atomically, publishes once per
 * microtask, and notifies selected subscribers only when their slice changes (shallow equality by
 * default). Requests go through one pipeline (`request`). User configuration survives detach.
 */
export class MediaStore {
  readonly #options: MediaStoreOptions;
  readonly #features: readonly MediaFeature[];
  readonly #store: ObservableStore<MediaState>;
  readonly #requests: MediaRequests;
  readonly #presentation: MediaPresentation;
  readonly #activity: ActivityOwner;
  readonly #changeListeners = new Set<(change: MediaStateChange) => void>();
  readonly #attributions = new Map<MediaStateKey, Attribution>();
  #hooks: Partial<MediaStoreHooks>;
  #config: MediaStoreConfig;
  #source: MediaSourceState;
  #snapshot: MediaState;
  #published: MediaState;
  #pending: PendingBatch | undefined;
  #target: (MediaStoreTarget & { readonly adapter: MediaTracksAdapter | null }) | null = null;
  #scope: CleanupScope | undefined;
  #capabilities: MediaCapabilities = NO_MEDIA_CAPABILITIES;
  #idleDelay: number;
  #disabled = false;
  #destroyed = false;

  constructor(options: MediaStoreOptions = {}) {
    this.#options = options;
    this.#hooks = options.hooks ?? {};
    this.#features = options.features ?? MEDIA_FEATURES;
    this.#idleDelay = options.idleDelay ?? DEFAULT_IDLE_DELAY;
    this.#config = DEFAULT_MEDIA_CONFIG;
    this.#source = DEFAULT_MEDIA_SOURCE;
    this.#snapshot = freezeMediaValue(deriveMediaState(this.#source, this.#config));
    this.#published = this.#snapshot;
    this.#store = new ObservableStore(this.#snapshot);
    this.#presentation = new MediaPresentation(() =>
      this.#target ? { media: this.#target.media, container: this.#target.container } : null,
    );
    this.#activity = new ActivityOwner({
      idleDelay: () => this.#idleDelay,
      visible: () => this.#snapshot.controlsVisible,
      onChange: ({ userActive, locked, reason }) =>
        this.#write({ userActive, controlsLocked: locked }, reason),
      ...(options.claimsTap ? { claimsTap: options.claimsTap } : {}),
    });
    const live = (read: () => unknown): PropertyDescriptor => ({ get: read, enumerable: true });
    const context = Object.defineProperties(
      {
        presentation: this.#presentation,
        activity: this.#activity,
        locale: () => options.locale?.() ?? globalThis.navigator?.language,
        set: (patch: MediaSourcePatch, reason: ChangeReason) => this.#write(patch, reason),
        attribute: (
          keys: readonly MediaStateKey[],
          reason: ChangeReason,
          until: Promise<unknown>,
        ) => this.#attribute(keys, reason, until),
        dispatchRequest: (detail: MediaRequestDetail) =>
          this.#hooks.dispatchRequest?.(detail) ?? true,
        requestFailed: (detail: MediaRequestFailedDetail) => this.#hooks.requestFailed?.(detail),
        diagnostic: (diagnostic: Diagnostic) => this.#diagnostic(diagnostic),
      },
      {
        attached: live(() => this.attached),
        media: live(() => this.#target?.media ?? null),
        adapter: live(() => this.#target?.adapter ?? null),
        disabled: live(() => this.#disabled),
        state: live(() => this.#snapshot),
      },
    ) as MediaRequestContext;
    this.#requests = new MediaRequests(context);
    if (options.config) this.configure(options.config);
  }

  /** The latest snapshot (committed; publication to subscribers follows in a microtask). */
  get state(): MediaState {
    return this.#snapshot;
  }

  /** The snapshot most recently delivered to subscribers. */
  get published(): MediaState {
    return this.#published;
  }

  get attached(): boolean {
    return this.#target !== null && !this.#destroyed;
  }

  get destroyed(): boolean {
    return this.#destroyed;
  }

  /** The attached media and container, or `null`. */
  get target(): MediaAttachTarget | null {
    return this.#target ? { media: this.#target.media, container: this.#target.container } : null;
  }

  get media(): MediaTarget | null {
    return this.#target?.media ?? null;
  }

  get container(): HTMLElement | null {
    return this.#target?.container ?? null;
  }

  /** Capability groups of the attached target (all `false` when detached). */
  get capabilities(): MediaCapabilities {
    return this.#capabilities;
  }

  get config(): MediaStoreConfig {
    return this.#config;
  }

  /** The activity and idle owner: leases, focus/hover tracking and the container listeners. */
  get activity(): ActivityOwner {
    return this.#activity;
  }

  get presentation(): MediaPresentation {
    return this.#presentation;
  }

  /** A disabled player rejects requests with `NotSupportedError`; playback continues. */
  get disabled(): boolean {
    return this.#disabled;
  }

  set disabled(value: boolean) {
    this.#disabled = value;
  }

  get idleDelay(): number {
    return this.#idleDelay;
  }

  set idleDelay(value: number) {
    this.#idleDelay = Number.isNaN(value) ? DEFAULT_IDLE_DELAY : value;
    if (this.#idleDelay <= 0) this.#activity.toggle(true, 'programmatic');
    else this.#activity.restart();
  }

  /** Replaces the event hooks (for example, after the host is upgraded). */
  setHooks(hooks: Partial<MediaStoreHooks>): void {
    this.#hooks = hooks;
  }

  /** Updates user-owned configuration; it survives detach. */
  configure(input: MediaStoreConfigInput): void {
    const next: { -readonly [K in keyof MediaStoreConfig]: MediaStoreConfig[K] } = {
      ...this.#config,
    };
    if ('contentTitle' in input) next.contentTitle = input.contentTitle;
    if ('poster' in input) next.poster = input.poster;
    if ('streamType' in input)
      next.streamType =
        input.streamType === 'live' || input.streamType === 'on-demand' ? input.streamType : 'auto';
    if ('orientationLock' in input) next.orientationLock = input.orientationLock || 'none';
    if ('playbackRates' in input) {
      const { rates, invalid } = normalizePlaybackRates(
        input.playbackRates ?? undefined,
        DEFAULT_PLAYBACK_RATES,
      );
      if (invalid.length)
        this.#diagnostic({
          code: 'media-invalid-playback-rates',
          message: 'Playback rates must be finite positive numbers; invalid entries were ignored.',
          severity: 'warning',
          context: { invalid },
        });
      next.playbackRates = rates;
    }
    this.#config = Object.freeze(next);
    this.#commit('programmatic');
    if (this.#target)
      this.#presentation.syncOrientation(
        orientationTarget({ config: () => this.#config }, this.#snapshot.fullscreen),
      );
  }

  /**
   * Attaches to `{media, container, adapter}`. A different media, container or adapter detaches
   * the previous target first (controls leases are kept); the same target is a no-op.
   */
  attach(target: MediaStoreTarget): void {
    if (this.#destroyed) return;
    const container = target.container ?? null;
    const adapter = target.adapter ?? null;
    const current = this.#target;
    if (
      current &&
      current.media === target.media &&
      current.container === container &&
      current.adapter === adapter
    )
      return;
    if (current) this.#detachTarget();
    const media = target.media;
    this.#target = { media, container, adapter };
    const scope = (this.#scope = new CleanupScope((error) => this.#featureError('detach', error)));
    const document = mediaOwnerDocument(media, container);
    const view = document?.defaultView ?? undefined;
    this.#capabilities = mediaCapabilities(media, adapter, view);
    if (container) this.#activity.attach(container);
    else this.#activity.detach();
    const context: MediaFeatureContext = {
      media,
      container,
      adapter,
      document,
      window: view,
      scope,
      presentation: this.#presentation,
      source: () => this.#source,
      state: () => this.#snapshot,
      config: () => this.#config,
      set: (patch, reason = 'media') => {
        if (this.#scope === scope) this.#write(patch, reason);
      },
      listen: (eventTarget, type, listener) => {
        if (!eventTarget) return;
        const guarded = (event: Event) => {
          try {
            listener(event);
          } catch (error) {
            this.#featureError(type, error);
          }
        };
        eventTarget.addEventListener(type, guarded);
        scope.add(() => eventTarget.removeEventListener(type, guarded));
      },
      diagnostic: (diagnostic) => this.#diagnostic(diagnostic),
      probeVolume: () => (this.#options.probeVolume ?? probeVolume)(document),
    };
    for (const feature of this.#features) {
      try {
        feature.attach(context);
      } catch (error) {
        this.#featureError(feature.name, error);
      }
    }
    // Playback starting restarts the idle delay while the user is active.
    context.listen(media, 'play', () => this.#activity.restart());
    this.#hooks.attach?.({ media, container });
  }

  /**
   * Detaches synchronously (`mp-f-lifecycle`): listeners, observers, pending seeks and controls
   * leases are released and source state resets to defaults; configuration is kept.
   */
  detach(): void {
    if (this.#target) this.#detachTarget();
    this.#activity.detach();
    this.#activity.reset();
    this.#write({ userActive: true, controlsLocked: false }, 'programmatic');
  }

  /** Re-reads every slice from the attached target (for example, after an attribute change). */
  refresh(): void {
    const target = this.#target;
    if (!target) return;
    this.#detachTarget();
    this.attach(target);
  }

  /** Final teardown. Requests then reject with `InvalidStateError`. */
  destroy(): void {
    if (this.#destroyed) return;
    this.detach();
    this.#activity.dispose();
    this.#destroyed = true;
    this.#changeListeners.clear();
    this.#attributions.clear();
  }

  /**
   * Observes published snapshots. With `selector`, the listener runs only when the selected value
   * changes under `equality` (default `shallowEqual`), so time updates do not reach subscribers
   * that do not select time.
   */
  subscribe(listener: (state: MediaState, change: StoreChange<MediaState>) => void): () => void;
  subscribe<S>(
    listener: SelectedStoreSubscriber<NoInfer<S>>,
    options: MediaSelectOptions<S>,
  ): () => void;
  subscribe<S>(
    listener:
      ((state: MediaState, change: StoreChange<MediaState>) => void) | SelectedStoreSubscriber<S>,
    options?: MediaSelectOptions<S>,
  ): () => void {
    if (!options)
      return this.#store.subscribe((change) =>
        (listener as (state: MediaState, change: StoreChange<MediaState>) => void)(
          change.value,
          change,
        ),
      );
    return this.#store.subscribe<S>(listener as SelectedStoreSubscriber<S>, {
      selector: options.selector,
      equality: options.equality ?? shallowEqual,
      ...(options.emitCurrent ? { emitCurrent: true } : {}),
    });
  }

  /** Observes each published batch with per-key reasons (for the announcement policy). */
  onStateChange(listener: (change: MediaStateChange) => void): () => void {
    if (this.#destroyed) return noop;
    this.#changeListeners.add(listener);
    return () => this.#changeListeners.delete(listener);
  }

  /** The media request pipeline (`mp-f-request`). */
  request<A extends MediaRequestAction>(
    action: A,
    ...args: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    return this.#requests.request(action, ...args);
  }

  /** The availability gating `action` right now. */
  requestAvailability(action: MediaRequestAction): MediaAvailability {
    return this.#requests.availability(action);
  }

  /** A reference-counted controls lease with an idempotent release. */
  requestControlsLock(reason?: string): () => void {
    return this.#activity.requestLock(reason);
  }

  #diagnostic(diagnostic: Diagnostic): void {
    if (this.#hooks.diagnostic) this.#hooks.diagnostic(diagnostic);
    else console.warn(`[tp-media] ${diagnostic.code}: ${diagnostic.message}`, diagnostic.context);
  }

  #featureError(name: string, error: unknown): void {
    this.#diagnostic({
      code: 'media-feature-error',
      message: `The media ${name} handler failed; other features continue.`,
      severity: 'error',
      context: { error },
    });
  }

  #detachTarget(): void {
    const target = this.#target;
    if (!target) return;
    this.#requests.reset();
    const scope = this.#scope;
    this.#scope = undefined;
    scope?.dispose();
    this.#presentation.syncOrientation(null);
    this.#target = null;
    this.#capabilities = NO_MEDIA_CAPABILITIES;
    this.#attributions.clear();
    this.#source = {
      ...DEFAULT_MEDIA_SOURCE,
      userActive: this.#source.userActive,
      controlsLocked: this.#source.controlsLocked,
    };
    this.#commit('programmatic');
    this.#hooks.detach?.({ media: target.media, container: target.container });
  }

  #now(): number {
    return this.#options.now?.() ?? Date.now();
  }

  #attribute(keys: readonly MediaStateKey[], reason: ChangeReason, until: Promise<unknown>): void {
    const attribution: Attribution = { reason, expires: Number.POSITIVE_INFINITY };
    for (const key of keys) this.#attributions.set(key, attribution);
    const settle = () => {
      attribution.expires = this.#now() + (this.#options.attributionGrace ?? 1000);
    };
    until.then(settle, settle);
  }

  #takeAttribution(key: MediaStateKey): ChangeReason | undefined {
    const attribution = this.#attributions.get(key);
    if (!attribution) return undefined;
    this.#attributions.delete(key);
    return attribution.expires >= this.#now() ? attribution.reason : undefined;
  }

  #write(patch: MediaSourcePatch, reason: ChangeReason): void {
    if (this.#destroyed) return;
    const source = this.#source as unknown as Record<string, unknown>;
    let next: Record<string, unknown> | undefined;
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined && !(key in DEFAULT_MEDIA_SOURCE)) continue;
      if (sameMediaValue(source[key], value)) continue;
      next ??= { ...source };
      next[key] = freezeMediaValue(value);
    }
    if (!next) return;
    this.#source = next as unknown as MediaSourceState;
    this.#commit(reason);
  }

  #commit(reason: ChangeReason): void {
    const derived = deriveMediaState(this.#source, this.#config) as unknown as Record<
      string,
      unknown
    >;
    const previous = this.#snapshot as unknown as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    const changed: MediaStateKey[] = [];
    for (const key of Object.keys(derived)) {
      if (sameMediaValue(previous[key], derived[key])) next[key] = previous[key];
      else {
        next[key] = freezeMediaValue(derived[key]);
        changed.push(key as MediaStateKey);
      }
    }
    if (!changed.length) return;
    this.#snapshot = Object.freeze(next) as unknown as MediaState;
    const pending = (this.#pending ??= this.#schedule());
    for (const key of changed) {
      const keyReason = reason === 'media' ? (this.#takeAttribution(key) ?? 'media') : reason;
      pending.reasons.set(key, keyReason);
      if (keyReason !== 'media') pending.reason = keyReason;
    }
  }

  #schedule(): PendingBatch {
    queueMicrotask(() => this.#flush());
    return { reasons: new Map(), reason: undefined };
  }

  #flush(): void {
    const pending = this.#pending;
    this.#pending = undefined;
    if (!pending || this.#destroyed) return;
    const previousState = this.#published;
    const state = this.#snapshot;
    const changed = (Object.keys(state) as MediaStateKey[]).filter(
      (key) => !Object.is(previousState[key], state[key]),
    );
    if (!changed.length) return;
    const reasons: Partial<Record<MediaStateKey, ChangeReason>> = {};
    for (const key of changed) reasons[key] = pending.reasons.get(key) ?? 'media';
    const reason = pending.reason ?? 'media';
    this.#published = state;
    this.#store.set(state, reason);
    const change: MediaStateChange = Object.freeze({
      changed: Object.freeze(changed),
      state,
      previousState,
      reason,
      reasons: Object.freeze(reasons),
    });
    for (const listener of [...this.#changeListeners]) {
      try {
        listener(change);
      } catch (error) {
        this.#featureError('state-change listener', error);
      }
    }
    this.#hooks.stateChange?.({ changed: change.changed, state, previousState, reason });
    if (!previousState.error && state.error) this.#hooks.error?.({ error: state.error });
  }
}

/**
 * Defers destruction two animation frames (`mp-f-lifecycle`), so a DOM move that reconnects within
 * that window keeps the store. Returns the cancel operation reconnection calls. Without
 * `requestAnimationFrame` the frames fall back to timeouts.
 */
export function deferMediaDestroy(view: Window | undefined, destroy: () => void): () => void {
  const scheduler = new Scheduler(view);
  const frame = (callback: () => void) =>
    view && typeof view.requestAnimationFrame === 'function'
      ? scheduler.animationFrame(callback)
      : scheduler.timeout(callback, 16);
  frame(() => frame(() => destroy()));
  return () => scheduler.dispose();
}
