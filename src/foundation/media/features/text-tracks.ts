import { isCaptionTrackKind } from '../availability.js';
import { clampCuesToDuration } from '../chapters.js';
import type { MediaTextTrackState, MediaThumbnailsTrack } from '../state.js';
import { corsMode } from '../thumbnails.js';
import {
  isMediaSeekCapable,
  isMediaSourceCapable,
  isMediaTextTrackCapable,
  listItems,
  type MediaTarget,
  type TextTrackLike,
} from '../target.js';
import type { MediaFeature } from './context.js';

/** Stable text-track id: `track.id`, else `track:<index>:<kind>:<language>:<label>`. */
export function textTrackId(track: TextTrackLike, index: number): string {
  return track.id || `track:${index}:${track.kind}:${track.language}:${track.label}`;
}

/** `<track>` children of the media (and of an open shadow root of a custom media element). */
export function trackElements(media: MediaTarget): HTMLTrackElement[] {
  const elements: HTMLTrackElement[] = [];
  if (typeof media.querySelectorAll === 'function')
    elements.push(...(Array.from(media.querySelectorAll('track')) as HTMLTrackElement[]));
  const shadow = (media as { shadowRoot?: ParentNode | null }).shadowRoot;
  if (shadow && typeof shadow.querySelectorAll === 'function')
    elements.push(...(Array.from(shadow.querySelectorAll('track')) as HTMLTrackElement[]));
  return elements;
}

/**
 * Text-track slice: the track list with stable ids, `captionsShowing`, the first chapters
 * track's cues (ends clamped to the finite duration) and the first `metadata` track labelled
 * `thumbnails`. Re-reads on list changes, `loadstart`, `durationchange` and `<track>` `load`.
 */
export const textTrackFeature: MediaFeature = {
  name: 'text-tracks',
  attach(context) {
    const { media } = context;
    if (!isMediaTextTrackCapable(media)) return;
    let loads: Array<() => void> = [];
    const releaseLoads = () => {
      for (const release of loads) release();
      loads = [];
    };
    context.scope.add(releaseLoads);

    const sync = () => {
      releaseLoads();
      const tracks = listItems(media.textTracks);
      const list: MediaTextTrackState[] = [];
      let chapters: TextTrackLike | undefined;
      let thumbnails: TextTrackLike | undefined;
      let captionsShowing = false;
      tracks.forEach((track, index) => {
        if (!chapters && track.kind === 'chapters') chapters = track;
        if (!thumbnails && track.kind === 'metadata' && track.label === 'thumbnails')
          thumbnails = track;
        list.push({
          id: textTrackId(track, index),
          kind: track.kind,
          label: track.label,
          language: track.language,
          mode: track.mode,
        });
        if (isCaptionTrackKind(track.kind) && track.mode === 'showing') captionsShowing = true;
      });
      const elements = trackElements(media);
      const duration = isMediaSeekCapable(media) ? (media.duration ?? Number.NaN) : Number.NaN;
      let thumbnailsTrack: MediaThumbnailsTrack | null = null;
      if (thumbnails) {
        const element = elements.find((candidate) => candidate.track === (thumbnails as unknown));
        thumbnailsTrack = {
          cues: clampCuesToDuration(thumbnails.cues, Number.NaN),
          src: element?.src || null,
          crossOrigin: isMediaSourceCapable(media) ? corsMode(media.crossOrigin) : null,
        };
      }
      // `addtrack` precedes cue parsing; a `<track>` element reports parsed cues with `load`.
      for (const element of elements) {
        if (element.track?.cues?.length) continue;
        element.addEventListener('load', sync, { once: true });
        loads.push(() => element.removeEventListener('load', sync));
      }
      context.set({
        textTracks: list,
        captionsShowing,
        chapters: clampCuesToDuration(chapters?.cues, duration),
        thumbnails: thumbnailsTrack,
      });
    };

    sync();
    for (const type of ['addtrack', 'removetrack', 'change'])
      context.listen(media.textTracks, type, sync);
    context.listen(media, 'loadstart', sync);
    context.listen(media, 'durationchange', sync);
  },
};
