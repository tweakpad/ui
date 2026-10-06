import { afterEach, describe, expect, it } from 'vitest';
import { formatDuration, formatDurationParts, secondsToIsoDuration } from './duration-format.js';
import { LocaleService } from './services.js';

const digits = (locale: string, value: number, pad = false) =>
  new Intl.NumberFormat(locale, {
    useGrouping: false,
    ...(pad ? { minimumIntegerDigits: 2 } : {}),
  }).format(value);

describe('digital duration text (media player C-37, V-41; Video.js formatTime parity)', () => {
  it.each([
    [0, undefined, '0:00'],
    [5, undefined, '0:05'],
    [65, undefined, '1:05'],
    [90, undefined, '1:30'],
    [599, undefined, '9:59'],
    [600, undefined, '10:00'],
    [3599, undefined, '59:59'],
    [3600, undefined, '1:00:00'],
    [3661, undefined, '1:01:01'],
    [36000, undefined, '10:00:00'],
    [360000, undefined, '100:00:00'],
    [35, 3600, '0:00:35'],
    [35, 600, '00:35'],
    [35, 599, '0:35'],
    [35, 7200, '0:00:35'],
    [65.9, undefined, '1:05'],
    [35, -3600, '0:00:35'],
    [35, Number.NaN, '0:35'],
    [35, Number.POSITIVE_INFINITY, '0:35'],
  ])('formats %s with guide %s as %s', (seconds, guide, expected) => {
    expect(formatDuration(seconds, { guide, locale: 'en' })).toBe(expected);
  });

  it('renders invalid values as 0:00 without a sign', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])
      expect(formatDurationParts(value, { locale: 'en' })).toEqual({ sign: '', text: '0:00' });
    expect(formatDuration(undefined as unknown as number)).toBe('0:00');
    expect(formatDuration('12' as unknown as number)).toBe('0:00');
  });

  it('prefixes negative values and exposes the sign separately', () => {
    expect(formatDuration(-65, { locale: 'en' })).toBe('-1:05');
    expect(formatDuration(-3661, { locale: 'en' })).toBe('-1:01:01');
    expect(formatDuration(-35, { guide: 3600, locale: 'en' })).toBe('-0:00:35');
    expect(formatDurationParts(-65, { locale: 'en' })).toEqual({ sign: '-', text: '1:05' });
    expect(formatDurationParts(65, { locale: 'en' })).toEqual({ sign: '', text: '1:05' });
    expect(formatDuration(-0.4, { locale: 'en' })).toBe('-0:00');
  });

  it('uses locale digits for hours, minutes and seconds without grouping', () => {
    const ar = 'ar-EG';
    expect(formatDuration(3661, { locale: ar })).toBe(
      `${digits(ar, 1)}:${digits(ar, 1, true)}:${digits(ar, 1, true)}`,
    );
    expect(formatDuration(65, { locale: ar })).toBe(`${digits(ar, 1)}:${digits(ar, 5, true)}`);
    expect(formatDuration(65, { locale: ar })).toBe('١:٠٥');
    expect(formatDuration(35, { locale: ar, guide: 600 })).toBe('٠٠:٣٥');
    expect(formatDuration(-65, { locale: 'ar-u-nu-arab' })).toBe('-١:٠٥');
    expect(formatDuration(65, { locale: 'de' })).toBe('1:05');
    expect(formatDuration(45_000_000, { locale: 'de' })).toBe('12500:00:00');
  });
});

