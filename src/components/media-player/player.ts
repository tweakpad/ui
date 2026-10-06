import { css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import type { ReactiveControllerHost } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { composedContains, composedParent, deepActiveElement } from '../../foundation/focus.js';
import { interactiveTargetInPath } from '../../foundation/interactive-target.js';
import { KeyBindingOwner, type KeyShortcut } from '../../foundation/key-bindings.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import {
  CleanupScope,
  Scheduler,
  resolveLocale,
  type Diagnostic,
} from '../../foundation/services.js';
import { shallowEqual } from '../../foundation/store.js';
import { TapGestureRecognizer } from '../../foundation/tap-gestures.js';
import type { LiveAnnouncer } from '../../foundation/announcer.js';
import {
  MediaAnnouncementPolicy,
  createMediaLiveAnnouncer,
} from '../../foundation/media/announcements.js';
import type { MediaAvailability } from '../../foundation/media/availability.js';
import {
  MEDIA_REGISTER_EVENT,
  createMediaEventHooks,
  type MediaRegisterDetail,
} from '../../foundation/media/events.js';
import {
  createMediaMessages,
  type MediaMessagesResolver,
  type MediaPlayerMessages,
} from '../../foundation/media/messages.js';
import { MediaRegistrations, discoverMedia } from '../../foundation/media/registration.js';
import type {
  MediaRequestAction,
  MediaRequestArgs,
  MediaRequestOutcome,
} from '../../foundation/media/requests.js';
import {
  DEFAULT_PLAYBACK_RATES,
  type MediaOrientationLock,
  type MediaState,
  type MediaStreamTypeConfig,
} from '../../foundation/media/state.js';
import { MediaStore, deferMediaDestroy } from '../../foundation/media/store.js';
import type { MediaTarget, MediaTracksAdapter } from '../../foundation/media/target.js';
import {
  closeMediaPopups,
  mediaPlayerBrand,
  type MediaPlayerApi,
  type MediaSubscribeOptions,
} from './context.js';
import { resolveMediaGestures, type MediaGestureInput } from './gestures.js';
import {
  mediaInputInactive,
  resolveMediaHotkeys,
  type MediaHotkeyInput,
  type MediaStepConfig,
} from './hotkeys.js';
import {
  MEDIA_CONTAINER_MARKERS,
  mediaContainerMarkers,
  mediaTypeOf,
  type MediaType,
} from './markers.js';
import { mediaContainerStyles } from './styles.js';

export type MediaHotkeysMode = 'default' | 'none';
export type MediaHotkeyScope = 'player' | 'document';
export type MediaGesturesMode = 'default' | 'none';
export type MediaAnnouncementsMode = 'polite' | 'off';

export const DEFAULT_SEEK_STEP = 10;
export const DEFAULT_VOLUME_STEP = 0.05;
export const DEFAULT_MEDIA_IDLE_DELAY = 2000;

/** `playback-rates="0.5 1 1.5"`: whitespace-separated numbers; validation happens in the store. */
export const playbackRatesConverter = {
  fromAttribute(value: string | null): readonly number[] {
    if (value === null) return DEFAULT_PLAYBACK_RATES;
    return value
      .trim()
      .split(/[\s,]+/u)
      .filter(Boolean)
      .map((entry) => Number(entry));
  },
  toAttribute(value: readonly number[] | null | undefined): string | null {
    return value ? value.join(' ') : null;
  },
};

/** Registered declarative bindings (`tp-media-hotkey`, `tp-media-gesture`). */
export type MediaHotkeySource = MediaHotkeyInput & object;
export type MediaGestureSource = MediaGestureInput & object;

interface Relay<S> {
  readonly selector: (state: MediaState) => S;
  readonly callback: (selected: S) => void;
  readonly equality: (previous: S, next: S) => boolean;
  last: S;
  unsubscribe: (() => void) | undefined;
}

const CONFIG_PROPERTIES = [
  'contentTitle',
  'poster',
  'playbackRates',
  'streamType',
  'orientationLock',
] as const;
const BINDING_PROPERTIES = [
  'hotkeys',
  'hotkeyScope',
  'gestures',
  'seekStep',
  'volumeStep',
] as const;
/** Root configuration constituents read directly (re-rendered when it changes). */
const CONSTITUENT_PROPERTIES = [
  'messages',
  'locale',
  'disabled',
  'hideOverControls',
  'seekStep',
  'volumeStep',
  'hotkeys',
] as const;

