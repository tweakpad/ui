import {
  hasMetadata,
  isMediaPictureInPictureCapable,
  isMediaRemotePlaybackCapable,
  isWebKitAirPlayCapable,
  mediaOwnerDocument,
  type MediaTarget,
} from './target.js';

/**
 * Presentation services (`mp-f-presentation`): fullscreen, picture-in-picture, remote playback
 * prompt and orientation lock. Everything resolves the owner document of the container/media
 * rather than the global document. Follows Video.js `core/src/dom/presentation/*`.
 */
export interface MediaPresentationTarget {
  readonly media: MediaTarget;
  readonly container: HTMLElement | null;
}

interface WebKitDocument {
  fullscreenEnabled?: boolean;
  webkitFullscreenEnabled?: boolean;
  fullscreenElement?: Element | null;
  webkitFullscreenElement?: Element | null;
  pictureInPictureEnabled?: boolean;
  pictureInPictureElement?: Element | null;
  exitFullscreen?: () => Promise<void> | void;
  webkitExitFullscreen?: () => void;
  exitPictureInPicture?: () => Promise<void>;
  defaultView?: Window | null;
}

interface WebKitElement {
  requestFullscreen?: () => Promise<void> | void;
  webkitRequestFullscreen?: () => Promise<void> | void;
  matches?: (selector: string) => boolean;
  getRootNode?: () => Node;
}

const fn = (value: unknown): value is (...args: never[]) => unknown => typeof value === 'function';

function ownerDocument(target: MediaPresentationTarget): WebKitDocument | undefined {
  return mediaOwnerDocument(target.media, target.container) as WebKitDocument | undefined;
}

function matchesFullscreen(element: unknown): boolean {
  const candidate = element as WebKitElement | null;
  if (!candidate || !fn(candidate.matches)) return false;
  try {
    return candidate.matches(':fullscreen');
  } catch {
    return false;
  }
}

/** Fullscreen elements of the document and the container's shadow root (retargeted). */
function fullscreenElements(target: MediaPresentationTarget): Element[] {
  const doc = ownerDocument(target);
  const elements: Element[] = [];
  const add = (element: Element | null | undefined) => {
    if (element) elements.push(element);
  };
  add(doc?.fullscreenElement);
  add(doc?.webkitFullscreenElement);
  const root = (target.container as WebKitElement | null)?.getRootNode?.() as
    (Node & { fullscreenElement?: Element | null }) | undefined;
  if (root && root !== (doc as unknown)) add(root.fullscreenElement);
  return elements;
}

/**
 * `fullscreenEnabled`, its WebKit variant, or the iOS WebKit presentation mode on the media.
 */
export function fullscreenSupported(target: MediaPresentationTarget): boolean {
  const doc = ownerDocument(target);
  if (doc?.fullscreenEnabled || doc?.webkitFullscreenEnabled) return true;
  return fn(target.media.webkitSetPresentationMode);
}

/** Container or media is the fullscreen element, `:fullscreen` matches, or WebKit fullscreen. */
export function isFullscreen(target: MediaPresentationTarget): boolean {
  if (target.media.webkitPresentationMode === 'fullscreen') return true;
  const elements = fullscreenElements(target);
  const media = target.media as unknown as Element;
  if (elements.some((element) => element === target.container || element === media)) return true;
  return matchesFullscreen(target.container) || matchesFullscreen(target.media);
}

/** Safari home-screen (standalone) apps cannot enter picture-in-picture. */
function standaloneSafari(view: Window | null | undefined): boolean {
  if (!view) return false;
  const agent = view.navigator?.userAgent ?? '';
  const safari = /Version\/.*Safari\//.test(agent);
  const standalone =
    typeof view.matchMedia === 'function' && view.matchMedia('(display-mode: standalone)').matches;
  return safari && standalone;
}

