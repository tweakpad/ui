/**
 * Media player constituent API (`sec-1810-media-player` mp-f-owner, mp-f-disabled-hidden,
 * mp-f-locale; Library `ucl21-media-player`).
 *
 * Every `tp-media-*` constituent (buttons, sliders, menus, time, indicators, layouts) builds on
 * this module instead of talking to the media element:
 *
 * - `mediaPlayerOf(host)` finds the owning `tp-media-player` (portal-aware, or by `player` id).
 * - `MediaSelectorController` subscribes a Lit host to one slice of the player's media state and
 *   re-renders only when that slice changes (`shallowEqual` by default).
 * - `TpMediaElement` is the base class: `player`, `select()`, `request()`, `messages`/`message()`,
 *   `shortcut()`, and the disabled/hidden availability policy (`controlAvailability()`), which
 *   publishes `data-availability`, `data-disabled` and `data-hidden`.
 *
 * Constituents never write to the media element; every change is a `request()` through the
 * player's single pipeline (cancelable `tp-media-request`, gating, `tp-media-request-failed`).
 */
import type {
  PropertyDeclarations,
  PropertyValues,
  ReactiveController,
  ReactiveControllerHost,
} from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { KeyShortcut } from '../../foundation/key-bindings.js';
import { nearestOwner } from '../../foundation/portal-ownership.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { shallowEqual, type StoreEquality } from '../../foundation/store.js';
import type { ChangeReason } from '../../foundation/types.js';
import {
  controlAvailability as mediaControlAvailability,
  type MediaAvailability,
  type MediaControlAvailability,
  type MediaControlAvailabilityOptions,
} from '../../foundation/media/availability.js';
import {
  createMediaMessages,
  type MediaMessageKey,
  type MediaMessageParams,
  type MediaMessagesResolver,
  type MediaPlayerMessages,
} from '../../foundation/media/messages.js';
import type {
  MediaRequestAction,
  MediaRequestArgs,
  MediaRequestOptions,
  MediaRequestOutcome,
} from '../../foundation/media/requests.js';
import {
  DEFAULT_MEDIA_CONFIG,
  DEFAULT_MEDIA_SOURCE,
  deriveMediaState,
  freezeMediaValue,
  type MediaState,
} from '../../foundation/media/state.js';
import type { MediaTarget } from '../../foundation/media/target.js';

/** Brand carried by `tp-media-player`; the owner lookup tests it instead of `instanceof`. */
export const mediaPlayerBrand: unique symbol = Symbol.for('tweakpad.media-player');

/** Snapshot every constituent sees while it has no player (store defaults, `mp-f-discovery`). */
export const DEFAULT_MEDIA_STATE: MediaState = freezeMediaValue(
  deriveMediaState(DEFAULT_MEDIA_SOURCE, DEFAULT_MEDIA_CONFIG),
);

export interface MediaSubscribeOptions<S> {
  /** Selected-value equality. Defaults to `shallowEqual`. */
  readonly equality?: StoreEquality<S>;
  /** Removes the subscription when aborted. */
  readonly signal?: AbortSignal;
}

/**
 * What a constituent may rely on from its player. `TpMediaPlayer` implements it; tests can supply a
 * fake. Root configuration that is not media state (steps, `hideOverControls`, locale, messages)
 * is read from here; registered constituents are re-rendered when it changes.
 */
