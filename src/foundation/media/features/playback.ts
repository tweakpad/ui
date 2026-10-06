import {
  isMediaPlaybackCapable,
  isMediaSeekCapable,
  isMediaSourceCapable,
  MediaReadyState,
} from '../target.js';
import type { MediaFeature } from './context.js';

/**
 * Playback slice: `paused`, `ended`, `started` (sticky until `emptied`), `waiting` and `loop`.
 *
 * `waiting` is starvation (`readyState` below future data while playing) that has not been
 * disproved by an advancing `currentTime`: Safari reports `HAVE_CURRENT_DATA` for the whole of
 * some MSE streams while presenting normally (Video.js `playbackFeature`).
 */
export const playbackFeature: MediaFeature = {
  name: 'playback',
  attach(context) {
    const { media } = context;
    if (!isMediaPlaybackCapable(media)) return;
    const seekCapable = isMediaSeekCapable(media);
    const sourceCapable = isMediaSourceCapable(media);
    let starvedAt: number | null = null;
    const time = () => (seekCapable && Number.isFinite(media.currentTime) ? media.currentTime! : 0);

    const sync = (fresh = false) => {
      const paused = media.paused;
      const currentTime = time();
      const readyState = sourceCapable ? media.readyState : MediaReadyState.HAVE_ENOUGH_DATA;
      const starved = readyState < MediaReadyState.HAVE_FUTURE_DATA && !paused;
      if (!starved) starvedAt = null;
      else starvedAt ??= currentTime;
      const started = (!fresh && context.source().started) || !paused || currentTime > 0;
      context.set({
        paused,
        ended: media.ended,
        started,
        waiting: starved && starvedAt === currentTime,
        loop: media.loop === true,
      });
    };
    const starve = () => {
      starvedAt = time();
      sync();
    };

    sync(true);
    context.listen(media, 'emptied', () => {
      starvedAt = time();
      sync(true);
    });
    for (const type of ['play', 'waiting', 'seeking']) context.listen(media, type, starve);
    for (const type of [
      'pause',
      'ended',
      'playing',
      'seeked',
      'canplay',
      'timeupdate',
      'loadstart',
    ])
      context.listen(media, type, () => sync());
  },
};
