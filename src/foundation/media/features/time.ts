import { isMediaBufferCapable, isMediaSeekCapable } from '../target.js';
import type { MediaFeature } from './context.js';

/**
 * Time slice: `currentTime`, `duration` (finite media duration, else the last seekable end for an
 * infinite duration, else `0`) and `seeking`. While a seek is in flight, `timeupdate` and
 * `progress` carry intermediate positions and are ignored so a time range does not snap back.
 */
export const timeFeature: MediaFeature = {
  name: 'time',
  attach(context) {
    const { media } = context;
    if (!isMediaSeekCapable(media)) return;
    const bufferCapable = isMediaBufferCapable(media);

    const duration = () => {
      const value = media.duration;
      if (value === Number.POSITIVE_INFINITY && bufferCapable) {
        const seekable = media.seekable;
        const end = seekable.length ? seekable.end(seekable.length - 1) : 0;
        return Number.isFinite(end) && end > 0 ? end : 0;
      }
      return Number.isFinite(value) && value > 0 ? value : 0;
    };
    const sync = () =>
      context.set({
        currentTime: Number.isFinite(media.currentTime) ? media.currentTime : 0,
        duration: duration(),
        seeking: media.seeking === true,
      });
    const syncUnlessSeeking = () => {
      if (!context.source().seeking) sync();
    };

    sync();
    context.listen(media, 'timeupdate', syncUnlessSeeking);
    context.listen(media, 'progress', syncUnlessSeeking);
    for (const type of ['durationchange', 'seeking', 'seeked', 'loadedmetadata', 'emptied'])
      context.listen(media, type, sync);
  },
};