describe('spoken duration text (Video.js formatTimeAsPhrase parity)', () => {
  it('formats long English phrases from hour, minute and second units', () => {
    expect(formatDuration(65, { style: 'long', locale: 'en' })).toBe('1 minute, 5 seconds');
    expect(formatDuration(3661, { style: 'long', locale: 'en' })).toBe(
      '1 hour, 1 minute, 1 second',
    );
    expect(formatDuration(3600, { style: 'long', locale: 'en' })).toBe('1 hour');
    expect(formatDuration(3605, { style: 'long', locale: 'en' })).toBe('1 hour, 5 seconds');
    expect(formatDuration(1, { style: 'long', locale: 'en' })).toBe('1 second');
    expect(formatDuration(0, { style: 'long', locale: 'en' })).toBe('0 seconds');
    expect(formatDuration(0.9, { style: 'long', locale: 'en' })).toBe('0 seconds');
  });

  it('returns the absolute phrase for negative input; the sign remains available', () => {
    expect(formatDuration(-65, { style: 'long', locale: 'en' })).toBe('1 minute, 5 seconds');
    expect(formatDurationParts(-65, { style: 'long', locale: 'en' })).toEqual({
      sign: '-',
      text: '1 minute, 5 seconds',
    });
  });

  it('renders invalid values as empty text', () => {
    expect(formatDuration(Number.NaN, { style: 'long' })).toBe('');
    expect(formatDurationParts(Number.POSITIVE_INFINITY, { style: 'long' })).toEqual({
      sign: '',
      text: '',
    });
  });

  it('localizes German and Arabic phrases through the platform formatter', () => {
    const units = (locale: string, values: [number, Intl.NumberFormatOptions['unit']][]) =>
      values.map(([value, unit]) =>
        new Intl.NumberFormat(locale, { style: 'unit', unit, unitDisplay: 'long' }).format(value),
      );
    const native = (Intl as unknown as { DurationFormat?: unknown }).DurationFormat;
    const de = formatDuration(3723, { style: 'long', locale: 'de' });
    for (const part of units('de', [
      [1, 'hour'],
      [2, 'minute'],
      [3, 'second'],
    ]))
      if (!native) expect(de).toContain(part);
    expect(de).toMatch(/Stunde.*Minuten.*Sekunden/u);
    const ar = formatDuration(65, { style: 'long', locale: 'ar-EG' });
    expect(ar).toContain('٥');
    expect(ar).not.toMatch(/[0-9]/u);
  });
});

describe('spoken duration fallback without Intl.DurationFormat', () => {
  const descriptor = Object.getOwnPropertyDescriptor(Intl, 'DurationFormat');
  afterEach(() => {
    if (descriptor) Object.defineProperty(Intl, 'DurationFormat', descriptor);
    else delete (Intl as unknown as { DurationFormat?: unknown }).DurationFormat;
  });

  it('joins unit-formatted numbers with Intl.ListFormat', () => {
    Object.defineProperty(Intl, 'DurationFormat', { value: undefined, configurable: true });
    // Fresh locale tags avoid formatter instances cached by the native-path tests above.
    expect(formatDuration(65, { style: 'long', locale: 'en-CA' })).toBe('1 minute, 5 seconds');
    const parts = ['1 Stunde', '2 Minuten', '3 Sekunden'];
    expect(formatDuration(3723, { style: 'long', locale: 'de-AT' })).toBe(
      new Intl.ListFormat('de-AT', { type: 'unit', style: 'long' }).format(parts),
    );
    expect(formatDuration(0, { style: 'long', locale: 'en-IE' })).toBe('0 seconds');
  });
});

describe('ISO 8601 durations', () => {
  it.each([
    [0, 'PT0S'],
    [5, 'PT5S'],
    [90, 'PT1M30S'],
    [3600, 'PT1H'],
    [3661, 'PT1H1M1S'],
    [3660, 'PT1H1M'],
    [-90, 'PT1M30S'],
    [90.7, 'PT1M30S'],
    [Number.NaN, 'PT0S'],
    [Number.POSITIVE_INFINITY, 'PT0S'],
  ])('converts %s to %s', (seconds, expected) => {
    expect(secondsToIsoDuration(seconds)).toBe(expected);
  });
});

describe('LocaleService.duration', () => {
  it('formats seconds with the service locale and per-call overrides', () => {
    const service = new LocaleService('ar-EG');
    expect(service.duration(65)).toBe('١:٠٥');
    expect(service.duration(65, { locale: 'en' })).toBe('1:05');
    expect(service.duration(35, { guide: 3600, locale: 'en' })).toBe('0:00:35');
    expect(service.duration(-65, { locale: 'en' })).toBe('-1:05');
    expect(service.durationParts(-65, { locale: 'en' })).toEqual({ sign: '-', text: '1:05' });
    expect(new LocaleService('en').duration(65, { style: 'long' })).toBe('1 minute, 5 seconds');
    expect(new LocaleService().duration(Number.NaN)).toBe('0:00');
  });

  it('keeps formatting duration records with a unit style', () => {
    const service = new LocaleService('en');
    expect(service.duration({ minutes: 1, seconds: 5 })).toBe('1 minute, 5 seconds');
    expect(service.duration({ hours: 2 }, 'short')).toBe(
      new LocaleService('en').duration({ hours: 2 }, 'short'),
    );
    expect(service.duration({ hours: 2 }, 'short')).toMatch(/^2\s?hr/u);
  });
});
