import { describe, expect, it } from 'vitest';
import type { MediaAvailability } from '../../foundation/media/availability.js';
import { createMediaMessages } from '../../foundation/media/messages.js';
import type { MediaRequestAction } from '../../foundation/media/requests.js';
import { volumeLevel, type MediaState } from '../../foundation/media/state.js';
import {
  captionsButtonView,
  fullscreenButtonView,
  liveButtonView,
  muteButtonLabelKey,
  muteButtonView,
  pipButtonView,
  playButtonState,
  playButtonView,
  playbackRateButtonView,
  remotePlaybackButtonView,
  resolveSeekSeconds,
  seekButtonView,
  seekDirection,
  volumeIconSlot,
  type MediaButtonContext,
} from './button-state.js';
import { DEFAULT_MEDIA_STATE } from './context.js';

const state = (patch: Partial<MediaState> = {}): MediaState => ({
  ...DEFAULT_MEDIA_STATE,
  ...patch,
});

const context = (
  capability: (action: MediaRequestAction) => MediaAvailability = () => 'available',
  locale = 'en-US',
): MediaButtonContext => ({ messages: createMediaMessages(), locale, capability });

describe('play button', () => {
  it('labels replay when ended, play when paused, otherwise pause', () => {
    expect(playButtonState({ paused: true, ended: true })).toBe('replay');
    expect(playButtonState({ paused: true, ended: false })).toBe('play');
    expect(playButtonState({ paused: false, ended: false })).toBe('pause');
    const playing = playButtonView(state({ paused: false, started: true }), context());
    expect(playing.label).toBe('Pause');
    expect(playing.icon).toEqual({ slot: 'pause', name: 'pause' });
    expect(playing.markers).toEqual({
      'data-paused': false,
      'data-ended': false,
      'data-started': true,
    });
    expect(playing.request).toEqual({ action: 'toggle-paused' });
    expect(playing.shortcut).toEqual({ action: 'toggle-paused' });
    expect(playButtonView(state({ ended: true }), context()).label).toBe('Replay');
  });

  it('uses the playback capability and messages overrides', () => {
    const view = playButtonView(state(), {
      ...context(() => 'unavailable'),
      messages: createMediaMessages({ play: 'Lecture' }),
    });
    expect(view.feature).toBe('unavailable');
    expect(view.label).toBe('Lecture');
  });
});

describe('mute button', () => {
  it('labels unmute when muted or at zero volume', () => {
    expect(muteButtonLabelKey({ muted: true, volume: 1 })).toBe('unmute');
    expect(muteButtonLabelKey({ muted: false, volume: 0 })).toBe('unmute');
    expect(muteButtonLabelKey({ muted: false, volume: 0.4 })).toBe('mute');
  });

  it('publishes the four-level volume marker and maps medium to the high artwork', () => {
    for (const [volume, muted, level] of [
      [0.6, true, 'off'],
      [0.3, false, 'low'],
      [0.6, false, 'medium'],
      [0.9, false, 'high'],
    ] as const) {
      const view = muteButtonView(
        state({
          volume,
          muted,
          volumeLevel: volumeLevel(volume, muted),
          mutedAvailability: 'available',
        }),
        context(),
      );
      expect(view.markers['data-volume-level']).toBe(level);
      expect(view.markers['data-muted']).toBe(muted);
    }
    expect(volumeIconSlot('medium')).toEqual({
      slot: 'volume-medium',
      fallbackSlots: ['volume-high'],
      name: 'volumeHigh',
    });
    expect(volumeIconSlot('off').name).toBe('volumeOff');
    expect(volumeIconSlot('low').name).toBe('volumeLow');
  });

  it('follows mutedAvailability', () => {
    expect(muteButtonView(state({ mutedAvailability: 'unsupported' }), context()).feature).toBe(
      'unsupported',
    );
  });
});

describe('seek button', () => {
  it('uses the player step without seconds and seeks backward for negative seconds', () => {
    expect(resolveSeekSeconds(null, 10)).toBe(10);
    expect(resolveSeekSeconds(Number.NaN, 5)).toBe(5);
    expect(resolveSeekSeconds(-30, 10)).toBe(-30);
    expect(seekDirection(-1)).toBe('backward');
    expect(seekDirection(5)).toBe('forward');
  });

  it('labels with the absolute seconds and publishes direction and seeking', () => {
    const view = seekButtonView(state({ duration: 60, seeking: true }), context(), -15);
    expect(view.label).toBe('Seek backward 15 seconds');
    expect(view.icon?.slot).toBe('seek-backward');
    expect(view.markers).toEqual({ 'data-direction': 'backward', 'data-seeking': true });
    expect(view.request).toEqual({ action: 'seek-by', value: -15 });
    expect(view.shortcut).toEqual({ action: 'seek-by', value: -15 });
    expect(view.feature).toBe('available');
  });

  it('is disabled (never hidden) without a time range, hidden only when seeking is unsupported', () => {
    expect(seekButtonView(state({ duration: 0 }), context(), 10).feature).toBe('unavailable');
    expect(
      seekButtonView(state({ duration: 60, streamType: 'live', dvr: false }), context(), 10)
        .feature,
    ).toBe('unavailable');
    expect(
      seekButtonView(
        state({ duration: 60 }),
        context(() => 'unsupported'),
        10,
      ).feature,
    ).toBe('unsupported');
  });
});

