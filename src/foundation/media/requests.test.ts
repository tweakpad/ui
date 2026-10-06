import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Diagnostic } from '../services.js';
import type { MediaRequestDetail, MediaRequestFailedDetail, MediaStoreHooks } from './events.js';
import {
  FakeContainer,
  FakeDocument,
  FakeMedia,
  FakeRemote,
  FakeTextTrack,
  FakeTimeRanges,
  flush,
} from './media-fakes.test.js';
import {
  MEDIA_REQUEST_ACTIONS,
  nextPlaybackRateCycle,
  normalizePlaybackRates,
  steppedPlaybackRate,
  UNMUTE_VOLUME,
} from './requests.js';
import { MediaStore } from './store.js';
import type { MediaStateChange } from './state.js';

afterEach(() => vi.useRealTimers());

function setup(
  options: { cancel?: (detail: MediaRequestDetail) => boolean; locale?: string } = {},
) {
  const document = new FakeDocument();
  const container = new FakeContainer(document);
  const media = new FakeMedia({ document });
  const requests: MediaRequestDetail[] = [];
  const failures: MediaRequestFailedDetail[] = [];
  const diagnostics: Diagnostic[] = [];
  const order: string[] = [];
  const hooks: Partial<MediaStoreHooks> = {
    dispatchRequest: (detail) => {
      order.push('proposal');
      requests.push(detail);
      return !(options.cancel?.(detail) ?? false);
    },
    requestFailed: (detail) => {
      order.push('failed');
      failures.push(detail);
    },
    diagnostic: (diagnostic) => void diagnostics.push(diagnostic),
  };
  const store = new MediaStore({
    hooks,
    probeVolume: () => 'available',
    locale: () => options.locale,
  });
  const changes: MediaStateChange[] = [];
  store.onStateChange((change) => changes.push(change));
  const attach = () =>
    store.attach({ media: media.asTarget(), container: container as unknown as HTMLElement });
  return {
    store,
    media,
    container,
    document,
    requests,
    failures,
    diagnostics,
    order,
    attach,
    changes,
  };
}

describe('request pipeline (V-08, V-27, V-31)', () => {
  it('V-08: rejects before attach with InvalidStateError and emits request-failed', async () => {
    const { store, failures } = setup();
    await expect(store.request('play')).rejects.toMatchObject({ name: 'InvalidStateError' });
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ action: 'play', reason: 'programmatic' });
    expect(() => store.configure({ contentTitle: 'x' })).not.toThrow();
  });

  it('V-27: dispatches the proposal with action, value, reason, source event and trigger', async () => {
    const { store, attach, requests } = setup();
    attach();
    const trigger = { nodeType: 1 } as unknown as Element;
    const sourceEvent = new Event('click');
    await store.request('set-volume', 0.5, { reason: 'pointer', sourceEvent, trigger });
    expect(requests[0]).toEqual({
      action: 'set-volume',
      value: 0.5,
      reason: 'pointer',
      sourceEvent,
      trigger,
    });
    await store.request('pause');
    expect(requests[1]!.reason).toBe('programmatic');
    expect(requests[1]!.sourceEvent.type).toBe('tp-programmatic-source');
  });

  it('V-27: a cancelled proposal stops before execution and resolves false', async () => {
    const { store, media, attach, failures } = setup({
      cancel: (detail) => detail.action === 'play',
    });
    attach();
    await expect(store.request('play')).resolves.toBe(false);
    expect(media.plays).toBe(0);
    expect(failures).toHaveLength(0);
  });

  it('V-27: disabled player and unavailable capabilities reject NotSupportedError after the proposal', async () => {
    const { store, media, attach, failures, order } = setup();
    attach();
    store.disabled = true;
    await expect(store.request('play')).rejects.toMatchObject({ name: 'NotSupportedError' });
    expect(order).toEqual(['proposal', 'failed']);
    expect(media.plays).toBe(0);
    store.disabled = false;
    // No captions tracks: toggle-captions is unavailable.
    await expect(store.request('toggle-captions')).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
    expect(failures).toHaveLength(2);
  });

  it('V-27: key-binding and gesture paths swallow the rejection after the event', async () => {
    const { store, media, attach, failures } = setup();
    attach();
    media.playResult = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    await expect(
      store.request('play', undefined, { reason: 'hotkey', swallow: true }),
    ).resolves.toBe(undefined);
    expect(failures[0]).toMatchObject({ action: 'play', reason: 'hotkey' });
    expect((failures[0]!.error as DOMException).name).toBe('NotAllowedError');
  });

  it('rejects invalid values with TypeError', async () => {
    const { store, attach } = setup();
    attach();
    await expect(store.request('seek', Number.NaN)).rejects.toBeInstanceOf(TypeError);
    await expect(store.request('set-playback-rate', 0)).rejects.toBeInstanceOf(TypeError);
  });

  it('V-31: requests are not rejected merely because an error is present', async () => {
    const { store, media, attach } = setup();
    media.error = { code: 3, message: 'decode' };
    attach();
    await flush();
    expect(store.state.error).not.toBeNull();
    await expect(store.request('set-muted', true)).resolves.toBe(true);
    await expect(store.request('play')).resolves.toBeUndefined();
  });

  it('every documented action is known to the availability gate', () => {
    const { store } = setup();
    for (const action of MEDIA_REQUEST_ACTIONS)
      expect(store.requestAvailability(action)).toBe('unavailable');
  });
});