/** The browser permits picture-in-picture and this media can enter it. */
export function pictureInPictureSupported(target: MediaPresentationTarget): boolean {
  const media = target.media;
  if (!isMediaPictureInPictureCapable(media) || media.disablePictureInPicture === true)
    return false;
  const doc = ownerDocument(target);
  if (doc?.pictureInPictureEnabled) return !standaloneSafari(doc.defaultView);
  return fn(media.webkitSetPresentationMode);
}

export function isPictureInPicture(target: MediaPresentationTarget): boolean {
  if (target.media.webkitPresentationMode === 'picture-in-picture') return true;
  const element = ownerDocument(target)?.pictureInPictureElement;
  return Boolean(element) && element === (target.media as unknown as Element);
}

export type FullscreenPath = 'container' | 'webkit-presentation' | 'media';

/**
 * Orientation lock that serializes platform requests so the last call wins (`mp-f-presentation`).
 * Rejections are ignored; `unlock()` releases the held lock.
 */
export class ScreenOrientationLock {
  #desired: OrientationLockType | null = null;
  #held: OrientationLockType | null = null;
  #settling = false;
  readonly #orientation: () => ScreenOrientation | undefined;

  constructor(view: () => Window | null | undefined = () => globalThis.window) {
    this.#orientation = () => view()?.screen?.orientation;
  }

  /** The requested type, or `null` when unlocked. */
  get desired(): OrientationLockType | null {
    return this.#desired;
  }

  lock(type: OrientationLockType): Promise<void> {
    this.#desired = type;
    return this.#reconcile();
  }

  unlock(): void {
    this.#desired = null;
    void this.#reconcile();
  }

  async #reconcile(): Promise<void> {
    if (this.#settling) return;
    this.#settling = true;
    try {
      while (this.#desired !== this.#held) {
        const target = this.#desired;
        const orientation = this.#orientation() as
          (ScreenOrientation & { lock?: (type: OrientationLockType) => Promise<void> }) | undefined;
        if (target === null) {
          try {
            orientation?.unlock?.();
          } catch {
            // Unlocking is best effort.
          }
          this.#held = null;
          continue;
        }
        if (!orientation || !fn(orientation.lock)) return;
        try {
          await orientation.lock(target);
        } catch {
          // A rejected lock leaves the held type unchanged; wait for the next request.
          if (this.#desired === target) return;
          continue;
        }
        this.#held = target;
      }
    } finally {
      this.#settling = false;
    }
  }
}

const notSupported = (what: string) =>
  new DOMException(`${what} is not supported by this media.`, 'NotSupportedError');

/**
 * Executes presentation requests against the current target. Fullscreen exits picture-in-picture
 * first; picture-in-picture exits fullscreen first; exit mirrors the recorded entry path.
 * Rejections (for example, a missing user gesture) propagate unchanged and change no state.
 */
export class MediaPresentation {
  readonly #target: () => MediaPresentationTarget | null;
  #path: FullscreenPath | undefined;
  readonly orientation: ScreenOrientationLock;

  constructor(target: () => MediaPresentationTarget | null) {
    this.#target = target;
    this.orientation = new ScreenOrientationLock(() => {
      const current = this.#target();
      return current ? (ownerDocument(current)?.defaultView ?? undefined) : globalThis.window;
    });
  }

  /** The path used by the last fullscreen entry, while it is still current. */
  get fullscreenPath(): FullscreenPath | undefined {
    return this.#path;
  }

  #require(): MediaPresentationTarget {
    const target = this.#target();
    if (!target) throw new DOMException('No media is attached.', 'InvalidStateError');
    return target;
  }

  isFullscreen(): boolean {
    const target = this.#target();
    return target ? isFullscreen(target) : false;
  }

  isPictureInPicture(): boolean {
    const target = this.#target();
    return target ? isPictureInPicture(target) : false;
  }

