import type { ChangeReason } from '../types.js';
import type { MediaAvailability } from './availability.js';
import type { MediaStreamType, MediaTimeRange } from './target.js';

/** Foundation `sec-1810-media-player` state model. */
export interface MediaTextTrackState {
  /** `track.id`, else `track:<index>:<kind>:<language>:<label>`. */
  readonly id: string;
  readonly kind: string;
  readonly label: string;
  readonly language: string;
  readonly mode: string;
}

export interface MediaCue {
  readonly id?: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly text: string;
}

export interface MediaThumbnailsTrack {
  readonly cues: readonly MediaCue[];
  /** Source of the `<track>` element, which cue URLs resolve against; `null` when unknown. */
  readonly src: string | null;
  /** CORS mode inherited from the media (`null`: the media is not CORS-enabled). */
  readonly crossOrigin: 'anonymous' | 'use-credentials' | null;
}

export interface MediaAudioTrackState {
  readonly id: string;
  readonly kind?: string;
  readonly label: string;
  readonly language: string;
  readonly enabled: boolean;
}

export interface MediaVideoRenditionState {
  readonly id: string;
  readonly width?: number;
  readonly height?: number;
  readonly bitrate?: number;
  readonly frameRate?: number;
  readonly codec?: string;
  readonly selected: boolean;
}

export interface MediaErrorState {
  readonly code: number;
  readonly message: string;
  readonly fatal: boolean;
}

export type MediaVolumeLevel = 'off' | 'low' | 'medium' | 'high';
export type MediaRemotePlaybackState = 'disconnected' | 'connecting' | 'connected';

export interface MediaState {
  // playback
  readonly paused: boolean;
  readonly ended: boolean;
  readonly started: boolean;
  readonly waiting: boolean;
  readonly loop: boolean;
  readonly readyState: number;
  // time
  readonly currentTime: number;
  readonly duration: number;
  readonly seeking: boolean;
  // buffer
  readonly buffered: readonly MediaTimeRange[];
  readonly seekable: readonly MediaTimeRange[];
  // source
  readonly currentSrc: string;
  readonly canPlay: boolean;
  // volume
  readonly volume: number;
  readonly muted: boolean;
  readonly volumeLevel: MediaVolumeLevel;
  readonly volumeAvailability: MediaAvailability;
  readonly mutedAvailability: MediaAvailability;
  // rate
  readonly playbackRate: number;
  readonly playbackRates: readonly number[];
  // error
  readonly error: MediaErrorState | null;
  // metadata
  readonly title: string;
  readonly poster: string;
  // presentation
  readonly fullscreen: boolean;
  readonly fullscreenAvailability: MediaAvailability;
  readonly pictureInPicture: boolean;
  readonly pictureInPictureAvailability: MediaAvailability;
  readonly remotePlaybackState: MediaRemotePlaybackState;
  readonly remotePlaybackAvailability: MediaAvailability;
  // controls
  readonly userActive: boolean;
  readonly controlsVisible: boolean;
  // text tracks
  readonly textTracks: readonly MediaTextTrackState[];
  readonly captionsShowing: boolean;
  readonly chapters: readonly MediaCue[];
  readonly thumbnails: MediaThumbnailsTrack | null;
  // audio tracks and quality
  readonly audioTracks: readonly MediaAudioTrackState[];
  readonly videoRenditions: readonly MediaVideoRenditionState[];
  readonly activeVideoRendition: MediaVideoRenditionState | null;
  readonly autoQuality: boolean;
  // live
  readonly streamType: MediaStreamType;
  readonly targetLiveWindow: number;
  readonly liveEdgeStart: number;
  readonly atLiveEdge: boolean;
  readonly dvr: boolean;
}

export type MediaStateKey = keyof MediaState;

/** Default playback-rate list (`playbackRates`). */
export const DEFAULT_PLAYBACK_RATES: readonly number[] = Object.freeze([
  0.2, 0.5, 0.7, 1, 1.2, 1.5, 1.7, 2,
]);
/** Live-edge tolerance with a reported `liveEdgeStart`, in seconds. */
export const LIVE_EDGE_START_TOLERANCE = 5;
/** Live-edge tolerance measured from the seekable end, in seconds. */
export const LIVE_EDGE_SEEKABLE_TOLERANCE = 10;