export interface MediaPlayerApi {
  readonly [mediaPlayerBrand]: true;
  /** Latest frozen snapshot. */
  readonly state: MediaState;
  /** Attached media target, or `null`. */
  readonly media: MediaTarget | null;
  /** The container (fullscreen target; activity, hotkey, gesture and portal boundary). */
  readonly container: HTMLElement | null;
  /** Whether a media element is attached. */
  readonly attached: boolean;
  /** Player `disabled`: controls are `aria-disabled`, hotkeys and gestures stop. */
  readonly disabled: boolean;
  readonly seekStep: number;
  readonly volumeStep: number;
  readonly hideOverControls: boolean;
  /** The resolved formatting locale (`locale` property, else `lang`, else the document). */
  readonly resolvedLocale: string | undefined;
  /** The root messages resolver (English fallbacks under the root `messages`). */
  readonly mediaMessages: MediaMessagesResolver;
  request<A extends MediaRequestAction>(
    action: A,
    ...args: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>>;
  /** Availability gating `action` right now (`unavailable` before attach). */
  requestAvailability(action: MediaRequestAction): MediaAvailability;
  subscribe<S>(
    selector: (state: MediaState) => S,
    callback: (selected: S) => void,
    options?: MediaSubscribeOptions<S>,
  ): () => void;
  /** Reference-counted controls lock; the release is idempotent. */
  requestControlsLock(reason?: string): () => void;
  /** Holds a `focus` lock while focus is inside `element`; returns the cleanup. */
  trackFocusWithin(element: HTMLElement): () => void;
  /** Holds a `hover` lock while a mouse/pen pointer is over `element`; returns the cleanup. */
  trackHover(element: HTMLElement): () => void;
  /** Published shortcut for an action (and optional value) from the active key bindings. */
  shortcut(action: MediaRequestAction, value?: unknown): KeyShortcut | undefined;
  /** Locks hotkeys and gestures (for example, a container-modal error dialog). */
  lockInteractions(): () => void;
  /** Registers a constituent for configuration-driven updates; returns the unregistration. */
  registerConstituent(element: ReactiveControllerHost): () => void;
  /**
   * Registers a controls region (`tp-media-controls`, including one inside a layout's shadow
   * root) whose block size feeds `--tp-media-caption-offset`; returns the unregistration.
   */
  registerControlsRegion?(element: HTMLElement): () => void;
}

const isPlayer = (node: Node): node is HTMLElement & MediaPlayerApi =>
  (node as Partial<MediaPlayerApi>)[mediaPlayerBrand] === true;

/**
 * The player that owns `host` (`mp-f-owner`): with a `player` id, the element with that id in the
 * host's tree scope (then its document); otherwise the nearest `tp-media-player` through composed
 * parents and logical portal owners, so a control in a portaled menu still resolves. `null` when
 * no player is found (the caller diagnoses and renders disabled).
 */
export function mediaPlayerOf(host: Node, playerId?: string | null): MediaPlayerApi | null {
  if (playerId) {
    const root = host.getRootNode?.() as
      (Node & { getElementById?(id: string): Element | null }) | undefined;
    const element =
      root?.getElementById?.(playerId) ?? host.ownerDocument?.getElementById(playerId) ?? null;
    return element && isPlayer(element) ? element : null;
  }
  return nearestOwner(host, isPlayer);
}

/** A Lit host that may expose an already-resolved player (as `TpMediaElement` does). */
export type MediaSelectorHost = ReactiveControllerHost & {
  readonly player?: MediaPlayerApi | null;
};

/**
 * Reactive controller for one media-state slice: `value` is `selector(state)`, and the host is
 * re-rendered only when the selected value changes under `equality` (default `shallowEqual`).
 * It binds on connection, re-binds before an update when the host's player changed, and
 * unsubscribes on disconnection. Without a player, `value` is the selector applied to the defaults.
 *
 * ```ts
 * readonly #paused = new MediaSelectorController(this, (state) => state.paused);
 * render() { return this.#paused.value ? 'Play' : 'Pause'; }
 * ```
 */
export class MediaSelectorController<S> implements ReactiveController {
  readonly #host: MediaSelectorHost;
  readonly #selector: (state: MediaState) => S;
  readonly #equality: StoreEquality<S>;
  #value: S;
  #player: MediaPlayerApi | null | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(
    host: MediaSelectorHost,
    selector: (state: MediaState) => S,
    equality: StoreEquality<S> = shallowEqual,
  ) {
    this.#host = host;
    this.#selector = selector;
    this.#equality = equality;
    this.#value = selector(DEFAULT_MEDIA_STATE);
    host.addController(this);
  }

  /** The selected value. */
  get value(): S {
    return this.#value;
  }

  /** The player this controller is bound to (`null` when none). */
  get player(): MediaPlayerApi | null {
    return this.#player ?? null;
  }

  hostConnected(): void {
    if (this.#bind()) this.#host.requestUpdate();
  }

  hostUpdate(): void {
    // A changed player (re-resolution, `player` id) re-binds before render.
    if (this.#resolve() !== this.#player) this.#bind();
  }

  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#player = undefined;
  }

  #resolve(): MediaPlayerApi | null {
    const host = this.#host;
    if ('player' in host) return host.player ?? null;
    return host instanceof Node ? mediaPlayerOf(host) : null;
  }

