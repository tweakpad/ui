import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic } from '../services.js';
import { shallowEqual } from '../store.js';
import type { MediaStoreHooks } from './events.js';
import {
  FakeAudioTrack,
  FakeContainer,
  FakeDocument,
  FakeList,
  FakeMedia,
  FakeRemote,
  FakeTextTrack,
  FakeTimeRanges,
  FakeWindow,
  flush,
  partialMedia,
} from './media-fakes.test.js';
import { deferMediaDestroy, MediaStore, type MediaStoreOptions } from './store.js';
import { DEFAULT_PLAYBACK_RATES, type MediaState, type MediaStateChange } from './state.js';
import type { MediaTarget, VideoRenditionLike } from './target.js';

afterEach(() => vi.useRealTimers());

type Recorded = { type: string; detail: unknown };

function setup(options: MediaStoreOptions = {}, mediaOptions: { document?: FakeDocument } = {}) {
  const document = mediaOptions.document ?? new FakeDocument();
  const container = new FakeContainer(document);
  const media = new FakeMedia({ document });
  const events: Recorded[] = [];
  const diagnostics: Diagnostic[] = [];
  const hooks: MediaStoreHooks = {
    dispatchRequest: (detail) => (events.push({ type: 'request', detail }), true),
    requestFailed: (detail) => void events.push({ type: 'request-failed', detail }),
    stateChange: (detail) => void events.push({ type: 'state-change', detail }),
    error: (detail) => void events.push({ type: 'error', detail }),
    attach: (detail) => void events.push({ type: 'attach', detail }),
    detach: (detail) => void events.push({ type: 'detach', detail }),
    diagnostic: (diagnostic) => void diagnostics.push(diagnostic),
  };
  const store = new MediaStore({ hooks, probeVolume: () => 'available', ...options });
  const attach = (target: MediaTarget = media.asTarget()) =>
    store.attach({ media: target, container: container as unknown as HTMLElement });
  const changes: MediaStateChange[] = [];
  store.onStateChange((change) => changes.push(change));
  const of = (type: string) => events.filter((event) => event.type === type);
  return { store, media, container, document, events, diagnostics, attach, changes, of };
}

describe('MediaStore scope and publication', () => {
  it('V-01: keeps two players independent', async () => {
    const a = setup();
    const b = setup();
    a.attach();
    b.attach();
    a.media.paused = false;
    a.media.fire('play');
    await flush();
    expect(a.store.state.paused).toBe(false);
    expect(b.store.state.paused).toBe(true);
    a.store.configure({ contentTitle: 'A' });
    expect(b.store.state.title).toBe('');
  });

  it('publishes a frozen snapshot whose source and derived values change atomically', async () => {
    const { store, media, attach } = setup();
    attach();
    await flush();
    const seen: MediaState[] = [];
    store.subscribe((state) => seen.push(state));
    media.volume = 0.3;
    media.fire('volumechange');
    media.muted = true;
    media.fire('volumechange');
    expect(seen).toHaveLength(0); // batched into a microtask
    await flush();
    expect(seen).toHaveLength(1);
    expect(Object.isFrozen(seen[0])).toBe(true);
    expect([seen[0]!.volume, seen[0]!.muted, seen[0]!.volumeLevel]).toEqual([0.3, true, 'off']);
    expect(Object.isFrozen(seen[0]!.buffered)).toBe(true);
  });

  it('V-11: notifies selector subscribers only for their slice, shallow by default', async () => {
    const { store, media, attach } = setup();
    attach();
    media.loadMetadata(60, 4);
    await flush();
    const time = vi.fn();
    const volume = vi.fn();
    const pair = vi.fn();
    store.subscribe(time, { selector: (state) => state.currentTime });
    store.subscribe(volume, { selector: (state) => state.volume });
    // A fresh object each time: shallow equality prevents spurious notifications.
    store.subscribe(pair, { selector: (state) => ({ muted: state.muted, volume: state.volume }) });
    for (let second = 1; second <= 4; second++) {
      media.advance(second);
      media.fire('timeupdate');
      await flush();
    }
    expect(time).toHaveBeenCalledTimes(4);
    expect(volume).not.toHaveBeenCalled();
    expect(pair).not.toHaveBeenCalled();
    const custom = vi.fn();
    store.subscribe(custom, {
      selector: (state) => state.buffered,
      equality: (a, b) => a.length === b.length,
      emitCurrent: true,
    });
    expect(custom).toHaveBeenCalledTimes(1);
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
  });

  it('keeps unchanged array references across syncs (structural sharing)', async () => {
    const { store, media, attach } = setup();
    attach();
    media.buffered = new FakeTimeRanges([[0, 5]]);
    media.fire('progress');
    await flush();
    const first = store.state.buffered;
    media.buffered = new FakeTimeRanges([[0, 5]]);
    media.fire('progress');
    await flush();
    expect(store.state.buffered).toBe(first);
  });

  it('V-33: emits attach, state-change (reason media) and detach', async () => {
    const { store, media, attach, of, container } = setup();
    attach();
    expect(of('attach')).toEqual([{ type: 'attach', detail: { media, container } }]);
    await flush();
    media.paused = false;
    media.fire('play');
    await flush();
    const change = of('state-change').at(-1)!.detail as MediaStateChange;
    expect(change.changed).toContain('paused');
    expect(change.reason).toBe('media');
    expect(change.previousState.paused).toBe(true);
    expect(change.state.paused).toBe(false);
    store.detach();
    expect(of('detach')).toEqual([{ type: 'detach', detail: { media, container } }]);
  });
});

