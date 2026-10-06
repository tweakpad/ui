import type { Diagnostic } from '../services.js';
import type { ChangeReason } from '../types.js';
import type { ActivityOwner } from './activity.js';
import { captionsAvailability, type MediaAvailability } from './availability.js';
import { captionTracks, findLocaleTrack } from './captions.js';
import type { MediaRequestDetail, MediaRequestFailedDetail } from './events.js';
import {
  audioTrackId,
  audioTrackList,
  renditionId,
  videoRenditionList,
} from './features/tracks.js';
import { textTrackId } from './features/text-tracks.js';
import type { MediaPresentation } from './presentation.js';
import {
  seekableEnd,
  seekableStart,
  timeRangeEnd,
  type MediaSourcePatch,
  type MediaState,
  type MediaStateKey,
} from './state.js';
import {
  hasMetadata,
  isMediaMutedCapable,
  isMediaPlaybackCapable,
  isMediaRateCapable,
  isMediaSeekCapable,
  isMediaTextTrackCapable,
  isMediaVolumeCapable,
  listItems,
  type MediaTarget,
  type MediaTracksAdapter,
  type TextTrackLike,
} from './target.js';

/** Request actions (`mp-f-request` table) and their values. */
export interface MediaRequestValues {
  play: undefined;
  pause: undefined;
  'toggle-paused': undefined;
  seek: number;
  'seek-by': number;
  'seek-to-percent': number;
  'seek-to-live-edge': undefined;
  'set-volume': number;
  'set-muted': boolean;
  'toggle-muted': undefined;
  'step-volume': number;
  'set-playback-rate': number;
  'step-playback-rate': number;
  'request-fullscreen': undefined;
  'exit-fullscreen': undefined;
  'toggle-fullscreen': undefined;
  'request-picture-in-picture': undefined;
  'exit-picture-in-picture': undefined;
  'toggle-picture-in-picture': undefined;
  'prompt-remote-playback': undefined;
  'select-text-track': string | null;
  'toggle-captions': boolean | undefined;
  'select-audio-track': string;
  'select-video-rendition': string;
  'toggle-controls': boolean | undefined;
  'dismiss-error': undefined;
}

/** What each request resolves with after execution. */
export interface MediaRequestResults {
  play: void;
  pause: void;
  'toggle-paused': void;
  /** The actual position after `seeked`. */
  seek: number;
  'seek-by': number;
  'seek-to-percent': number;
  'seek-to-live-edge': number;
  /** The resulting volume. */
  'set-volume': number;
  /** The resulting muted state. */
  'set-muted': boolean;
  'toggle-muted': boolean;
  'step-volume': number;
  /** The written rate (state follows `ratechange`). */
  'set-playback-rate': number;
  'step-playback-rate': number;
  'request-fullscreen': void;
  'exit-fullscreen': void;
  'toggle-fullscreen': void;
  'request-picture-in-picture': void;
  'exit-picture-in-picture': void;
  'toggle-picture-in-picture': void;
  'prompt-remote-playback': void;
  'select-text-track': void;
  /** The resulting `captionsShowing`. */
  'toggle-captions': boolean;
  'select-audio-track': void;
  'select-video-rendition': void;
  /** The resulting user activity. */
  'toggle-controls': boolean;
  'dismiss-error': void;
}

export type MediaRequestAction = keyof MediaRequestValues;

export const MEDIA_REQUEST_ACTIONS: readonly MediaRequestAction[] = Object.freeze([
  'play',
  'pause',
  'toggle-paused',
  'seek',
  'seek-by',
  'seek-to-percent',
  'seek-to-live-edge',
  'set-volume',
  'set-muted',
  'toggle-muted',
  'step-volume',
  'set-playback-rate',
  'step-playback-rate',
  'request-fullscreen',
  'exit-fullscreen',
  'toggle-fullscreen',
  'request-picture-in-picture',
  'exit-picture-in-picture',
  'toggle-picture-in-picture',
  'prompt-remote-playback',
  'select-text-track',
  'toggle-captions',
  'select-audio-track',
  'select-video-rendition',
  'toggle-controls',
  'dismiss-error',
]);

