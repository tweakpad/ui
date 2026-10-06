import {
  ANNOUNCEMENT_CLEAR_DELAY,
  LiveAnnouncer,
  type AnnounceOptions,
  type LiveAnnouncerOptions,
} from '../announcer.js';
import { formatDuration } from '../duration-format.js';
import { captionsAvailability } from './availability.js';
import {
  createMediaMessages,
  formatMediaPercent,
  formatPlaybackRate,
  type MediaMessageKey,
  type MediaMessagesResolver,
} from './messages.js';
import type { MediaState, MediaStateChange, MediaStateKey } from './state.js';

/**
 * Media status announcements (`mp-f-announce`, over the shared `LiveAnnouncer`). Paused/playing,
 * captions, fullscreen, picture-in-picture and rate changes are immediate; volume, mute and
 * completed seeks are debounced 200 ms and suppressed while a slider has focus. Simultaneous
 * messages join with a period, text clears after 800 ms, and element-originated (`media`) changes
 * and buffering are never announced.
 */
export const MEDIA_ANNOUNCEMENT_DEBOUNCE = 200;
export const MEDIA_ANNOUNCEMENT_CLEAR_DELAY = ANNOUNCEMENT_CLEAR_DELAY;

/** One derived announcement: a message key with its formatted parameters. */
export interface MediaAnnouncement {
  /** Replacement identity: a newer announcement with the same slot replaces a pending one. */
  readonly slot:
    'paused' | 'captions' | 'fullscreen' | 'picture-in-picture' | 'rate' | 'volume' | 'seek';
  readonly key: MediaMessageKey;
  readonly params?: Readonly<Record<string, string>>;
  readonly debounced: boolean;
}

/** The announcer surface the policy needs (`LiveAnnouncer` implements it). */
export interface MediaAnnouncerLike {
  announce(message: string, options?: AnnounceOptions): void;
  clear?(): void;
  dispose?(): void;
}

export interface MediaAnnouncementFormat {
  readonly locale?: string | string[] | undefined;
}

const announced = (change: MediaStateChange, key: MediaStateKey) =>
  change.changed.includes(key) && (change.reasons[key] ?? change.reason) !== 'media';

/**
 * Derives the announcements for one published batch. `seekStart` is the position before the
 * current seek began (`undefined` when no seek is tracked); a seek that ends where it started is
 * not announced.
 */
export function deriveMediaAnnouncements(
  change: MediaStateChange,
  format: MediaAnnouncementFormat = {},
  seekStart?: number,
): MediaAnnouncement[] {
  const { state, previousState } = change;
  const result: MediaAnnouncement[] = [];
  if (announced(change, 'paused'))
    result.push({
      slot: 'paused',
      key: state.paused ? 'statusPaused' : 'statusPlaying',
      debounced: false,
    });
  if (announced(change, 'captionsShowing') && captionsAvailability(state) === 'available')
    result.push({
      slot: 'captions',
      key: state.captionsShowing ? 'statusCaptionsOn' : 'statusCaptionsOff',
      debounced: false,
    });
  if (announced(change, 'fullscreen'))
    result.push({
      slot: 'fullscreen',
      key: state.fullscreen ? 'statusFullscreen' : 'statusExitFullscreen',
      debounced: false,
    });
  if (announced(change, 'pictureInPicture'))
    result.push({
      slot: 'picture-in-picture',
      key: state.pictureInPicture ? 'statusPictureInPicture' : 'statusExitPictureInPicture',
      debounced: false,
    });
  if (announced(change, 'playbackRate'))
    result.push({
      slot: 'rate',
      key: 'statusPlaybackRate',
      params: { rate: formatPlaybackRate(state.playbackRate, format.locale) },
      debounced: false,
    });
  if (announced(change, 'volume') || announced(change, 'muted'))
    result.push(
      state.muted || state.volume <= 0
        ? { slot: 'volume', key: 'statusMuted', debounced: true }
        : {
            slot: 'volume',
            key: 'statusVolume',
            params: { percent: formatMediaPercent(state.volume, format.locale) },
            debounced: true,
          },
    );
  if (
    announced(change, 'seeking') &&
    previousState.seeking &&
    !state.seeking &&
    !(seekStart !== undefined && Object.is(seekStart, state.currentTime))
  )
    result.push({
      slot: 'seek',
      key: 'statusSeekedTo',
      params: { time: formatDuration(state.currentTime, { style: 'long' }, format.locale) },
      debounced: true,
    });
  return result;
}

export interface MediaAnnouncementPolicyOptions {
  readonly announcer: MediaAnnouncerLike;
  /** Messages resolver (root dictionary). Defaults to English. */
  readonly messages?: () => MediaMessagesResolver;
  /** Locale for numbers and times. */
  readonly locale?: () => string | string[] | undefined;
  /** `announcements="off"` returns false. */
  readonly enabled?: () => boolean;
  /** Whether a media slider has focus (its value text already speaks). */
  readonly sliderFocused?: () => boolean;
}

const defaultMessages = createMediaMessages();

/** Turns published media state changes into live-region announcements. */
export class MediaAnnouncementPolicy {
  readonly #options: MediaAnnouncementPolicyOptions;
  #seekStart: number | undefined;
  #disposed = false;

  constructor(options: MediaAnnouncementPolicyOptions) {
    this.#options = options;
  }

  /** Subscribes to a store's published batches; returns the unsubscribe. */
  connect(store: {
    onStateChange(listener: (change: MediaStateChange) => void): () => void;
  }): () => void {
    return store.onStateChange((change) => this.process(change));
  }

  process(change: MediaStateChange): void {
    if (this.#disposed) return;
    const { state, previousState } = change;
    const seekStart = this.#trackSeek(previousState, state);
    if (this.#options.enabled?.() === false) return;
    const messages = this.#options.messages?.() ?? defaultMessages;
    const locale = this.#options.locale?.();
    for (const announcement of deriveMediaAnnouncements(change, { locale }, seekStart)) {
      if (announcement.debounced && this.#options.sliderFocused?.() === true) continue;
      const text = messages.get(
        announcement.key as 'statusPaused',
        ...((announcement.params ? [announcement.params] : []) as []),
      );
      this.#options.announcer.announce(text, {
        key: `media-${announcement.slot}`,
        ...(announcement.debounced ? { debounce: MEDIA_ANNOUNCEMENT_DEBOUNCE } : {}),
      });
    }
  }

  dispose(): void {
    this.#disposed = true;
  }

  /** Remembers where a seek began; returns that start when the seek completes. */
  #trackSeek(previous: MediaState, state: MediaState): number | undefined {
    if (!previous.seeking && state.seeking) {
      this.#seekStart = previous.currentTime;
      return undefined;
    }
    if (previous.seeking && !state.seeking) {
      const start = this.#seekStart;
      this.#seekStart = undefined;
      return start;
    }
    return undefined;
  }
}

/**
 * A `LiveAnnouncer` configured for a player: 800 ms clear delay, period separator, and debounced
 * messages suppressed (when requested and when due) while `sliderFocused()` is true. Pass `root`
 * as the container so the region stays inside the fullscreen subtree.
 */
export function createMediaLiveAnnouncer(
  options: Omit<LiveAnnouncerOptions, 'suppress'> & { readonly sliderFocused?: () => boolean } = {},
): LiveAnnouncer {
  const { sliderFocused, ...rest } = options;
  return new LiveAnnouncer({
    clearDelay: MEDIA_ANNOUNCEMENT_CLEAR_DELAY,
    separator: '. ',
    ...rest,
    suppress: (_message, context) => context.debounced && sliderFocused?.() === true,
  });
}
