/**
 * Media target contract (Foundation `sec-1810-media-player`, media target table).
 *
 * The store accepts any object that implements the HTMLMediaElement-compatible subset below.
 * Native `<video>` and `<audio>` qualify; a custom media element qualifies by implementing the
 * subset. Every capability is optional: a feature whose capability is missing keeps its defaults
 * and reports `unsupported`. Shapes follow Video.js `packages/media/src/core/types.ts`.
 */

/** `HTMLMediaElement.readyState` values. */
export const MediaReadyState = Object.freeze({
  HAVE_NOTHING: 0,
  HAVE_METADATA: 1,
  HAVE_CURRENT_DATA: 2,
  HAVE_FUTURE_DATA: 3,
  HAVE_ENOUGH_DATA: 4,
} as const);
export type MediaReadyStateValue = 0 | 1 | 2 | 3 | 4;

export type MediaStreamType = 'on-demand' | 'live' | 'unknown';
export type MediaCrossOrigin = 'anonymous' | 'use-credentials';

export interface TimeRangesLike {
  readonly length: number;
  start(index: number): number;
  end(index: number): number;
}

export interface MediaErrorLike {
  readonly code: number;
  readonly message?: string | undefined;
  /** Non-standard; engines may flag recoverable errors. */
  readonly fatal?: boolean | undefined;
}

export interface TextCueLike {
  readonly id?: string | undefined;
  readonly startTime: number;
  readonly endTime: number;
  readonly text?: string | undefined;
}

export interface TextCueListLike {
  readonly length: number;
  readonly [index: number]: TextCueLike | undefined;
}

export interface TextTrackLike {
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  mode: 'disabled' | 'hidden' | 'showing' | string;
  readonly cues?: TextCueListLike | null | undefined;
}

/** `TextTrackList`: array-like, an event target for `addtrack`, `removetrack` and `change`. */
export interface TextTrackListLike extends EventTarget {
  readonly length: number;
  readonly [index: number]: TextTrackLike | undefined;
}

export interface AudioTrackLike {
  readonly id: string;
  readonly kind?: string | undefined;
  readonly label: string;
  readonly language: string;
  enabled: boolean;
}

/** `AudioTrackList`: array-like, an event target for `addtrack`, `removetrack` and `change`. */
export interface AudioTrackListLike extends EventTarget {
  readonly length: number;
  readonly [index: number]: AudioTrackLike | undefined;
}

export interface VideoRenditionLike {
  readonly id?: string | undefined;
  readonly width?: number | undefined;
  readonly height?: number | undefined;
  readonly bitrate?: number | undefined;
  readonly frameRate?: number | undefined;
  readonly codec?: string | undefined;
  readonly selected?: boolean | undefined;
  /** The rendition currently decoding, when the engine reports it. */
  readonly active?: boolean | undefined;
}

/**
 * Video rendition list: array-like with `selectedIndex` (`-1` = adaptive), an event target for
 * `addrendition`, `removerendition`, `change` and `activechange`.
 */
export interface VideoRenditionListLike extends EventTarget {
  readonly length: number;
  readonly [index: number]: VideoRenditionLike | undefined;
  selectedIndex: number;
}

/** W3C Remote Playback `media.remote`. */
export interface RemotePlaybackLike extends EventTarget {
  readonly state: 'disconnected' | 'connecting' | 'connected' | string;
  prompt(): Promise<void>;
  watchAvailability?(callback: (available: boolean) => void): Promise<number>;
  cancelWatchAvailability?(id?: number): Promise<void>;
}

export interface MediaContentData {
  readonly title?: string | null | undefined;
  readonly poster?: string | null | undefined;
}

/**
 * The full optional member set. A target is any `EventTarget`; each feature checks its capability
 * predicate before reading members.
 */
