import { describe, expect, it } from 'vitest';
import { DEFAULT_MEDIA_STATE } from './context.js';
import { MEDIA_CONTAINER_MARKERS, mediaContainerMarkers, mediaTypeOf } from './markers.js';
import type { MediaTarget } from '../../foundation/media/target.js';
import { authoredImageHasSource, posterVisible } from './poster.js';

describe('container state markers (Library mp-l-container-a11y; V-49)', () => {
  it('publishes the default state', () => {
    expect(mediaContainerMarkers(DEFAULT_MEDIA_STATE, null)).toEqual({
      'data-paused': '',
      'data-ended': null,
      'data-started': null,
      'data-waiting': null,
      'data-seeking': null,
      'data-muted': null,
      'data-fullscreen': null,
      'data-pip': null,
      'data-captions-showing': null,
      'data-controls-visible': '',
      'data-user-active': '',
      'data-live-edge': null,
      'data-volume-level': 'high',
      'data-stream-type': 'unknown',
      'data-error': null,
      'data-media-type': null,
    });
    expect(Object.keys(mediaContainerMarkers(DEFAULT_MEDIA_STATE, null)).sort()).toEqual(
      [...MEDIA_CONTAINER_MARKERS].sort(),
    );
  });

  it('maps every published field', () => {
    const markers = mediaContainerMarkers(
      {
        ...DEFAULT_MEDIA_STATE,
        paused: false,
        ended: true,
        started: true,
        waiting: true,
        seeking: true,
        muted: true,
        volumeLevel: 'off',
        fullscreen: true,
        pictureInPicture: true,
        captionsShowing: true,
        controlsVisible: false,
        userActive: false,
        streamType: 'live',
        atLiveEdge: true,
        error: { code: 2, message: 'network', fatal: true },
      },
      'video',
    );
    expect(markers).toMatchObject({
      'data-paused': null,
      'data-ended': '',
      'data-started': '',
      'data-waiting': '',
      'data-seeking': '',
      'data-muted': '',
      'data-volume-level': 'off',
      'data-fullscreen': '',
      'data-pip': '',
      'data-captions-showing': '',
      'data-controls-visible': null,
      'data-user-active': null,
      'data-stream-type': 'live',
      'data-live-edge': '',
      'data-error': '2',
      'data-media-type': 'video',
    });
  });

  it('classifies media type', () => {
    const media = (members: object) => Object.assign(new EventTarget(), members) as MediaTarget;
    expect(mediaTypeOf(null)).toBeNull();
    expect(mediaTypeOf(media({ localName: 'audio' }))).toBe('audio');
    expect(mediaTypeOf(media({ localName: 'video' }))).toBe('video');
    expect(mediaTypeOf(media({ localName: 'custom-media', videoWidth: 0 }))).toBe('video');
    expect(mediaTypeOf(media({ localName: 'custom-audio' }))).toBe('audio');
  });
});

describe('poster policy (Library mp-l-poster-title; V-59)', () => {
  it('is visible until started, and after end only with show-on-ended', () => {
    expect(posterVisible({ started: false, ended: false }, false)).toBe(true);
    expect(posterVisible({ started: true, ended: false }, true)).toBe(false);
    expect(posterVisible({ started: true, ended: true }, false)).toBe(false);
    expect(posterVisible({ started: true, ended: true }, true)).toBe(true);
  });

  it('treats src, srcset or picture sources as an authored source', () => {
    const image = (attributes: string[], parent?: object) =>
      ({
        hasAttribute: (name: string) => attributes.includes(name),
        parentElement: parent ?? null,
      }) as unknown as HTMLImageElement;
    expect(authoredImageHasSource(image([]))).toBe(false);
    expect(authoredImageHasSource(image(['src']))).toBe(true);
    expect(authoredImageHasSource(image(['srcset']))).toBe(true);
    const picture = { localName: 'picture', querySelector: () => ({}) };
    expect(authoredImageHasSource(image([], picture))).toBe(true);
    const empty = { localName: 'picture', querySelector: () => null };
    expect(authoredImageHasSource(image([], empty))).toBe(false);
  });
});