  /** Subscribes to the current player; returns whether the value changed. */
  #bind(): boolean {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    const player = (this.#player = this.#resolve());
    const previous = this.#value;
    this.#value = this.#selector(player?.state ?? DEFAULT_MEDIA_STATE);
    if (player)
      this.#unsubscribe = player.subscribe(
        this.#selector,
        (selected) => {
          if (this.#equality(this.#value, selected)) return;
          this.#value = selected;
          this.#host.requestUpdate();
        },
        { equality: this.#equality },
      );
    return !this.#equality(previous, this.#value);
  }
}

/**
 * Messages with root → constituent inheritance: the constituent's own `messages` override the
 * player's, which override English. Resolvers are cached per (root resolver, override) pair, so
 * repeated reads during render allocate nothing.
 */
const resolverCache = new WeakMap<
  MediaMessagesResolver,
  WeakMap<MediaPlayerMessages, MediaMessagesResolver>
>();
const englishMessages = createMediaMessages();

export function resolveMediaMessages(
  root: MediaMessagesResolver | null | undefined,
  own: MediaPlayerMessages | null | undefined,
): MediaMessagesResolver {
  const base = root ?? englishMessages;
  if (!own) return base;
  let cache = resolverCache.get(base);
  if (!cache) resolverCache.set(base, (cache = new WeakMap()));
  let resolver = cache.get(own);
  if (!resolver) cache.set(own, (resolver = base.extend(own)));
  return resolver;
}

/** Popup hosts (Menu, Popover, Tooltip…) expose `open` and `setOpen(open, reason)`. */
interface PopupHost {
  readonly open?: unknown;
  setOpen?: (open: boolean, reason: ChangeReason) => unknown;
}

/**
 * Brand of elements whose shadow root holds player constituents (the layouts). `closeMediaPopups`
 * walks into their shadow roots; other shadow roots stay private to their component.
 */
export const mediaPopupScopeBrand: unique symbol = Symbol.for('tweakpad.media-popup-scope');

/**
 * Closes every open popup host in `scope`'s light-DOM subtree with `reason` (`idle` when controls
 * hide, `imperative-action` on fullscreen entry), including the shadow trees of layouts
 * (`mediaPopupScopeBrand`). Hosts stay in place when their surface is portaled, so the walk
 * finds them. Focus is not moved by this call.
 */
export function closeMediaPopups(scope: ParentNode, reason: ChangeReason): void {
  for (const element of scope.querySelectorAll<HTMLElement>('*')) {
    const host = element as unknown as PopupHost;
    if (host.open === true && typeof host.setOpen === 'function') host.setOpen(false, reason);
    const root = element.shadowRoot;
    if (root && (element as unknown as Record<symbol, unknown>)[mediaPopupScopeBrand] === true)
      closeMediaPopups(root, reason);
  }
}

/** Options for `TpMediaElement.controlAvailability`; `attached`/`disabled` come from context. */
export type MediaControlPolicy = Omit<MediaControlAvailabilityOptions, 'attached' | 'disabled'>;

/** A Lit element that owns a `MediaOwnerController`. */
export type MediaOwnerHost = HTMLElement & ReactiveControllerHost;

export interface MediaOwnerControllerOptions {
  /** The `player` id reference, read on every resolution (`null`: nearest owner). */
  readonly playerId?: () => string | null | undefined;
}

/**
 * The single player-ownership owner for media constituents (`mp-f-owner`). It resolves the
 * owning player on connection (portal-aware, or by `player` id), retries once the root is
 * defined or later in parsing, registers the host for configuration-driven updates, re-renders
 * it when the player's key bindings change (after `watchShortcuts()`), and diagnoses a missing
 * owner once. `TpMediaElement` delegates to it; constituents that must extend another library
 * class (for example Menu radio groups) use it directly.
 */
export class MediaOwnerController implements ReactiveController {
  readonly #host: MediaOwnerHost;
  readonly #options: MediaOwnerControllerOptions;
  #player: MediaPlayerApi | null = null;
  #unregister: (() => void) | undefined;
  #shortcutWatch = false;
  #unwatchShortcuts: (() => void) | undefined;
  #diagnosed = false;
  #pendingResolve = false;