export interface MediaTarget extends EventTarget {
  // Playback
  play?(): Promise<void> | void;
  pause?(): void;
  readonly paused?: boolean;
  readonly ended?: boolean;
  // Seek and time
  currentTime?: number;
  readonly duration?: number;
  readonly seeking?: boolean;
  loop?: boolean;
  // Source
  src?: string;
  readonly currentSrc?: string;
  readonly readyState?: number;
  readonly networkState?: number;
  preload?: string;
  crossOrigin?: string | null;
  load?(): void;
  // Buffer
  readonly buffered?: TimeRangesLike;
  readonly seekable?: TimeRangesLike;
  // Volume and rate
  volume?: number;
  muted?: boolean;
  playbackRate?: number;
  // Error
  readonly error?: MediaErrorLike | null;
  // Tracks and renditions
  readonly textTracks?: TextTrackListLike;
  readonly audioTracks?: AudioTrackListLike;
  readonly videoRenditions?: VideoRenditionListLike;
  // Picture-in-picture and presentation
  requestPictureInPicture?(): Promise<unknown>;
  disablePictureInPicture?: boolean;
  readonly webkitPresentationMode?: string;
  webkitSetPresentationMode?(mode: 'inline' | 'picture-in-picture' | 'fullscreen'): void;
  requestFullscreen?(): Promise<void> | void;
  webkitEnterFullscreen?(): void;
  webkitExitFullscreen?(): void;
  // Remote playback
  readonly remote?: RemotePlaybackLike;
  webkitShowPlaybackTargetPicker?(): void;
  readonly webkitCurrentPlaybackTargetIsWireless?: boolean;
  // Live
  readonly streamType?: MediaStreamType | string;
  readonly targetLiveWindow?: number;
  readonly liveEdgeStart?: number;
  // Content data and dimensions
  readonly contentData?: MediaContentData | null;
  readonly poster?: string;
  readonly videoWidth?: number;
  readonly videoHeight?: number;
  // DOM (track children and owner document)
  readonly ownerDocument?: Document | null;
  querySelectorAll?(selectors: string): ArrayLike<Element>;
}

/**
 * An engine-provided tracks source for media without native lists (`mp-f-adapter`). Each list
 * implements the native list contract above. Getters are re-read on `loadstart`, so an adapter
 * may replace its lists when the engine loads a new source.
 */
export interface MediaTracksAdapter {
  readonly videoRenditions?: VideoRenditionListLike | null | undefined;
  readonly audioTracks?: AudioTrackListLike | null | undefined;
}

/** A frozen, empty `TimeRanges` for hosts with no ranges; treated as "not capable". */
export const EMPTY_TIME_RANGES: TimeRangesLike = Object.freeze({
  length: 0,
  start: () => 0,
  end: () => 0,
});

/** An empty `TextTrackList` for hosts without text tracks; treated as "not capable". */
export const EMPTY_TEXT_TRACKS: TextTrackListLike = Object.assign(new EventTarget(), {
  length: 0,
}) as TextTrackListLike;

/** An inert `remote` for hosts without remote playback; treated as "not capable". */
export const EMPTY_REMOTE: RemotePlaybackLike = Object.assign(new EventTarget(), {
  state: 'disconnected',
  prompt: () =>
    Promise.reject(new DOMException('Remote playback is not supported.', 'NotSupportedError')),
}) as RemotePlaybackLike;

type Members = Record<string, unknown>;
const object = (value: unknown): value is Members =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;
const defined = (media: Members, key: string) => media[key] !== undefined;
const callable = (media: Members, key: string) => typeof media[key] === 'function';

export function isMediaPlaybackCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'play' | 'pause' | 'paused' | 'ended'>> {
  return (
    object(media) &&
    callable(media, 'play') &&
    callable(media, 'pause') &&
    defined(media, 'paused') &&
    defined(media, 'ended')
  );
}

export function isMediaSeekCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'currentTime' | 'duration' | 'seeking'>> {
  return (
    object(media) &&
    defined(media, 'currentTime') &&
    defined(media, 'duration') &&
    defined(media, 'seeking')
  );
}

export function isMediaSourceCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'currentSrc' | 'readyState'>> {
  return object(media) && defined(media, 'currentSrc') && defined(media, 'readyState');
}