describe('MediaStore lifecycle', () => {
  it('holds defaults with availability unavailable before attach', () => {
    const { store } = setup();
    expect(store.attached).toBe(false);
    expect(store.state.volumeAvailability).toBe('unavailable');
    expect(store.state.fullscreenAvailability).toBe('unavailable');
    expect(store.state.remotePlaybackAvailability).toBe('unsupported');
    expect(store.state.playbackRates).toEqual(DEFAULT_PLAYBACK_RATES);
  });

  it('V-07: detaches synchronously, resets source state and keeps user configuration', async () => {
    const { store, media, attach } = setup();
    store.configure({
      contentTitle: 'Title',
      poster: 'p.jpg',
      playbackRates: [1, 2],
      orientationLock: 'landscape',
    });
    attach();
    media.loadMetadata(30, 4);
    media.volume = 0.4;
    media.fire('volumechange');
    await flush();
    const release = store.requestControlsLock();
    expect(store.state.duration).toBe(30);
    store.detach();
    expect(store.attached).toBe(false);
    expect(store.state.duration).toBe(0);
    expect(store.state.volume).toBe(1);
    expect(store.state.title).toBe('Title');
    expect(store.state.poster).toBe('p.jpg');
    expect(store.state.playbackRates).toEqual([1, 2]);
    expect(store.config.orientationLock).toBe('landscape');
    expect(store.activity.locked).toBe(false);
    release(); // idempotent after detach released it
    // Listeners are gone.
    media.duration = 99;
    media.fire('durationchange');
    await flush();
    expect(store.state.duration).toBe(0);
  });

  it('V-07: deferred destroy runs after two frames and reconnection cancels it', () => {
    vi.useFakeTimers();
    const view = new FakeWindow();
    const destroy = vi.fn();
    const cancel = deferMediaDestroy(view as unknown as Window, destroy);
    vi.advanceTimersByTime(16);
    expect(destroy).not.toHaveBeenCalled();
    cancel();
    vi.advanceTimersByTime(100);
    expect(destroy).not.toHaveBeenCalled();
    deferMediaDestroy(view as unknown as Window, destroy);
    vi.advanceTimersByTime(32);
    expect(destroy).toHaveBeenCalledTimes(1);
  });

  it('re-attaches on media swap; subscriptions continue and leases survive', async () => {
    const { store, media, attach, document, of } = setup();
    attach();
    await flush();
    const listener = vi.fn();
    store.subscribe(listener, { selector: (state) => state.duration });
    const release = store.requestControlsLock();
    const next = new FakeMedia({ document });
    next.duration = 12;
    attach(next.asTarget());
    await flush();
    expect(of('detach')).toHaveLength(1);
    expect(of('attach')).toHaveLength(2);
    expect(store.media).toBe(next);
    expect(listener).toHaveBeenLastCalledWith(12, expect.anything());
    expect(store.activity.locked).toBe(true);
    // The old media no longer drives state.
    media.duration = 50;
    media.fire('durationchange');
    await flush();
    expect(store.state.duration).toBe(12);
    release();
    // Attaching the same target again is a no-op.
    attach(next.asTarget());
    expect(of('attach')).toHaveLength(2);
  });

  it('edge matrix: emptied clears the error, resets started and keeps controls leases', async () => {
    const { store, media, attach } = setup();
    attach();
    media.paused = false;
    media.fire('play');
    media.error = { code: 2, message: 'net' };
    media.fire('error');
    const release = store.requestControlsLock('popup');
    await flush();
    expect([store.state.started, store.state.error?.code]).toEqual([true, 2]);
    media.paused = true;
    media.error = null;
    media.fire('emptied');
    await flush();
    expect([store.state.started, store.state.error]).toEqual([false, null]);
    expect(store.activity.locked).toBe(true);
    release();
  });

  it('refresh re-reads every slice from the same target', async () => {
    const { store, media, attach, of } = setup();
    attach();
    media.poster = 'late.jpg'; // attribute changes have no media event
    store.refresh();
    await flush();
    expect(store.state.poster).toBe('late.jpg');
    expect(of('attach')).toHaveLength(2);
  });

  it('destroy stops publication and requests reject', async () => {
    const { store, attach } = setup();
    attach();
    store.destroy();
    expect(store.destroyed).toBe(true);
    await expect(store.request('play')).rejects.toMatchObject({ name: 'InvalidStateError' });
  });
});

