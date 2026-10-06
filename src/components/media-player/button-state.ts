/**
 * Pure state → view mapping for the media buttons (Library mp-l-buttons, mp-f-disabled-hidden;
 * Video.js `core/ui/*-button/core.ts`). Each view names the state-dependent accessible label, the
 * per-state icon slot and its fallback artwork, visible text (rate and live buttons), the host
 * markers, the feature availability with its hide policy, and the request the button issues.
 * The Lit elements in `buttons.ts` only bind these views to `tp-button`.
 */
import type { MediaIconName } from '../../icons/media.js';
import {
  captionsAvailability,
  liveEdgeAvailability,
  rateAvailability,
  timeRangeAvailability,
  type MediaAvailability,
} from '../../foundation/media/availability.js';
import { formatPlaybackRate, type MediaMessagesResolver } from '../../foundation/media/messages.js';
import { nextPlaybackRateCycle, type MediaRequestAction } from '../../foundation/media/requests.js';
import type { MediaState, MediaVolumeLevel } from '../../foundation/media/state.js';

/** Host marker values: `true` → empty attribute, a string → that value, `false`/`null` → absent. */
export type MediaMarkerValue = string | boolean | null;
export type MediaMarkers = Readonly<Record<string, MediaMarkerValue>>;

/** The per-state icon: a named slot (with nested fallback slots) over library artwork. */
export interface MediaButtonIcon {
  /** Named slot that replaces this state's icon (`<svg slot="pause">`). */
  readonly slot: string;
  /** Further slots consulted, in order, when `slot` has no assigned content. */
  readonly fallbackSlots?: readonly string[];
  /** Library artwork used when no slot has content. */
  readonly name: MediaIconName;
}

export interface MediaButtonRequest {
  readonly action: MediaRequestAction;
  readonly value?: unknown;
}

export interface MediaButtonView {
  /** State-dependent accessible name (`aria-label`; never `aria-pressed`). */
  readonly label: string;
  readonly icon?: MediaButtonIcon;
  /** Visible text (`1.5×`, `Live`), decorative next to the accessible name. */
  readonly text?: string;
  readonly markers: MediaMarkers;
  /** Feature availability before the attach/disabled policy is applied. */
  readonly feature: MediaAvailability;
  /** Hide policy: `list` hides an empty list, `remote` hides only when unsupported. */
  readonly policy: {
    readonly list?: boolean;
    readonly remote?: boolean;
    readonly atEdge?: boolean;
  };
  /** The request issued on activation (`null`: nothing to do). */
  readonly request: MediaButtonRequest | null;
  /** The binding published as `aria-keyshortcuts`, if any. */
  readonly shortcut?: MediaButtonRequest;
}

export interface MediaButtonContext {
  readonly messages: MediaMessagesResolver;
  readonly locale?: string | undefined;
  /** Capability gate of a request action (the player's `requestAvailability`). */
  readonly capability: (action: MediaRequestAction) => MediaAvailability;
}

/** Narrows a capability: an unsupported request hides the control; otherwise `feature` decides. */
function gated(capability: MediaAvailability, feature: MediaAvailability): MediaAvailability {
  if (capability === 'unsupported') return 'unsupported';
  return feature;
}

// ---------------------------------------------------------------------------------------------
// Play

export type MediaPlayButtonState = 'play' | 'pause' | 'replay';

/** `replay` when ended, `play` when paused, otherwise `pause` (Video.js PlayButtonCore). */
export function playButtonState(state: Pick<MediaState, 'paused' | 'ended'>): MediaPlayButtonState {
  if (state.ended) return 'replay';
  return state.paused ? 'play' : 'pause';
}

export function playButtonView(state: MediaState, context: MediaButtonContext): MediaButtonView {
  const current = playButtonState(state);
  return {
    label: context.messages.get(current),
    icon: { slot: current, name: current },
    markers: {
      'data-paused': state.paused,
      'data-ended': state.ended,
      'data-started': state.started,
    },
    feature: context.capability('toggle-paused'),
    policy: {},
    request: { action: 'toggle-paused' },
    shortcut: { action: 'toggle-paused' },
  };
}