export type MediaOrientationLock = 'none' | OrientationLockType;
export type MediaStreamTypeConfig = 'auto' | 'on-demand' | 'live';

/**
 * User-owned configuration. It survives detach (`mp-f-lifecycle`). `contentTitle`/`poster`
 * `undefined` or `null` mean "not authored"; an authored `''` stops the fallback.
 */
export interface MediaStoreConfig {
  readonly contentTitle: string | null | undefined;
  readonly poster: string | null | undefined;
  /** Validated list; see `normalizePlaybackRates`. */
  readonly playbackRates: readonly number[];
  readonly streamType: MediaStreamTypeConfig;
  readonly orientationLock: MediaOrientationLock;
}

export const DEFAULT_MEDIA_CONFIG: MediaStoreConfig = Object.freeze({
  contentTitle: undefined,
  poster: undefined,
  playbackRates: DEFAULT_PLAYBACK_RATES,
  streamType: 'auto',
  orientationLock: 'none',
});

/**
 * Source values written by features. Derived keys are computed from these and configuration, so
 * source and derived values always publish together.
 */
export type MediaDerivedKey =
  | 'canPlay'
  | 'volumeLevel'
  | 'playbackRates'
  | 'title'
  | 'poster'
  | 'controlsVisible'
  | 'streamType'
  | 'targetLiveWindow'
  | 'atLiveEdge'
  | 'dvr';

export interface MediaSourceState extends Omit<MediaState, MediaDerivedKey> {
  /** `contentData.title` of the media. */
  readonly mediaTitle: string | null | undefined;
  /** `contentData.poster` of the media. */
  readonly mediaPoster: string | null | undefined;
  /** Native `video.poster`. */
  readonly videoPoster: string | null | undefined;
  /** `media.streamType`, else detected from the duration. */
  readonly detectedStreamType: MediaStreamType;
  /** `media.targetLiveWindow`, `NaN` when not reported. */
  readonly mediaTargetLiveWindow: number;
  /** A controls lease is held. */
  readonly controlsLocked: boolean;
}

export type MediaSourcePatch = Partial<{
  -readonly [K in keyof MediaSourceState]: MediaSourceState[K];
}>;

export const DEFAULT_MEDIA_SOURCE: MediaSourceState = Object.freeze({
  paused: true,
  ended: false,
  started: false,
  waiting: false,
  loop: false,
  readyState: 0,
  currentTime: 0,
  duration: 0,
  seeking: false,
  buffered: Object.freeze([]),
  seekable: Object.freeze([]),
  currentSrc: '',
  volume: 1,
  muted: false,
  volumeAvailability: 'unavailable',
  mutedAvailability: 'unavailable',
  playbackRate: 1,
  error: null,
  fullscreen: false,
  fullscreenAvailability: 'unavailable',
  pictureInPicture: false,
  pictureInPictureAvailability: 'unavailable',
  remotePlaybackState: 'disconnected',
  remotePlaybackAvailability: 'unsupported',
  userActive: true,
  textTracks: Object.freeze([]),
  captionsShowing: false,
  chapters: Object.freeze([]),
  thumbnails: null,
  audioTracks: Object.freeze([]),
  videoRenditions: Object.freeze([]),
  activeVideoRendition: null,
  autoQuality: true,
  liveEdgeStart: Number.NaN,
  mediaTitle: undefined,
  mediaPoster: undefined,
  videoPoster: undefined,
  detectedStreamType: 'unknown',
  mediaTargetLiveWindow: Number.NaN,
  controlsLocked: false,
} satisfies MediaSourceState);

/** Keys of `MediaSourceState` that are internal and never published. */
const INTERNAL_KEYS = new Set<string>([
  'mediaTitle',
  'mediaPoster',
  'videoPoster',
  'detectedStreamType',
  'mediaTargetLiveWindow',
  'controlsLocked',
]);