describe('playback requests', () => {
  it('play returns the media promise and publishes optimistically when synchronously playing', async () => {
    const { store, attach, changes } = setup();
    attach();
    await flush();
    const result = store.request('play', undefined, { reason: 'pointer' });
    expect(store.state.paused).toBe(false); // committed before the queued play event
    await result;
    await flush();
    expect(changes.at(-1)!.reasons.paused).toBe('pointer');
    expect(store.state.started).toBe(true);
  });

  it('autoplay blocked: play rejects NotAllowedError, emits request-failed and state stays paused', async () => {
    const { store, media, attach, failures } = setup();
    attach();
    media.playSync = false;
    media.playResult = () => Promise.reject(new DOMException('blocked', 'NotAllowedError'));
    await expect(store.request('play')).rejects.toMatchObject({ name: 'NotAllowedError' });
    expect(failures).toHaveLength(1);
    expect(store.state.paused).toBe(true);
  });

  it('pause publishes immediately; toggle plays when paused or ended', async () => {
    const { store, media, attach } = setup();
    attach();
    await store.request('play');
    await store.request('pause');
    expect(store.state.paused).toBe(true);
    media.ended = true;
    await store.request('toggle-paused');
    expect(media.plays).toBe(2);
    await store.request('toggle-paused');
    expect(media.pauses).toBe(2);
  });

  it('play on non-DVR live seeks to the live edge first', async () => {
    const { store, media, attach } = setup();
    attach();
    media.seekable = new FakeTimeRanges([[0, 300]]);
    media.loadMetadata(Number.POSITIVE_INFINITY, 4);
    media.fire('progress');
    await flush();
    expect([store.state.streamType, store.state.dvr]).toEqual(['live', false]);
    await store.request('play');
    expect(media.seeks).toEqual([300]);
    Object.assign(media, { targetLiveWindow: 60, liveEdgeStart: Number.NaN });
  });
});

describe('seek requests (V-28)', () => {
  it('supersedes a pending seek, awaits metadata, clamps and resolves the actual position', async () => {
    const { store, media, attach } = setup();
    attach();
    const first = store.request('seek', 30);
    const second = store.request('seek', 500);
    expect(media.seeks).toEqual([]); // waiting for metadata
    media.seekable = new FakeTimeRanges([[0, 100]]);
    media.loadMetadata(100);
    await expect(first).resolves.toBe(0); // superseded before metadata: current position
    await flush();
    expect(media.seeks).toEqual([100]); // clamped to the duration
    expect([store.state.currentTime, store.state.seeking]).toEqual([100, true]);
    media.advance(99.9); // actual position differs from the target
    media.completeSeek();
    await expect(second).resolves.toBe(99.9);
  });

  it('clamps to the seekable start and aborts on emptied', async () => {
    const { store, media, attach } = setup();
    attach();
    media.seekable = new FakeTimeRanges([[20, 80]]);
    media.loadMetadata(Number.POSITIVE_INFINITY, 4);
    const pending = store.request('seek', 5);
    await flush();
    expect(media.seeks).toEqual([20]);
    media.fire('emptied');
    await expect(pending).resolves.toBe(20);
  });

  it('seek-by builds on the optimistic position; seek-to-percent and seek-to-live-edge', async () => {
    const { store, media, attach } = setup();
    attach();
    media.loadMetadata(200, 4);
    await flush();
    void store.request('seek-by', 10);
    void store.request('seek-by', 10);
    await flush();
    expect(media.seeks).toEqual([10, 20]);
    media.completeSeek();
    void store.request('seek-by', -50);
    await flush();
    expect(media.seeks.at(-1)).toBe(0);
    media.completeSeek();
    void store.request('seek-to-percent', 25);
    await flush();
    expect(media.seeks.at(-1)).toBe(50);
    media.completeSeek();
    await expect(store.request('seek-to-live-edge')).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
  });

  it('attributes the completed seek to the request reason (not media)', async () => {
    const { store, media, attach, changes } = setup();
    attach();
    media.loadMetadata(60, 4);
    await flush();
    const seek = store.request('seek', 30, { reason: 'keyboard' });
    await flush();
    media.completeSeek();
    await seek;
    await flush();
    const last = changes.at(-1)!;
    expect(last.changed).toContain('seeking');
    expect(last.reasons.seeking).toBe('keyboard');
  });
});

