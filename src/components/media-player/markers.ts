import type { MediaState } from '../../foundation/media/state.js';
import type { MediaTarget } from '../../foundation/media/target.js';

/** `data-media-type` value of the container. */
export type MediaType = 'video' | 'audio';

/**
 * Video for `<video>` and custom media exposing video dimensions; audio otherwise; `null` when no
 * media is attached.
 */
export function mediaTypeOf(media: MediaTarget | null | undefined): MediaType | null {
  if (!media) return null;
  const name = (media as { localName?: unknown }).localName;
  if (name === 'audio') return 'audio';
  if (name === 'video') return 'video';
  return 'videoWidth' in media ? 'video' : 'audio';
}

/** Boolean container markers and the state field each one publishes (Library mp-l-container-a11y). */
const BOOLEAN_MARKERS = [
  ['data-paused', 'paused'],
  ['data-ended', 'ended'],
  ['data-started', 'started'],
  ['data-waiting', 'waiting'],
  ['data-seeking', 'seeking'],
  ['data-muted', 'muted'],
  ['data-fullscreen', 'fullscreen'],
  ['data-pip', 'pictureInPicture'],
  ['data-captions-showing', 'captionsShowing'],
  ['data-controls-visible', 'controlsVisible'],
  ['data-user-active', 'userActive'],
  ['data-live-edge', 'atLiveEdge'],
] as const satisfies readonly (readonly [string, keyof MediaState])[];

/** Every attribute the container markers own. */
export const MEDIA_CONTAINER_MARKERS: readonly string[] = Object.freeze([
  ...BOOLEAN_MARKERS.map(([name]) => name),
  'data-volume-level',
  'data-stream-type',
  'data-error',
  'data-media-type',
]);

/**
 * Container state markers: attribute → value (`''` for a present boolean marker, `null` to remove).
 * `data-volume-level` is `off|low|medium|high`, `data-stream-type` is `on-demand|live|unknown`,
 * `data-error` carries the media error code, and `data-media-type` is `video|audio`.
 */
export function mediaContainerMarkers(
  state: MediaState,
  mediaType: MediaType | null,
): Record<string, string | null> {
  const markers: Record<string, string | null> = {};
  for (const [name, key] of BOOLEAN_MARKERS) markers[name] = state[key] ? '' : null;
  markers['data-volume-level'] = state.volumeLevel;
  markers['data-stream-type'] = state.streamType;
  markers['data-error'] = state.error ? String(state.error.code) : null;
  markers['data-media-type'] = mediaType;
  return markers;
}