describe('MediaStore capabilities (V-09)', () => {
  it('keeps defaults and reports unsupported for missing capabilities', async () => {
    const { store, attach } = setup();
    const media = partialMedia({
      paused: true,
      ended: false,
      play: () => undefined,
      pause: () => undefined,
    });
    attach(media);
    await flush();
    expect(store.capabilities.playback).toBe(true);
    expect(store.capabilities.seek).toBe(false);
    expect(store.state.volumeAvailability).toBe('unsupported');
    expect(store.state.mutedAvailability).toBe('unsupported');
    expect(store.state.pictureInPictureAvailability).toBe('unsupported');
    expect(store.state.remotePlaybackAvailability).toBe('unsupported');
    expect(store.state.duration).toBe(0);
    expect(store.state.textTracks).toEqual([]);
    expect(store.requestAvailability('seek')).toBe('unsupported');
    expect(store.requestAvailability('set-playback-rate')).toBe('unsupported');
  });

  it('treats sentinel lists and ranges as not capable', async () => {
    const { store, attach } = setup();
    const { EMPTY_TIME_RANGES, EMPTY_TEXT_TRACKS, EMPTY_REMOTE } = await import('./target.js');
    attach(
      partialMedia({
        buffered: EMPTY_TIME_RANGES,
        seekable: EMPTY_TIME_RANGES,
        textTracks: EMPTY_TEXT_TRACKS,
        remote: EMPTY_REMOTE,
      }),
    );
    expect(store.capabilities.buffer).toBe(false);
    expect(store.capabilities.textTracks).toBe(false);
    expect(store.capabilities.remotePlayback).toBe(false);
  });

  it('isolates a failing feature with a diagnostic', async () => {
    const { store, attach, diagnostics } = setup({
      features: [
        {
          name: 'broken',
          attach() {
            throw new Error('boom');
          },
        },
      ],
    });
    attach();
    expect(store.attached).toBe(true);
    expect(diagnostics[0]?.code).toBe('media-feature-error');
  });
});

