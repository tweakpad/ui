import { displayNames } from '../intl.js';
import { isCaptionTrackKind } from './availability.js';
import type { MediaMessagesResolver } from './messages.js';

/** Caption-track helpers (`mp-f-captions`; captions menu order and labels). */
interface TrackShape {
  readonly kind: string;
  readonly label: string;
  readonly language: string;
}

const kindOrder = (kind: string) => (kind === 'captions' ? 0 : 1);

/** Captions and subtitles tracks, grouped by kind (captions first), stable within a kind. */
export function captionTracks<T extends { readonly kind: string }>(tracks: Iterable<T>): T[] {
  return Array.from(tracks)
    .map((track, index) => ({ track, index }))
    .filter(({ track }) => isCaptionTrackKind(track.kind))
    .sort((a, b) => kindOrder(a.track.kind) - kindOrder(b.track.kind) || a.index - b.index)
    .map(({ track }) => track);
}

/** Lower-cased BCP 47 tag without Unicode extensions (`en-US-u-nu-latn` → `en-us`). */
export function localeKey(locale: string | null | undefined): string {
  if (!locale) return '';
  return locale
    .replace(/_/g, '-')
    .split(/-u-|-x-/i)[0]!
    .toLowerCase();
}

/**
 * The track matching a locale: the most specific tag first (`es-419` → `es-419`, `es`), each
 * tried as an exact language and then as a regional variant (`es` matches `es-MX`). There is no
 * English fallback for selection.
 */
export function findLocaleTrack<T extends { readonly language: string }>(
  tracks: readonly T[],
  locale: string | null | undefined,
): T | undefined {
  const key = localeKey(locale);
  if (!key) return undefined;
  const segments = key.split('-').filter(Boolean);
  for (let length = segments.length; length >= 1; length--) {
    const candidate = segments.slice(0, length).join('-');
    const exact = tracks.find((track) => localeKey(track.language) === candidate);
    if (exact) return exact;
    const regional = tracks.find((track) => localeKey(track.language).startsWith(`${candidate}-`));
    if (regional) return regional;
  }
  return undefined;
}

/** Localized language name through `Intl.DisplayNames`, or `''`. */
export function languageName(language: string, locale?: string | string[]): string {
  if (!language) return '';
  try {
    return displayNames(locale, { type: 'language' }).of(language) ?? '';
  } catch {
    return '';
  }
}

/**
 * Track label fallback: `label`, else the localized language name, else the `captions` or
 * `subtitles` message.
 */
export function textTrackLabel(
  track: TrackShape,
  messages: Pick<MediaMessagesResolver, 'get'>,
  locale?: string | string[],
): string {
  if (track.label.trim()) return track.label;
  const name = languageName(track.language, locale);
  if (name) return name;
  return track.kind === 'subtitles' ? messages.get('subtitles') : messages.get('captions');
}
