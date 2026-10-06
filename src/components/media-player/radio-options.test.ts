import { describe, expect, it } from 'vitest';
import { createMediaMessages } from '../../foundation/media/messages.js';
import type {
  MediaAudioTrackState,
  MediaState,
  MediaTextTrackState,
  MediaVideoRenditionState,
} from '../../foundation/media/state.js';
import { DEFAULT_MEDIA_STATE } from './context.js';
import {
  CAPTIONS_OFF_VALUE,
  QUALITY_AUTO_VALUE,
  audioTrackLabel,
  audioTrackOptions,
  captionsOptions,
  formatBitrate,
  playbackRateOptions,
  qualityOptions,
  renditionBadge,
  renditionLabel,
  renditionSize,
  renditionTier,
  selectedAudioTrack,
  selectedCaptions,
  selectedOptionLabel,
  selectedPlaybackRate,
  selectedQuality,
} from './radio-options.js';
import {
  audioTrackModel,
  captionsModel,
  playbackRateModel,
  qualityModel,
  type MediaRadioModelContext,
} from './radio-groups.js';
import { DEFAULT_MEDIA_SETTINGS_GROUPS, mediaSettingsEntries } from './settings-menu.js';

const messages = createMediaMessages();

const text = (id: string, patch: Partial<MediaTextTrackState> = {}): MediaTextTrackState => ({
  id,
  kind: 'captions',
  label: '',
  language: '',
  mode: 'disabled',
  ...patch,
});

const rendition = (
  id: string,
  patch: Partial<MediaVideoRenditionState> = {},
): MediaVideoRenditionState => ({ id, selected: false, ...patch });

describe('playback-rate options (Library mp-l-menus; V-60)', () => {
  it('labels rates with the multiplication sign and 1 as Normal', () => {
    expect(playbackRateOptions([0.5, 1, 1.5, 2], messages, 'en')).toEqual([
      { value: 0.5, label: '0.5×' },
      { value: 1, label: 'Normal' },
      { value: 1.5, label: '1.5×' },
      { value: 2, label: '2×' },
    ]);
  });

  it('formats rate digits for the locale and honors message overrides', () => {
    const custom = createMediaMessages({ normalSpeed: 'Normale' });
    expect(playbackRateOptions([1, 1.5], custom, 'fr').map((option) => option.label)).toEqual([
      'Normale',
      '1,5×',
    ]);
  });

  it('selects the rate by identity, or nothing for an off-list rate', () => {
    expect(selectedPlaybackRate([0.5, 1, 2], 2)).toBe(2);
    expect(selectedPlaybackRate([0.5, 1, 2], 1.25)).toBeUndefined();
  });
});

describe('captions options (mp-f-captions label fallback)', () => {
  const tracks = [
    text('sub-es', { kind: 'subtitles', language: 'es' }),
    text('cap-en', { label: 'English CC', language: 'en' }),
    text('sub-x', { kind: 'subtitles' }),
    text('meta', { kind: 'metadata', label: 'thumbnails' }),
  ];

  it('adds Off and orders captions before subtitles with label fallbacks', () => {
    expect(captionsOptions(tracks, messages, 'en')).toEqual([
      { value: CAPTIONS_OFF_VALUE, label: 'Off' },
      { value: 'cap-en', label: 'English CC', track: 'cap-en' },
      { value: 'sub-es', label: 'Spanish', track: 'sub-es' },
      { value: 'sub-x', label: 'Subtitles', track: 'sub-x' },
    ]);
  });

  it('is empty without caption tracks', () => {
    expect(captionsOptions([text('meta', { kind: 'metadata' })], messages)).toEqual([]);
  });

  it('selects the showing track, else off', () => {
    expect(selectedCaptions(tracks)).toBe(CAPTIONS_OFF_VALUE);
    expect(selectedCaptions([...tracks.slice(0, 1), text('x', { mode: 'showing' })])).toBe('x');
  });
});

describe('audio-track options', () => {
  const audio = (id: string, patch: Partial<MediaAudioTrackState> = {}): MediaAudioTrackState => ({
    id,
    label: '',
    language: '',
    enabled: false,
    ...patch,
  });

  it('falls back from label to language name to kind to Audio', () => {
    expect(audioTrackLabel(audio('a', { label: 'Director' }), messages)).toBe('Director');
    expect(audioTrackLabel(audio('a', { language: 'de' }), messages, 'en')).toBe('German');
    expect(audioTrackLabel(audio('a', { kind: 'commentary' }), messages)).toBe('commentary');
    expect(audioTrackLabel(audio('a'), messages)).toBe('Audio');
  });

  it('needs more than one track and selects the enabled one', () => {
    expect(audioTrackOptions([audio('a')], messages)).toEqual([]);
    const tracks = [audio('a', { label: 'Main', enabled: true }), audio('b', { label: 'Alt' })];
    expect(audioTrackOptions(tracks, messages).map((option) => option.track)).toEqual(['a', 'b']);
    expect(selectedAudioTrack(tracks)).toBe('a');
  });
});