export interface MediaRequestOptions {
  /** Defaults to `programmatic`. */
  readonly reason?: ChangeReason;
  /** The originating DOM event; a synthetic source is used when absent. */
  readonly sourceEvent?: Event;
  readonly trigger?: Element;
  /**
   * Key-binding and gesture paths: after `tp-media-request-failed` is emitted, resolve
   * `undefined` instead of rejecting.
   */
  readonly swallow?: boolean;
}

/** `request(action, value?, options?)` argument tuple for an action. */
export type MediaRequestArgs<A extends MediaRequestAction> = undefined extends MediaRequestValues[A]
  ? [value?: MediaRequestValues[A], options?: MediaRequestOptions]
  : [value: MediaRequestValues[A], options?: MediaRequestOptions];

/** Cancelled proposals resolve `false`; swallowed failures resolve `undefined`. */
export type MediaRequestOutcome<A extends MediaRequestAction> =
  MediaRequestResults[A] | false | undefined;

interface CaptionEntry {
  readonly id: string;
  readonly kind: string;
  readonly language: string;
  readonly track: TextTrackLike;
}

/** Volume restored when unmuting at zero. */
export const UNMUTE_VOLUME = 0.25;

/** What the request pipeline needs from its store. */
export interface MediaRequestContext {
  readonly attached: boolean;
  readonly media: MediaTarget | null;
  readonly adapter: MediaTracksAdapter | null;
  readonly disabled: boolean;
  readonly state: MediaState;
  readonly presentation: MediaPresentation;
  readonly activity: ActivityOwner;
  /** Locale used for caption locale matching. */
  locale(): string | undefined;
  set(patch: MediaSourcePatch, reason: ChangeReason): void;
  /** Attributes upcoming element-originated changes of `keys` to `reason` until `until` settles. */
  attribute(keys: readonly MediaStateKey[], reason: ChangeReason, until: Promise<unknown>): void;
  dispatchRequest(detail: MediaRequestDetail): boolean;
  requestFailed(detail: MediaRequestFailedDetail): void;
  diagnostic(diagnostic: Diagnostic): void;
}

const notSupported = (action: string, why: string) =>
  new DOMException(`The ${action} request is not available: ${why}.`, 'NotSupportedError');
const invalidValue = (action: string) =>
  new TypeError(`The ${action} request needs a finite numeric value.`);

function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Resolves `true` when `type` fires on `target`, `false` when `signal` aborts first. */
function once(target: EventTarget, type: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const done = (result: boolean) => {
      target.removeEventListener(type, onEvent);
      signal.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const onEvent = () => done(true);
    const onAbort = () => done(false);
    target.addEventListener(type, onEvent);
    signal.addEventListener('abort', onAbort);
  });
}

/**
 * The next rate in `rates` above (`direction > 0`) or below the current rate, clamped at the
 * ends of the list (`step-playback-rate`; Video.js wraps, Tweakpad clamps).
 */
export function steppedPlaybackRate(
  rates: readonly number[],
  current: number,
  direction: number,
): number {
  if (!rates.length || !direction) return current;
  const sorted = [...rates].sort((a, b) => a - b);
  if (direction > 0) return sorted.find((rate) => rate > current + 1e-9) ?? sorted.at(-1)!;
  return [...sorted].reverse().find((rate) => rate < current - 1e-9) ?? sorted[0]!;
}

/**
 * The rate a playback-rate button cycles to: the next rate in list order after the current one,
 * wrapping to the first. Separate from the clamped `step-playback-rate` request.
 */
export function nextPlaybackRateCycle(rates: readonly number[], current: number): number {
  if (!rates.length) return current;
  const index = rates.findIndex((rate) => Math.abs(rate - current) < 1e-9);
  if (index >= 0) return rates[(index + 1) % rates.length]!;
  return rates.find((rate) => rate > current) ?? rates[0]!;
}

/**
 * Validates a configured rate list: finite positive rates, deduplicated, in ascending order.
 * Invalid entries are dropped; `invalid` lists them for a diagnostic. A non-array input, or one
 * with no valid entries left (other than an explicitly empty list), falls back to `fallback`.
 */
