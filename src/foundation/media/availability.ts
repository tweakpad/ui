import type { MediaState } from './state.js';
import { seekableEnd, timeRangeEnd } from './state.js';

/**
 * Feature availability (`mp-f-availability`): `unavailable` means "not now" (no metadata, no
 * device, no tracks); `unsupported` means "never on this platform or media".
 */
export type MediaAvailability = 'available' | 'unavailable' | 'unsupported';

const CAPTION_KINDS = new Set(['captions', 'subtitles']);

export function isCaptionTrackKind(kind: string): boolean {
  return CAPTION_KINDS.has(kind);
}

type CountAvailability = (count: number, threshold: number) => MediaAvailability;
const fromCount: CountAvailability = (count, threshold) =>
  count >= threshold ? 'available' : 'unavailable';

/** Captions: at least one captions or subtitles track. */
export function captionsAvailability(state: Pick<MediaState, 'textTracks'>): MediaAvailability {
  return fromCount(state.textTracks.filter((track) => isCaptionTrackKind(track.kind)).length, 1);
}

/** Quality: more than one rendition. */
export function qualityAvailability(state: Pick<MediaState, 'videoRenditions'>): MediaAvailability {
  return fromCount(state.videoRenditions.length, 2);
}

/** Audio track: more than one track. */
export function audioTrackAvailability(state: Pick<MediaState, 'audioTracks'>): MediaAvailability {
  return fromCount(state.audioTracks.length, 2);
}

/** Rate: a non-empty rate list; live streams without DVR hide rate controls (`mp-f-live`). */
export function rateAvailability(
  state: Pick<MediaState, 'playbackRates' | 'streamType' | 'dvr'>,
): MediaAvailability {
  if (state.streamType === 'live' && !state.dvr) return 'unsupported';
  return fromCount(state.playbackRates.length, 1);
}

/** Time range: a positive duration or a finite seekable end; hidden for live without DVR. */
export function timeRangeAvailability(
  state: Pick<MediaState, 'duration' | 'seekable' | 'streamType' | 'dvr'>,
): MediaAvailability {
  if (state.streamType === 'live' && !state.dvr) return 'unsupported';
  return timeRangeEnd(state) > 0 ? 'available' : 'unavailable';
}

/** Live edge: a live stream with a finite seekable end. */
export function liveEdgeAvailability(
  state: Pick<MediaState, 'streamType' | 'seekable'>,
): MediaAvailability {
  if (state.streamType !== 'live') return 'unsupported';
  return Number.isFinite(seekableEnd(state.seekable)) ? 'available' : 'unavailable';
}

/** Whether a control backed by `availability` is hidden (`mp-f-disabled-hidden`). */
export function availabilityHidden(availability: MediaAvailability, list = false): boolean {
  return availability === 'unsupported' || (list && availability === 'unavailable');
}

export interface MediaControlAvailabilityOptions {
  /** The store is attached to a media element. */
  readonly attached: boolean;
  /** The player is disabled. */
  readonly disabled?: boolean;
  /** The control represents a list (captions, quality, audio): an empty list hides it. */
  readonly list?: boolean;
  /** The remote-playback control: hidden only when unsupported (`mp-f-disabled-hidden`). */
  readonly remote?: boolean;
  /** A live control at the live edge: cannot act now. */
  readonly atEdge?: boolean;
}

/** Markers a media control publishes (`data-availability`, `data-disabled`, `data-hidden`). */
export interface MediaControlAvailability {
  readonly availability: MediaAvailability;
  /** Focusable with `aria-disabled`; never native `disabled`. */
  readonly disabled: boolean;
  /** Native `hidden`, removed from the accessibility tree. */
  readonly hidden: boolean;
}

/**
 * Applies the disabled/hidden policy. Without media every control is `unavailable` and disabled
 * (edge matrix "No media"). An unsupported feature, or an empty list, is hidden; the remote
 * control is hidden only when unsupported.
 */
export function controlAvailability(
  feature: MediaAvailability,
  options: MediaControlAvailabilityOptions,
): MediaControlAvailability {
  const availability: MediaAvailability = options.attached ? feature : 'unavailable';
  const hidden =
    options.attached &&
    (options.remote
      ? availability === 'unsupported'
      : availabilityHidden(availability, options.list === true));
  const disabled =
    !hidden &&
    (availability !== 'available' || options.disabled === true || options.atEdge === true);
  return { availability, disabled, hidden };
}
