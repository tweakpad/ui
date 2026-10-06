import { describe, expect, it } from 'vitest';
import { LocaleService } from '../services.js';
import {
  controlAvailability,
  audioTrackAvailability,
  captionsAvailability,
  liveEdgeAvailability,
  qualityAvailability,
  rateAvailability,
  timeRangeAvailability,
} from './availability.js';
import { MediaRegistrations, discoverMedia } from './registration.js';
import {
  requestMediaRegistration,
  TpMediaRegisterEvent,
  TpMediaRequestEvent,
  createMediaEventHooks,
} from './events.js';
import {
  createMediaMessages,
  DEFAULT_MEDIA_MESSAGES,
  formatMediaPercent,
  formatPlaybackRate,
  interpolateMediaMessage,
  mediaErrorMessageKey,
} from './messages.js';
import {
  DEFAULT_MEDIA_CONFIG,
  DEFAULT_MEDIA_SOURCE,
  deriveMediaState,
  type MediaState,
} from './state.js';
import type { MediaTarget } from './target.js';

describe('messages and formatting (V-41)', () => {
  it('has every key with the English defaults, including the MediaError strings verbatim', () => {
    expect(Object.keys(DEFAULT_MEDIA_MESSAGES)).toHaveLength(71);
    expect(DEFAULT_MEDIA_MESSAGES.showDuration).toBe('Show duration, {duration}.');
    expect(DEFAULT_MEDIA_MESSAGES.durationSuffix).toBe('{duration} duration');
    expect(DEFAULT_MEDIA_MESSAGES.toggleDurationDescription).toBe(
      'Toggle between duration and remaining time.',
    );
    expect(DEFAULT_MEDIA_MESSAGES.errorDecode).toBe(
      'This media could not be played. It may be corrupted, or your browser may not support its format.',
    );
    expect(DEFAULT_MEDIA_MESSAGES.dismiss).toBe('OK');
    expect(mediaErrorMessageKey(2)).toBe('errorNetwork');
    expect(mediaErrorMessageKey(5)).toBe('errorEncrypted');
    expect(mediaErrorMessageKey(100)).toBe('errorUnexpected');
  });

  it('resolves strings with placeholders or functions and inherits root → constituent', () => {
    const root = createMediaMessages({
      play: 'Lecture',
      seekForward: ({ seconds }) => `Avancer de ${seconds} s`,
    });
    expect(root.get('play')).toBe('Lecture');
    expect(root.get('seekForward', { seconds: 10 })).toBe('Avancer de 10 s');
    expect(root.get('timePosition', { current: '0:05', duration: '1:00' })).toBe('0:05 of 1:00');
    const constituent = root.extend({ play: 'Jouer', pause: undefined });
    expect(constituent.get('play')).toBe('Jouer');
    expect(constituent.get('seekForward', { seconds: 5 })).toBe('Avancer de 5 s');
    expect(constituent.get('pause')).toBe('Pause');
    expect(root.extend(undefined)).toBe(root);
    expect(interpolateMediaMessage('{a} {b}', { a: 1 })).toBe('1 {b}');
  });

  it('formats rates, percentages and durations through the locale only', () => {
    expect(formatPlaybackRate(1.25, 'en')).toBe('1.25×');
    expect(formatPlaybackRate(1.5, 'de')).toBe('1,5×');
    expect(formatMediaPercent(0.5, 'en')).toBe('50%');
    expect(formatMediaPercent(2, 'en')).toBe('100%');
    const locale = new LocaleService('en');
    expect(locale.duration(Number.NaN)).toBe('0:00');
    expect(locale.duration(65, { guide: 3600 })).toBe('0:01:05');
    expect(locale.duration(65, { style: 'long' })).toBe('1 minute, 5 seconds');
  });
});

const state = (patch: Partial<MediaState> = {}): MediaState => ({
  ...deriveMediaState(DEFAULT_MEDIA_SOURCE, DEFAULT_MEDIA_CONFIG),
  ...patch,
});

