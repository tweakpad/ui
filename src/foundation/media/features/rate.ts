import { isMediaRateCapable } from '../target.js';
import type { MediaFeature } from './context.js';

/** Rate slice: `playbackRate` follows `ratechange` (`playbackRates` is configuration). */
export const rateFeature: MediaFeature = {
  name: 'rate',
  attach(context) {
    const { media } = context;
    if (!isMediaRateCapable(media)) return;
    const sync = () =>
      context.set({ playbackRate: Number.isFinite(media.playbackRate) ? media.playbackRate : 1 });
    sync();
    context.listen(media, 'ratechange', sync);
    context.listen(media, 'loadstart', sync);
  },
};
