import { numberFormatter } from '../intl.js';
/**
 * Media player messages dictionary (`mp-f-locale`; contract proposal §3.13).
 *
 * Every user-facing string comes from a replaceable dictionary with English fallbacks. An entry is
 * a string (with optional `{name}` placeholders) or a function of its parameters. Locale formats
 * numbers and times only; it never selects translations. Diagnostics are not localized.
 */
type Text = string | number;

/** Parameters of the parameterized entries. Values arrive already formatted for the locale. */
export interface MediaMessageParams {
  seekForward: { seconds: Text };
  seekBackward: { seconds: Text };
  volumeValue: { percent: Text };
  mutedValue: { percent: Text };
  playbackRate: { rate: Text };
  timePosition: { current: Text; duration: Text };
  showRemaining: { duration: Text };
  showElapsed: { duration: Text };
  showDuration: { duration: Text };
  remainingSuffix: { duration: Text };
  elapsedSuffix: { duration: Text };
  durationSuffix: { duration: Text };
  autoWithLabel: { label: Text };
  statusPlaybackRate: { rate: Text };
  statusVolume: { percent: Text };
  statusSeekedTo: { time: Text };
}

export type MediaMessageKey =
  | 'player'
  | 'play'
  | 'pause'
  | 'replay'
  | 'mute'
  | 'unmute'
  | 'seekForward'
  | 'seekBackward'
  | 'enterFullscreen'
  | 'exitFullscreen'
  | 'enterPictureInPicture'
  | 'exitPictureInPicture'
  | 'enableCaptions'
  | 'disableCaptions'
  | 'startRemotePlayback'
  | 'stopRemotePlayback'
  | 'connecting'
  | 'live'
  | 'playingLive'
  | 'seekToLiveEdge'
  | 'seek'
  | 'volume'
  | 'volumeValue'
  | 'mutedValue'
  | 'playbackRate'
  | 'currentTime'
  | 'duration'
  | 'remainingTime'
  | 'timePosition'
  | 'timeUnknown'
  | 'showRemaining'
  | 'showElapsed'
  | 'showDuration'
  | 'remainingSuffix'
  | 'elapsedSuffix'
  | 'durationSuffix'
  | 'toggleTimeDescription'
  | 'toggleDurationDescription'
  | 'settings'
  | 'speed'
  | 'quality'
  | 'audio'
  | 'captions'
  | 'subtitles'
  | 'off'
  | 'auto'
  | 'autoWithLabel'
  | 'back'
  | 'normalSpeed'
  | 'statusPaused'
  | 'statusPlaying'
  | 'statusCaptionsOn'
  | 'statusCaptionsOff'
  | 'statusFullscreen'
  | 'statusExitFullscreen'
  | 'statusPictureInPicture'
  | 'statusExitPictureInPicture'
  | 'statusPlaybackRate'
  | 'statusMuted'
  | 'statusVolume'
  | 'statusSeekedTo'
  | 'errorTitle'
  | 'errorAborted'
  | 'errorNetwork'
  | 'errorDecode'
  | 'errorSource'
  | 'errorEncrypted'
  | 'errorUnplayable'
  | 'errorUnexpected'
  | 'retry'
  | 'dismiss';

export type MediaMessageParamsOf<K extends MediaMessageKey> = K extends keyof MediaMessageParams
  ? MediaMessageParams[K]
  : Record<string, never>;

export type MediaMessageEntry<K extends MediaMessageKey> =
  string | ((params: MediaMessageParamsOf<K>) => string);

/** The complete dictionary. */
export type MediaPlayerMessageDictionary = { [K in MediaMessageKey]: MediaMessageEntry<K> };

/** A partial dictionary supplied by the root (`messages`) or a constituent override. */
export type MediaPlayerMessages = {
  [K in MediaMessageKey]?: MediaMessageEntry<K> | undefined;
};