  constructor(host: MediaOwnerHost, options: MediaOwnerControllerOptions = {}) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** The owning player, or `null`. */
  get player(): MediaPlayerApi | null {
    return this.#player;
  }

  hostConnected(): void {
    this.resolve();
  }

  hostDisconnected(): void {
    this.#unbind();
  }

  /** Keeps the host re-rendering when the player's published shortcuts change. */
  watchShortcuts(): void {
    if (this.#shortcutWatch) return;
    this.#shortcutWatch = true;
    this.#watch();
  }

  /** Re-resolves the player (for example after the `player` id changed). */
  resolve(): void {
    const host = this.#host;
    const playerId = this.#options.playerId?.() ?? null;
    const next = mediaPlayerOf(host, playerId);
    if (next !== this.#player) {
      this.#unbind();
      this.#player = next;
      if (next) {
        this.#unregister = next.registerConstituent(host);
        if (this.#shortcutWatch) this.#watch();
      }
      host.requestUpdate();
    }
    if (next) return;
    // The root may not be upgraded yet, or a referenced player may appear later in parsing.
    if (this.#pendingResolve) return;
    this.#pendingResolve = true;
    const registry = host.ownerDocument?.defaultView?.customElements ?? globalThis.customElements;
    // An undefined root upgrades synchronously in `define()`, before `whenDefined` resolves.
    const defined =
      !registry || registry.get('tp-media-player')
        ? Promise.resolve()
        : registry.whenDefined('tp-media-player');
    void defined.then(() =>
      queueMicrotask(() => {
        this.#pendingResolve = false;
        if (!host.isConnected || this.#player) return;
        const late = mediaPlayerOf(host, this.#options.playerId?.() ?? null);
        if (late) this.resolve();
        else this.diagnoseMissing();
      }),
    );
  }

  /** Emits the `media-player-missing` diagnostic once and re-renders the host disabled. */
  diagnoseMissing(): void {
    if (this.#diagnosed) return;
    this.#diagnosed = true;
    const host = this.#host;
    host.dispatchEvent(
      new CustomEvent('tp-diagnostic', {
        bubbles: true,
        composed: true,
        detail: {
          code: 'media-player-missing',
          message: `<${host.localName}> has no tp-media-player owner; it renders disabled.`,
          severity: 'warning',
        },
      }),
    );
    host.requestUpdate();
  }

  /**
   * Requests a media change through the player pipeline with `host` as the default trigger.
   * Without a player it diagnoses and rejects with `InvalidStateError`, like a request before
   * attach.
   */
  request<A extends MediaRequestAction>(
    action: A,
    ...[value, options]: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    const player = this.#player;
    if (!player) {
      this.diagnoseMissing();
      return Promise.reject(
        new DOMException('No media player owns this control.', 'InvalidStateError'),
      );
    }
    const merged: MediaRequestOptions = { trigger: this.#host, ...options };
    return player.request(action, ...([value, merged] as unknown as MediaRequestArgs<A>));
  }

  #unbind(): void {
    this.#unregister?.();
    this.#unregister = undefined;
    this.#unwatchShortcuts?.();
    this.#unwatchShortcuts = undefined;
    this.#player = null;
  }

  #watch(): void {
    this.#unwatchShortcuts?.();
    this.#unwatchShortcuts = undefined;
    const player = this.#player as unknown as EventTarget | null;
    if (!player || typeof player.addEventListener !== 'function') return;
    const update = () => this.#host.requestUpdate();
    // The container's key-binding owner dispatches `tp-shortcut-change`; it bubbles to the player.
    player.addEventListener('tp-shortcut-change', update);
    this.#unwatchShortcuts = () => player.removeEventListener('tp-shortcut-change', update);
  }
}

/**
 * Base class for media constituents. Subclasses read state with `select()`, act with `request()`,
 * read text with `message()`, and declare the disabled/hidden policy with `controlAvailability()`
 * (usually from `willUpdate`). Only `disabled` (plus `player` and `messages`) is public; the
 * inherited `readOnly`, `invalid` and `required` do not apply to media constituents.
 *
 * Presentation: constituents consume the `tp-media-player` definition and dictionary
 * (`presentationTagName`), so their parts and recipes live with the family.
 */
export abstract class TpMediaElement extends TpElement {
  static override properties: PropertyDeclarations = {
    ...TpElement.properties,
    playerId: { type: String, attribute: 'player' },
    messages: { attribute: false },
  };

  /** Constituents share the Media player definition, parts and recipes. */
  static presentationTagName = 'tp-media-player';

  /** Id of a `tp-media-player` to bind to from outside its subtree (`player` attribute). */
  playerId: string | null = null;
  /** Per-constituent message overrides; they win over the root `messages`. */
  messages: MediaPlayerMessages | null = null;

  // Player ownership (resolution, registration, shortcut watch, diagnostics).
  readonly #owner = new MediaOwnerController(this, { playerId: () => this.playerId });
  #availability: MediaControlAvailability | undefined;
  #markers: OwnedAttributes | undefined;

  /** The owning player, or `null` (the constituent then renders disabled). */
  get player(): MediaPlayerApi | null {
    return this.#owner.player;
  }

  /** The player's latest state, or the defaults without a player. */
  get mediaState(): MediaState {
    return this.player?.state ?? DEFAULT_MEDIA_STATE;
  }

  /** Effective disabled: own `disabled`, no player, or a disabled player. */
  get mediaDisabled(): boolean {
    const player = this.player;
    return this.disabled || !player || player.disabled;
  }

  /** Messages resolver: this constituent's `messages` over the player's over English. */
  get mediaMessages(): MediaMessagesResolver {
    return resolveMediaMessages(this.player?.mediaMessages, this.messages);
  }

  /** The player's resolved formatting locale. */
  get mediaLocale(): string | undefined {
    return this.player?.resolvedLocale;
  }

  /** The availability most recently computed by `controlAvailability()`. */
  get availability(): MediaControlAvailability | undefined {
    return this.#availability;
  }

  /** Resolves one message key (`message('seekForward', { seconds: 10 })`). */
  message<K extends MediaMessageKey>(
    key: K,
    ...params: K extends keyof MediaMessageParams ? [params: MediaMessageParams[K]] : []
  ): string {
    return this.mediaMessages.get(key, ...params);
  }

  /** A `MediaSelectorController` bound to this element (create it in a field initializer). */
  protected select<S>(
    selector: (state: MediaState) => S,
    equality: StoreEquality<S> = shallowEqual,
  ): MediaSelectorController<S> {
    return new MediaSelectorController(this, selector, equality);
  }

  /**
   * Requests a media change through the player pipeline. The trigger defaults to this element.
   * Without a player it rejects with `InvalidStateError`, like a request before attach.
   */
  request<A extends MediaRequestAction>(
    action: A,
    ...args: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    return this.#owner.request(action, ...args);
  }

  /**
   * The published shortcut for an action, for `aria-keyshortcuts` (`.aria`) and Key Hint/tooltip
   * display (`.display`, `.keys`). The element re-renders when the player's bindings change.
   */
  shortcut(action: MediaRequestAction, value?: unknown): KeyShortcut | undefined {
    this.#owner.watchShortcuts();
    return this.player?.shortcut(action, value);
  }

  /**
   * Applies the disabled/hidden policy (`mp-f-disabled-hidden`) to `feature` and remembers it;
   * after the update the host publishes `data-availability`, `data-disabled` and `data-hidden`,
   * and native `hidden` when hidden. `disabled` in the result means focusable `aria-disabled`
   * (never native disabled). Call it during `willUpdate` or `render`.
   */
  protected controlAvailability(
    feature: MediaAvailability,
    policy: MediaControlPolicy = {},
  ): MediaControlAvailability {
    const result = mediaControlAvailability(feature, {
      ...policy,
      attached: this.player?.attached ?? false,
      disabled: this.mediaDisabled,
    });
    this.#availability = result;
    return result;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#markers?.dispose();
    this.#markers = undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('playerId') && this.isConnected) this.#owner.resolve();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed as PropertyValues<this>);
    // Structural constituents keep TpElement's own-`disabled` marker. A control that declared
    // its policy publishes the effective state, which includes the player and availability.
    const availability = this.#availability;
    if (!availability) return;
    this.toggleAttribute('data-disabled', availability.disabled || this.disabled);
    const markers = (this.#markers ??= new OwnedAttributes(this));
    markers.set('data-availability', availability.availability);
    markers.set('data-hidden', availability.hidden ? '' : null);
    markers.set('hidden', availability.hidden ? '' : markers.original('hidden'));
  }
}
