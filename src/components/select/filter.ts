import { LocaleService } from '../../foundation/services.js';

export interface SelectFilterOptions extends Intl.CollatorOptions {
  locale?: string | string[];
}
export interface SelectFilter {
  contains<T>(item: T, query: string, text?: (item: T) => string): boolean;
  startsWith<T>(item: T, query: string, text?: (item: T) => string): boolean;
  endsWith<T>(item: T, query: string, text?: (item: T) => string): boolean;
}
const filters = new Map<string, SelectFilter>();

/** Collation can equate strings of different lengths (punctuation, ligatures, accents). */
export function createSelectFilter(options: SelectFilterOptions = {}): SelectFilter {
  const { locale, ...supplied } = options;
  const comparison = {
    usage: 'search',
    sensitivity: 'base',
    ignorePunctuation: true,
    ...supplied,
  } as Intl.CollatorOptions;
  const key = JSON.stringify([locale, comparison]);
  const cached = filters.get(key);
  if (cached) return cached;
  const collator = new LocaleService(locale).collator(comparison);
  const match = <T>(
    item: T,
    query: string,
    text: ((item: T) => string) | undefined,
    kind: 'contains' | 'startsWith' | 'endsWith',
  ) => {
    if (!query) return true;
    const value = text ? text(item) : String(item ?? '');
    const characters = Array.from(value);
    // Every candidate is a complete code point; a fixed query-length window loses collation matches.
    for (let start = 0; start < characters.length; start++) {
      if (kind === 'startsWith' && start !== 0) break;
      for (let end = start + 1; end <= characters.length; end++) {
        if (kind === 'endsWith' && end !== characters.length) continue;
        if (collator.compare(characters.slice(start, end).join(''), query) === 0) return true;
      }
    }
    return false;
  };
  const filter: SelectFilter = {
    contains: (item, query, text) => match(item, query, text, 'contains'),
    startsWith: (item, query, text) => match(item, query, text, 'startsWith'),
    endsWith: (item, query, text) => match(item, query, text, 'endsWith'),
  };
  filters.set(key, filter);
  return filter;
}