export function normalizePlaybackRates(
  input: unknown,
  fallback: readonly number[],
): { readonly rates: readonly number[]; readonly invalid: readonly unknown[] } {
  if (!Array.isArray(input))
    return { rates: fallback, invalid: input === undefined ? [] : [input] };
  const invalid: unknown[] = [];
  const valid = new Set<number>();
  for (const entry of input) {
    const rate = typeof entry === 'string' && entry.trim() !== '' ? Number(entry) : entry;
    if (finite(rate) && rate > 0) valid.add(rate);
    else invalid.push(entry);
  }
  if (!valid.size && input.length) return { rates: fallback, invalid };
  return { rates: Object.freeze([...valid].sort((a, b) => a - b)), invalid };
}

/** Executes media requests for one store (`mp-f-request`). There is no global error lock. */
export class MediaRequests {
  readonly #context: MediaRequestContext;
  #seek: AbortController | undefined;
  #lastShownTrack: string | null = null;

  constructor(context: MediaRequestContext) {
    this.#context = context;
  }

  /** Aborts a pending seek (superseded, `emptied`, detach). */
  abortSeek(): void {
    this.#seek?.abort();
    this.#seek = undefined;
  }

  /** Forgets per-source memory (detach). */
  reset(): void {
    this.abortSeek();
    this.#lastShownTrack = null;
  }

  /** The caption track id `toggle-captions` restores, if any. */
  get lastShownTrack(): string | null {
    return this.#lastShownTrack;
  }

  /**
   * Proposal → gate → execution → failure (`mp-f-request`). A cancelled proposal resolves `false`.
   * Failures emit `tp-media-request-failed` and reject, or resolve `undefined` when `swallow` is set.
   */
  async request<A extends MediaRequestAction>(
    action: A,
    ...[value, options = {}]: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    const context = this.#context;
    const reason = options.reason ?? 'programmatic';
    const sourceEvent = options.sourceEvent ?? new Event('tp-programmatic-source');
    const eventTrigger =
      (sourceEvent.target as Node | null)?.nodeType === 1
        ? (sourceEvent.target as Element)
        : undefined;
    const trigger = options.trigger ?? eventTrigger;
    const detail: MediaRequestDetail = {
      action,
      value,
      reason,
      sourceEvent,
      ...(trigger ? { trigger } : {}),
    };
    if (!context.dispatchRequest(detail)) return false;
    try {
      const gate = this.#gate(action);
      if (gate) throw gate;
      return (await this.#execute(action, value, reason)) as MediaRequestResults[A];
    } catch (error) {
      context.requestFailed({ action, value, reason, error });
      if (options.swallow) return undefined;
      throw error;
    }
  }

  /** The availability that gates `action` right now (`unavailable` before attach). */
  availability(action: MediaRequestAction): MediaAvailability {
    const context = this.#context;
    const media = context.media;
    if (!context.attached || !media) return 'unavailable';
    const state = context.state;
    const capability = (capable: boolean): MediaAvailability =>
      capable ? 'available' : 'unsupported';
    switch (action) {
      case 'play':
      case 'pause':
      case 'toggle-paused':
        return capability(isMediaPlaybackCapable(media));
      case 'seek':
      case 'seek-by':
      case 'seek-to-percent':
        return capability(isMediaSeekCapable(media));
      case 'seek-to-live-edge':
        if (!isMediaSeekCapable(media) || state.streamType !== 'live') return 'unsupported';
        return Number.isFinite(seekableEnd(state.seekable)) ? 'available' : 'unavailable';
      case 'set-volume':
      case 'step-volume':
        return state.volumeAvailability;
      case 'set-muted':
      case 'toggle-muted':
        return state.mutedAvailability;
      case 'set-playback-rate':
        return capability(isMediaRateCapable(media));
      case 'step-playback-rate':
        if (!isMediaRateCapable(media)) return 'unsupported';
        return state.playbackRates.length ? 'available' : 'unavailable';
      case 'request-fullscreen':
      case 'toggle-fullscreen':
        return state.fullscreenAvailability;
      case 'exit-fullscreen':
        return state.fullscreenAvailability === 'unsupported' ? 'unsupported' : 'available';
      case 'request-picture-in-picture':
      case 'toggle-picture-in-picture':
        return state.pictureInPicture ? 'available' : state.pictureInPictureAvailability;
      case 'exit-picture-in-picture':
        return state.pictureInPictureAvailability === 'unsupported' ? 'unsupported' : 'available';
      case 'prompt-remote-playback':
        return state.remotePlaybackState !== 'disconnected'
          ? 'available'
          : state.remotePlaybackAvailability;
      case 'select-text-track':
        return capability(isMediaTextTrackCapable(media));
      case 'toggle-captions':
        return isMediaTextTrackCapable(media) ? captionsAvailability(state) : 'unsupported';
      case 'select-audio-track':
        return capability(audioTrackList(media, context.adapter) !== null);
      case 'select-video-rendition':
        return capability(videoRenditionList(media, context.adapter) !== null);
      case 'toggle-controls':
      case 'dismiss-error':
        return 'available';
    }
  }

  #gate(action: MediaRequestAction): Error | undefined {
    const context = this.#context;
    if (!context.attached || !context.media)
      return new DOMException('No media is attached.', 'InvalidStateError');
    if (context.disabled) return notSupported(action, 'the player is disabled');
    const availability = this.availability(action);
    if (availability === 'available') return undefined;
    // A picture-in-picture request before metadata is refused by the presentation service with
    // InvalidStateError (`mp-f-request` table); only an unsupported platform fails the gate.
    if (
      availability === 'unavailable' &&
      (action === 'request-picture-in-picture' || action === 'toggle-picture-in-picture')
    )
      return undefined;
    return notSupported(action, availability);
  }

