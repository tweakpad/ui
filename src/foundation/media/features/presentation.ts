import {
  fullscreenSupported,
  isFullscreen,
  isPictureInPicture,
  pictureInPictureSupported,
} from '../presentation.js';
import { hasMetadata, isMediaSourceCapable } from '../target.js';
import type { MediaFeature, MediaFeatureContext } from './context.js';

/** The orientation lock type to hold now: the configured type while fullscreen, else `null`. */
export function orientationTarget(
  context: Pick<MediaFeatureContext, 'config'>,
  fullscreen: boolean,
) {
  const lock = context.config().orientationLock;
  return fullscreen && lock !== 'none' ? lock : null;
}

/**
 * Fullscreen slice. State follows owner-document `fullscreenchange`/`webkitfullscreenchange` and
 * the WebKit presentation mode; the opt-in orientation lock follows fullscreen and is released on
 * detach.
 */
export const fullscreenFeature: MediaFeature = {
  name: 'fullscreen',
  attach(context) {
    const target = { media: context.media, container: context.container };
    context.set({
      fullscreenAvailability: fullscreenSupported(target) ? 'available' : 'unsupported',
    });
    const sync = () => {
      const fullscreen = isFullscreen(target);
      context.set({ fullscreen });
      context.presentation.syncOrientation(orientationTarget(context, fullscreen));
    };
    sync();
    context.listen(context.document, 'fullscreenchange', sync);
    context.listen(context.document, 'webkitfullscreenchange', sync);
    if ('webkitPresentationMode' in context.media)
      context.listen(context.media, 'webkitpresentationmodechanged', sync);
    context.scope.add(() => context.presentation.syncOrientation(null));
  },
};

/**
 * Picture-in-picture slice: `unsupported` unless the browser permits it (Safari home-screen apps
 * excluded) and the media is capable; then `available` once metadata has loaded.
 */
export const pictureInPictureFeature: MediaFeature = {
  name: 'pip',
  attach(context) {
    const { media } = context;
    const target = { media, container: context.container };
    const supported = pictureInPictureSupported(target);
    const sync = () =>
      context.set({
        pictureInPicture: isPictureInPicture(target),
        pictureInPictureAvailability: supported
          ? isMediaSourceCapable(media) && hasMetadata(media)
            ? 'available'
            : 'unavailable'
          : 'unsupported',
      });
    sync();
    for (const type of [
      'enterpictureinpicture',
      'leavepictureinpicture',
      'loadstart',
      'loadedmetadata',
      'emptied',
    ])
      context.listen(media, type, sync);
    if ('webkitPresentationMode' in media)
      context.listen(media, 'webkitpresentationmodechanged', sync);
  },
};
