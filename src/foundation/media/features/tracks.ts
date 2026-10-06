import type { MediaAudioTrackState, MediaVideoRenditionState } from '../state.js';
import {
  isMediaAudioTrackCapable,
  isMediaVideoDimensionsCapable,
  isMediaVideoRenditionCapable,
  listItems,
  type AudioTrackLike,
  type AudioTrackListLike,
  type MediaTarget,
  type MediaTracksAdapter,
  type VideoRenditionLike,
  type VideoRenditionListLike,
} from '../target.js';
import type { MediaFeature, MediaFeatureContext } from './context.js';
import { CleanupScope } from '../../services.js';

export const audioTrackId = (track: AudioTrackLike, index: number): string =>
  track.id || String(index);
export const renditionId = (rendition: VideoRenditionLike, index: number): string =>
  rendition.id || String(index);

/** The audio-track list: the tracks adapter when supplied, else the native list. */
export function audioTrackList(
  media: MediaTarget,
  adapter: MediaTracksAdapter | null,
): AudioTrackListLike | null {
  if (adapter?.audioTracks) return adapter.audioTracks;
  return isMediaAudioTrackCapable(media) ? media.audioTracks : null;
}

/** The video-rendition list: the tracks adapter when supplied, else the native list. */
export function videoRenditionList(
  media: MediaTarget,
  adapter: MediaTracksAdapter | null,
): VideoRenditionListLike | null {
  if (adapter?.videoRenditions) return adapter.videoRenditions;
  return isMediaVideoRenditionCapable(media) ? media.videoRenditions : null;
}

function toAudioTrack(track: AudioTrackLike, index: number): MediaAudioTrackState {
  return {
    id: audioTrackId(track, index),
    ...(track.kind !== undefined ? { kind: track.kind } : {}),
    label: track.label,
    language: track.language,
    enabled: track.enabled,
  };
}

function toRendition(
  rendition: VideoRenditionLike,
  index: number,
  selectedIndex: number,
): MediaVideoRenditionState {
  const optional = (key: 'width' | 'height' | 'bitrate' | 'frameRate' | 'codec') =>
    rendition[key] !== undefined ? { [key]: rendition[key] } : {};
  return {
    id: renditionId(rendition, index),
    ...optional('width'),
    ...optional('height'),
    ...optional('bitrate'),
    ...optional('frameRate'),
    ...optional('codec'),
    selected: rendition.selected ?? index === selectedIndex,
  };
}

const size = (width: number | undefined, height: number | undefined): number | undefined =>
  width && height ? Math.min(width, height) : (height ?? width);

/** Rebinds list listeners whenever the list object changes (engines replace lists on load). */
function bindList<L extends EventTarget>(
  context: MediaFeatureContext,
  read: () => L | null,
  events: readonly string[],
  sync: (list: L | null) => void,
): void {
  let current: L | null | undefined;
  let scope: CleanupScope | undefined;
  context.scope.add(() => scope?.dispose());
  const bind = () => {
    const next = read();
    if (next !== current) {
      scope?.dispose();
      scope = new CleanupScope();
      current = next;
      const owner = scope;
      if (next)
        for (const type of events) {
          const listener = () => sync(next);
          next.addEventListener(type, listener);
          owner.add(() => next.removeEventListener(type, listener));
        }
    }
    sync(next);
  };
  bind();
  context.listen(context.media, 'loadstart', bind);
}

/** Audio-track slice (native list or tracks adapter). */
export const audioTrackFeature: MediaFeature = {
  name: 'audio-tracks',
  attach(context) {
    const { media, adapter } = context;
    bindList(
      context,
      () => audioTrackList(media, adapter),
      ['addtrack', 'removetrack', 'change'],
      (list) => context.set({ audioTracks: list ? listItems(list).map(toAudioTrack) : [] }),
    );
  },
};

/**
 * Quality slice: renditions, the active rendition (its `active` flag, else the unique rendition
 * matching the decoded `min(videoWidth, videoHeight)`) and `autoQuality` (`selectedIndex === -1`).
 */
export const qualityFeature: MediaFeature = {
  name: 'quality',
  attach(context) {
    const { media, adapter } = context;
    let list: VideoRenditionListLike | null = null;
    const sync = (next: VideoRenditionListLike | null) => {
      list = next;
      const renditions = next ? listItems(next) : [];
      const selectedIndex = next?.selectedIndex ?? -1;
      let active = renditions.find((rendition) => rendition.active);
      if (!active && isMediaVideoDimensionsCapable(media)) {
        const decoded = size(media.videoWidth || undefined, media.videoHeight || undefined);
        const matches =
          decoded === undefined
            ? []
            : renditions.filter((rendition) => size(rendition.width, rendition.height) === decoded);
        if (matches.length === 1) active = matches[0];
      }
      context.set({
        videoRenditions: renditions.map((rendition, index) =>
          toRendition(rendition, index, selectedIndex),
        ),
        activeVideoRendition: active
          ? toRendition(active, renditions.indexOf(active), selectedIndex)
          : null,
        autoQuality: selectedIndex === -1,
      });
    };
    bindList(
      context,
      () => videoRenditionList(media, adapter),
      ['addrendition', 'removerendition', 'change', 'activechange'],
      sync,
    );
    context.listen(media, 'resize', () => sync(list));
  },
};