describe('MediaStore playback and time (V-12, V-13)', () => {
  it('tracks paused, ended, sticky started and loop', async () => {
    const { store, media, attach } = setup();
    media.loop = true;
    attach();
    await flush();
    expect([store.state.paused, store.state.started, store.state.loop]).toEqual([
      true,
      false,
      true,
    ]);
    media.paused = false;
    media.fire('play');
    await flush();
    expect(store.state.started).toBe(true);
    media.paused = true;
    media.fire('pause');
    await flush();
    expect(store.state.started).toBe(true);
    media.ended = true;
    media.fire('ended');
    await flush();
    expect(store.state.ended).toBe(true);
    media.advance(0);
    media.ended = false;
    media.fire('emptied');
    await flush();
    expect(store.state.started).toBe(false);
  });

  it('reports waiting only while starved and currentTime has not advanced', async () => {
    const { store, media, attach } = setup();
    attach();
    media.readyState = 4;
    media.paused = false;
    media.fire('playing');
    await flush();
    expect(store.state.waiting).toBe(false);
    media.readyState = 2;
    media.fire('waiting');
    await flush();
    expect(store.state.waiting).toBe(true);
    // Safari MSE: readyState stays low while frames are presented.
    media.advance(1);
    media.fire('timeupdate');
    await flush();
    expect(store.state.waiting).toBe(false);
    media.readyState = 4;
    media.fire('canplay');
    await flush();
    expect([store.state.waiting, store.state.canPlay, store.state.readyState]).toEqual([
      false,
      true,
      4,
    ]);
  });

  it('ignores timeupdate/progress while seeking so the position does not snap back', async () => {
    const { store, media, attach } = setup();
    attach();
    media.loadMetadata(100, 4);
    await flush();
    const seek = store.request('seek', 50);
    await flush();
    expect([store.state.currentTime, store.state.seeking]).toEqual([50, true]);
    media.advance(10); // intermediate position
    media.fire('timeupdate');
    media.fire('progress');
    await flush();
    expect(store.state.currentTime).toBe(50);
    media.advance(50);
    media.completeSeek();
    await expect(seek).resolves.toBe(50);
    await flush();
    expect([store.state.currentTime, store.state.seeking]).toEqual([50, false]);
  });

  it('derives an infinite duration from the seekable end', async () => {
    const { store, media, attach } = setup();
    attach();
    media.seekable = new FakeTimeRanges([[10, 70]]);
    media.loadMetadata(Number.POSITIVE_INFINITY);
    await flush();
    expect(store.state.duration).toBe(70);
    expect(store.state.streamType).toBe('live');
    media.duration = Number.NaN;
    media.fire('durationchange');
    await flush();
    expect(store.state.duration).toBe(0);
  });
});

describe('MediaStore buffer, source, volume and rate (V-14..V-16)', () => {
  it('V-14: serializes buffered/seekable ranges and mirrors the source', async () => {
    const { store, media, attach } = setup();
    attach();
    media.currentSrc = 'a.mp4';
    media.buffered = new FakeTimeRanges([
      [0, 4],
      [8, 12],
    ]);
    media.seekable = new FakeTimeRanges([[0, 30]]);
    media.fire('loadstart');
    media.fire('progress');
    await flush();
    expect(store.state.buffered).toEqual([
      [0, 4],
      [8, 12],
    ]);
    expect(store.state.seekable).toEqual([[0, 30]]);
    expect(store.state.currentSrc).toBe('a.mp4');
  });

  it('V-15: derives four volume levels and probes volume availability', async () => {
    const { store, media, attach } = setup();
    attach();
    const level = async (volume: number, muted = false) => {
      media.volume = volume;
      media.muted = muted;
      media.fire('volumechange');
      await flush();
      return store.state.volumeLevel;
    };
    expect(await level(0)).toBe('off');
    expect(await level(0.3)).toBe('low');
    expect(await level(0.6)).toBe('medium');
    expect(await level(0.75)).toBe('high');
    expect(await level(1, true)).toBe('off');
    expect([store.state.volumeAvailability, store.state.mutedAvailability]).toEqual([
      'available',
      'available',
    ]);
  });

  it('V-15: a volume that does not persist is unsupported (iOS) while mute stays available', async () => {
    const document = new FakeDocument();
    document.volumeSticks = false;
    const { store, attach } = setup({ probeVolume: undefined }, { document });
    attach();
    await flush();
    expect(store.state.volumeAvailability).toBe('unsupported');
    expect(store.state.mutedAvailability).toBe('available');
  });

  it('V-16: follows ratechange and validates configured rates with a diagnostic', async () => {
    const { store, media, attach, diagnostics } = setup();
    attach();
    media.playbackRate = 1.5;
    media.fire('ratechange');
    await flush();
    expect(store.state.playbackRate).toBe(1.5);
    store.configure({ playbackRates: [2, 'x', 0.5, -1, 1, 2] });
    expect(store.state.playbackRates).toEqual([0.5, 1, 2]);
    expect(diagnostics.at(-1)?.code).toBe('media-invalid-playback-rates');
    store.configure({ playbackRates: ['bad'] });
    expect(store.state.playbackRates).toEqual(DEFAULT_PLAYBACK_RATES);
    store.configure({ playbackRates: [] });
    expect(store.state.playbackRates).toEqual([]);
  });
});

