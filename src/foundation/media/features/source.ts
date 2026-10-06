import { isMediaBufferCapable, isMediaSourceCapable, serializeTimeRanges } from '../target.js';
import type { MediaFeature } from './context.js';

/** Buffer slice: serialized `buffered` and `seekable` ranges. */
export const bufferFeature: MediaFeature = {
  name: 'buffer',
  attach(context) {
    const { media } = context;
    if (!isMediaBufferCapable(media)) return;
    const sync = () =>
      context.set({
        buffered: serializeTimeRanges(media.buffered),
        seekable: serializeTimeRanges(media.seekable),
      });
    sync();
    for (const type of [
      'loadedmetadata',
      'durationchange',
      'progress',
      'emptied',
      'seeked',
      'canplay',
    ])
      context.listen(media, type, sync);
  },
};

/** Source slice: `currentSrc` and the `readyState` mirror (`canPlay` is derived). */
export const sourceFeature: MediaFeature = {
  name: 'source',
  attach(context) {
    const { media } = context;
    if (!isMediaSourceCapable(media)) return;
    const sync = () =>
      context.set({ currentSrc: media.currentSrc ?? '', readyState: media.readyState ?? 0 });
    sync();
    for (const type of [
      'loadstart',
      'emptied',
      'loadedmetadata',
      'loadeddata',
      'canplay',
      'canplaythrough',
      'waiting',
      'playing',
      'seeking',
      'seeked',
      'stalled',
      'suspend',
      'abort',
    ])
      context.listen(media, type, sync);
  },
};
