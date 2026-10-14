import { afterEach, describe, expect, it } from 'vitest';
import { capitalize, sentence, toUpper } from './case.js';
import { identifierCase, identifierWords } from './identifier.js';
import { parseNumericInput } from './number.js';
import { defineTextPreset, subscribeTextPresets, transformText } from './presets.js';
import {
  countCut,
  fitCut,
  joinCut,
  singleLine,
  truncationUnits,
  type TruncationMeasure,
} from './truncate.js';

const releases: (() => void)[] = [];
afterEach(() => {
  for (const release of releases.splice(0)) release();
});

describe('case presets', () => {
  it('maps case for the locale', () => {
    expect(toUpper('istanbul', 'tr')).toBe('İSTANBUL');
    expect(transformText('İSTANBUL', { preset: 'lowercase', locale: 'tr' }).text).toBe('istanbul');
    expect(transformText('straße', { preset: 'uppercase', locale: 'de' }).text).toBe('STRASSE');
  });

  it('capitalizes the first grapheme of every word only', () => {
    expect(capitalize('northern lights tour', 'en')).toBe('Northern Lights Tour');
    expect(capitalize("don't stop iPhone", 'en')).toBe("Don't Stop IPhone");
    expect(capitalize('éclair au café', 'fr')).toBe('Éclair Au Café');
    expect(capitalize('éclair', 'fr')).toBe('Éclair');
  });

  it('uppercases only the first word in sentence case', () => {
    expect(sentence('  quiet harbor at dawn', 'en')).toBe('  Quiet harbor at dawn');
    expect(sentence('«quiet» harbor', 'fr')).toBe('«Quiet» harbor');
  });
});

describe('identifier presets', () => {
  it('splits at separators, case transitions and acronyms', () => {
    expect(identifierWords('backgroundColor')).toEqual(['background', 'Color']);
    expect(identifierWords('XMLHttpRequest')).toEqual(['XML', 'Http', 'Request']);
    expect(identifierWords('base64Encode')).toEqual(['base64', 'Encode']);
    expect(identifierWords('user_id.value-max min')).toEqual(['user', 'id', 'value', 'max', 'min']);
  });

  it('joins words in each style', () => {
    expect(identifierCase('shadow cascade-count', 'camel')).toBe('shadowCascadeCount');
    expect(identifierCase('shadow cascade-count', 'pascal')).toBe('ShadowCascadeCount');
    expect(identifierCase('shadowCascadeCount', 'kebab')).toBe('shadow-cascade-count');
    expect(identifierCase('shadowCascadeCount', 'snake')).toBe('shadow_cascade_count');
    expect(identifierCase('shadowCascadeCount', 'constant')).toBe('SHADOW_CASCADE_COUNT');
    expect(identifierCase('shadowCascadeCount', 'humanize')).toBe('Shadow cascade count');
  });
});

describe('numeric input', () => {
  it('reads numbers, bigints and decimal literal text', () => {
    expect(parseNumericInput(12.5)?.machine).toBe('12.5');
    expect(parseNumericInput(12n)?.machine).toBe('12');
    expect(parseNumericInput(' -1.5e3 ')?.number).toBe(-1500);
    expect(parseNumericInput('1,234')).toBeNull();
    expect(parseNumericInput(Number.NaN)).toBeNull();
    expect(parseNumericInput('abc')).toBeNull();
  });

  it('keeps decimal text exact', () => {
    const result = transformText('12345678901234567890.25', { preset: 'decimal', locale: 'en-US' });
    expect(result.text).toBe('12,345,678,901,234,567,890.25');
    expect(result.machineValue).toBe('12345678901234567890.25');
  });
});

