import { describe, expect, it } from 'vitest';
import { createMediaMessages } from '../../foundation/media/messages.js';
import {
  initialMediaTimeShown,
  mediaTimeDuration,
  mediaTimeLabel,
  mediaTimeToggleText,
  mediaTimeView,
  nextMediaTimeShown,
  normalizeMediaTimeType,
} from './time-state.js';

const messages = createMediaMessages();

describe('media time view', () => {
  it('formats current time with the duration as the digital guide', () => {
    const view = mediaTimeView({ type: 'current', currentTime: 65, duration: 125, locale: 'en' });
    expect(view.text).toBe('1:05');
    expect(view.datetime).toBe('PT1M5S');
    expect(view.phrase).toMatch(/1 minute.*5 seconds/);
    expect(view.negative).toBe(false);
    expect(view.unavailable).toBe(false);
    // A guide of at least ten minutes pads minutes; an hour adds hours.
    expect(mediaTimeView({ type: 'current', currentTime: 65, duration: 700 }).text).toBe('01:05');
    expect(mediaTimeView({ type: 'current', currentTime: 65, duration: 3700 }).text).toBe(
      '0:01:05',
    );
  });

  it('shows the duration and the remaining time with a separate sign', () => {
    expect(mediaTimeView({ type: 'duration', currentTime: 10, duration: 125 }).text).toBe('2:05');
    const remaining = mediaTimeView({ type: 'remaining', currentTime: 25, duration: 125 });
    expect(remaining.seconds).toBe(-100);
    expect(remaining.negative).toBe(true);
    expect(remaining.text).toBe('1:40');
    expect(remaining.datetime).toBe('PT1M40S');
    const end = mediaTimeView({ type: 'remaining', currentTime: 125, duration: 125 });
    expect(end.negative).toBe(false);
    expect(end.text).toBe('0:00');
  });

  it('is unknown before a time range and renders 0:00 for invalid input', () => {
    const view = mediaTimeView({ type: 'current', currentTime: Number.NaN, duration: Number.NaN });
    expect(view.unavailable).toBe(true);
    expect(view.text).toBe('0:00');
    expect(view.datetime).toBe('PT0S');
  });

  it('uses value as the position override and as the pointer time', () => {
    expect(mediaTimeView({ type: 'current', currentTime: 5, duration: 100, value: 42 }).text).toBe(
      '0:42',
    );
    expect(
      mediaTimeView({ type: 'remaining', currentTime: 5, duration: 100, value: 40 }).seconds,
    ).toBe(-60);
    const pointer = mediaTimeView({ type: 'pointer', currentTime: 5, duration: 100, value: 30 });
    expect(pointer.text).toBe('0:30');
    expect(pointer.unavailable).toBe(false);
    expect(mediaTimeView({ type: 'pointer', currentTime: 5, duration: 100 }).unavailable).toBe(
      true,
    );
  });

  it('derives the duration from the seekable end for infinite media', () => {
    expect(mediaTimeDuration({ duration: Number.POSITIVE_INFINITY, seekable: [[0, 90]] })).toBe(90);
    expect(mediaTimeDuration({ duration: 0, seekable: [] })).toBe(0);
  });

  it('normalizes unknown types to current', () => {
    expect(normalizeMediaTimeType('pointer')).toBe('pointer');
    expect(normalizeMediaTimeType('elapsed')).toBe('current');
  });
});

describe('media time names', () => {
  it('names plain displays by type and reports unknown time', () => {
    const known = { unavailable: false };
    expect(mediaTimeLabel('current', known, messages)).toBe('Current time');
    expect(mediaTimeLabel('duration', known, messages)).toBe('Duration');
    expect(mediaTimeLabel('remaining', known, messages)).toBe('Remaining');
    expect(mediaTimeLabel('current', { unavailable: true }, messages)).toBe(
      'Media not loaded, unknown time.',
    );
  });

  it('toggles current ↔ remaining, and duration ↔ remaining for duration and remaining (Video.js)', () => {
    expect(initialMediaTimeShown('current')).toBe('current');
    expect(initialMediaTimeShown('remaining')).toBe('remaining');
    expect(initialMediaTimeShown('duration')).toBe('duration');
    expect(nextMediaTimeShown('current', 'current')).toBe('remaining');
    expect(nextMediaTimeShown('current', 'remaining')).toBe('current');
    expect(nextMediaTimeShown('remaining', 'remaining')).toBe('duration');
    expect(nextMediaTimeShown('remaining', 'duration')).toBe('remaining');
    expect(nextMediaTimeShown('duration', 'duration')).toBe('remaining');
    expect(nextMediaTimeShown('duration', 'remaining')).toBe('duration');
  });

  it('names the toggle by what it shows next and describes it', () => {
    const phrase = '1 minute, 5 seconds';
    const elapsed = mediaTimeToggleText(
      'current',
      'current',
      { unavailable: false, phrase },
      messages,
    );
    expect(elapsed.label).toBe('Show remaining time, 1 minute, 5 seconds elapsed.');
    expect(elapsed.description).toBe('Toggle between elapsed and remaining time.');
    const remaining = mediaTimeToggleText(
      'remaining',
      'remaining',
      { unavailable: false, phrase },
      messages,
    );
    expect(remaining.label).toBe('Show duration, 1 minute, 5 seconds remaining.');
    expect(remaining.description).toBe('Toggle between duration and remaining time.');
    const fromCurrent = mediaTimeToggleText(
      'current',
      'remaining',
      { unavailable: false, phrase },
      messages,
    );
    expect(fromCurrent.label).toBe('Show elapsed time, 1 minute, 5 seconds remaining.');
    const duration = mediaTimeToggleText(
      'duration',
      'duration',
      { unavailable: false, phrase },
      messages,
    );
    expect(duration.label).toBe('Show remaining time, 1 minute, 5 seconds duration.');
    expect(duration.description).toBe('Toggle between duration and remaining time.');
    const localized = mediaTimeToggleText(
      'duration',
      'remaining',
      { unavailable: false, phrase },
      createMediaMessages({
        showDuration: 'Dauer anzeigen, {duration}.',
        remainingSuffix: '{duration} verbleibend',
        toggleDurationDescription: 'Zwischen Dauer und Restzeit wechseln.',
      }),
    );
    expect(localized).toEqual({
      label: 'Dauer anzeigen, 1 minute, 5 seconds verbleibend.',
      description: 'Zwischen Dauer und Restzeit wechseln.',
    });
    const unknown = mediaTimeToggleText(
      'current',
      'current',
      { unavailable: true, phrase },
      messages,
    );
    expect(unknown).toEqual({ label: 'Media not loaded, unknown time.', description: null });
  });
});