  #execute(action: MediaRequestAction, value: unknown, reason: ChangeReason): Promise<unknown> {
    const context = this.#context;
    const media = context.media!;
    const run = async (): Promise<unknown> => {
      switch (action) {
        case 'play':
          return this.#play(media, reason);
        case 'pause':
          return this.#pause(media, reason);
        case 'toggle-paused':
          return media.paused || media.ended
            ? this.#play(media, reason)
            : this.#pause(media, reason);
        case 'seek':
          if (!finite(value)) throw invalidValue(action);
          return this.#seekTo(media, value, reason);
        case 'seek-by':
          if (!finite(value)) throw invalidValue(action);
          return this.#seekTo(media, context.state.currentTime + value, reason);
        case 'seek-to-percent': {
          if (!finite(value)) throw invalidValue(action);
          const percent = Math.min(100, Math.max(0, value));
          return this.#seekTo(media, (percent / 100) * timeRangeEnd(context.state), reason);
        }
        case 'seek-to-live-edge':
          return this.#seekTo(media, seekableEnd(context.state.seekable), reason);
        case 'set-volume':
          if (!finite(value)) throw invalidValue(action);
          return this.#setVolume(media, value, reason);
        case 'step-volume':
          if (!finite(value)) throw invalidValue(action);
          return this.#setVolume(media, (media.volume ?? context.state.volume) + value, reason);
        case 'set-muted':
          return this.#setMuted(media, Boolean(value), reason);
        case 'toggle-muted':
          return this.#setMuted(media, !(media.muted || media.volume === 0), reason);
        case 'set-playback-rate':
          if (!finite(value) || value <= 0) throw invalidValue(action);
          media.playbackRate = value;
          return value;
        case 'step-playback-rate': {
          if (!finite(value)) throw invalidValue(action);
          const current = finite(media.playbackRate)
            ? media.playbackRate
            : context.state.playbackRate;
          const next = steppedPlaybackRate(context.state.playbackRates, current, Math.sign(value));
          if (next !== current) media.playbackRate = next;
          return next;
        }
        case 'request-fullscreen':
          return context.presentation.requestFullscreen();
        case 'exit-fullscreen':
          return context.presentation.exitFullscreen();
        case 'toggle-fullscreen':
          return context.presentation.isFullscreen()
            ? context.presentation.exitFullscreen()
            : context.presentation.requestFullscreen();
        case 'request-picture-in-picture':
          return context.presentation.requestPictureInPicture();
        case 'exit-picture-in-picture':
          return context.presentation.exitPictureInPicture();
        case 'toggle-picture-in-picture':
          return context.presentation.isPictureInPicture()
            ? context.presentation.exitPictureInPicture()
            : context.presentation.requestPictureInPicture();
        case 'prompt-remote-playback':
          return context.presentation.promptRemotePlayback();
        case 'select-text-track':
          return this.#selectTextTrack(
            media,
            value === null || value === undefined ? null : String(value),
          );
        case 'toggle-captions':
          return this.#toggleCaptions(media, value === undefined ? undefined : Boolean(value));
        case 'select-audio-track':
          return this.#selectAudioTrack(media, String(value));
        case 'select-video-rendition':
          return this.#selectRendition(media, String(value));
        case 'toggle-controls':
          return context.activity.toggle(value === undefined ? undefined : Boolean(value), reason);
        case 'dismiss-error':
          context.set({ error: null }, reason);
          return undefined;
      }
    };
    // Attribute before executing: some targets report the change synchronously.
    let settle = (): void => undefined;
    const settled = new Promise<void>((resolve) => (settle = resolve));
    const keys = ATTRIBUTED_KEYS[action];
    if (keys) context.attribute(keys, reason, settled);
    const execution = run();
    execution.then(settle, settle);
    return execution;
  }

  async #play(media: MediaTarget, reason: ChangeReason): Promise<void> {
    const context = this.#context;
    const state = context.state;
    // Live without DVR always resumes at the live edge (Media Chrome parity).
    if (state.streamType === 'live' && !state.dvr && isMediaSeekCapable(media)) {
      const edge = seekableEnd(state.seekable);
      if (Number.isFinite(edge)) media.currentTime = edge;
    }
    const playing = media.play!();
    // The `play` event is queued: publish now so an immediate second toggle reads the new state.
    if (media.paused === false) context.set({ paused: false, ended: false, started: true }, reason);
    await playing;
  }

  #pause(media: MediaTarget, reason: ChangeReason): void {
    media.pause!();
    this.#context.set({ paused: media.paused !== false }, reason);
  }

  async #seekTo(media: MediaTarget, time: number, reason: ChangeReason): Promise<number> {
    if (!Number.isFinite(time)) throw invalidValue('seek');
    this.#seek?.abort();
    const controller = (this.#seek = new AbortController());
    const signal = controller.signal;
    const emptied = () => controller.abort();
    media.addEventListener('emptied', emptied);
    try {
      if (!hasMetadata(media) && !(await once(media, 'loadedmetadata', signal)))
        return media.currentTime ?? 0;
      const state = this.#context.state;
      const start = seekableStart(state.seekable);
      const duration = media.duration;
      const end =
        finite(duration) && duration > 0
          ? duration
          : Number.isFinite(seekableEnd(state.seekable))
            ? seekableEnd(state.seekable)
            : Number.POSITIVE_INFINITY;
      const target = Math.max(start, Math.min(time, end));
      this.#context.set({ currentTime: target, seeking: true }, reason);
      media.currentTime = target;
      await once(media, 'seeked', signal);
      return media.currentTime ?? target;
    } finally {
      media.removeEventListener('emptied', emptied);
      if (this.#seek === controller) this.#seek = undefined;
    }
  }

  #setVolume(media: MediaTarget, volume: number, reason: ChangeReason): number {
    const clamped = Math.min(1, Math.max(0, volume));
    if (clamped > 0 && media.muted) media.muted = false;
    media.volume = clamped;
    // `volumechange` is queued; read the media back so repeated steps build on the new value.
    this.#context.set({ volume: media.volume ?? clamped, muted: media.muted === true }, reason);
    return media.volume ?? clamped;
  }

  #setMuted(media: MediaTarget, muted: boolean, reason: ChangeReason): boolean {
    media.muted = muted;
    const volumeCapable = isMediaVolumeCapable(media);
    if (!muted && volumeCapable && media.volume === 0) media.volume = UNMUTE_VOLUME;
    this.#context.set(
      {
        muted: isMediaMutedCapable(media) ? media.muted === true : muted,
        ...(volumeCapable ? { volume: media.volume } : {}),
      },
      reason,
    );
    return media.muted === true;
  }

  #captionEntries(media: MediaTarget): CaptionEntry[] {
    if (!isMediaTextTrackCapable(media)) return [];
    const entries = listItems(media.textTracks).map((track, index) => ({
      id: textTrackId(track, index),
      kind: track.kind,
      language: track.language,
      track,
    }));
    return captionTracks(entries);
  }

  #showOnly(entries: readonly CaptionEntry[], id: string | null): void {
    for (const entry of entries) {
      const mode = entry.id === id ? 'showing' : 'disabled';
      if (entry.track.mode !== mode) entry.track.mode = mode;
    }
  }

  #selectTextTrack(media: MediaTarget, id: string | null): void {
    const entries = this.#captionEntries(media);
    const showing = entries.find((entry) => entry.track.mode === 'showing');
    if (id === null) {
      if (showing) this.#lastShownTrack = showing.id;
      this.#showOnly(entries, null);
      return;
    }
    const entry = entries.find((candidate) => candidate.id === id);
    if (!entry) {
      this.#context.diagnostic({
        code: 'media-unknown-text-track',
        message: `No captions or subtitles track has the id "${id}".`,
        severity: 'warning',
        context: { id },
      });
      return;
    }
    this.#lastShownTrack = entry.id;
    this.#showOnly(entries, entry.id);
  }

  #toggleCaptions(media: MediaTarget, force: boolean | undefined): boolean {
    const entries = this.#captionEntries(media);
    if (!entries.length) return false;
    const showing = entries.find((entry) => entry.track.mode === 'showing');
    if (showing) this.#lastShownTrack = showing.id;
    if (!(force ?? !showing)) {
      this.#showOnly(entries, null);
      return false;
    }
    const next =
      showing ??
      entries.find((entry) => entry.id === this.#lastShownTrack) ??
      findLocaleTrack(entries, this.#context.locale()) ??
      entries[0]!;
    this.#lastShownTrack = next.id;
    this.#showOnly(entries, next.id);
    return true;
  }

  #selectAudioTrack(media: MediaTarget, id: string): void {
    const list = audioTrackList(media, this.#context.adapter);
    const tracks = list ? listItems(list) : [];
    const track = tracks.find((candidate, index) => audioTrackId(candidate, index) === id);
    if (!track) {
      this.#context.diagnostic({
        code: 'media-unknown-audio-track',
        message: `No audio track has the id "${id}".`,
        severity: 'warning',
        context: { id },
      });
      return;
    }
    for (const candidate of tracks) {
      const enabled = candidate === track;
      if (candidate.enabled !== enabled) candidate.enabled = enabled;
    }
  }

  #selectRendition(media: MediaTarget, id: string): void {
    const list = videoRenditionList(media, this.#context.adapter);
    if (!list) return;
    if (id === 'auto') {
      list.selectedIndex = -1;
      return;
    }
    const index = listItems(list).findIndex(
      (rendition, position) => renditionId(rendition, position) === id,
    );
    if (index < 0) {
      this.#context.diagnostic({
        code: 'media-unknown-rendition',
        message: `No video rendition has the id "${id}".`,
        severity: 'warning',
        context: { id },
      });
      return;
    }
    list.selectedIndex = index;
  }
}

