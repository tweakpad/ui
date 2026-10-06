import { describe, expect, it } from 'vitest';
import { FakeContainer, FakeDocument, FakeMedia, FakeWindow, flush } from './media-fakes.test.js';
import {
  fullscreenSupported,
  isFullscreen,
  MediaPresentation,
  pictureInPictureSupported,
  ScreenOrientationLock,
} from './presentation.js';
import type { MediaTarget } from './target.js';

function setup() {
  const document = new FakeDocument();
  const container = new FakeContainer(document);
  const media = new FakeMedia({ document });
  const target = { media: media.asTarget(), container: container as unknown as HTMLElement };
  const presentation = new MediaPresentation(() => target);
  return { document, container, media, target, presentation };
}

/** iOS-like media: no document fullscreen, WebKit presentation mode only. */
function webkitMedia(document: FakeDocument) {
  const media = new FakeMedia({ document });
  const modes: string[] = [];
  Object.assign(media, {
    webkitPresentationMode: 'inline',
    webkitSetPresentationMode(mode: string) {
      modes.push(mode);
      (media as unknown as { webkitPresentationMode: string }).webkitPresentationMode = mode;
      media.fire('webkitpresentationmodechanged');
    },
  });
  return { media, modes };
}

describe('MediaPresentation (V-34)', () => {
  it('requests fullscreen on the container and exits through the owner document', async () => {
    const { presentation, container, document, target } = setup();
    await presentation.requestFullscreen();
    expect(container.fullscreenRequests).toBe(1);
    expect(presentation.fullscreenPath).toBe('container');
    expect(isFullscreen(target)).toBe(true);
    await presentation.exitFullscreen();
    expect(document.exits).toEqual(['fullscreen']);
    expect(isFullscreen(target)).toBe(false);
  });

  it('exits picture-in-picture before fullscreen and fullscreen before picture-in-picture', async () => {
    const { presentation, media, document } = setup();
    media.readyState = 1;
    await presentation.requestPictureInPicture();
    expect(presentation.isPictureInPicture()).toBe(true);
    await presentation.requestFullscreen();
    expect(document.exits).toEqual(['pip']);
    expect(presentation.isPictureInPicture()).toBe(false);
    await presentation.requestPictureInPicture();
    expect(document.exits).toEqual(['pip', 'fullscreen']);
    expect(presentation.isFullscreen()).toBe(false);
  });

  it('refuses picture-in-picture before metadata without leaving fullscreen', async () => {
    const { presentation, document } = setup();
    await presentation.requestFullscreen();
    await expect(presentation.requestPictureInPicture()).rejects.toMatchObject({
      name: 'InvalidStateError',
    });
    expect(document.exits).toEqual([]);
    expect(presentation.isFullscreen()).toBe(true);
  });

  it('falls back to the iOS WebKit presentation mode and mirrors it on exit', async () => {
    const document = new FakeDocument();
    document.fullscreenEnabled = false;
    document.pictureInPictureEnabled = false;
    const { media, modes } = webkitMedia(document);
    const target = { media: media.asTarget(), container: null };
    expect(fullscreenSupported(target)).toBe(true);
    expect(pictureInPictureSupported(target)).toBe(true);
    const presentation = new MediaPresentation(() => target);
    await presentation.requestFullscreen();
    expect(presentation.fullscreenPath).toBe('webkit-presentation');
    expect(isFullscreen(target)).toBe(true);
    await presentation.exitFullscreen();
    expect(modes).toEqual(['fullscreen', 'inline']);
    media.readyState = 1;
    await presentation.requestPictureInPicture();
    await presentation.exitPictureInPicture();
    expect(modes).toEqual(['fullscreen', 'inline', 'picture-in-picture', 'inline']);
  });

  it('uses the media fullscreen API when neither container nor WebKit mode can', async () => {
    const document = new FakeDocument();
    document.fullscreenEnabled = false;
    const media = new FakeMedia({ document });
    let requested = 0;
    Object.assign(media, { requestFullscreen: () => void requested++ });
    const presentation = new MediaPresentation(() => ({
      media: media.asTarget(),
      container: null,
    }));
    await presentation.requestFullscreen();
    expect([requested, presentation.fullscreenPath]).toEqual([1, 'media']);
    const bare = new MediaPresentation(() => ({
      media: Object.assign(new EventTarget(), {
        ownerDocument: document,
      }) as unknown as MediaTarget,
      container: null,
    }));
    await expect(bare.requestFullscreen()).rejects.toMatchObject({ name: 'NotSupportedError' });
  });

  it('detects :fullscreen on the container and a disabled picture-in-picture', () => {
    const { target, container, media } = setup();
    container.matches = (selector?: string) => selector === ':fullscreen';
    expect(isFullscreen(target)).toBe(true);
    media.disablePictureInPicture = true;
    expect(pictureInPictureSupported(target)).toBe(false);
  });

  it('rejects requests without a target', async () => {
    const presentation = new MediaPresentation(() => null);
    await expect(presentation.requestFullscreen()).rejects.toMatchObject({
      name: 'InvalidStateError',
    });
    expect(presentation.isFullscreen()).toBe(false);
  });
});

describe('ScreenOrientationLock', () => {
  it('serializes lock requests so the last call wins and ignores rejections', async () => {
    const view = new FakeWindow();
    const pending: Array<() => void> = [];
    view.lockImpl = () => new Promise<void>((resolve) => pending.push(resolve));
    const lock = new ScreenOrientationLock(() => view as unknown as Window);
    void lock.lock('landscape');
    void lock.lock('portrait');
    void lock.lock('landscape-primary');
    expect(view.orientationCalls).toEqual(['lock:landscape']);
    pending.shift()!();
    await flush();
    expect(view.orientationCalls).toEqual(['lock:landscape', 'lock:landscape-primary']);
    pending.shift()!();
    await flush();
    lock.unlock();
    await flush();
    expect(view.orientationCalls.at(-1)).toBe('unlock');
    view.lockImpl = () => Promise.reject(new DOMException('no', 'NotSupportedError'));
    await expect(lock.lock('portrait')).resolves.toBeUndefined();
  });

  it('locks while fullscreen through the store and unlocks on exit and detach', async () => {
    const { MediaStore } = await import('./store.js');
    const { document, container, media } = setup();
    const store = new MediaStore({ probeVolume: () => 'available' });
    store.configure({ orientationLock: 'landscape' });
    store.attach({ media: media.asTarget(), container: container as unknown as HTMLElement });
    await store.request('request-fullscreen');
    await flush();
    expect(document.defaultView.orientationCalls).toEqual(['lock:landscape']);
    await store.request('exit-fullscreen');
    await flush();
    expect(document.defaultView.orientationCalls).toEqual(['lock:landscape', 'unlock']);
    await store.request('request-fullscreen');
    await flush();
    store.detach();
    await flush();
    expect(document.defaultView.orientationCalls).toEqual([
      'lock:landscape',
      'unlock',
      'lock:landscape',
      'unlock',
    ]);
  });
});
