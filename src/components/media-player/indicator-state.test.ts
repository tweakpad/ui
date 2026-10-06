import { describe, expect, it, vi } from 'vitest';
import { createMediaMessages } from '../../foundation/media/messages.js';
import type { MediaState } from '../../foundation/media/state.js';
import { DEFAULT_MEDIA_STATE } from './context.js';
import {
  indicatorActionIncluded,
  nextSeekIndicatorState,
  parseIndicatorActions,
  predictVolume,
  registerMediaIndicator,
  showMediaIndicator,
  statusIndicatorDetails,
  volumeIndicatorDetails,
  type MediaSeekIndicatorState,
} from './indicator-state.js';
import { errorDialogOpens, mediaErrorDialogText, mediaStalled } from './feedback-state.js';

const messages = createMediaMessages();
const state = (patch: Partial<MediaState> = {}): MediaState => ({
  ...DEFAULT_MEDIA_STATE,
  ...patch,
});

describe('status indicator', () => {
  it('derives play/pause from the pre-action snapshot', () => {
    expect(
      statusIndicatorDetails({ action: 'toggle-paused', value: undefined }, state(), messages),
    ).toEqual({ status: 'play', label: 'Playing', value: null });
    expect(
      statusIndicatorDetails(
        { action: 'toggle-paused', value: undefined },
        state({ paused: false }),
        messages,
      ),
    ).toEqual({ status: 'pause', label: 'Paused', value: null });
    // Toggling after the end plays again.
    expect(
      statusIndicatorDetails(
        { action: 'toggle-paused', value: undefined },
        state({ paused: false, ended: true }),
        messages,
      )?.status,
    ).toBe('play');
  });

  it('derives volume statuses with medium mapped to high', () => {
    const muted = statusIndicatorDetails(
      { action: 'toggle-muted', value: undefined },
      state({ volume: 0.6 }),
      messages,
      'en-US',
    );
    expect(muted).toEqual({ status: 'volume-off', label: 'Muted', value: '0%' });
    const medium = statusIndicatorDetails(
      { action: 'step-volume', value: 0.05 },
      state({ volume: 0.6 }),
      messages,
      'en-US',
    );
    expect(medium).toEqual({ status: 'volume-high', label: 'Volume 65%', value: '65%' });
    expect(
      statusIndicatorDetails(
        { action: 'step-volume', value: -0.05 },
        state({ volume: 0.3 }),
        messages,
      )?.status,
    ).toBe('volume-low');
  });

  it('derives captions only when captions are available', () => {
    expect(
      statusIndicatorDetails({ action: 'toggle-captions', value: undefined }, state(), messages),
    ).toBeNull();
    const tracks = [{ id: 'a', kind: 'subtitles', label: '', language: 'en', mode: 'disabled' }];
    expect(
      statusIndicatorDetails(
        { action: 'toggle-captions', value: undefined },
        state({ textTracks: tracks }),
        messages,
      ),
    ).toEqual({ status: 'captions-on', label: 'Captions on', value: null });
    expect(
      statusIndicatorDetails(
        { action: 'toggle-captions', value: undefined },
        state({ textTracks: tracks, captionsShowing: true }),
        messages,
      )?.status,
    ).toBe('captions-off');
  });

  it('derives fullscreen and picture-in-picture entry and exit', () => {
    expect(
      statusIndicatorDetails({ action: 'toggle-fullscreen', value: undefined }, state(), messages)
        ?.status,
    ).toBe('fullscreen');
    expect(
      statusIndicatorDetails(
        { action: 'toggle-fullscreen', value: undefined },
        state({ fullscreen: true }),
        messages,
      ),
    ).toEqual({ status: 'exit-fullscreen', label: 'Exit fullscreen', value: null });
    expect(
      statusIndicatorDetails(
        { action: 'toggle-picture-in-picture', value: undefined },
        state({ pictureInPicture: true }),
        messages,
      )?.status,
    ).toBe('exit-pip');
    expect(
      statusIndicatorDetails(
        { action: 'request-picture-in-picture', value: undefined },
        state(),
        messages,
      )?.status,
    ).toBe('pip');
  });

  it('has no status for seeks or rate steps', () => {
    expect(statusIndicatorDetails({ action: 'seek-by', value: 10 }, state(), messages)).toBeNull();
    expect(
      statusIndicatorDetails({ action: 'step-playback-rate', value: 1 }, state(), messages),
    ).toBeNull();
  });

  it('filters actions', () => {
    expect(parseIndicatorActions('')).toBeNull();
    const filter = parseIndicatorActions('toggle-captions, toggle-fullscreen');
    expect(filter).toEqual(['toggle-captions', 'toggle-fullscreen']);
    expect(indicatorActionIncluded('toggle-captions', filter)).toBe(true);
    expect(indicatorActionIncluded('toggle-paused', filter)).toBe(false);
    expect(indicatorActionIncluded('toggle-paused', null)).toBe(true);
  });
});

