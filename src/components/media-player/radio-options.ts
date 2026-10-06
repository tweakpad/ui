/**
 * Option generation for the media radio groups (Library mp-l-menus; Video.js
 * `*-radio-group/core.ts`). Pure functions of store state, messages and locale.
 */
import { captionTracks, languageName, textTrackLabel } from '../../foundation/media/captions.js';
import { formatPlaybackRate, type MediaMessagesResolver } from '../../foundation/media/messages.js';
import type {
  MediaAudioTrackState,
  MediaTextTrackState,
  MediaVideoRenditionState,
} from '../../foundation/media/state.js';

type Messages = Pick<MediaMessagesResolver, 'get'>;
type Locale = string | string[] | undefined;

/** One generated radio choice. */
export interface MediaRadioOption {
  /** Radio value (`Object.is` identity): a rate number, a track/rendition id, `off` or `auto`. */
  readonly value: number | string;
  readonly label: string;
  /** Text-track or audio-track id (`data-track`). */
  readonly track?: string;
  /** Video rendition id (`data-rendition`). */
  readonly rendition?: string;
  /** Resolution tier (`8K`, `4K`, `HD`), rendered through `tp-badge`. */
  readonly tier?: string;
  /** Disambiguating bitrate for renditions sharing a size, rendered through `tp-badge`. */
  readonly badge?: string;
}

/** Captions "off" choice value. */
export const CAPTIONS_OFF_VALUE = 'off';
/** Automatic quality choice value. */
export const QUALITY_AUTO_VALUE = 'auto';

// --- Playback rate -------------------------------------------------------------------------

/** `${rate}×` per rate; rate 1 is labelled `normalSpeed`. */
export function playbackRateOptions(
  rates: readonly number[],
  messages: Messages,
  locale?: Locale,
): MediaRadioOption[] {
  return rates.map((rate) => ({
    value: rate,
    label: rate === 1 ? messages.get('normalSpeed') : formatPlaybackRate(rate, locale),
  }));
}

/** The rate option matching the current rate (`Object.is`), else `undefined`. */
export function selectedPlaybackRate(
  rates: readonly number[],
  current: number,
): number | undefined {
  return rates.find((rate) => Object.is(rate, current));
}

// --- Captions -------------------------------------------------------------------------------

/** `off`, then each captions/subtitles track (label → language name → captions/subtitles). */
export function captionsOptions(
  tracks: readonly MediaTextTrackState[],
  messages: Messages,
  locale?: Locale,
): MediaRadioOption[] {
  const choices = captionTracks(tracks);
  if (!choices.length) return [];
  return [
    { value: CAPTIONS_OFF_VALUE, label: messages.get('off') },
    ...choices.map((track) => ({
      value: track.id,
      label: textTrackLabel(track, messages, locale),
      track: track.id,
    })),
  ];
}

/** The showing captions/subtitles track id, else `off`. */
export function selectedCaptions(tracks: readonly MediaTextTrackState[]): string {
  return captionTracks(tracks).find((track) => track.mode === 'showing')?.id ?? CAPTIONS_OFF_VALUE;
}

// --- Audio tracks ---------------------------------------------------------------------------

/** Audio track label: label → language name → kind → `audio`. */
export function audioTrackLabel(
  track: Pick<MediaAudioTrackState, 'label' | 'language' | 'kind'>,
  messages: Messages,
  locale?: Locale,
): string {
  if (track.label.trim()) return track.label;
  const name = languageName(track.language, locale);
  if (name) return name;
  if (track.kind?.trim()) return track.kind;
  return messages.get('audio');
}

/** One option per audio track (only when more than one track exists). */
export function audioTrackOptions(
  tracks: readonly MediaAudioTrackState[],
  messages: Messages,
  locale?: Locale,
): MediaRadioOption[] {
  if (tracks.length < 2) return [];
  return tracks.map((track) => ({
    value: track.id,
    label: audioTrackLabel(track, messages, locale),
    track: track.id,
  }));
}

/** The enabled audio track id, else `undefined`. */
export function selectedAudioTrack(tracks: readonly MediaAudioTrackState[]): string | undefined {
  return tracks.find((track) => track.enabled)?.id;
}

// --- Quality --------------------------------------------------------------------------------

/** Standard resolution classes a rendition's size snaps to. */
export const STANDARD_RENDITION_SIZES: readonly number[] = Object.freeze([
  4320, 2160, 1440, 1080, 720, 480, 360, 240,
]);

function widescreenSize(width: number): number | undefined {
  const size = Math.round((width * 9) / 16);
  return STANDARD_RENDITION_SIZES.includes(size) ? size : undefined;
}

