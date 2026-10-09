import type { PropertyDeclarations, PropertyValues } from 'lit';
import { numberOrNull } from '../../foundation/converters.js';
import { PressAndHold } from '../../foundation/press-and-hold.js';
import type { MediaState } from '../../foundation/media/state.js';
import {
  captionsButtonView,
  fullscreenButtonView,
  liveButtonView,
  muteButtonView,
  pipButtonView,
  playButtonView,
  playbackRateButtonView,
  remotePlaybackButtonView,
  resolveSeekSeconds,
  seekButtonView,
  type MediaButtonContext,
  type MediaButtonView,
} from './button-state.js';
import { TpMediaButtonElement } from './media-button.js';
import { DEFAULT_SEEK_STEP } from './player.js';

/**
 * `tp-media-play-button`: `toggle-paused`. Label `replay` when ended, `play` when paused,
 * otherwise `pause`. Markers `data-paused`, `data-ended`, `data-started`.
 *
 * @slot play - Icon while paused.
 * @slot pause - Icon while playing.
 * @slot replay - Icon after the end.
 */
export class TpMediaPlayButton extends TpMediaButtonElement {
  static tagName = 'tp-media-play-button';
  readonly #state = this.select((state) => ({
    paused: state.paused,
    ended: state.ended,
    started: state.started,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return playButtonView(state, context);
  }
}

/**
 * `tp-media-mute-button`: `toggle-muted`. Label `unmute` when muted or at zero volume, otherwise
 * `mute`. Markers `data-muted` and the four-level `data-volume-level` (`off|low|medium|high`).
 *
 * @slot volume-off - Icon when muted or at zero volume.
 * @slot volume-low - Icon below half volume.
 * @slot volume-medium - Icon at medium volume (falls back to the `volume-high` slot).
 * @slot volume-high - Icon at high volume.
 */
export class TpMediaMuteButton extends TpMediaButtonElement {
  static tagName = 'tp-media-mute-button';
  readonly #state = this.select((state) => ({
    muted: state.muted,
    volume: state.volume,
    level: state.volumeLevel,
    availability: state.mutedAvailability,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return muteButtonView(state, context);
  }
}

/**
 * `tp-media-seek-button`: `seek-by seconds`. `seconds` defaults to the player `seek-step`;
 * negative seeks backward. Label `seekForward`/`seekBackward` with the absolute seconds. Markers
 * `data-direction` (`forward|backward`) and `data-seeking`. Never hidden for a missing time range;
 * it is disabled instead. With `repeat`, holding the pointer repeats the seek through the shared
 * press-and-hold owner (400 ms, then every 60 ms).
 *
 * @slot seek-forward - Icon for a forward seek.
 * @slot seek-backward - Icon for a backward seek.
 */
export class TpMediaSeekButton extends TpMediaButtonElement {
  static tagName = 'tp-media-seek-button';
  static override properties: PropertyDeclarations = {
    ...TpMediaButtonElement.properties,
    seconds: { attribute: 'seconds', converter: numberOrNull },
    repeat: { type: Boolean, reflect: true },
  };

  /** Seconds to seek; `null` uses the player `seek-step`. Negative seeks backward. */
  seconds: number | null = null;
  /** Repeat the seek while the pointer is held. */
  repeat = false;

  readonly #state = this.select((state) => ({
    seeking: state.seeking,
    duration: state.duration,
    seekable: state.seekable,
    streamType: state.streamType,
    dvr: state.dvr,
  }));
  #hold: PressAndHold | undefined;

  /** The effective seconds (`seconds`, else the player step). */
  get effectiveSeconds(): number {
    return resolveSeekSeconds(this.seconds, this.player?.seekStep ?? DEFAULT_SEEK_STEP);
  }

  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return seekButtonView(state, context, this.effectiveSeconds);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#hold?.dispose();
    this.#hold = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    if (this.repeat && !this.#hold) {
      this.#hold = new PressAndHold(this, {
        disabled: () => !this.availability || this.availability.disabled,
        tick: (event) => {
          void this.sendRequest('seek-by', this.effectiveSeconds, event);
          return true;
        },
        release: () => undefined,
        focus: () => this.focus({ preventScroll: true }),
      });
    } else if (!this.repeat && this.#hold) {
      this.#hold.dispose();
      this.#hold = undefined;
    }
  }

  protected override skipActivation(event: MouseEvent): boolean {
    // A hold already sought; the click that ends it does not seek again.
    return this.#hold?.shouldSkipClick(event) ?? false;
  }
}

/**
 * `tp-media-fullscreen-button`: `toggle-fullscreen`. Label `enterFullscreen`/`exitFullscreen`.
 * Marker `data-fullscreen`. Hidden when unsupported. After a pointer activation the container is
 * focused so player hotkeys keep working.
 *
 * @slot enter-fullscreen - Icon while not fullscreen.
 * @slot exit-fullscreen - Icon while fullscreen.
 */