describe('number presets', () => {
  const format = (value: unknown, options: Parameters<typeof transformText>[1]) =>
    transformText(value, { locale: 'en-US', ...options });

  it('formats each preset with the locale', () => {
    expect(format(1234.567, { preset: 'number' }).text).toBe('1,234.567');
    expect(format(1234.567, { preset: 'integer' }).text).toBe('1,235');
    expect(format(3, { preset: 'decimal' }).text).toBe('3.00');
    expect(format(0.125, { preset: 'percent' }).text).toBe('13%');
    expect(format(0.125, { preset: 'percent', decimals: 1 }).text).toBe('12.5%');
    expect(format(1234.5, { preset: 'currency', currency: 'EUR' }).text).toBe('€1,234.50');
    expect(format(1234.5, { preset: 'currency', currency: 'EUR', locale: 'de-DE' }).text).toBe(
      '1.234,50\u00a0€',
    );
    expect(format(15300, { preset: 'compact' }).text).toBe('15K');
    expect(format(15300, { preset: 'scientific' }).text).toBe('1.53E4');
    expect(format(42, { preset: 'unit', unit: 'kilometer-per-hour' }).text).toBe('42 km/h');
    expect(format(7, { preset: 'number', locale: 'ar-EG' }).text).toBe('٧');
  });

  it('spells out abbreviated forms in the accessible text', () => {
    expect(format(15300, { preset: 'compact' }).accessibleText).toBe('15 thousand');
    expect(format(42, { preset: 'unit', unit: 'kilometer-per-hour' }).accessibleText).toBe(
      '42 kilometers per hour',
    );
    const plain = format(12.5, { preset: 'number' });
    expect(plain.accessibleText).toBe(plain.text);
  });

  it('merges preset defaults, shortcuts and format in that order', () => {
    expect(format(2.5, { preset: 'decimal', decimals: 0 }).text).toBe('3');
    expect(
      format(1234.5, {
        preset: 'currency',
        currency: 'EUR',
        format: { currency: 'USD', maximumFractionDigits: 0 },
      }).text,
    ).toBe('$1,235');
    expect(format(1234.5, { format: { maximumFractionDigits: 0 } }).text).toBe('1,235');
  });

  it('falls back with diagnostics', () => {
    const missing = format(5, { preset: 'currency' });
    expect(missing.text).toBe('5');
    expect(missing.diagnostics.map((entry) => entry.code)).toEqual(['missing-currency']);
    expect(format(5, { preset: 'currency', currency: 'EURO' }).diagnostics[0]?.code).toBe(
      'invalid-currency',
    );
    expect(format(5, { preset: 'unit', unit: 'parsec-ish' }).diagnostics[0]?.code).toBe(
      'invalid-unit',
    );
    const rejected = format(5, { preset: 'percent', format: { notation: 'sideways' as never } });
    expect(rejected.text).toBe('500%');
    expect(rejected.diagnostics[0]?.code).toBe('invalid-format');
    expect(format(5, { preset: 'decimal', decimals: 25 }).diagnostics[0]?.code).toBe(
      'invalid-decimals',
    );
  });

  it('marks unreadable input invalid', () => {
    const result = format('twelve', { preset: 'number' });
    expect(result.invalid).toBe(true);
    expect(result.machineValue).toBeUndefined();
    expect(result.diagnostics[0]?.code).toBe('invalid-number');
    expect(format(-5, { preset: 'bytes' }).invalid).toBe(true);
    expect(format(-5, { preset: 'duration' }).invalid).toBe(true);
  });

  it('presents empty input as nothing without invalidity', () => {
    expect(format('  ', { preset: 'number' })).toMatchObject({ text: '', invalid: false });
    expect(format(undefined, { preset: 'currency' })).toMatchObject({ text: '', invalid: false });
  });
});

describe('bytes and durations', () => {
  it('formats byte sizes with long accessible units', () => {
    const result = transformText(1536, { preset: 'bytes', locale: 'en' });
    expect(result.text).toBe('1.5 KB');
    expect(result.accessibleText).toBe('1.5 kilobytes');
  });

  it('formats durations digitally by default with a spoken accessible form', () => {
    const result = transformText(3725, { preset: 'duration', locale: 'en' });
    expect(result.text).toBe('1:02:05');
    expect(result.accessibleText).toMatch(/1 hour, 2 minutes, 5 seconds/);
    expect(
      transformText(65, { preset: 'duration', locale: 'en', format: { style: 'long' } }).text,
    ).toMatch(/1 minute, 5 seconds/);
  });
});