describe('MediaStore error and metadata (V-17, V-18)', () => {
  it('V-17: reads an error that happened before attach and emits tp-media-error once', async () => {
    const { store, media, attach, of } = setup();
    media.error = { code: 4, message: '' };
    attach();
    await flush();
    expect(store.state.error).toEqual({ code: 4, message: '', fatal: true });
    expect(of('error')).toHaveLength(1);
    media.error = null;
    media.fire('emptied');
    await flush();
    expect(store.state.error).toBeNull();
    media.error = { code: 1, message: 'aborted' };
    media.fire('error');
    await flush();
    expect(store.state.error).toEqual({ code: 1, message: 'aborted', fatal: false });
    await store.request('dismiss-error');
    await flush();
    expect(store.state.error).toBeNull();
    expect(media.error).not.toBeNull(); // the media keeps its own error
    expect(of('error')).toHaveLength(2);
  });

  it('V-18: resolves title and poster with authored empty strings stopping the fallback', async () => {
    const { store, media, attach } = setup();
    const target = Object.assign(media, {
      contentData: { title: 'From media', poster: 'media.jpg' },
    });
    target.poster = 'video.jpg';
    attach();
    await flush();
    expect([store.state.title, store.state.poster]).toEqual(['From media', 'media.jpg']);
    target.contentData = { title: 'From media', poster: null as unknown as string };
    media.fire('contentdatachange');
    await flush();
    expect(store.state.poster).toBe('video.jpg');
    store.configure({ contentTitle: '', poster: '' });
    expect([store.state.title, store.state.poster]).toEqual(['', '']);
    store.configure({ contentTitle: 'Authored', poster: null });
    expect([store.state.title, store.state.poster]).toEqual(['Authored', 'video.jpg']);
  });
});

describe('MediaStore presentation and remote state (V-21)', () => {
  it('reports fullscreen and picture-in-picture availability and state', async () => {
    const { store, media, attach, container, document } = setup();
    attach();
    await flush();
    expect(store.state.fullscreenAvailability).toBe('available');
    expect(store.state.pictureInPictureAvailability).toBe('unavailable');
    media.loadMetadata(10);
    await flush();
    expect(store.state.pictureInPictureAvailability).toBe('available');
    document.fullscreenElement = container;
    document.dispatchEvent(new Event('fullscreenchange'));
    await flush();
    expect(store.state.fullscreen).toBe(true);
  });

  it('excludes picture-in-picture in Safari home-screen apps', async () => {
    const document = new FakeDocument();
    document.defaultView.navigator.userAgent = 'Version/17.0 Safari/605.1.15';
    document.defaultView.standalone = true;
    const { store, attach } = setup({}, { document });
    attach();
    await flush();
    expect(store.state.pictureInPictureAvailability).toBe('unsupported');
  });

  it('V-21: follows W3C remote playback state and availability', async () => {
    const { store, media, attach } = setup();
    const remote = new FakeRemote();
    Object.assign(media, { remote });
    attach();
    await flush();
    expect(store.state.remotePlaybackAvailability).toBe('unavailable');
    remote.availability!(true);
    await flush();
    expect(store.state.remotePlaybackAvailability).toBe('available');
    remote.state = 'connecting';
    remote.dispatchEvent(new Event('connecting'));
    await flush();
    expect(store.state.remotePlaybackState).toBe('connecting');
    expect(store.state.controlsVisible).toBe(true);
    store.detach();
    await flush();
    expect(remote.cancelled).toBe(1);
  });

  it('V-21: a rejected watchAvailability means unsupported', async () => {
    const { store, media, attach } = setup();
    const remote = new FakeRemote();
    remote.watchResult = 'reject';
    Object.assign(media, { remote });
    attach();
    await flush();
    expect(store.state.remotePlaybackAvailability).toBe('unsupported');
  });

  it('V-21: uses WebKit AirPlay events when available', async () => {
    const document = new FakeDocument();
    Object.assign(document.defaultView, { WebKitPlaybackTargetAvailabilityEvent: class {} });
    const { store, media, attach } = setup({}, { document });
    Object.assign(media, {
      webkitShowPlaybackTargetPicker: () => undefined,
      webkitCurrentPlaybackTargetIsWireless: false,
    });
    attach();
    await flush();
    expect(store.state.remotePlaybackAvailability).toBe('unavailable');
    media.fire('webkitplaybacktargetavailabilitychanged', { availability: 'available' });
    Object.assign(media, { webkitCurrentPlaybackTargetIsWireless: true });
    media.fire('webkitcurrentplaybacktargetiswirelesschanged');
    await flush();
    expect(store.state.remotePlaybackAvailability).toBe('available');
    expect(store.state.remotePlaybackState).toBe('connected');
  });
});