describe('presentation buttons', () => {
  it('fullscreen swaps enter/exit labels and icons', () => {
    const off = fullscreenButtonView(state({ fullscreenAvailability: 'available' }), context());
    expect(off.label).toBe('Enter fullscreen');
    expect(off.icon?.slot).toBe('enter-fullscreen');
    const on = fullscreenButtonView(state({ fullscreen: true }), context());
    expect(on.label).toBe('Exit fullscreen');
    expect(on.icon?.name).toBe('fullscreenExit');
    expect(on.markers).toEqual({ 'data-fullscreen': true });
    expect(on.request).toEqual({ action: 'toggle-fullscreen' });
  });

  it('picture-in-picture stays available while active', () => {
    const active = pipButtonView(
      state({ pictureInPicture: true, pictureInPictureAvailability: 'unsupported' }),
      context(),
    );
    expect(active.feature).toBe('available');
    expect(active.label).toBe('Exit picture-in-picture');
    expect(active.markers).toEqual({ 'data-pip': true });
    expect(pipButtonView(state(), context()).label).toBe('Enter picture-in-picture');
  });

  it('remote playback labels by connection state and hides only when unsupported', () => {
    const idle = remotePlaybackButtonView(
      state({ remotePlaybackAvailability: 'unavailable' }),
      context(),
    );
    expect(idle.label).toBe('Start casting');
    expect(idle.feature).toBe('unavailable');
    expect(idle.policy).toEqual({ remote: true });
    expect(idle.icon?.slot).toBe('disconnected');
    const connecting = remotePlaybackButtonView(
      state({ remotePlaybackState: 'connecting' }),
      context(),
    );
    expect(connecting.label).toBe('Connecting');
    expect(connecting.feature).toBe('available');
    expect(connecting.markers).toEqual({ 'data-remote-state': 'connecting' });
    expect(
      remotePlaybackButtonView(state({ remotePlaybackState: 'connected' }), context()).label,
    ).toBe('Stop casting');
  });
});

describe('captions button', () => {
  const track = { id: 't1', kind: 'captions', label: 'English', language: 'en', mode: 'disabled' };

  it('is a hidden empty list without caption tracks', () => {
    const view = captionsButtonView(state(), context());
    expect(view.feature).toBe('unavailable');
    expect(view.policy).toEqual({ list: true });
  });

  it('swaps enable/disable labels with data-active', () => {
    const off = captionsButtonView(state({ textTracks: [track] }), context());
    expect(off.feature).toBe('available');
    expect(off.label).toBe('Enable captions');
    expect(off.markers).toEqual({ 'data-active': false });
    expect(off.icon?.slot).toBe('captions-off');
    const on = captionsButtonView(
      state({ textTracks: [{ ...track, mode: 'showing' }], captionsShowing: true }),
      context(),
    );
    expect(on.label).toBe('Disable captions');
    expect(on.icon?.slot).toBe('captions-on');
  });

  it('is unsupported when the media has no text tracks API', () => {
    expect(
      captionsButtonView(
        state({ textTracks: [track] }),
        context(() => 'unsupported'),
      ).feature,
    ).toBe('unsupported');
  });
});

describe('playback-rate button', () => {
  it('shows the rate with the multiplication sign and cycles with wrapping', () => {
    const view = playbackRateButtonView(
      state({ playbackRate: 1.5, playbackRates: [0.5, 1, 1.5] }),
      context(),
    );
    expect(view.text).toBe('1.5×');
    expect(view.label).toBe('Playback rate 1.5×');
    expect(view.markers).toEqual({ 'data-rate': '1.5' });
    expect(view.request).toEqual({ action: 'set-playback-rate', value: 0.5 });
    expect(view.shortcut).toBeUndefined();
    expect(
      playbackRateButtonView(state({ playbackRate: 1, playbackRates: [0.5, 1, 1.5] }), context())
        .request,
    ).toEqual({ action: 'set-playback-rate', value: 1.5 });
  });

  it('hides without rates or for live without DVR', () => {
    const empty = playbackRateButtonView(state({ playbackRates: [] }), context());
    expect(empty.feature).toBe('unavailable');
    expect(empty.policy).toEqual({ list: true });
    expect(empty.request).toBeNull();
    expect(
      playbackRateButtonView(state({ streamType: 'live', dvr: false }), context()).feature,
    ).toBe('unsupported');
  });

  it('formats digits with the locale', () => {
    expect(
      playbackRateButtonView(state({ playbackRate: 1.5 }), context(undefined, 'de-DE')).text,
    ).toBe('1,5×');
  });
});

describe('live button', () => {
  it('is unsupported (hidden) unless the stream is live', () => {
    const view = liveButtonView(state(), context());
    expect(view.feature).toBe('unsupported');
    expect(view.markers).toEqual({ 'data-live': false, 'data-live-edge': false });
  });

  it('labels playing live and disables at the edge, otherwise seeks to the edge', () => {
    const live = state({ streamType: 'live', seekable: [[0, 120]] });
    const behind = liveButtonView(live, context());
    expect(behind.label).toBe('Seek to live edge');
    expect(behind.text).toBe('Live');
    expect(behind.feature).toBe('available');
    expect(behind.policy).toEqual({ atEdge: false });
    expect(behind.request).toEqual({ action: 'seek-to-live-edge' });
    const edge = liveButtonView({ ...live, atLiveEdge: true }, context());
    expect(edge.label).toBe('Playing live');
    expect(edge.policy).toEqual({ atEdge: true });
    expect(edge.markers).toEqual({ 'data-live': true, 'data-live-edge': true });
  });
});