// ---------------------------------------------------------------------------------------------
// Mute

/** Icon slot for a volume level: the four-level vocabulary maps `medium` to the high artwork. */
export function volumeIconSlot(level: MediaVolumeLevel): MediaButtonIcon {
  switch (level) {
    case 'off':
      return { slot: 'volume-off', name: 'volumeOff' };
    case 'low':
      return { slot: 'volume-low', name: 'volumeLow' };
    case 'medium':
      return { slot: 'volume-medium', fallbackSlots: ['volume-high'], name: 'volumeHigh' };
    case 'high':
      return { slot: 'volume-high', name: 'volumeHigh' };
  }
}

/** `unmute` when muted or at zero volume (Video.js MuteButtonCore), otherwise `mute`. */
export function muteButtonLabelKey(state: Pick<MediaState, 'muted' | 'volume'>): 'mute' | 'unmute' {
  return state.muted || state.volume <= 0 ? 'unmute' : 'mute';
}

export function muteButtonView(state: MediaState, context: MediaButtonContext): MediaButtonView {
  return {
    label: context.messages.get(muteButtonLabelKey(state)),
    icon: volumeIconSlot(state.volumeLevel),
    markers: { 'data-muted': state.muted, 'data-volume-level': state.volumeLevel },
    feature: state.mutedAvailability,
    policy: {},
    request: { action: 'toggle-muted' },
    shortcut: { action: 'toggle-muted' },
  };
}

// ---------------------------------------------------------------------------------------------
// Seek

export type MediaSeekDirection = 'forward' | 'backward';

/** Negative seconds seek backward. */
export function seekDirection(seconds: number): MediaSeekDirection {
  return seconds < 0 ? 'backward' : 'forward';
}

/** A finite seek amount, else the player step. */
export function resolveSeekSeconds(seconds: number | null | undefined, seekStep: number): number {
  return typeof seconds === 'number' && Number.isFinite(seconds) && seconds !== 0
    ? seconds
    : seekStep;
}

export function seekButtonView(
  state: MediaState,
  context: MediaButtonContext,
  seconds: number,
): MediaButtonView {
  const direction = seekDirection(seconds);
  const amount = new Intl.NumberFormat(context.locale, {
    maximumFractionDigits: 2,
    useGrouping: false,
  }).format(Math.abs(seconds));
  const backward = direction === 'backward';
  const capability = context.capability('seek-by');
  // Never hidden for a missing time range (live without DVR, no metadata): disabled instead.
  const feature =
    capability === 'unsupported'
      ? 'unsupported'
      : capability === 'available' && timeRangeAvailability(state) === 'available'
        ? 'available'
        : 'unavailable';
  return {
    label: context.messages.get(backward ? 'seekBackward' : 'seekForward', { seconds: amount }),
    icon: backward
      ? { slot: 'seek-backward', name: 'seekBackward' }
      : { slot: 'seek-forward', name: 'seekForward' },
    markers: { 'data-direction': direction, 'data-seeking': state.seeking },
    feature,
    policy: {},
    request: { action: 'seek-by', value: seconds },
    shortcut: { action: 'seek-by', value: seconds },
  };
}

// ---------------------------------------------------------------------------------------------
// Fullscreen and picture-in-picture

export function fullscreenButtonView(
  state: MediaState,
  context: MediaButtonContext,
): MediaButtonView {
  const active = state.fullscreen;
  return {
    label: context.messages.get(active ? 'exitFullscreen' : 'enterFullscreen'),
    icon: active
      ? { slot: 'exit-fullscreen', name: 'fullscreenExit' }
      : { slot: 'enter-fullscreen', name: 'fullscreenEnter' },
    markers: { 'data-fullscreen': active },
    feature: state.fullscreenAvailability,
    policy: {},
    request: { action: 'toggle-fullscreen' },
    shortcut: { action: 'toggle-fullscreen' },
  };
}