describe('MediaStore tracks (V-10, V-23, V-24)', () => {
  it('V-23: lists text tracks with stable ids, captionsShowing, chapters and thumbnails', async () => {
    const { store, media, attach } = setup();
    const english = new FakeTextTrack('captions', 'English', 'en', 'en-cc');
    const french = new FakeTextTrack('subtitles', '', 'fr');
    const chapters = new FakeTextTrack('chapters', 'Chapters', 'en', '', [
      { startTime: 0, endTime: 10, text: 'Intro' },
      { startTime: 10, endTime: 9e9, text: 'Rest' },
    ]);
    const thumbnails = new FakeTextTrack('metadata', 'thumbnails', '', '', [
      { startTime: 0, endTime: 5, text: 'sprite.jpg#xywh=0,0,160,90' },
    ]);
    media.textTracks.set([english, french, chapters, thumbnails]);
    const element = Object.assign(new EventTarget(), {
      track: thumbnails,
      src: 'https://cdn.test/thumbs.vtt',
    });
    media.trackElements = [element];
    media.crossOrigin = '';
    media.duration = 60;
    attach();
    await flush();
    expect(store.state.textTracks.map((track) => track.id)).toEqual([
      'en-cc',
      'track:1:subtitles:fr:',
      'track:2:chapters:en:Chapters',
      'track:3:metadata::thumbnails',
    ]);
    expect(store.state.captionsShowing).toBe(false);
    expect(store.state.chapters).toEqual([
      { startTime: 0, endTime: 10, text: 'Intro' },
      { startTime: 10, endTime: 60, text: 'Rest' },
    ]);
    expect(store.state.thumbnails).toEqual({
      cues: [{ startTime: 0, endTime: 5, text: 'sprite.jpg#xywh=0,0,160,90' }],
      src: 'https://cdn.test/thumbs.vtt',
      crossOrigin: 'anonymous',
    });
    english.mode = 'showing';
    media.textTracks.fire('change');
    await flush();
    expect(store.state.captionsShowing).toBe(true);
  });

  it('V-23: re-reads cues when a <track> element loads', async () => {
    const { store, media, attach } = setup();
    const chapters = new FakeTextTrack('chapters', '', 'en', '', null);
    media.textTracks.set([chapters]);
    const element = Object.assign(new EventTarget(), { track: chapters, src: 'c.vtt' });
    media.trackElements = [element];
    attach();
    await flush();
    expect(store.state.chapters).toEqual([]);
    chapters.cues = [{ startTime: 0, endTime: 5, text: 'One' }];
    element.dispatchEvent(new Event('load'));
    await flush();
    expect(store.state.chapters).toHaveLength(1);
  });

  it('V-24: lists audio tracks and renditions with the active rendition and autoQuality', async () => {
    const { store, media, attach } = setup();
    const audio = new FakeList([
      new FakeAudioTrack('a1', 'English', 'en', true),
      new FakeAudioTrack('', 'Spanish', 'es'),
    ]);
    const renditions = new FakeList<VideoRenditionLike>([
      { id: 'r1', width: 640, height: 360 },
      { width: 1280, height: 720, bitrate: 3e6 },
    ]);
    Object.assign(media, { audioTracks: audio, videoRenditions: renditions });
    media.videoWidth = 1280;
    media.videoHeight = 720;
    attach();
    await flush();
    expect(store.state.audioTracks.map((track) => [track.id, track.enabled])).toEqual([
      ['a1', true],
      ['1', false],
    ]);
    expect(store.state.videoRenditions).toEqual([
      { id: 'r1', width: 640, height: 360, selected: false },
      { id: '1', width: 1280, height: 720, bitrate: 3e6, selected: false },
    ]);
    expect(store.state.activeVideoRendition?.id).toBe('1');
    expect(store.state.autoQuality).toBe(true);
    renditions.selectedIndex = 0;
    renditions.fire('change');
    await flush();
    expect(store.state.autoQuality).toBe(false);
    expect(store.state.videoRenditions[0]?.selected).toBe(true);
  });

  it('V-10: prefers a tracks adapter and rebinds when its lists change on loadstart', async () => {
    const { store, media, container } = setup();
    let renditions = new FakeList<VideoRenditionLike>([{ id: 'a' }, { id: 'b' }]);
    const audioTracks = new FakeList([new FakeAudioTrack('x', 'Main', 'en', true)]);
    const adapter = {
      get videoRenditions() {
        return renditions;
      },
      audioTracks,
    };
    store.attach({
      media: media.asTarget(),
      container: container as unknown as HTMLElement,
      adapter,
    });
    await flush();
    expect(store.state.videoRenditions.map((item) => item.id)).toEqual(['a', 'b']);
    expect(store.capabilities.videoRenditions).toBe(true);
    const old = renditions;
    renditions = new FakeList<VideoRenditionLike>([{ id: 'c' }, { id: 'd' }, { id: 'e' }]);
    media.fire('loadstart');
    await flush();
    expect(store.state.videoRenditions).toHaveLength(3);
    old.set([]);
    old.fire('removerendition'); // the old list is no longer observed
    await flush();
    expect(store.state.videoRenditions).toHaveLength(3);
    await store.request('select-video-rendition', 'd');
    expect(renditions.selectedIndex).toBe(1);
    await store.request('select-video-rendition', 'auto');
    expect(renditions.selectedIndex).toBe(-1);
    await store.request('select-audio-track', 'x');
    expect(audioTracks[0]!.enabled).toBe(true);
  });
});

