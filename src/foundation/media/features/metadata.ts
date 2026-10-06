import { isMediaContentDataCapable } from '../target.js';
import type { MediaFeature } from './context.js';

/**
 * Metadata sources: media content data and the native video poster. `title`/`poster` are derived:
 * configuration, else content data, else the video poster (poster only); an authored `''` stops
 * the fallback.
 */
export const metadataFeature: MediaFeature = {
  name: 'metadata',
  attach(context) {
    const { media } = context;
    const sync = () => {
      const data = isMediaContentDataCapable(media) ? media.contentData : undefined;
      context.set({
        mediaTitle: data?.title ?? undefined,
        mediaPoster: data?.poster ?? undefined,
        videoPoster: typeof media.poster === 'string' && media.poster ? media.poster : undefined,
      });
    };
    sync();
    context.listen(media, 'contentdatachange', sync);
    context.listen(media, 'loadstart', sync);
    context.listen(media, 'loadedmetadata', sync);
  },
};