/** English defaults (Video.js `core/i18n/locales/en.ts`; error strings match `MediaError`). */
export const DEFAULT_MEDIA_MESSAGES: Readonly<MediaPlayerMessageDictionary> = Object.freeze({
  player: 'Media player',
  play: 'Play',
  pause: 'Pause',
  replay: 'Replay',
  mute: 'Mute',
  unmute: 'Unmute',
  seekForward: 'Seek forward {seconds} seconds',
  seekBackward: 'Seek backward {seconds} seconds',
  enterFullscreen: 'Enter fullscreen',
  exitFullscreen: 'Exit fullscreen',
  enterPictureInPicture: 'Enter picture-in-picture',
  exitPictureInPicture: 'Exit picture-in-picture',
  enableCaptions: 'Enable captions',
  disableCaptions: 'Disable captions',
  startRemotePlayback: 'Start casting',
  stopRemotePlayback: 'Stop casting',
  connecting: 'Connecting',
  live: 'Live',
  playingLive: 'Playing live',
  seekToLiveEdge: 'Seek to live edge',
  seek: 'Seek',
  volume: 'Volume',
  volumeValue: '{percent}',
  mutedValue: '{percent}, muted',
  playbackRate: 'Playback rate {rate}',
  currentTime: 'Current time',
  duration: 'Duration',
  remainingTime: 'Remaining',
  timePosition: '{current} of {duration}',
  timeUnknown: 'Media not loaded, unknown time.',
  showRemaining: 'Show remaining time, {duration}.',
  showElapsed: 'Show elapsed time, {duration}.',
  showDuration: 'Show duration, {duration}.',
  remainingSuffix: '{duration} remaining',
  elapsedSuffix: '{duration} elapsed',
  durationSuffix: '{duration} duration',
  toggleTimeDescription: 'Toggle between elapsed and remaining time.',
  toggleDurationDescription: 'Toggle between duration and remaining time.',
  settings: 'Settings',
  speed: 'Speed',
  quality: 'Quality',
  audio: 'Audio',
  captions: 'Captions',
  subtitles: 'Subtitles',
  off: 'Off',
  auto: 'Auto',
  autoWithLabel: 'Auto ({label})',
  back: 'Back',
  normalSpeed: 'Normal',
  statusPaused: 'Paused',
  statusPlaying: 'Playing',
  statusCaptionsOn: 'Captions on',
  statusCaptionsOff: 'Captions off',
  statusFullscreen: 'Fullscreen',
  statusExitFullscreen: 'Exit fullscreen',
  statusPictureInPicture: 'Picture in picture',
  statusExitPictureInPicture: 'Exit picture in picture',
  statusPlaybackRate: 'Playback rate {rate}',
  statusMuted: 'Muted',
  statusVolume: 'Volume {percent}',
  statusSeekedTo: 'Seeked to {time}',
  errorTitle: 'Something went wrong.',
  errorAborted: 'You stopped media playback before it finished.',
  errorNetwork: 'This media could not be loaded due to a network or server issue.',
  errorDecode:
    'This media could not be played. It may be corrupted, or your browser may not support its format.',
  errorSource:
    'This media could not be loaded. It may be unavailable, or your browser may not support its format.',
  errorEncrypted: 'This media could not be played because it could not be decrypted.',
  errorUnplayable: 'This media is unsupported by the player.',
  errorUnexpected: 'An unexpected error occurred.',
  retry: 'Retry',
  dismiss: 'OK',
} satisfies MediaPlayerMessageDictionary);

const PLACEHOLDER = /\{(\w+)\}/g;

/** Replaces `{name}` placeholders; unknown placeholders are left intact. */
export function interpolateMediaMessage(
  template: string,
  params: Readonly<Record<string, Text>> = {},
): string {
  return template.replace(PLACEHOLDER, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

/** Resolves message keys through layered dictionaries. */
export interface MediaMessagesResolver {
  /** The text for `key`, from the most specific layer that defines it. */
  get<K extends MediaMessageKey>(
    key: K,
    ...params: K extends keyof MediaMessageParams ? [params: MediaMessageParams[K]] : []
  ): string;
  /** A resolver whose entries override this one (root → constituent inheritance). */
  extend(messages: MediaPlayerMessages | null | undefined): MediaMessagesResolver;
  /** The merged dictionary. */
  readonly messages: Readonly<MediaPlayerMessageDictionary>;
}

/**
 * Creates a resolver over English defaults and the given layers, from least to most specific
 * (for example, `createMediaMessages(root.messages, constituent.messages)`). `undefined` entries
 * in a layer fall through to the next less specific layer.
 */
export function createMediaMessages(
  ...layers: Array<MediaPlayerMessages | null | undefined>
): MediaMessagesResolver {
  const merged: Record<string, unknown> = { ...DEFAULT_MEDIA_MESSAGES };
  for (const layer of layers) {
    if (!layer) continue;
    for (const [key, entry] of Object.entries(layer))
      if (entry !== undefined && Object.prototype.hasOwnProperty.call(DEFAULT_MEDIA_MESSAGES, key))
        merged[key] = entry;
  }
  const messages = Object.freeze(merged) as unknown as Readonly<MediaPlayerMessageDictionary>;
  const resolver: MediaMessagesResolver = {
    messages,
    get(key, ...rest) {
      const params = (rest[0] ?? {}) as Record<string, Text>;
      const entry = messages[key] as string | ((params: unknown) => string);
      return typeof entry === 'function' ? entry(params) : interpolateMediaMessage(entry, params);
    },
    extend(layer) {
      return layer ? createMediaMessages(messages, layer) : resolver;
    },
  };
  return resolver;
}

/** The dictionary key describing a media error code (`MediaError` codes 1–5). */
export function mediaErrorMessageKey(code: number | null | undefined): MediaMessageKey {
  switch (code) {
    case 1:
      return 'errorAborted';
    case 2:
      return 'errorNetwork';
    case 3:
      return 'errorDecode';
    case 4:
      return 'errorSource';
    case 5:
      return 'errorEncrypted';
    default:
      return 'errorUnexpected';
  }
}

/** Rate label `${rate}×` (U+00D7), with digits from the locale. */
export function formatPlaybackRate(rate: number, locale?: string | string[]): string {
  const digits = numberFormatter(locale, { maximumFractionDigits: 2, useGrouping: false });
  return `${digits.format(rate)}×`;
}

/** Percentage text for a 0–1 value, formatted by the locale. */
export function formatMediaPercent(value: number, locale?: string | string[]): string {
  const ratio = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
  return numberFormatter(locale, { style: 'percent', maximumFractionDigits: 0 }).format(ratio);
}