export class TpMediaFullscreenButton extends TpMediaButtonElement {
  static tagName = 'tp-media-fullscreen-button';
  readonly #state = this.select((state) => ({
    fullscreen: state.fullscreen,
    availability: state.fullscreenAvailability,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return fullscreenButtonView(state, context);
  }

  protected override async activate(event: MouseEvent): Promise<unknown> {
    // `detail` counts pointer clicks; keyboard activation reports 0 and keeps focus here.
    const pointer = event.detail > 0;
    const result = await super.activate(event);
    const container = this.player?.container;
    if (pointer && container?.isConnected) container.focus({ preventScroll: true });
    return result;
  }
}

/**
 * `tp-media-pip-button`: `toggle-picture-in-picture`. Label `enterPictureInPicture` /
 * `exitPictureInPicture`. Marker `data-pip`. Hidden when unsupported; disabled before metadata.
 *
 * @slot enter-pip - Icon while not in picture-in-picture.
 * @slot exit-pip - Icon while in picture-in-picture.
 */
export class TpMediaPipButton extends TpMediaButtonElement {
  static tagName = 'tp-media-pip-button';
  readonly #state = this.select((state) => ({
    pip: state.pictureInPicture,
    availability: state.pictureInPictureAvailability,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return pipButtonView(state, context);
  }
}

/**
 * `tp-media-captions-button`: `toggle-captions`. Label `enableCaptions`/`disableCaptions`.
 * Marker `data-active`. Hidden without captions or subtitles tracks. Used as a `tp-menu` trigger
 * (`slot="trigger"`), it opens the menu instead of toggling.
 *
 * @slot captions-on - Icon while captions show.
 * @slot captions-off - Icon while captions are off.
 */
export class TpMediaCaptionsButton extends TpMediaButtonElement {
  static tagName = 'tp-media-captions-button';
  readonly #state = this.select((state) => ({
    showing: state.captionsShowing,
    tracks: state.textTracks,
  }));
  protected override get opensMenuWhenTrigger(): boolean {
    return true;
  }
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return captionsButtonView(state, context);
  }
}

/**
 * `tp-media-playback-rate-button`: cycles `playbackRates` with wrapping (`set-playback-rate` with
 * the next rate in list order). Visible text `${rate}×`; label `playbackRate`. Marker `data-rate`.
 * Hidden without rates or for live without DVR. Used as a `tp-menu` trigger it opens the menu
 * instead of cycling.
 *
 * @csspart text - The visible rate.
 */
export class TpMediaPlaybackRateButton extends TpMediaButtonElement {
  static tagName = 'tp-media-playback-rate-button';
  readonly #state = this.select((state) => ({
    rate: state.playbackRate,
    rates: state.playbackRates,
    streamType: state.streamType,
    dvr: state.dvr,
  }));
  protected override get opensMenuWhenTrigger(): boolean {
    return true;
  }
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return playbackRateButtonView(state, context);
  }
}

/**
 * `tp-media-live-button`: `seek-to-live-edge`. Label `playingLive` at the edge (where it is
 * `aria-disabled`), otherwise `seekToLiveEdge`; visible text `live` with a decorative dot.
 * Markers `data-live`, `data-live-edge`. Hidden unless the stream is live.
 *
 * @slot live - The live dot.
 * @csspart text - The visible "Live" text.
 */
export class TpMediaLiveButton extends TpMediaButtonElement {
  static tagName = 'tp-media-live-button';
  readonly #state = this.select((state) => ({
    streamType: state.streamType,
    atLiveEdge: state.atLiveEdge,
    seekable: state.seekable,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return liveButtonView(state, context);
  }
}

/**
 * `tp-media-remote-playback-button`: `prompt-remote-playback`. Label `startRemotePlayback`,
 * `connecting` or `stopRemotePlayback`. Marker `data-remote-state`
 * (`disconnected|connecting|connected`). Hidden only when unsupported; disabled while no device
 * is available.
 *
 * @slot disconnected - Icon while not casting.
 * @slot connecting - Icon while connecting.
 * @slot connected - Icon while casting.
 */
export class TpMediaRemotePlaybackButton extends TpMediaButtonElement {
  static tagName = 'tp-media-remote-playback-button';
  readonly #state = this.select((state) => ({
    remote: state.remotePlaybackState,
    availability: state.remotePlaybackAvailability,
  }));
  protected computeView(state: MediaState, context: MediaButtonContext): MediaButtonView {
    void this.#state.value;
    return remotePlaybackButtonView(state, context);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-play-button': TpMediaPlayButton;
    'tp-media-mute-button': TpMediaMuteButton;
    'tp-media-seek-button': TpMediaSeekButton;
    'tp-media-fullscreen-button': TpMediaFullscreenButton;
    'tp-media-pip-button': TpMediaPipButton;
    'tp-media-captions-button': TpMediaCaptionsButton;
    'tp-media-playback-rate-button': TpMediaPlaybackRateButton;
    'tp-media-live-button': TpMediaLiveButton;
    'tp-media-remote-playback-button': TpMediaRemotePlaybackButton;
  }
}