/** State keys whose element-originated changes are attributed to the request that caused them. */
const ATTRIBUTED_KEYS: Partial<Record<MediaRequestAction, readonly MediaStateKey[]>> = {
  play: ['paused', 'ended', 'started'],
  pause: ['paused'],
  'toggle-paused': ['paused', 'ended', 'started'],
  seek: ['seeking'],
  'seek-by': ['seeking'],
  'seek-to-percent': ['seeking'],
  'seek-to-live-edge': ['seeking'],
  'set-volume': ['volume', 'muted'],
  'set-muted': ['volume', 'muted'],
  'toggle-muted': ['volume', 'muted'],
  'step-volume': ['volume', 'muted'],
  'set-playback-rate': ['playbackRate'],
  'step-playback-rate': ['playbackRate'],
  'request-fullscreen': ['fullscreen'],
  'exit-fullscreen': ['fullscreen'],
  'toggle-fullscreen': ['fullscreen'],
  'request-picture-in-picture': ['pictureInPicture', 'fullscreen'],
  'exit-picture-in-picture': ['pictureInPicture'],
  'toggle-picture-in-picture': ['pictureInPicture', 'fullscreen'],
  'prompt-remote-playback': ['remotePlaybackState', 'fullscreen'],
  'select-text-track': ['textTracks', 'captionsShowing'],
  'toggle-captions': ['textTracks', 'captionsShowing'],
  'select-audio-track': ['audioTracks'],
  'select-video-rendition': ['videoRenditions', 'activeVideoRendition', 'autoQuality'],
};