  async requestFullscreen(): Promise<void> {
    const target = this.#require();
    if (isPictureInPicture(target)) await this.exitPictureInPicture();
    const doc = ownerDocument(target);
    const container = target.container as WebKitElement | null;
    if (container && (doc?.fullscreenEnabled || doc?.webkitFullscreenEnabled)) {
      if (fn(container.requestFullscreen)) {
        this.#path = 'container';
        await container.requestFullscreen();
        return;
      }
      if (fn(container.webkitRequestFullscreen)) {
        this.#path = 'container';
        await container.webkitRequestFullscreen();
        return;
      }
    }
    const media = target.media;
    if (fn(media.webkitSetPresentationMode)) {
      this.#path = 'webkit-presentation';
      media.webkitSetPresentationMode('fullscreen');
      return;
    }
    if (fn(media.requestFullscreen)) {
      this.#path = 'media';
      await media.requestFullscreen();
      return;
    }
    if (fn(media.webkitEnterFullscreen)) {
      this.#path = 'media';
      media.webkitEnterFullscreen();
      return;
    }
    throw notSupported('Fullscreen');
  }

  async exitFullscreen(): Promise<void> {
    const target = this.#require();
    const media = target.media;
    const doc = ownerDocument(target);
    const path =
      media.webkitPresentationMode === 'fullscreen'
        ? 'webkit-presentation'
        : fullscreenElements(target).length
          ? 'container'
          : (this.#path ?? 'media');
    this.#path = undefined;
    if (path === 'webkit-presentation' && fn(media.webkitSetPresentationMode)) {
      media.webkitSetPresentationMode('inline');
      return;
    }
    if (path === 'container' || path === 'media') {
      if (fn(doc?.exitFullscreen)) return void (await doc.exitFullscreen());
      if (fn(doc?.webkitExitFullscreen)) return void doc.webkitExitFullscreen();
    }
    if (fn(media.webkitExitFullscreen)) return void media.webkitExitFullscreen();
  }

  async requestPictureInPicture(): Promise<void> {
    const target = this.#require();
    const media = target.media;
    if (!isMediaPictureInPictureCapable(media)) throw notSupported('Picture-in-picture');
    // Refuse before leaving fullscreen, so a rejected request keeps the player in fullscreen.
    if (!hasMetadata(media))
      throw new DOMException('The media has no metadata yet.', 'InvalidStateError');
    if (isFullscreen(target)) await this.exitFullscreen();
    if (fn(media.webkitSetPresentationMode)) {
      media.webkitSetPresentationMode('picture-in-picture');
      return;
    }
    await media.requestPictureInPicture!();
  }

  async exitPictureInPicture(): Promise<void> {
    const target = this.#require();
    const media = target.media;
    if (
      media.webkitPresentationMode === 'picture-in-picture' &&
      fn(media.webkitSetPresentationMode)
    ) {
      media.webkitSetPresentationMode('inline');
      return;
    }
    const doc = ownerDocument(target);
    if (fn(doc?.exitPictureInPicture)) await doc.exitPictureInPicture();
  }

  /**
   * Exits fullscreen, then shows the remote-playback picker (W3C `remote.prompt()` or the WebKit
   * AirPlay picker). While connected the prompt is used to disconnect, so fullscreen is kept.
   */
  async promptRemotePlayback(): Promise<void> {
    const target = this.#require();
    const media = target.media;
    const remote = isMediaRemotePlaybackCapable(media) ? media.remote : undefined;
    const view = ownerDocument(target)?.defaultView;
    const airplay = isWebKitAirPlayCapable(media, view);
    const connected = airplay
      ? media.webkitCurrentPlaybackTargetIsWireless === true
      : remote?.state === 'connected';
    if (!remote && !airplay) throw notSupported('Remote playback');
    if (!connected && isFullscreen(target)) await this.exitFullscreen();
    if (airplay) {
      media.webkitShowPlaybackTargetPicker!();
      return;
    }
    await remote!.prompt();
  }

  /** Locks the orientation while fullscreen when `type` is set; unlocks otherwise. */
  syncOrientation(type: OrientationLockType | null): void {
    if (type === null) {
      if (this.orientation.desired !== null) this.orientation.unlock();
      return;
    }
    if (this.orientation.desired !== type) void this.orientation.lock(type);
  }
}