export function volumeLevel(volume: number, muted: boolean): MediaVolumeLevel {
  if (muted || volume <= 0) return 'off';
  if (volume < 0.5) return 'low';
  if (volume < 0.75) return 'medium';
  return 'high';
}

/** The end of the last seekable range when finite, else `NaN`. */
export function seekableEnd(seekable: readonly MediaTimeRange[]): number {
  const end = seekable.at(-1)?.[1];
  return end !== undefined && Number.isFinite(end) ? end : Number.NaN;
}

/** The start of the first seekable range when finite, else `0`. */
export function seekableStart(seekable: readonly MediaTimeRange[]): number {
  const start = seekable[0]?.[0];
  return start !== undefined && Number.isFinite(start) ? start : 0;
}

/** Finite positive duration, else a positive seekable end, else `0` (the time-range end). */
export function timeRangeEnd(state: Pick<MediaState, 'duration' | 'seekable'>): number {
  if (Number.isFinite(state.duration) && state.duration > 0) return state.duration;
  const end = seekableEnd(state.seekable);
  return Number.isFinite(end) && end > 0 ? end : 0;
}

/** Computes the published snapshot from source values and configuration. */
export function deriveMediaState(source: MediaSourceState, config: MediaStoreConfig): MediaState {
  const state: Record<string, unknown> = {};
  for (const key of Object.keys(source)) {
    if (!INTERNAL_KEYS.has(key)) state[key] = source[key as keyof MediaSourceState];
  }
  const streamType: MediaStreamType =
    config.streamType === 'auto' ? source.detectedStreamType : config.streamType;
  const live = streamType === 'live';
  // A live stream that reports no window is a standard (sliding) live stream (Media Chrome).
  const targetLiveWindow = Number.isNaN(source.mediaTargetLiveWindow)
    ? live
      ? 0
      : Number.NaN
    : source.mediaTargetLiveWindow;
  let atLiveEdge = false;
  if (live) {
    if (Number.isFinite(source.liveEdgeStart))
      atLiveEdge = source.currentTime >= source.liveEdgeStart - LIVE_EDGE_START_TOLERANCE;
    else {
      const end = seekableEnd(source.seekable);
      atLiveEdge = Number.isFinite(end) && source.currentTime >= end - LIVE_EDGE_SEEKABLE_TOLERANCE;
    }
  }
  const title =
    config.contentTitle !== undefined && config.contentTitle !== null
      ? config.contentTitle
      : (source.mediaTitle ?? '');
  const poster =
    config.poster !== undefined && config.poster !== null
      ? config.poster
      : (source.mediaPoster ?? source.videoPoster ?? '');
  Object.assign(state, {
    canPlay: source.readyState >= 3,
    volumeLevel: volumeLevel(source.volume, source.muted),
    playbackRates: config.playbackRates,
    title,
    poster,
    controlsVisible:
      source.controlsLocked ||
      source.userActive ||
      source.paused ||
      source.remotePlaybackState !== 'disconnected',
    streamType,
    targetLiveWindow,
    atLiveEdge,
    dvr: live && targetLiveWindow > 0,
  });
  return state as unknown as MediaState;
}

/** Structural equality for plain state data (primitives, arrays, plain objects). */
export function sameMediaValue(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false;
    return a.every((item, index) => sameMediaValue(item, b[index]));
  }
  if (Array.isArray(b)) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every(
    (key) =>
      Object.prototype.hasOwnProperty.call(b, key) &&
      sameMediaValue((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  );
}

/** Deep-freezes plain state data in place. */
export function freezeMediaValue<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const item of Object.values(value)) freezeMediaValue(item);
  return Object.freeze(value);
}

/** Change notification for one published batch. */
export interface MediaStateChange {
  /** Keys whose value changed in this batch. */
  readonly changed: readonly MediaStateKey[];
  readonly state: MediaState;
  readonly previousState: MediaState;
  /** `media` when every change was element-originated; otherwise the latest request reason. */
  readonly reason: ChangeReason;
  /** The reason attributed to each changed key. */
  readonly reasons: Readonly<Partial<Record<MediaStateKey, ChangeReason>>>;
}