describe('volume and rate requests (V-29)', () => {
  it('clamps volume, unmutes on a positive volume and restores 0.25 when unmuting at 0', async () => {
    const { store, media, attach } = setup();
    attach();
    await expect(store.request('set-volume', 1.7)).resolves.toBe(1);
    media.muted = true;
    await expect(store.request('set-volume', 0.4)).resolves.toBe(0.4);
    expect(media.muted).toBe(false);
    await expect(store.request('set-volume', -1)).resolves.toBe(0);
    await expect(store.request('set-muted', true)).resolves.toBe(true);
    await expect(store.request('set-muted', false)).resolves.toBe(false);
    expect(media.volume).toBe(UNMUTE_VOLUME);
    expect(store.state.volume).toBe(UNMUTE_VOLUME);
  });

  it('toggle-muted uses muted or zero volume; step-volume steps from the media value', async () => {
    const { store, media, attach } = setup();
    attach();
    media.volume = 0;
    await expect(store.request('toggle-muted')).resolves.toBe(false);
    expect(media.volume).toBe(UNMUTE_VOLUME);
    await expect(store.request('toggle-muted')).resolves.toBe(true);
    media.muted = false;
    media.volume = 0.5;
    await store.request('step-volume', 0.05);
    await store.request('step-volume', 0.05);
    expect(store.state.volume).toBeCloseTo(0.6);
  });

  it('volume requests are gated by the probe (iOS)', async () => {
    const store = new MediaStore({ probeVolume: () => 'unsupported' });
    const media = new FakeMedia();
    store.attach({ media: media.asTarget(), container: null });
    await expect(store.request('set-volume', 0.5)).rejects.toMatchObject({
      name: 'NotSupportedError',
    });
    await expect(store.request('toggle-muted')).resolves.toBe(true);
  });

  it('set-playback-rate writes the rate and state follows ratechange', async () => {
    const { store, media, attach } = setup();
    attach();
    await store.request('set-playback-rate', 1.5);
    expect(media.playbackRate).toBe(1.5);
    await flush();
    expect(store.state.playbackRate).toBe(1);
    media.fire('ratechange');
    await flush();
    expect(store.state.playbackRate).toBe(1.5);
  });

  it('step-playback-rate is clamped to the list; the cycle helper wraps', async () => {
    const { store, media, attach } = setup();
    store.configure({ playbackRates: [0.5, 1, 2] });
    attach();
    media.playbackRate = 2;
    await expect(store.request('step-playback-rate', 1)).resolves.toBe(2);
    await expect(store.request('step-playback-rate', -1)).resolves.toBe(1);
    expect(steppedPlaybackRate([0.5, 1, 2], 1.3, 1)).toBe(2);
    expect(steppedPlaybackRate([0.5, 1, 2], 1.3, -1)).toBe(1);
    expect(steppedPlaybackRate([0.5, 1, 2], 0.5, -1)).toBe(0.5);
    expect(nextPlaybackRateCycle([0.5, 1, 2], 2)).toBe(0.5);
    expect(nextPlaybackRateCycle([0.5, 1, 2], 1)).toBe(2);
    expect(nextPlaybackRateCycle([0.5, 1, 2], 1.3)).toBe(2);
    expect(normalizePlaybackRates(undefined, [1])).toEqual({ rates: [1], invalid: [] });
  });
});

describe('presentation requests', () => {
  it('fullscreen rejection surfaces as a request failure without changing state', async () => {
    const { store, attach, container, failures } = setup();
    attach();
    container.rejectFullscreen = new TypeError('Permissions check failed');
    await expect(store.request('request-fullscreen')).rejects.toBeInstanceOf(TypeError);
    await flush();
    expect(store.state.fullscreen).toBe(false);
    expect(failures).toHaveLength(1);
  });

  it('toggles fullscreen through the container and attributes the change', async () => {
    const { store, attach, container, changes } = setup();
    attach();
    await store.request('toggle-fullscreen', undefined, { reason: 'hotkey' });
    await flush();
    expect(container.fullscreenRequests).toBe(1);
    expect(store.state.fullscreen).toBe(true);
    expect(changes.at(-1)!.reasons.fullscreen).toBe('hotkey');
    await store.request('toggle-fullscreen');
    await flush();
    expect(store.state.fullscreen).toBe(false);
  });

  it('picture-in-picture before metadata rejects InvalidStateError', async () => {
    const { store, media, attach } = setup();
    attach();
    await expect(store.request('request-picture-in-picture')).rejects.toMatchObject({
      name: 'InvalidStateError',
    });
    media.loadMetadata(10);
    await store.request('toggle-picture-in-picture');
    await flush();
    expect(store.state.pictureInPicture).toBe(true);
    await store.request('toggle-picture-in-picture');
    await flush();
    expect(store.state.pictureInPicture).toBe(false);
  });

  it('prompt-remote-playback exits fullscreen first; when connected it prompts to disconnect', async () => {
    const { store, media, attach, document } = setup();
    const remote = new FakeRemote();
    Object.assign(media, { remote });
    attach();
    remote.availability!(true);
    await store.request('request-fullscreen');
    await store.request('prompt-remote-playback');
    expect(document.exits).toEqual(['fullscreen']);
    expect(remote.prompts).toBe(1);
    remote.state = 'connected';
    remote.dispatchEvent(new Event('connect'));
    remote.availability!(false);
    await flush();
    await store.request('prompt-remote-playback');
    expect(remote.prompts).toBe(2);
  });
});