describe('MediaStore live (V-25)', () => {
  it('detects stream type, honors the override and derives live edge and DVR', async () => {
    const { store, media, attach } = setup();
    attach();
    media.loadMetadata(120);
    await flush();
    expect([store.state.streamType, store.state.dvr]).toEqual(['on-demand', false]);
    expect(store.state.targetLiveWindow).toBeNaN();
    media.seekable = new FakeTimeRanges([[0, 100]]);
    media.loadMetadata(Number.POSITIVE_INFINITY);
    media.advance(95);
    media.fire('timeupdate');
    await flush();
    // Live without a reported window is a standard (sliding) live stream.
    expect([store.state.streamType, store.state.targetLiveWindow, store.state.dvr]).toEqual([
      'live',
      0,
      false,
    ]);
    expect(store.state.atLiveEdge).toBe(true);
    media.advance(80);
    media.fire('timeupdate');
    await flush();
    expect(store.state.atLiveEdge).toBe(false);
    store.configure({ streamType: 'on-demand' });
    expect([store.state.streamType, store.state.atLiveEdge]).toEqual(['on-demand', false]);
  });

  it('uses the media live capability: DVR window and liveEdgeStart tolerance', async () => {
    const { store, media, attach } = setup();
    Object.assign(media, {
      streamType: 'live',
      targetLiveWindow: Number.POSITIVE_INFINITY,
      liveEdgeStart: 100,
    });
    attach();
    media.advance(96);
    media.fire('timeupdate');
    await flush();
    expect([store.state.dvr, store.state.liveEdgeStart, store.state.atLiveEdge]).toEqual([
      true,
      100,
      true,
    ]);
    media.advance(94);
    media.fire('timeupdate');
    await flush();
    expect(store.state.atLiveEdge).toBe(false);
  });
});

describe('MediaStore controls visibility', () => {
  it('derives controlsVisible from leases, activity, paused and remote state', async () => {
    vi.useFakeTimers();
    const { store, media, attach } = setup();
    attach();
    media.paused = false;
    media.fire('play');
    await flush();
    vi.advanceTimersByTime(2000);
    await flush();
    expect([store.state.userActive, store.state.controlsVisible]).toEqual([false, false]);
    const release = store.requestControlsLock('popup');
    await flush();
    expect(store.state.controlsVisible).toBe(true);
    release();
    await flush();
    expect([store.state.userActive, store.state.controlsVisible]).toEqual([true, true]);
    vi.advanceTimersByTime(2000);
    media.paused = true;
    media.fire('pause');
    await flush();
    expect([store.state.userActive, store.state.controlsVisible]).toEqual([false, true]);
  });

  it('idle reason reaches the state-change event', async () => {
    vi.useFakeTimers();
    const { store, media, attach, changes } = setup();
    attach();
    media.paused = false;
    media.fire('play');
    await flush();
    vi.advanceTimersByTime(2000);
    await flush();
    expect(changes.at(-1)?.reasons.userActive).toBe('idle');
    store.idleDelay = 0;
    await flush();
    expect(store.state.userActive).toBe(true);
  });
});