/**
 * `tp-media-player`: the media player root and provider (`sec-1810-media-player`, Library
 * `ucl21-media-player`). It owns one `MediaStore`, discovers its media (registered custom media,
 * else the first `<video>`/`<audio>` in its light DOM), attaches the store to `{media, container}`,
 * and publishes state markers and ARIA on the container. The container is the root itself unless
 * a `tp-media-container` descendant is present. The root renders no visual structure: it is
 * `display: contents` unless it is the container.
 *
 * @fires tp-media-request - Cancelable proposal for every change (`detail.action`, `value`,
 *   `reason`, `sourceEvent`, `trigger`).
 * @fires tp-media-request-failed - A request was refused or failed (`detail.error`).
 * @fires tp-media-state-change - Published state batch (`changed`, `state`, `previousState`, `reason`).
 * @fires tp-media-error - The media error became non-null.
 * @fires tp-media-attach - The store attached to `{media, container}`.
 * @fires tp-media-detach - The store detached from `{media, container}`.
 * @fires tp-diagnostic - Configuration and discovery diagnostics (not localized).
 * @slot - The media element and all constituents.
 */
export class TpMediaPlayer extends TpElement implements MediaPlayerApi {
  static tagName = 'tp-media-player';

  static override properties: PropertyDeclarations = {
    ...TpElement.properties,
    contentTitle: { type: String, attribute: 'content-title' },
    poster: { type: String },
    streamType: { type: String, attribute: 'stream-type' },
    playbackRates: { attribute: 'playback-rates', converter: playbackRatesConverter },
    seekStep: { type: Number, attribute: 'seek-step' },
    volumeStep: { type: Number, attribute: 'volume-step' },
    idleDelay: { type: Number, attribute: 'idle-delay' },
    hideOverControls: { type: Boolean, attribute: 'hide-over-controls' },
    hotkeys: { type: String },
    hotkeyScope: { type: String, attribute: 'hotkey-scope' },
    gestures: { type: String },
    orientationLock: { type: String, attribute: 'orientation-lock' },
    announcements: { type: String },
    messages: { attribute: false },
    locale: { type: String },
    mediaAdapter: { attribute: false },
  };

  static override styles = [
    TpElement.styles,
    mediaContainerStyles,
    css`
      :host {
        display: contents;
      }

      /* Disabling the player disables its controls; it never dims or blocks the media. */
      :host([disabled]),
      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }
    `,
  ];

  readonly [mediaPlayerBrand] = true as const;

  /** Title; falls back to media content data. An authored `''` stops the fallback. */
  contentTitle: string | null = null;
  /** Poster URL; falls back to media content data, then `video.poster`. */
  poster: string | null = null;
  streamType: MediaStreamTypeConfig = 'auto';
  /** Rate options; must be sorted and positive (invalid entries are diagnosed and ignored). */
  playbackRates: readonly number[] = DEFAULT_PLAYBACK_RATES;
  /** Seconds for seek hotkeys, gestures and seek buttons without a value. */
  seekStep = DEFAULT_SEEK_STEP;
  /** Volume step (0–1) for hotkeys and indicators. */
  volumeStep = DEFAULT_VOLUME_STEP;
  /** Controls autohide delay in milliseconds; `≤ 0` disables autohide. */
  idleDelay = DEFAULT_MEDIA_IDLE_DELAY;
  /** Allow hiding while the pointer is over the controls. */
  hideOverControls = false;
  /** `default` registers the default key map; `none` keeps only `tp-media-hotkey` bindings. */
  hotkeys: MediaHotkeysMode = 'default';
  /** `player` listens on the container; `document` routes to the most recently active player. */
  hotkeyScope: MediaHotkeyScope = 'player';
  /** `default` registers the default video tap-gesture set. */
  gestures: MediaGesturesMode = 'none';
  /** Lock the screen orientation while fullscreen. */
  orientationLock: MediaOrientationLock = 'none';
  /** `off` disables the status live region. */
  announcements: MediaAnnouncementsMode = 'polite';
  /** Localized strings with English fallbacks, inherited by constituents. */
  messages: MediaPlayerMessages = {};
  /** Formatting locale (never selects translations). Empty: `lang`, then the document. */
  locale = '';
  /** Engine-provided renditions and audio tracks. */
  mediaAdapter: MediaTracksAdapter | null = null;