export function isMediaBufferCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'buffered' | 'seekable'>> {
  return (
    object(media) &&
    object(media.buffered) &&
    media.buffered !== (EMPTY_TIME_RANGES as unknown) &&
    object(media.seekable) &&
    media.seekable !== (EMPTY_TIME_RANGES as unknown)
  );
}

export function isMediaVolumeCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'volume' | 'muted'>> {
  return object(media) && defined(media, 'volume') && defined(media, 'muted');
}

/** A media can report mute without offering a settable level (embeds). */
export function isMediaMutedCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'muted'>> {
  return object(media) && defined(media, 'muted');
}

export function isMediaRateCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'playbackRate'>> {
  return object(media) && defined(media, 'playbackRate');
}

export function isMediaErrorCapable(media: unknown): media is MediaTarget {
  return object(media) && defined(media, 'error');
}

export function isMediaTextTrackCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'textTracks'>> {
  return (
    object(media) && object(media.textTracks) && media.textTracks !== (EMPTY_TEXT_TRACKS as unknown)
  );
}

export function isMediaAudioTrackCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'audioTracks'>> {
  return object(media) && object(media.audioTracks);
}

export function isMediaVideoRenditionCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'videoRenditions'>> {
  return object(media) && object(media.videoRenditions);
}

/** `requestPictureInPicture` or the WebKit presentation mode; exit belongs to the document. */
export function isMediaPictureInPictureCapable(media: unknown): media is MediaTarget {
  return (
    object(media) &&
    (callable(media, 'requestPictureInPicture') || callable(media, 'webkitSetPresentationMode'))
  );
}

export function isMediaRemotePlaybackCapable(
  media: unknown,
): media is MediaTarget & Required<Pick<MediaTarget, 'remote'>> {
  if (!object(media) || !object(media.remote) || media.remote === (EMPTY_REMOTE as unknown))
    return false;
  const remote = media.remote as Members;
  return 'state' in remote && callable(remote, 'prompt');
}

/** WebKit AirPlay: the picker plus the target-availability event interface. */
export function isWebKitAirPlayCapable(media: unknown, view?: Window | null): boolean {
  if (!object(media) || !callable(media, 'webkitShowPlaybackTargetPicker')) return false;
  const owner = (view ?? globalThis) as unknown as Members;
  return 'WebKitPlaybackTargetAvailabilityEvent' in owner;
}

export function isMediaStreamTypeCapable(media: unknown): media is MediaTarget {
  return object(media) && defined(media, 'streamType');
}

export function isMediaLiveCapable(media: unknown): media is MediaTarget {
  return object(media) && defined(media, 'liveEdgeStart') && defined(media, 'targetLiveWindow');
}

export function isMediaContentDataCapable(media: unknown): media is MediaTarget {
  return object(media) && defined(media, 'contentData');
}

export function isMediaVideoDimensionsCapable(media: unknown): media is MediaTarget {
  return object(media) && defined(media, 'videoWidth') && defined(media, 'videoHeight');
}

export function hasMetadata(media: MediaTarget): boolean {
  return (media.readyState ?? 0) >= MediaReadyState.HAVE_METADATA;
}

/** Serialized ordered `[start, end]` pairs. */
export type MediaTimeRange = readonly [start: number, end: number];

export function serializeTimeRanges(ranges: TimeRangesLike | null | undefined): MediaTimeRange[] {
  const result: MediaTimeRange[] = [];
  if (!ranges) return result;
  for (let index = 0; index < ranges.length; index++)
    result.push([ranges.start(index), ranges.end(index)]);
  return result;
}

/** Iterates an array-like list (native lists are not reliably iterable in every engine). */
export function listItems<T>(list: {
  readonly length: number;
  readonly [index: number]: T | undefined;
}): T[] {
  const items: T[] = [];
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    if (item !== undefined) items.push(item);
  }
  return items;
}

/** The owner document of a media or container, falling back to the global document. */
export function mediaOwnerDocument(
  media: MediaTarget | null | undefined,
  container?: Element | null,
): Document | undefined {
  return (
    container?.ownerDocument ??
    (media?.ownerDocument as Document | null | undefined) ??
    (globalThis.document as Document | undefined)
  );
}