describe('formatters and Consumer presets', () => {
  it('runs a formatter that composes presets', () => {
    const result = transformText(0.256, {
      locale: 'en-US',
      formatter: (context) => ({
        text: `${context.apply('percent')} done`,
        accessibleText: `${context.apply('percent')} complete`,
      }),
    });
    expect(result.text).toBe('26% done');
    expect(result.accessibleText).toBe('26% complete');
  });

  it('yields to the preset when a formatter fails', () => {
    const result = transformText('quiet harbor', {
      preset: 'uppercase',
      formatter: () => {
        throw new Error('broken');
      },
    });
    expect(result.text).toBe('QUIET HARBOR');
    expect(result.diagnostics[0]?.code).toBe('formatter-failed');
    expect(transformText('x', { formatter: (() => 42) as never }).diagnostics[0]?.code).toBe(
      'formatter-result',
    );
  });

  it('defines, notifies and releases Consumer presets', () => {
    const changes: string[] = [];
    releases.push(subscribeTextPresets((name) => changes.push(name)));
    const release = defineTextPreset('fare', { preset: 'currency', format: { currency: 'EUR' } });
    releases.push(release);
    expect(transformText(42, { preset: 'fare', locale: 'en-US' }).text).toBe('€42.00');
    expect(transformText(42, { preset: 'fare', locale: 'en-US', currency: 'JPY' }).text).toBe(
      '¥42',
    );
    releases.push(defineTextPreset('shout', (context) => `${context.apply('uppercase')}!`));
    expect(transformText('dock four', { preset: 'shout' }).text).toBe('DOCK FOUR!');
    release();
    const unknown = transformText(42, { preset: 'fare' });
    expect(unknown.text).toBe('42');
    expect(unknown.diagnostics[0]?.code).toBe('unknown-preset');
    expect(changes).toEqual(['fare', 'shout', 'fare']);
  });

  it('reserves built-in names and rejects malformed definitions', () => {
    expect(() => defineTextPreset('currency', () => '')).toThrow(TypeError);
    expect(() => defineTextPreset('', () => '')).toThrow(TypeError);
    expect(() => defineTextPreset('broken', {} as never)).toThrow(TypeError);
  });

  it('stops preset cycles', () => {
    releases.push(defineTextPreset('loop-a', { preset: 'loop-b' }));
    releases.push(defineTextPreset('loop-b', { preset: 'loop-a' }));
    const result = transformText('wave', { preset: 'loop-a' });
    expect(result.text).toBe('wave');
    expect(result.diagnostics[0]?.code).toBe('preset-cycle');
  });

  it('reports a rejected locale once and formats with the default locale', () => {
    const result = transformText(5, { preset: 'number', locale: 'not a locale' });
    expect(result.diagnostics.map((entry) => entry.code)).toEqual(['invalid-locale']);
  });
});

describe('truncation units and count cuts', () => {
  it('splits graphemes and words', () => {
    expect(truncationUnits('a👩‍👩‍👧b', 'chars')).toEqual(['a', '👩‍👩‍👧', 'b']);
    expect(truncationUnits('Nightly shadow (pass), final.', 'words', 'en')).toEqual([
      'Nightly ',
      'shadow ',
      '(pass), ',
      'final.',
    ]);
  });

  it('collapses line breaks to one line', () => {
    expect(singleLine(' harbor\n\tlights  ')).toBe('harbor lights');
  });

  it('keeps counted units at each position', () => {
    const units = truncationUnits('render pass shadow cascade final', 'words');
    expect(joinCut(units, countCut(units.length, 2, 'end')!)).toBe('render pass…');
    expect(joinCut(units, countCut(units.length, 2, 'start')!)).toBe('…cascade final');
    expect(joinCut(units, countCut(units.length, 3, 'middle')!)).toBe('render pass…final');
    expect(joinCut(units, countCut(units.length, 0, 'end')!)).toBe('…');
    expect(countCut(units.length, 5, 'end')).toBeNull();
    expect(countCut(units.length, 2, 'none')).toEqual({ head: 2, tail: 0 });
  });
});

describe('fit cuts', () => {
  // One width unit per character keeps the arithmetic readable.
  function measure(units: string[]): TruncationMeasure {
    const text = units.join('');
    return {
      count: units.length,
      full: text.length,
      omission: 1,
      head: (k) => units.slice(0, k).join('').trimEnd().length,
      tail: (k) =>
        k
          ? units
              .slice(units.length - k)
              .join('')
              .trimStart().length
          : 0,
    };
  }
  const chars = truncationUnits('abcdefghij', 'chars');

  it('keeps the whole text when it fits', () => {
    expect(fitCut(measure(chars), 10, 'end')).toBeNull();
  });

  it('keeps as many units as fit with the omission', () => {
    expect(joinCut(chars, fitCut(measure(chars), 6, 'end')!)).toBe('abcde…');
    expect(joinCut(chars, fitCut(measure(chars), 6, 'start')!)).toBe('…fghij');
    expect(joinCut(chars, fitCut(measure(chars), 6, 'middle')!)).toBe('abc…ij');
    expect(joinCut(chars, fitCut(measure(chars), 0.5, 'end')!)).toBe('…');
  });

  it('honors the count cap within the fit', () => {
    expect(joinCut(chars, fitCut(measure(chars), 100, 'end', 4)!)).toBe('abcd…');
    expect(joinCut(chars, fitCut(measure(chars), 4, 'middle', 6)!)).toBe('ab…j');
  });

  it('does not count whitespace at the cut', () => {
    const words = truncationUnits('dock four north gate', 'words');
    expect(joinCut(words, fitCut(measure(words), 10, 'end')!)).toBe('dock four…');
  });
});