export function pipButtonView(state: MediaState, context: MediaButtonContext): MediaButtonView {
  const active = state.pictureInPicture;
  return {
    label: context.messages.get(active ? 'exitPictureInPicture' : 'enterPictureInPicture'),
    icon: active ? { slot: 'exit-pip', name: 'pipExit' } : { slot: 'enter-pip', name: 'pipEnter' },
    markers: { 'data-pip': active },
    // An active session can always be left, even if the platform later reports otherwise.
    feature: active ? 'available' : state.pictureInPictureAvailability,
    policy: {},
    request: { action: 'toggle-picture-in-picture' },
    shortcut: { action: 'toggle-picture-in-picture' },
  };
}

// ---------------------------------------------------------------------------------------------
// Captions

export function captionsButtonView(
  state: MediaState,
  context: MediaButtonContext,
): MediaButtonView {
  const active = state.captionsShowing;
  return {
    label: context.messages.get(active ? 'disableCaptions' : 'enableCaptions'),
    icon: active
      ? { slot: 'captions-on', name: 'captionsOn' }
      : { slot: 'captions-off', name: 'captionsOff' },
    markers: { 'data-active': active },
    feature: gated(context.capability('select-text-track'), captionsAvailability(state)),
    // No captions or subtitles track hides the control (an empty list).
    policy: { list: true },
    request: { action: 'toggle-captions' },
    shortcut: { action: 'toggle-captions' },
  };
}

// ---------------------------------------------------------------------------------------------
// Playback rate

export function playbackRateButtonView(
  state: MediaState,
  context: MediaButtonContext,
): MediaButtonView {
  const rate = formatPlaybackRate(state.playbackRate, context.locale);
  return {
    label: context.messages.get('playbackRate', { rate }),
    text: rate,
    markers: { 'data-rate': String(state.playbackRate) },
    feature: gated(context.capability('set-playback-rate'), rateAvailability(state)),
    // No rates (or live without DVR, which is unsupported) hides the control.
    policy: { list: true },
    // The cycle button wraps (`nextPlaybackRateCycle`); the clamped `step-playback-rate`
    // key binding is a different action, so no shortcut is published for the button.
    request: state.playbackRates.length
      ? {
          action: 'set-playback-rate',
          value: nextPlaybackRateCycle(state.playbackRates, state.playbackRate),
        }
      : null,
  };
}

// ---------------------------------------------------------------------------------------------
// Live

export function liveButtonView(state: MediaState, context: MediaButtonContext): MediaButtonView {
  const live = state.streamType === 'live';
  const edge = live && state.atLiveEdge;
  return {
    label: context.messages.get(edge ? 'playingLive' : 'seekToLiveEdge'),
    icon: { slot: 'live', name: 'live' },
    text: context.messages.get('live'),
    markers: { 'data-live': live, 'data-live-edge': edge },
    feature: gated(context.capability('seek-to-live-edge'), liveEdgeAvailability(state)),
    // At the edge the control cannot act now: focusable and aria-disabled.
    policy: { atEdge: edge },
    request: { action: 'seek-to-live-edge' },
    shortcut: { action: 'seek-to-live-edge' },
  };
}

// ---------------------------------------------------------------------------------------------
// Remote playback

export function remotePlaybackButtonView(
  state: MediaState,
  context: MediaButtonContext,
): MediaButtonView {
  const remote = state.remotePlaybackState;
  return {
    label: context.messages.get(
      remote === 'connecting'
        ? 'connecting'
        : remote === 'connected'
          ? 'stopRemotePlayback'
          : 'startRemotePlayback',
    ),
    icon: { slot: remote, name: 'cast' },
    markers: { 'data-remote-state': remote },
    feature: remote !== 'disconnected' ? 'available' : state.remotePlaybackAvailability,
    // Hidden only when unsupported; unavailable (no device) is disabled.
    policy: { remote: true },
    request: { action: 'prompt-remote-playback' },
    shortcut: { action: 'prompt-remote-playback' },
  };
}