describe('track requests (V-30)', () => {
  function tracks() {
    return [
      new FakeTextTrack('subtitles', 'Deutsch', 'de', 'de'),
      new FakeTextTrack('captions', 'English CC', 'en-US', 'en'),
      new FakeTextTrack('subtitles', 'Español', 'es-MX', 'es'),
      new FakeTextTrack('chapters', 'Chapters', 'en', 'ch'),
    ];
  }

  it('select-text-track shows exactly one captions/subtitles track; null disables all', async () => {
    const { store, media, attach, diagnostics } = setup();
    const list = tracks();
    list[0]!.mode = 'showing';
    list[3]!.mode = 'hidden';
    media.textTracks.set(list);
    attach();
    await store.request('select-text-track', 'es');
    expect(list.map((track) => track.mode)).toEqual(['disabled', 'disabled', 'showing', 'hidden']);
    await store.request('select-text-track', null);
    expect(list.map((track) => track.mode)).toEqual(['disabled', 'disabled', 'disabled', 'hidden']);
    await store.request('select-text-track', 'missing');
    expect(diagnostics.at(-1)?.code).toBe('media-unknown-text-track');
  });

  it('toggle-captions: showing → last shown → locale match → first in menu order', async () => {
    const first = setup({ locale: 'fr' });
    const list = tracks();
    first.media.textTracks.set(list);
    first.attach();
    await flush();
    // No showing, no memory, no French track: the first in menu order (captions first).
    await expect(first.store.request('toggle-captions')).resolves.toBe(true);
    expect(list[1]!.mode).toBe('showing');
    await expect(first.store.request('toggle-captions')).resolves.toBe(false);
    await first.store.request('select-text-track', 'es');
    await first.store.request('toggle-captions', false);
    // Last shown wins over the first track.
    await first.store.request('toggle-captions');
    expect(list[2]!.mode).toBe('showing');
    // force=true while showing keeps the showing track.
    await expect(first.store.request('toggle-captions', true)).resolves.toBe(true);
    expect(list[2]!.mode).toBe('showing');

    const second = setup({ locale: 'es-ES' });
    const others = tracks();
    second.media.textTracks.set(others);
    second.attach();
    await second.store.request('toggle-captions');
    expect(others[2]!.mode).toBe('showing'); // es-ES → es → regional es-MX
  });

  it('caption changes are announced with the request reason, not media', async () => {
    const { store, media, attach, changes } = setup();
    const list = tracks();
    media.textTracks.set(list);
    attach();
    await flush();
    await store.request('toggle-captions', undefined, { reason: 'hotkey' });
    media.textTracks.fire('change');
    await flush();
    expect(changes.at(-1)!.reasons.captionsShowing).toBe('hotkey');
  });

  it('select-audio-track enables only the chosen track; unknown ids are diagnostics', async () => {
    const { store, media, attach, diagnostics } = setup();
    const { FakeAudioTrack, FakeList } = await import('./media-fakes.test.js');
    const audio = new FakeList([
      new FakeAudioTrack('a', 'One', 'en', true),
      new FakeAudioTrack('b', 'Two', 'fr'),
    ]);
    Object.assign(media, { audioTracks: audio });
    attach();
    await store.request('select-audio-track', 'b');
    expect(audio.items().map((track) => track.enabled)).toEqual([false, true]);
    await store.request('select-audio-track', 'zzz');
    expect(diagnostics.at(-1)?.code).toBe('media-unknown-audio-track');
  });
});

describe('controls requests', () => {
  it('toggle-controls drives the activity owner with the request reason', async () => {
    const { store, media, attach, changes } = setup();
    attach();
    media.paused = false;
    media.fire('play');
    await flush();
    await expect(store.request('toggle-controls', false, { reason: 'gesture' })).resolves.toBe(
      false,
    );
    await flush();
    expect(store.state.controlsVisible).toBe(false);
    expect(changes.at(-1)!.reasons.userActive).toBe('gesture');
    await expect(store.request('toggle-controls')).resolves.toBe(true);
  });
});
