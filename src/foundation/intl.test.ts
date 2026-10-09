import { describe, expect, it, vi } from 'vitest';
import { dateTimeFormatter } from './date-locale.js';
import { cachedIntl, collator, displayNames, numberFormatter } from './intl.js';
import { languageName } from './media/captions.js';
import { searchCollator } from './search/match.js';
import { LocaleService } from './services.js';

describe('cached Intl objects', () => {
  it('shares one instance per locale and option set', () => {
    expect(numberFormatter('en-US', { style: 'percent' })).toBe(
      numberFormatter('en-US', { style: 'percent' }),
    );
    expect(numberFormatter('en-US', { style: 'percent' })).not.toBe(
      numberFormatter('de-DE', { style: 'percent' }),
    );
    expect(collator('en', { sensitivity: 'base' })).toBe(collator('en', { sensitivity: 'base' }));
    expect(dateTimeFormatter('en-US', { weekday: 'short', timeZone: 'UTC' })).toBe(
      dateTimeFormatter('en-US', { weekday: 'short', timeZone: 'UTC' }),
    );
    expect(displayNames('en', { type: 'language' }).of('fr')).toBe('French');
  });

  it('routes the locale service and search collation through the shared cache', () => {
    expect(new LocaleService('en').collator({ numeric: true })).toBe(
      collator('en', { numeric: true }),
    );
    expect(searchCollator({ locale: 'en' })).toBe(
      collator('en', { usage: 'search', sensitivity: 'base', ignorePunctuation: true }),
    );
    expect(new LocaleService('de-DE').number(1234.5)).toBe('1.234,5');
  });

  it('evicts the oldest entry once the cache is full', () => {
    const create = vi.fn((locale: string | string[] | undefined, options?: { n: number }) => ({
      locale,
      options,
    }));
    const cached = cachedIntl(create);
    const first = cached('en', { n: 0 });
    for (let n = 1; n < 64; n++) cached('en', { n });
    expect(cached('en', { n: 0 })).toBe(first);
    cached('en', { n: 64 });
    expect(cached('en', { n: 0 })).not.toBe(first);
    expect(create).toHaveBeenCalledTimes(66);
  });

  it('caches nothing for a factory that throws', () => {
    expect(() => collator('not a locale')).toThrow(RangeError);
    expect(() => collator('not a locale')).toThrow(RangeError);
    expect(languageName('fr', 'not a locale')).toBe('');
    expect(languageName('fr', 'en')).toBe('French');
  });
});