  #store: MediaStore;
  readonly #registrations = new MediaRegistrations(() => this.#scheduleReconcile());
  readonly #relays = new Set<Relay<unknown>>();
  readonly #constituents = new Set<ReactiveControllerHost>();
  readonly #hotkeySources = new Set<MediaHotkeySource>();
  readonly #gestureSources = new Set<MediaGestureSource>();
  #connection: CleanupScope | undefined;
  #scheduler: Scheduler | undefined;
  #containerScope: CleanupScope | undefined;
  #container: HTMLElement | null = null;
  #containerAria: OwnedAttributes | undefined;
  #containerMarkers: OwnedAttributes | undefined;
  #mediaType: MediaType | null = null;
  #keyOwner: KeyBindingOwner | undefined;
  #recognizer: TapGestureRecognizer | undefined;
  #hotkeyReleases: Array<() => void> = [];
  #gestureReleases: Array<() => void> = [];
  #announcer: LiveAnnouncer | undefined;
  #policy: MediaAnnouncementPolicy | undefined;
  #policyRelease: (() => void) | undefined;
  #cancelDestroy: (() => void) | undefined;
  #reconcileQueued = false;
  #bindingsQueued = false;
  #noMediaDiagnosed = false;
  #interactionLocks = 0;
  #nativeFullscreen = 0;
  #messagesSource: MediaPlayerMessages | null | undefined;
  #messagesResolver: MediaMessagesResolver = createMediaMessages();
  #controlsObserver: ResizeObserver | undefined;
  readonly #controlsRegions = new Set<HTMLElement>();
  #controlsBlockSize = 0;
  #controlsVisible = true;
  #fullscreen = false;

  constructor() {
    super();
    this.#store = this.#createStore();
    this.#subscribeInternal();
  }

  // ---------------------------------------------------------------------------------------------
  // Read-only API

  /** The latest frozen state snapshot. */
  get state(): MediaState {
    return this.#store.state;
  }

  /** The attached media target, or `null`. */
  get media(): MediaTarget | null {
    return this.#store.media;
  }

  /** The container: a `tp-media-container` descendant, else this root (`null` before connection). */
  get container(): HTMLElement | null {
    return this.#container;
  }

  /** Whether media is attached. */
  get attached(): boolean {
    return this.#store.attached;
  }

  /** The formatting locale in effect. */
  get resolvedLocale(): string | undefined {
    if (this.locale) return this.locale;
    return typeof this.getAttribute === 'function' && this.ownerDocument
      ? resolveLocale(this)
      : undefined;
  }

  /** Root messages resolver (English fallbacks under `messages`). */
  get mediaMessages(): MediaMessagesResolver {
    if (this.#messagesSource !== this.messages) {
      this.#messagesSource = this.messages;
      this.#messagesResolver = createMediaMessages(this.messages);
    }
    return this.#messagesResolver;
  }

  // ---------------------------------------------------------------------------------------------
  // Requests

  /**
   * Proposes a media change through the request pipeline (`mp-f-request`): a cancelable
   * `tp-media-request`, gating (disabled player, capability), execution and
   * `tp-media-request-failed`. Before attach it rejects with `InvalidStateError`.
   */
  request<A extends MediaRequestAction>(
    action: A,
    ...args: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    const fullscreen = action === 'request-fullscreen' || action === 'toggle-fullscreen';
    if (fullscreen) this.#nativeFullscreen++;
    const result = this.#store.request(action, ...args);
    if (fullscreen) {
      const release = () => {
        this.#nativeFullscreen--;
      };
      result.then(release, release);
    }
    return result;
  }

  /** Availability gating `action` right now. */
  requestAvailability(action: MediaRequestAction): MediaAvailability {
    return this.#store.requestAvailability(action);
  }