describe('volume indicator', () => {
  it('predicts like the request pipeline', () => {
    expect(
      predictVolume({ action: 'toggle-muted', value: undefined }, { volume: 0.5, muted: false }),
    ).toEqual({ previousVolume: 0.5, volume: 0.5, muted: true });
    // Unmuting at zero restores the unmute volume.
    expect(
      predictVolume({ action: 'toggle-muted', value: undefined }, { volume: 0, muted: false }),
    ).toEqual({ previousVolume: 0, volume: 0.25, muted: false });
    // A positive step unmutes.
    expect(
      predictVolume({ action: 'step-volume', value: 0.1 }, { volume: 0.5, muted: true }),
    ).toEqual({ previousVolume: 0.5, volume: 0.6, muted: false });
    expect(
      predictVolume({ action: 'set-volume', value: 2 }, { volume: 0.5, muted: false })?.volume,
    ).toBe(1);
    expect(
      predictVolume({ action: 'seek-by', value: 1 }, { volume: 0.5, muted: false }),
    ).toBeNull();
  });

  it('reports the four-level level, fill and limit boundaries', () => {
    const muted = volumeIndicatorDetails(
      { action: 'toggle-muted', value: undefined },
      { volume: 0.8, muted: false },
      'en-US',
    );
    expect(muted).toEqual({ level: 'off', fill: 0, value: '0%', boundary: null });
    expect(
      volumeIndicatorDetails({ action: 'step-volume', value: 0.05 }, { volume: 0.6, muted: false })
        ?.level,
    ).toBe('medium');
    expect(
      volumeIndicatorDetails({ action: 'step-volume', value: 0.05 }, { volume: 1, muted: false })
        ?.boundary,
    ).toBe('max');
    expect(
      volumeIndicatorDetails({ action: 'step-volume', value: -0.05 }, { volume: 0, muted: false })
        ?.boundary,
    ).toBe('min');
  });
});

describe('seek indicator', () => {
  const snapshot = { currentTime: 50, duration: 100, seekable: [] as const };

  it('accumulates same-direction steps while open, clamped to the media range', () => {
    let current: MediaSeekIndicatorState | null = null;
    current = nextSeekIndicatorState(
      current,
      false,
      { action: 'seek-by', value: 20 },
      snapshot,
      'en-US',
    );
    expect(current).toMatchObject({ direction: 'forward', count: 1, total: 20, origin: 50 });
    expect(current?.value).toBe('20s');
    current = nextSeekIndicatorState(
      current,
      true,
      { action: 'seek-by', value: 20 },
      { ...snapshot, currentTime: 70 },
    );
    expect(current).toMatchObject({ count: 2, total: 40, origin: 50 });
    current = nextSeekIndicatorState(
      current,
      true,
      { action: 'seek-by', value: 20 },
      { ...snapshot, currentTime: 90 },
    );
    // Only 50 s remained after the origin.
    expect(current).toMatchObject({ count: 3, total: 50 });
  });

  it('starts a new burst after closing or changing direction', () => {
    const forward = nextSeekIndicatorState(null, false, { action: 'seek-by', value: 10 }, snapshot);
    const closed = nextSeekIndicatorState(
      forward,
      false,
      { action: 'seek-by', value: 10 },
      snapshot,
    );
    expect(closed).toMatchObject({ count: 1, total: 10 });
    const backward = nextSeekIndicatorState(
      forward,
      true,
      { action: 'seek-by', value: -60 },
      snapshot,
    );
    expect(backward).toMatchObject({ direction: 'backward', count: 1, total: 50 });
  });

  it('shows the target time for seek-to-percent', () => {
    const target = nextSeekIndicatorState(
      null,
      false,
      { action: 'seek-to-percent', value: 20 },
      snapshot,
    );
    expect(target).toMatchObject({ direction: 'backward', value: '0:20' });
    expect(
      nextSeekIndicatorState(null, false, { action: 'seek-to-percent', value: 50 }, snapshot),
    ).toBeNull();
    expect(
      nextSeekIndicatorState(null, false, { action: 'toggle-paused', value: 1 }, snapshot),
    ).toBeNull();
  });
});

describe('indicator coordination', () => {
  it('keeps one indicator visible per player', () => {
    const player = {};
    const a = { close: vi.fn() };
    const b = { close: vi.fn() };
    const other = { close: vi.fn() };
    const releaseA = registerMediaIndicator(player, a);
    registerMediaIndicator(player, b);
    registerMediaIndicator({}, other);
    showMediaIndicator(player, b);
    expect(a.close).toHaveBeenCalledTimes(1);
    expect(b.close).not.toHaveBeenCalled();
    expect(other.close).not.toHaveBeenCalled();
    releaseA();
    showMediaIndicator(player, b);
    expect(a.close).toHaveBeenCalledTimes(1);
  });
});

describe('buffering and error feedback', () => {
  it('stalls while waiting and not paused', () => {
    expect(mediaStalled({ waiting: true, paused: false })).toBe(true);
    expect(mediaStalled({ waiting: true, paused: true })).toBe(false);
    expect(mediaStalled({ waiting: false, paused: false })).toBe(false);
  });

  it('opens on non-aborted errors', () => {
    expect(errorDialogOpens(null)).toBe(false);
    expect(errorDialogOpens({ code: 1, message: '', fatal: true })).toBe(false);
    expect(errorDialogOpens({ code: 2, message: '', fatal: true })).toBe(true);
  });

  it('maps codes to messages, else the error message, else unexpected', () => {
    expect(mediaErrorDialogText({ code: 2, message: 'x' }, messages)).toEqual({
      title: 'Something went wrong.',
      description: 'This media could not be loaded due to a network or server issue.',
    });
    expect(mediaErrorDialogText({ code: 4, message: '' }, messages).description).toMatch(
      /could not be loaded/,
    );
    expect(
      mediaErrorDialogText({ code: 99, message: ' Engine failure ' }, messages).description,
    ).toBe('Engine failure');
    expect(mediaErrorDialogText({ code: 99, message: '' }, messages).description).toBe(
      'An unexpected error occurred.',
    );
    expect(
      mediaErrorDialogText(
        { code: 3, message: '' },
        createMediaMessages({ errorTitle: 'Fehler', errorDecode: 'Dekodierfehler' }),
      ),
    ).toEqual({ title: 'Fehler', description: 'Dekodierfehler' });
  });
});