/**
 * The `{size}p` class of a rendition: the short side, except that encodes wider than 16:9 snap
 * to the standard class their width implies when it maps cleanly (a 1920×800 encode is 1080p).
 */
export function renditionSize(
  rendition: Pick<MediaVideoRenditionState, 'width' | 'height'>,
): number | undefined {
  const { width, height } = rendition;
  if (width && height) {
    if (width > height && width * 9 > height * 16) return widescreenSize(width) ?? height;
    return Math.min(width, height);
  }
  if (height) return height;
  if (width) return widescreenSize(width) ?? width;
  return undefined;
}

/** Localized bitrate: megabits per second from 1 Mbps, else kilobits per second. */
export function formatBitrate(bitrate: number, locale?: Locale): string {
  const mega = bitrate >= 1_000_000;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'unit',
      unit: mega ? 'megabit-per-second' : 'kilobit-per-second',
      unitDisplay: 'short',
      maximumFractionDigits: mega ? 1 : 0,
    }).format(mega ? bitrate / 1_000_000 : bitrate / 1000);
  } catch {
    return mega
      ? `${Math.round(bitrate / 100_000) / 10} Mbps`
      : `${Math.round(bitrate / 1000)} kbps`;
  }
}

/** Rendition label: `{size}p`, else the bitrate, else the `quality` message. */
export function renditionLabel(
  rendition: Pick<MediaVideoRenditionState, 'width' | 'height' | 'bitrate'>,
  messages: Messages,
  locale?: Locale,
): string {
  const size = renditionSize(rendition);
  if (size) return `${size}p`;
  if (rendition.bitrate) return formatBitrate(rendition.bitrate, locale);
  return messages.get('quality');
}

/** Resolution tier: `8K` from 4320p, `4K` from 2160p, `HD` from 1080p. */
export function renditionTier(
  rendition: Pick<MediaVideoRenditionState, 'width' | 'height'>,
): string | undefined {
  const size = renditionSize(rendition);
  if (!size) return undefined;
  if (size >= 4320) return '8K';
  if (size >= 2160) return '4K';
  if (size >= 1080) return 'HD';
  return undefined;
}

/** A bitrate badge only for renditions whose size class another rendition shares. */
export function renditionBadge(
  rendition: MediaVideoRenditionState,
  renditions: readonly MediaVideoRenditionState[],
  locale?: Locale,
): string | undefined {
  const size = renditionSize(rendition);
  if (!size || !rendition.bitrate) return undefined;
  const shared = renditions.some(
    (other) => other !== rendition && other.id !== rendition.id && renditionSize(other) === size,
  );
  return shared ? formatBitrate(rendition.bitrate, locale) : undefined;
}

/**
 * `auto` (`autoWithLabel` while adaptive with a known active rendition), then one option per
 * rendition; only when more than one rendition exists.
 */
export function qualityOptions(
  renditions: readonly MediaVideoRenditionState[],
  active: MediaVideoRenditionState | null,
  autoQuality: boolean,
  messages: Messages,
  locale?: Locale,
): MediaRadioOption[] {
  if (renditions.length < 2) return [];
  const option = (rendition: MediaVideoRenditionState): MediaRadioOption => {
    const tier = renditionTier(rendition);
    const badge = renditionBadge(rendition, renditions, locale);
    return {
      value: rendition.id,
      label: renditionLabel(rendition, messages, locale),
      rendition: rendition.id,
      ...(tier ? { tier } : {}),
      ...(badge ? { badge } : {}),
    };
  };
  const activeKnown = active && renditions.some((rendition) => rendition.id === active.id);
  const auto: MediaRadioOption = {
    value: QUALITY_AUTO_VALUE,
    label:
      autoQuality && activeKnown
        ? messages.get('autoWithLabel', { label: renditionLabel(active, messages, locale) })
        : messages.get('auto'),
  };
  return [auto, ...renditions.map(option)];
}

/** `auto` while adaptive (or nothing is selected), else the selected rendition id. */
export function selectedQuality(
  renditions: readonly MediaVideoRenditionState[],
  autoQuality: boolean,
): string {
  if (autoQuality) return QUALITY_AUTO_VALUE;
  return renditions.find((rendition) => rendition.selected)?.id ?? QUALITY_AUTO_VALUE;
}

/** The selected option's label (submenu hint), else `''`. */
export function selectedOptionLabel(options: readonly MediaRadioOption[], value: unknown): string {
  return options.find((option) => Object.is(option.value, value))?.label ?? '';
}
