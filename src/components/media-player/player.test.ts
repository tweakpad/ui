import { describe, expect, it } from 'vitest';
import type { MediaRequestDetail } from '../../foundation/media/events.js';
import { DEFAULT_PLAYBACK_RATES } from '../../foundation/media/state.js';
import { mediaPlayerBrand } from './context.js';
import { TpMediaPlayer, playbackRatesConverter } from './player.js';

customElements.define('tp-media-player-unit', class extends TpMediaPlayer {});
const createPlayer = () => new (customElements.get('tp-media-player-unit')!)() as TpMediaPlayer;

/** Records proposals and failures; cancels every proposal when `cancel` is set. */
function record(player: TpMediaPlayer, cancel = false) {
  const requests: MediaRequestDetail[] = [];
  const failures: unknown[] = [];
  player.addEventListener('tp-media-request', (event) => {
    requests.push((event as CustomEvent<MediaRequestDetail>).detail);
    if (cancel) event.preventDefault();
  });
  player.addEventListener('tp-media-request-failed', (event) =>
    failures.push((event as CustomEvent).detail),
  );
  return { requests, failures };
}

describe('tp-media-player properties (Library mp-l props; V-47)', () => {
  it('has the contract defaults', () => {
    const player = createPlayer();
    expect(player[mediaPlayerBrand]).toBe(true);
    expect({
      contentTitle: player.contentTitle,
      poster: player.poster,
      streamType: player.streamType,
      playbackRates: player.playbackRates,
      seekStep: player.seekStep,
      volumeStep: player.volumeStep,
      idleDelay: player.idleDelay,
      hideOverControls: player.hideOverControls,
      hotkeys: player.hotkeys,
      hotkeyScope: player.hotkeyScope,
      gestures: player.gestures,
      orientationLock: player.orientationLock,
      announcements: player.announcements,
      messages: player.messages,
      locale: player.locale,
      mediaAdapter: player.mediaAdapter,
      disabled: player.disabled,
    }).toEqual({
      contentTitle: null,
      poster: null,
      streamType: 'auto',
      playbackRates: DEFAULT_PLAYBACK_RATES,
      seekStep: 10,
      volumeStep: 0.05,
      idleDelay: 2000,
      hideOverControls: false,
      hotkeys: 'default',
      hotkeyScope: 'player',
      gestures: 'none',
      orientationLock: 'none',
      announcements: 'polite',
      messages: {},
      locale: '',
      mediaAdapter: null,
      disabled: false,
    });
    expect(player.state.paused).toBe(true);
    expect([player.media, player.container, player.attached]).toEqual([null, null, false]);
  });

  it('parses playback-rates as whitespace or comma separated numbers', () => {
    expect(playbackRatesConverter.fromAttribute('0.5 1  1.5,2')).toEqual([0.5, 1, 1.5, 2]);
    expect(playbackRatesConverter.fromAttribute(null)).toBe(DEFAULT_PLAYBACK_RATES);
    expect(playbackRatesConverter.fromAttribute('1 x')).toEqual([1, Number.NaN]);
    expect(playbackRatesConverter.toAttribute([1, 2])).toBe('1 2');
  });

  it('resolves messages and the formatting locale from the root', () => {
    const player = createPlayer();
    const english = player.mediaMessages;
    expect(english.get('player')).toBe('Media player');
    expect(player.mediaMessages).toBe(english);
    player.messages = { player: 'Lecteur' };
    expect(player.mediaMessages.get('player')).toBe('Lecteur');
    player.locale = 'fr-FR';
    expect(player.resolvedLocale).toBe('fr-FR');
  });
});

