import type { MediaStreamType } from '../target.js';
import { isMediaLiveCapable, isMediaSeekCapable, isMediaStreamTypeCapable } from '../target.js';
import type { MediaFeature } from './context.js';

/**
 * Live slice: the detected stream type (the media's own `streamType`, else an infinite duration
 * means live and a finite positive one on-demand), and the media's `targetLiveWindow` and
 * `liveEdgeStart` when it reports them. The configured `stream-type` override, `atLiveEdge` and
 * `dvr` are derived.
 */
export const liveFeature: MediaFeature = {
  name: 'live',
  attach(context) {
    const { media } = context;
    const detect = (): MediaStreamType => {
      if (isMediaStreamTypeCapable(media)) {
        const reported = media.streamType;
        if (reported === 'live' || reported === 'on-demand') return reported;
      }
      if (!isMediaSeekCapable(media)) return 'unknown';
      const duration = media.duration;
      if (duration === Number.POSITIVE_INFINITY) return 'live';
      return Number.isFinite(duration) && duration > 0 ? 'on-demand' : 'unknown';
    };
    const liveCapable = isMediaLiveCapable(media);
    const number = (value: unknown) => (typeof value === 'number' ? value : Number.NaN);
    const sync = () =>
      context.set({
        detectedStreamType: detect(),
        ...(liveCapable
          ? {
              liveEdgeStart: number(media.liveEdgeStart),
              mediaTargetLiveWindow: number(media.targetLiveWindow),
            }
          : {}),
      });
    sync();
    for (const type of [
      'streamtypechange',
      'targetlivewindowchange',
      'durationchange',
      'loadedmetadata',
      'emptied',
      'progress',
      'canplay',
    ])
      context.listen(media, type, sync);
    if (liveCapable) context.listen(media, 'timeupdate', sync);
  },
};