  play(): Promise<MediaRequestOutcome<'play'>> {
    return this.request('play');
  }
  pause(): Promise<MediaRequestOutcome<'pause'>> {
    return this.request('pause');
  }
  togglePaused(): Promise<MediaRequestOutcome<'toggle-paused'>> {
    return this.request('toggle-paused');
  }
  /** Seeks to `time` seconds; resolves the actual position after `seeked`. */
  seek(time: number): Promise<MediaRequestOutcome<'seek'>> {
    return this.request('seek', time);
  }
  seekBy(delta: number): Promise<MediaRequestOutcome<'seek-by'>> {
    return this.request('seek-by', delta);
  }
  seekToLiveEdge(): Promise<MediaRequestOutcome<'seek-to-live-edge'>> {
    return this.request('seek-to-live-edge');
  }
  setVolume(volume: number): Promise<MediaRequestOutcome<'set-volume'>> {
    return this.request('set-volume', volume);
  }
  setMuted(muted: boolean): Promise<MediaRequestOutcome<'set-muted'>> {
    return this.request('set-muted', muted);
  }
  setPlaybackRate(rate: number): Promise<MediaRequestOutcome<'set-playback-rate'>> {
    return this.request('set-playback-rate', rate);
  }
  /**
   * Requests fullscreen through the presentation service (container, WebKit presentation, then
   * media). While that service is entering fullscreen on this root, the call is the native one.
   */
  override requestFullscreen(options?: FullscreenOptions): Promise<void> {
    if (this.#nativeFullscreen > 0) return super.requestFullscreen(options);
    return this.request('request-fullscreen').then(() => undefined);
  }
  exitFullscreen(): Promise<MediaRequestOutcome<'exit-fullscreen'>> {
    return this.request('exit-fullscreen');
  }
  requestPictureInPicture(): Promise<MediaRequestOutcome<'request-picture-in-picture'>> {
    return this.request('request-picture-in-picture');
  }
  exitPictureInPicture(): Promise<MediaRequestOutcome<'exit-picture-in-picture'>> {
    return this.request('exit-picture-in-picture');
  }
  promptRemotePlayback(): Promise<MediaRequestOutcome<'prompt-remote-playback'>> {
    return this.request('prompt-remote-playback');
  }
  /** Shows the text track with `id` (captions/subtitles), or none with `null`. */
  selectTextTrack(id: string | null): Promise<MediaRequestOutcome<'select-text-track'>> {
    return this.request('select-text-track', id);
  }
  toggleCaptions(force?: boolean): Promise<MediaRequestOutcome<'toggle-captions'>> {
    return this.request('toggle-captions', force);
  }
  selectAudioTrack(id: string): Promise<MediaRequestOutcome<'select-audio-track'>> {
    return this.request('select-audio-track', id);
  }
  /** Selects a rendition by id, or `'auto'` to restore adaptive selection. */
  selectVideoRendition(id: string): Promise<MediaRequestOutcome<'select-video-rendition'>> {
    return this.request('select-video-rendition', id);
  }
  toggleControls(force?: boolean): Promise<MediaRequestOutcome<'toggle-controls'>> {
    return this.request('toggle-controls', force);
  }
  /** Clears the store error (the media is not reloaded). */
  dismissError(): Promise<MediaRequestOutcome<'dismiss-error'>> {
    return this.request('dismiss-error');
  }

  /** Reference-counted controls lock; releasing the last one restarts the idle delay. */
  requestControlsLock(reason?: string): () => void {
    return this.#store.requestControlsLock(reason);
  }

  /**
   * Observes a state slice: `callback` runs when `selector(state)` changes under `equality`
   * (default `shallowEqual`). Returns the unsubscribe; `signal` aborts it too.
   */
  subscribe<S>(
    selector: (state: MediaState) => S,
    callback: (selected: S) => void,
    options: MediaSubscribeOptions<S> = {},
  ): () => void {
    const relay: Relay<S> = {
      selector,
      callback,
      equality: options.equality ?? shallowEqual,
      last: selector(this.#store.state),
      unsubscribe: undefined,
    };
    const remove = () => {
      relay.unsubscribe?.();
      relay.unsubscribe = undefined;
      this.#relays.delete(relay as Relay<unknown>);
    };
    if (options.signal?.aborted) return () => undefined;
    this.#relays.add(relay as Relay<unknown>);
    this.#attachRelay(relay);
    options.signal?.addEventListener('abort', remove, { once: true });
    return remove;
  }

  // ---------------------------------------------------------------------------------------------
  // Constituent services (see `context.ts`)

  trackFocusWithin(element: HTMLElement): () => void {
    return this.#store.activity.trackFocusWithin(element);
  }

  trackHover(element: HTMLElement): () => void {
    return this.#store.activity.trackHover(element);
  }

  shortcut(action: MediaRequestAction, value?: unknown): KeyShortcut | undefined {
    return this.#keyOwner?.shortcut(action, value);
  }

  /** Suspends hotkeys and gestures until the returned release runs (idempotent). */
  lockInteractions(): () => void {
    this.#interactionLocks++;
    this.#keyOwner?.refresh();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.#interactionLocks--;
      this.#keyOwner?.refresh();
    };
  }

  registerConstituent(element: ReactiveControllerHost): () => void {
    this.#constituents.add(element);
    return () => this.#constituents.delete(element);
  }

  /** Registers a controls region measured for `--tp-media-caption-offset` (light or shadow DOM). */
  registerControlsRegion(element: HTMLElement): () => void {
    this.#controlsRegions.add(element);
    this.#observeControls();
    return () => {
      if (!this.#controlsRegions.delete(element)) return;
      this.#observeControls();
    };
  }

  /** Registers a declarative key binding (`tp-media-hotkey`); read again whenever bindings sync. */
  registerHotkey(source: MediaHotkeySource): () => void {
    this.#hotkeySources.add(source);
    this.#scheduleBindings();
    return () => {
      if (this.#hotkeySources.delete(source)) this.#scheduleBindings();
    };
  }

  /** Registers a declarative gesture binding (`tp-media-gesture`). */
  registerGesture(source: MediaGestureSource): () => void {
    this.#gestureSources.add(source);
    this.#scheduleBindings();
    return () => {
      if (this.#gestureSources.delete(source)) this.#scheduleBindings();
    };
  }

  /** Re-reads registered bindings (after a `tp-media-hotkey`/`tp-media-gesture` change). */
  refreshBindings(): void {
    this.#scheduleBindings();
  }

  // ---------------------------------------------------------------------------------------------
  // Lifecycle

  override connectedCallback(): void {
    super.connectedCallback();
    this.#cancelDestroy?.();
    this.#cancelDestroy = undefined;
    if (this.#store.destroyed) this.#replaceStore();
    const scope = (this.#connection = new CleanupScope());
    const view = this.ownerDocument.defaultView ?? undefined;
    this.#scheduler = new Scheduler(view);
    scope.add(() => this.#scheduler?.dispose());
    const register = (event: Event) => this.#register(event as CustomEvent<MediaRegisterDetail>);
    this.addEventListener(MEDIA_REGISTER_EVENT, register);
    scope.add(() => this.removeEventListener(MEDIA_REGISTER_EVENT, register));
    const MutationObserverCtor = view?.MutationObserver ?? globalThis.MutationObserver;
    if (MutationObserverCtor) {
      const observer = new MutationObserverCtor(() => this.#scheduleReconcile());
      observer.observe(this, { childList: true, subtree: true });
      scope.add(() => observer.disconnect());
    }
    const ResizeObserverCtor = view?.ResizeObserver ?? globalThis.ResizeObserver;
    if (ResizeObserverCtor) {
      this.#controlsObserver = new ResizeObserverCtor(() => this.#measureControls());
      scope.add(() => {
        this.#controlsObserver?.disconnect();
        this.#controlsObserver = undefined;
      });
    }
    this.#connectAnnouncements();
    scope.add(() => this.#disconnectAnnouncements());
    // Discovery runs once in a microtask after connection, then on subtree mutations.
    this.#scheduleReconcile();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#connection?.dispose();
    this.#connection = undefined;
    this.#scheduler = undefined;
    this.#unbindContainer();
    // Detach synchronously; destroy two frames later unless the root reconnects (a DOM move).
    this.#store.detach();
    const store = this.#store;
    this.#cancelDestroy = deferMediaDestroy(this.ownerDocument.defaultView ?? undefined, () => {
      this.#cancelDestroy = undefined;
      store.destroy();
    });
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!(Number.isFinite(this.seekStep) && this.seekStep > 0)) this.seekStep = DEFAULT_SEEK_STEP;
    if (!(Number.isFinite(this.volumeStep) && this.volumeStep > 0 && this.volumeStep <= 1))
      this.volumeStep = DEFAULT_VOLUME_STEP;
    if (Number.isNaN(this.idleDelay)) this.idleDelay = DEFAULT_MEDIA_IDLE_DELAY;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed as PropertyValues<this>);
    const has = (keys: readonly string[]) => keys.some((key) => changed.has(key));
    if (has(CONFIG_PROPERTIES)) this.#store.configure(this.#config());
    if (changed.has('idleDelay')) this.#store.idleDelay = this.idleDelay;
    if (changed.has('disabled')) {
      this.#store.disabled = this.disabled;
      this.#keyOwner?.refresh();
    }
    if (changed.has('mediaAdapter')) this.#scheduleReconcile();
    if (has(BINDING_PROPERTIES)) this.#scheduleBindings();
    if (changed.has('messages')) this.#applyContainerLabel();
    if (has(CONSTITUENT_PROPERTIES))
      for (const element of this.#constituents) element.requestUpdate();
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  // ---------------------------------------------------------------------------------------------
  // Store and subscriptions

  #createStore(): MediaStore {
    return new MediaStore({
      hooks: createMediaEventHooks(this, (diagnostic) => this.#diagnostic(diagnostic)),
      config: this.#config(),
      idleDelay: this.idleDelay ?? DEFAULT_MEDIA_IDLE_DELAY,
      locale: () => this.resolvedLocale,
      claimsTap: (event) => this.#recognizer?.claimsTap(event) ?? false,
    });
  }

  #config() {
    return {
      contentTitle: this.contentTitle,
      poster: this.poster,
      playbackRates: this.playbackRates ?? DEFAULT_PLAYBACK_RATES,
      streamType: this.streamType,
      orientationLock: this.orientationLock,
    };
  }

  /** After deferred destruction: a fresh store keeps every subscription (`mp-f-lifecycle`). */
  #replaceStore(): void {
    this.#store = this.#createStore();
    this.#store.disabled = this.disabled;
    for (const relay of this.#relays) {
      relay.unsubscribe?.();
      this.#attachRelay(relay);
      const selected = relay.selector(this.#store.state);
      if (!relay.equality(relay.last, selected)) {
        relay.last = selected;
        relay.callback(selected);
      }
    }
  }

  #attachRelay<S>(relay: Relay<S>): void {
    relay.unsubscribe = this.#store.subscribe(
      (selected: S) => {
        relay.last = selected;
        relay.callback(selected);
      },
      { selector: relay.selector, equality: relay.equality },
    );
  }

  #subscribeInternal(): void {
    this.subscribe(
      (state) => mediaContainerMarkers(state, this.#mediaType),
      () => this.#applyMarkers(),
    );
    this.subscribe(
      (state) => state.controlsVisible,
      (visible) => {
        const hidden = this.#controlsVisible && !visible;
        this.#controlsVisible = visible;
        if (hidden) closeMediaPopups(this, 'idle');
        this.#applyCaptionOffset();
      },
    );
    this.subscribe(
      (state) => state.fullscreen,
      (fullscreen) => {
        const entered = !this.#fullscreen && fullscreen;
        this.#fullscreen = fullscreen;
        // Surfaces open on entry close and do not reopen (`mp-f-surfaces-fullscreen`).
        if (entered) closeMediaPopups(this, 'imperative-action');
      },
    );
    // Live restrictions change which bindings are active and published.
    this.subscribe(
      (state) => [state.streamType, state.dvr] as const,
      () => this.#keyOwner?.refresh(),
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Discovery and container

  #register(event: CustomEvent<MediaRegisterDetail>): void {
    const detail = event.detail;
    if (!detail?.media || event.defaultPrevented) return;
    event.preventDefault();
    event.stopPropagation();
    detail.release = this.#registrations.register(detail.media);
  }

  #scheduleReconcile(): void {
    if (this.#reconcileQueued) return;
    this.#reconcileQueued = true;
    queueMicrotask(() => {
      this.#reconcileQueued = false;
      this.#reconcile();
    });
  }

  #owned(element: Element): boolean {
    return element.closest('tp-media-player') === this;
  }

  #reconcile(): void {
    if (!this.isConnected) return;
    const container =
      [...this.querySelectorAll<HTMLElement>('tp-media-container')].find((element) =>
        this.#owned(element),
      ) ?? this;
    if (container !== this.#container) this.#bindContainer(container);
    const candidates = [...this.querySelectorAll('video, audio')].filter((element) =>
      this.#owned(element),
    );
    const media = discoverMedia(this.#registrations, candidates);
    this.#mediaType = mediaTypeOf(media);
    if (media) this.#store.attach({ media, container, adapter: this.mediaAdapter });
    else {
      if (this.#store.attached) this.#store.detach();
      this.#scheduleNoMediaDiagnostic();
    }
    this.#observeControls();
    this.#applyMarkers();
  }

  #scheduleNoMediaDiagnostic(): void {
    if (this.#noMediaDiagnosed) return;
    // Parsing may still be inserting children: report only if media is still missing later.
    this.#scheduler?.timeout(() => {
      if (this.#noMediaDiagnosed || !this.isConnected || this.#store.attached) return;
      this.#noMediaDiagnosed = true;
      this.#diagnostic({
        code: 'media-no-media',
        message:
          'tp-media-player found no media: add a <video> or <audio>, or register custom media.',
        severity: 'warning',
      });
    }, 0);
  }

  #bindContainer(container: HTMLElement): void {
    this.#unbindContainer();
    this.#container = container;
    const scope = (this.#containerScope = new CleanupScope());
    const aria = (this.#containerAria = new OwnedAttributes(container));
    const markers = (this.#containerMarkers = new OwnedAttributes(container));
    scope.add(() => {
      aria.dispose();
      markers.dispose();
      container.style.removeProperty('--tp-media-caption-offset');
    });
    markers.set('data-media-container', '');
    if (container === this)
      scope.add(this.presentationController.registerPart('media-container', this));
    if (aria.original('role') === null) aria.set('role', 'group');
    if (aria.original('tabindex') === null) aria.set('tabindex', '0');
    this.#applyContainerLabel();
    // Pressing the media surface focuses the container (hotkeys need focus inside).
    scope.listen(container, 'pointerup', (event) => {
      if (interactiveTargetInPath(event, container)) return;
      const active = deepActiveElement(container.ownerDocument);
      if (active && composedContains(container, active)) return;
      container.focus({ preventScroll: true });
    });
    try {
      this.#keyOwner = new KeyBindingOwner(container, {
        disabled: () => this.disabled || this.#interactionLocks > 0,
        scope,
      });
    } catch (error) {
      this.#diagnostic({
        code: 'media-key-owner',
        message: 'The media container already has a key-binding owner; hotkeys are inactive.',
        severity: 'error',
        context: { error },
      });
    }
    const recognizer = (this.#recognizer = new TapGestureRecognizer(container, {
      locked: () => this.disabled || this.#interactionLocks > 0,
      onError: (error) =>
        this.#diagnostic({
          code: 'media-gesture-error',
          message: 'A media gesture handler failed.',
          severity: 'error',
          context: { error },
        }),
    }));
    scope.add(() => recognizer.dispose());
    this.#syncBindings();
  }

  #unbindContainer(): void {
    for (const release of this.#hotkeyReleases) release();
    for (const release of this.#gestureReleases) release();
    this.#hotkeyReleases = [];
    this.#gestureReleases = [];
    this.#containerScope?.dispose();
    this.#containerScope = undefined;
    this.#containerAria = undefined;
    this.#containerMarkers = undefined;
    this.#keyOwner = undefined;
    this.#recognizer = undefined;
    this.#container = null;
  }

  #applyContainerLabel(): void {
    const aria = this.#containerAria;
    if (!aria) return;
    if (aria.original('aria-label') !== null || aria.original('aria-labelledby') !== null) return;
    aria.set('aria-label', this.mediaMessages.get('player'));
  }

  #applyMarkers(): void {
    const markers = this.#containerMarkers;
    if (!markers) return;
    const values = mediaContainerMarkers(this.#store.state, this.#mediaType);
    for (const name of MEDIA_CONTAINER_MARKERS) markers.set(name, values[name] ?? null);
  }

  /**
   * Measures the registered controls regions for `--tp-media-caption-offset` (`mp-f-captions`).
   * Regions register through their owner lookup, so a region inside a layout's shadow root counts.
   */
  #observeControls(): void {
    const observer = this.#controlsObserver;
    if (!observer) return;
    observer.disconnect();
    for (const controls of this.#controlsRegions) observer.observe(controls);
    this.#measureControls();
  }

  #measureControls(): void {
    let size = 0;
    for (const controls of this.#controlsRegions)
      if (controls.isConnected) size = Math.max(size, controls.offsetHeight || 0);
    this.#controlsBlockSize = size;
    this.#applyCaptionOffset();
  }

  #applyCaptionOffset(): void {
    const container = this.#container;
    if (!container) return;
    const offset = this.#controlsVisible ? this.#controlsBlockSize : 0;
    container.style.setProperty('--tp-media-caption-offset', `${offset}px`);
  }

  // ---------------------------------------------------------------------------------------------
  // Hotkeys and gestures

  #scheduleBindings(): void {
    if (this.#bindingsQueued) return;
    this.#bindingsQueued = true;
    queueMicrotask(() => {
      this.#bindingsQueued = false;
      this.#syncBindings();
    });
  }

  #steps(): MediaStepConfig {
    return { seekStep: this.seekStep, volumeStep: this.volumeStep };
  }

  #syncBindings(): void {
    for (const release of this.#hotkeyReleases) release();
    for (const release of this.#gestureReleases) release();
    this.#hotkeyReleases = [];
    this.#gestureReleases = [];
    const owner = this.#keyOwner;
    if (owner) {
      const { specs, problems } = resolveMediaHotkeys({
        defaults: this.hotkeys !== 'none',
        config: this.#steps(),
        authored: [...this.#hotkeySources],
        platform: owner.platform,
      });
      for (const problem of problems)
        this.#diagnostic({
          code: 'media-invalid-hotkey',
          message: `Invalid media hotkey "${problem.keys}" (${problem.action}): ${problem.message}`,
          severity: 'warning',
        });
      const scope = this.hotkeyScope === 'document' ? 'document' : 'owner';
      for (const spec of specs)
        this.#hotkeyReleases.push(
          owner.register({
            keys: spec.keys,
            action: spec.action,
            value: spec.value,
            repeat: spec.repeat,
            scope,
            disabled: () => mediaInputInactive(spec.action, this.#store.state),
            handler: (event) => {
              void this.#requestFrom(spec.action, spec.value, 'hotkey', event);
            },
          }),
        );
    }
    const recognizer = this.#recognizer;
    if (recognizer) {
      const { specs, problems } = resolveMediaGestures({
        defaults: this.gestures === 'default',
        config: this.#steps(),
        authored: [...this.#gestureSources],
      });
      for (const problem of problems)
        this.#diagnostic({
          code: 'media-invalid-gesture',
          message: `Invalid media gesture: ${problem.message}`,
          severity: 'warning',
        });
      for (const spec of specs)
        this.#gestureReleases.push(
          recognizer.add({
            type: spec.type,
            action: spec.action,
            ...(spec.pointer ? { pointer: spec.pointer } : {}),
            ...(spec.region ? { region: spec.region } : {}),
            disabled: () => spec.disabled || mediaInputInactive(spec.action, this.#store.state),
            handler: (activation) => {
              void this.#requestFrom(spec.action, spec.value, 'gesture', activation.event);
            },
          }),
        );
    }
  }

  /** Hotkey and gesture paths swallow the rejection after `tp-media-request-failed`. */
  #requestFrom(
    action: MediaRequestAction,
    value: unknown,
    reason: 'hotkey' | 'gesture',
    sourceEvent: Event,
  ): Promise<unknown> {
    const request = this.request as (
      action: MediaRequestAction,
      value: unknown,
      options: object,
    ) => Promise<unknown>;
    return request.call(this, action, value, { reason, sourceEvent, swallow: true });
  }

  // ---------------------------------------------------------------------------------------------
  // Announcements

  #connectAnnouncements(): void {
    const sliderFocused = () => this.#sliderFocused();
    const announcer = (this.#announcer = createMediaLiveAnnouncer({
      root: () => {
        const container = this.#container ?? this;
        return container.shadowRoot ?? container;
      },
      sliderFocused,
    }));
    const policy = (this.#policy = new MediaAnnouncementPolicy({
      announcer,
      messages: () => this.mediaMessages,
      locale: () => this.resolvedLocale,
      enabled: () => this.announcements !== 'off',
      sliderFocused,
    }));
    this.#policyRelease = policy.connect(this.#store);
  }

  #disconnectAnnouncements(): void {
    this.#policyRelease?.();
    this.#policyRelease = undefined;
    this.#policy?.dispose();
    this.#policy = undefined;
    this.#announcer?.dispose();
    this.#announcer = undefined;
  }

  /** A slider inside the container has focus: its value text already speaks. */
  #sliderFocused(): boolean {
    const container = this.#container;
    if (!container) return false;
    for (
      let node: Node | null = deepActiveElement(container.ownerDocument);
      node && node !== container;
      node = composedParent(node)
    ) {
      const element = node as Element;
      if (
        node.nodeType === 1 &&
        (element.getAttribute('role') === 'slider' || element.localName === 'tp-slider')
      )
        return true;
    }
    return false;
  }

  #diagnostic(diagnostic: Diagnostic): void {
    this.emit('tp-diagnostic', diagnostic);
  }
}