describe('availability (V-26)', () => {
  it('derives captions, quality, audio, rate, time range and live-edge availability', () => {
    const track = (kind: string) => ({ id: kind, kind, label: '', language: '', mode: 'disabled' });
    expect(captionsAvailability(state({ textTracks: [track('chapters')] }))).toBe('unavailable');
    expect(captionsAvailability(state({ textTracks: [track('subtitles')] }))).toBe('available');
    const rendition = { id: 'a', selected: false };
    expect(qualityAvailability(state({ videoRenditions: [rendition] }))).toBe('unavailable');
    expect(
      qualityAvailability(state({ videoRenditions: [rendition, { ...rendition, id: 'b' }] })),
    ).toBe('available');
    const audio = { id: 'a', label: '', language: '', enabled: true };
    expect(audioTrackAvailability(state({ audioTracks: [audio, audio] }))).toBe('available');
    expect(rateAvailability(state({ playbackRates: [] }))).toBe('unavailable');
    expect(rateAvailability(state({ streamType: 'live', dvr: false }))).toBe('unsupported');
    expect(timeRangeAvailability(state())).toBe('unavailable');
    expect(timeRangeAvailability(state({ seekable: [[0, 30]] }))).toBe('available');
    expect(
      timeRangeAvailability(state({ streamType: 'live', dvr: true, seekable: [[0, 30]] })),
    ).toBe('available');
    expect(liveEdgeAvailability(state())).toBe('unsupported');
    expect(liveEdgeAvailability(state({ streamType: 'live', seekable: [[0, 9]] }))).toBe(
      'available',
    );
  });

  it('applies the disabled/hidden policy', () => {
    expect(controlAvailability('available', { attached: false })).toEqual({
      availability: 'unavailable',
      disabled: true,
      hidden: false,
    });
    expect(controlAvailability('unavailable', { attached: true })).toEqual({
      availability: 'unavailable',
      disabled: true,
      hidden: false,
    });
    expect(controlAvailability('unsupported', { attached: true }).hidden).toBe(true);
    expect(controlAvailability('unavailable', { attached: true, list: true }).hidden).toBe(true);
    expect(controlAvailability('unavailable', { attached: true, remote: true })).toEqual({
      availability: 'unavailable',
      disabled: true,
      hidden: false,
    });
    expect(controlAvailability('available', { attached: true, disabled: true }).disabled).toBe(
      true,
    );
    expect(controlAvailability('available', { attached: true, atEdge: true }).disabled).toBe(true);
  });
});

describe('registration and events (V-04, V-33)', () => {
  const media = (name: string) =>
    Object.assign(new EventTarget(), { name }) as unknown as MediaTarget;

  it('V-04: the last registration wins and each release removes only its own registration', () => {
    const seen: Array<MediaTarget | null> = [];
    const registrations = new MediaRegistrations((current) => seen.push(current));
    const a = media('a');
    const b = media('b');
    const releaseA = registrations.register(a);
    const releaseB = registrations.register(b);
    expect(registrations.current).toBe(b);
    releaseA();
    releaseA();
    expect(registrations.current).toBe(b);
    const releaseA2 = registrations.register(a);
    releaseB();
    expect(registrations.current).toBe(a);
    releaseA2();
    expect(registrations.current).toBeNull();
    expect(seen).toEqual([a, b, a, null]);
  });

  it('discovers registered media first, then the first slotted video or audio', () => {
    const registrations = new MediaRegistrations();
    const video = { localName: 'video' } as Element;
    const div = { localName: 'div' } as Element;
    expect(discoverMedia(registrations, [div, video])).toBe(video);
    expect(discoverMedia(registrations, [div])).toBeNull();
    const custom = media('custom');
    registrations.register(custom);
    expect(discoverMedia(registrations, [video])).toBe(custom);
  });

  it('runs the tp-media-register protocol', () => {
    const host = new EventTarget();
    const element = media('custom');
    const release = () => undefined;
    // A provider ancestor acknowledges; here the element itself stands in for the bubbling path.
    (element as EventTarget).addEventListener(TpMediaRegisterEvent.eventName, (event) => {
      const registration = event as TpMediaRegisterEvent;
      registration.preventDefault();
      registration.detail.release = release;
    });
    expect(requestMediaRegistration(element)).toBe(release);
    expect(requestMediaRegistration(Object.assign(host, {}) as MediaTarget)).toBeUndefined();
  });

  it('dispatches bubbling, composed media events and reports cancellation', () => {
    const host = new EventTarget();
    const types: string[] = [];
    for (const type of ['tp-media-request', 'tp-media-request-failed', 'tp-media-attach'])
      host.addEventListener(type, (event) => {
        types.push(`${event.type}:${event.bubbles}:${event.composed}`);
        if (event.type === 'tp-media-request') event.preventDefault();
      });
    const hooks = createMediaEventHooks(host);
    const proceed = hooks.dispatchRequest({
      action: 'play',
      value: undefined,
      reason: 'pointer',
      sourceEvent: new Event('click'),
    });
    hooks.requestFailed({
      action: 'play',
      value: undefined,
      reason: 'pointer',
      error: new Error('x'),
    });
    hooks.attach({ media: media('m'), container: null });
    expect(proceed).toBe(false);
    expect(types).toEqual([
      'tp-media-request:true:true',
      'tp-media-request-failed:true:true',
      'tp-media-attach:true:true',
    ]);
    expect(
      new TpMediaRequestEvent({
        action: 'pause',
        value: undefined,
        reason: 'keyboard',
        sourceEvent: new Event('x'),
      }).cancelable,
    ).toBe(true);
  });
});