describe('tp-media-player requests (mp-f-pre-attach, mp-f-request; V-08/V-48)', () => {
  it('rejects before attach with InvalidStateError after the proposal and failure events', async () => {
    const player = createPlayer();
    const { requests, failures } = record(player);
    await expect(player.play()).rejects.toMatchObject({ name: 'InvalidStateError' });
    expect(requests.map((detail) => [detail.action, detail.reason])).toEqual([
      ['play', 'programmatic'],
    ]);
    expect(failures).toEqual([
      expect.objectContaining({
        action: 'play',
        error: expect.objectContaining({ name: 'InvalidStateError' }),
      }),
    ]);
  });

  it('maps every convenience method to its action and value', async () => {
    const player = createPlayer();
    const { requests } = record(player, true);
    const calls: Array<[() => Promise<unknown>, string, unknown]> = [
      [() => player.play(), 'play', undefined],
      [() => player.pause(), 'pause', undefined],
      [() => player.togglePaused(), 'toggle-paused', undefined],
      [() => player.seek(12), 'seek', 12],
      [() => player.seekBy(-5), 'seek-by', -5],
      [() => player.seekToLiveEdge(), 'seek-to-live-edge', undefined],
      [() => player.setVolume(0.4), 'set-volume', 0.4],
      [() => player.setMuted(true), 'set-muted', true],
      [() => player.setPlaybackRate(1.5), 'set-playback-rate', 1.5],
      [() => player.requestFullscreen(), 'request-fullscreen', undefined],
      [() => player.exitFullscreen(), 'exit-fullscreen', undefined],
      [() => player.requestPictureInPicture(), 'request-picture-in-picture', undefined],
      [() => player.exitPictureInPicture(), 'exit-picture-in-picture', undefined],
      [() => player.promptRemotePlayback(), 'prompt-remote-playback', undefined],
      [() => player.selectTextTrack('en'), 'select-text-track', 'en'],
      [() => player.toggleCaptions(true), 'toggle-captions', true],
      [() => player.selectAudioTrack('a2'), 'select-audio-track', 'a2'],
      [() => player.selectVideoRendition('auto'), 'select-video-rendition', 'auto'],
      [() => player.toggleControls(false), 'toggle-controls', false],
      [() => player.dismissError(), 'dismiss-error', undefined],
    ];
    for (const [call] of calls) await call();
    expect(requests.map((detail) => [detail.action, detail.value])).toEqual(
      calls.map(([, action, value]) => [action, value]),
    );
  });

  it('cancelled proposals resolve false without executing', async () => {
    const player = createPlayer();
    const { failures } = record(player, true);
    await expect(player.request('seek', 3)).resolves.toBe(false);
    expect(failures).toEqual([]);
  });

  it('a disabled player still reports requests before attach as InvalidStateError', async () => {
    const player = createPlayer();
    player.disabled = true;
    record(player);
    await expect(player.togglePaused()).rejects.toMatchObject({ name: 'InvalidStateError' });
  });
});

describe('tp-media-player constituent services (Library mp-l-api; V-48)', () => {
  it('subscribe returns an idempotent unsubscribe and honors an abort signal', () => {
    // Delivery itself needs attached media (browser scenario V-48); here: registration shape.
    const player = createPlayer();
    const unsubscribe = player.subscribe(
      (state) => state.paused,
      () => undefined,
    );
    unsubscribe();
    unsubscribe();
    const aborted = new AbortController();
    aborted.abort();
    expect(
      player.subscribe(
        (state) => state.paused,
        () => undefined,
        { signal: aborted.signal },
      )(),
    ).toBeUndefined();
    const later = new AbortController();
    player.subscribe(
      (state) => state.muted,
      () => undefined,
      { signal: later.signal },
    );
    later.abort();
  });

  it('interaction locks are reference counted and idempotent', () => {
    const player = createPlayer();
    const first = player.lockInteractions();
    const second = player.lockInteractions();
    first();
    first();
    second();
    // No container: no key owner; the lock count must not underflow (a later lock still works).
    const third = player.lockInteractions();
    third();
    expect(player.shortcut('toggle-paused')).toBeUndefined();
  });

  it('controls locks come from the store activity owner', () => {
    const player = createPlayer();
    const release = player.requestControlsLock();
    expect(typeof release).toBe('function');
    release();
    release();
  });

  it('registered constituents are tracked until unregistered', () => {
    const player = createPlayer();
    const host = {
      addController: () => undefined,
      removeController: () => undefined,
      requestUpdate: () => undefined,
      updateComplete: Promise.resolve(true),
    };
    const unregister = player.registerConstituent(host);
    expect(typeof unregister).toBe('function');
    unregister();
  });
});