describe('quality options (size snapping, tiers, badges)', () => {
  it('uses the short side and snaps wide encodes to standard classes', () => {
    expect(renditionSize({ width: 1280, height: 720 })).toBe(720);
    expect(renditionSize({ width: 720, height: 1280 })).toBe(720);
    expect(renditionSize({ width: 1440, height: 1080 })).toBe(1080);
    expect(renditionSize({ width: 1920, height: 800 })).toBe(1080);
    expect(renditionSize({ width: 1000, height: 400 })).toBe(400);
    expect(renditionSize({ width: 3840 })).toBe(2160);
    expect(renditionSize({ height: 480 })).toBe(480);
    expect(renditionSize({})).toBeUndefined();
  });

  it('labels by size, else bitrate, else Quality', () => {
    expect(renditionLabel({ width: 1920, height: 1080 }, messages)).toBe('1080p');
    expect(renditionLabel({ bitrate: 2_500_000 }, messages, 'en')).toBe(
      formatBitrate(2_500_000, 'en'),
    );
    expect(renditionLabel({}, messages)).toBe('Quality');
    expect(formatBitrate(2_500_000, 'en')).toMatch(/^2\.5\sMb\/s$/u);
    expect(formatBitrate(800_000, 'en')).toMatch(/^800\skb\/s$/u);
  });

  it('assigns 8K, 4K and HD tiers', () => {
    expect(renditionTier({ width: 7680, height: 4320 })).toBe('8K');
    expect(renditionTier({ width: 3840, height: 2160 })).toBe('4K');
    expect(renditionTier({ width: 1920, height: 1080 })).toBe('HD');
    expect(renditionTier({ width: 1280, height: 720 })).toBeUndefined();
  });

  it('badges only renditions that share a size class', () => {
    const a = rendition('a', { width: 1920, height: 1080, bitrate: 6_000_000 });
    const b = rendition('b', { width: 1920, height: 1080, bitrate: 3_000_000 });
    const c = rendition('c', { width: 1280, height: 720, bitrate: 2_000_000 });
    expect(renditionBadge(a, [a, b, c], 'en')).toBe(formatBitrate(6_000_000, 'en'));
    expect(renditionBadge(c, [a, b, c], 'en')).toBeUndefined();
  });

  it('offers Auto (with the active rendition while adaptive) and the renditions', () => {
    const renditions = [
      rendition('hd', { width: 1920, height: 1080 }),
      rendition('sd', { width: 1280, height: 720 }),
    ];
    const options = qualityOptions(renditions, renditions[1]!, true, messages, 'en');
    expect(options).toEqual([
      { value: QUALITY_AUTO_VALUE, label: 'Auto (720p)' },
      { value: 'hd', label: '1080p', rendition: 'hd', tier: 'HD' },
      { value: 'sd', label: '720p', rendition: 'sd' },
    ]);
    expect(qualityOptions(renditions, null, true, messages)[0]!.label).toBe('Auto');
    expect(qualityOptions(renditions.slice(0, 1), null, true, messages)).toEqual([]);
    expect(selectedQuality(renditions, true)).toBe(QUALITY_AUTO_VALUE);
    expect(selectedQuality([renditions[0]!, { ...renditions[1]!, selected: true }], false)).toBe(
      'sd',
    );
    expect(selectedOptionLabel(options, 'sd')).toBe('720p');
  });
});

describe('radio models and settings entries (availability and omission)', () => {
  const context: MediaRadioModelContext & { attached: boolean } = {
    messages,
    locale: 'en',
    capability: () => 'available',
    attached: true,
  };
  const state = (patch: Partial<MediaState>): MediaState => ({ ...DEFAULT_MEDIA_STATE, ...patch });

  it('hides rates for live streams without DVR', () => {
    expect(playbackRateModel(state({}), context).feature).toBe('available');
    expect(playbackRateModel(state({ streamType: 'live', dvr: false }), context).feature).toBe(
      'unsupported',
    );
    expect(playbackRateModel(state({ playbackRate: 1.25 }), context).value).toBeNull();
  });

  it('marks unsupported capabilities and empty lists', () => {
    const unsupported = { ...context, capability: () => 'unsupported' as const };
    expect(captionsModel(state({ textTracks: [text('a')] }), unsupported).feature).toBe(
      'unsupported',
    );
    expect(captionsModel(state({}), context).feature).toBe('unavailable');
    expect(audioTrackModel(state({}), context).options).toEqual([]);
    expect(qualityModel(state({}), context).feature).toBe('unavailable');
  });

  it('lists only usable groups, in order, with the selected value as hint', () => {
    const entries = mediaSettingsEntries(
      DEFAULT_MEDIA_SETTINGS_GROUPS,
      state({ textTracks: [text('en', { label: 'English', mode: 'showing' })], playbackRate: 1.5 }),
      context,
    );
    expect(entries).toEqual([
      { group: 'speed', label: 'Speed', hint: '1.5×' },
      { group: 'captions', label: 'Captions', hint: 'English' },
    ]);
    expect(
      mediaSettingsEntries(DEFAULT_MEDIA_SETTINGS_GROUPS, state({}), {
        ...context,
        attached: false,
      }),
    ).toEqual([]);
    expect(
      mediaSettingsEntries(['speed'], state({ streamType: 'live', dvr: false }), context),
    ).toEqual([]);
  });
});
