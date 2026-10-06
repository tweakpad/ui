import type { MediaCue, MediaThumbnailsTrack } from './state.js';

/** Thumbnail cues (`mp-f-thumbnails`): a URL per cue, with an optional `#xywh` sprite cell. */
export interface MediaThumbnailCoords {
  readonly x: number;
  readonly y: number;
}

export interface MediaThumbnail {
  /** Absolute image URL (resolved against the track source when known). */
  readonly url: string;
  readonly startTime: number;
  readonly endTime: number;
  readonly width?: number;
  readonly height?: number;
  readonly coords?: MediaThumbnailCoords;
}

export interface MediaFragment {
  readonly url: string;
  readonly width?: number;
  readonly height?: number;
  readonly coords?: MediaThumbnailCoords;
}

/** Resolves `url` against `base`; an unparsable pair keeps the raw text. */
function resolveUrl(url: string, base: string | null | undefined): string {
  if (!base) return url;
  try {
    return new URL(url, base).href;
  } catch {
    return url;
  }
}

/**
 * Parses `url#xywh=x,y,w,h` (W3C Media Fragments spatial dimension, pixel unit; the optional
 * `pixel:` prefix is accepted). A malformed or partial fragment selects no cell.
 */
export function parseMediaFragment(text: string, base?: string | null): MediaFragment {
  const trimmed = text.trim();
  const hashIndex = trimmed.indexOf('#');
  const raw = hashIndex < 0 ? trimmed : trimmed.slice(0, hashIndex);
  const url = resolveUrl(raw, base);
  if (hashIndex < 0) return { url };
  const params = new URLSearchParams(trimmed.slice(hashIndex + 1));
  const value = params.get('xywh');
  if (value === null) return { url };
  const numbers = value
    .replace(/^pixel:/, '')
    .split(',')
    .map((part) => (part.trim() === '' ? Number.NaN : Number(part)));
  if (numbers.length !== 4 || numbers.some((part) => !Number.isFinite(part) || part < 0))
    return { url };
  const [x, y, width, height] = numbers as [number, number, number, number];
  if (!width || !height) return { url };
  return { url, width, height, coords: { x, y } };
}

/** Maps a thumbnails track to images, resolving each cue URL against the track source. */
export function resolveThumbnails(
  track: Pick<MediaThumbnailsTrack, 'cues' | 'src'> | null | undefined,
): MediaThumbnail[] {
  if (!track) return [];
  return track.cues.map((cue: MediaCue) => {
    const fragment = parseMediaFragment(cue.text, track.src);
    return {
      url: fragment.url,
      startTime: cue.startTime,
      endTime: cue.endTime,
      ...(fragment.width !== undefined ? { width: fragment.width } : {}),
      ...(fragment.height !== undefined ? { height: fragment.height } : {}),
      ...(fragment.coords ? { coords: fragment.coords } : {}),
    };
  });
}

/** The last thumbnail whose start is at or before `time` (cues sorted by start). */
export function findThumbnail(
  thumbnails: readonly MediaThumbnail[],
  time: number,
): MediaThumbnail | undefined {
  if (!Number.isFinite(time)) return undefined;
  let match: MediaThumbnail | undefined;
  for (const thumbnail of thumbnails) {
    if (thumbnail.startTime <= time) {
      if (!match || thumbnail.startTime >= match.startTime) match = thumbnail;
    }
  }
  return match;
}

/** Remembers failed thumbnail sources so they are never retried. */
export class ThumbnailSourceMemory {
  readonly #failed = new Set<string>();

  hasFailed(url: string): boolean {
    return this.#failed.has(url);
  }

  markFailed(url: string): void {
    this.#failed.add(url);
  }

  /** The thumbnail when its source has not failed. */
  usable(thumbnail: MediaThumbnail | undefined): MediaThumbnail | undefined {
    return thumbnail && !this.#failed.has(thumbnail.url) ? thumbnail : undefined;
  }

  clear(): void {
    this.#failed.clear();
  }
}

export type ThumbnailCrossOrigin = '' | 'anonymous' | 'use-credentials';

/**
 * The CORS mode for thumbnail images: an explicit value wins (`null` opts out, `''` is
 * Anonymous); otherwise the media's mode is inherited.
 */
export function resolveThumbnailCrossOrigin(
  explicit: ThumbnailCrossOrigin | null | undefined,
  inherited: MediaThumbnailsTrack['crossOrigin'] | undefined,
): ThumbnailCrossOrigin | null {
  if (explicit !== undefined) return explicit;
  return inherited ?? null;
}

/** CORS-settings attribute → CORS mode: anything but `use-credentials` is Anonymous. */
export function corsMode(value: string | null | undefined): MediaThumbnailsTrack['crossOrigin'] {
  if (value === null || value === undefined) return null;
  return value.toLowerCase() === 'use-credentials' ? 'use-credentials' : 'anonymous';
}
