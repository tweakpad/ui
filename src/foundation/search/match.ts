import { collator } from '../intl.js';
import { foldedPrefixEnd, tokenize } from './normalize.js';
import type { SearchRange } from './types.js';

export interface CollationOptions extends Intl.CollatorOptions {
  locale?: string | string[];
}

/** Where a query must match: anywhere, at the start, or at the end of the text. */
export type CollationMatch = 'contains' | 'startsWith' | 'endsWith';

/** The shared search collator: base sensitivity, punctuation ignored, cached per option set. */
export function searchCollator(options: CollationOptions = {}): Intl.Collator {
  const { locale, ...supplied } = options;
  return collator(locale, {
    usage: 'search',
    sensitivity: 'base',
    ignorePunctuation: true,
    ...supplied,
  });
}

const printable = /^[\u0020-\u007e]*$/;
const foldAscii = (value: string): string => value.replace(/[^0-9a-z]/gi, '').toLowerCase();
const untailored = new WeakMap<Intl.Collator, boolean>();

/**
 * Whether a match is still possible. English collation weighs ASCII letters without case and
 * digits as themselves, and every other printable ASCII character is ignorable or a symbol, so a
 * window can only equal the query when the text's letters and digits contain the query's. Other
 * locales and other characters always stay possible.
 */
function asciiFolding(
  text: string,
  query: string,
  kind: CollationMatch,
  collator: Intl.Collator,
): boolean {
  let plain = untailored.get(collator);
  if (plain === undefined) {
    const options = collator.resolvedOptions();
    plain =
      new Intl.Locale(options.locale).language === 'en' &&
      options.collation === 'default' &&
      !options.numeric;
    untailored.set(collator, plain);
  }
  if (!plain || !printable.test(text) || !printable.test(query)) return true;
  const folded = foldAscii(query);
  if (!folded) return true;
  const haystack = foldAscii(text);
  return kind === 'startsWith'
    ? haystack.startsWith(folded)
    : kind === 'endsWith'
      ? haystack.endsWith(folded)
      : haystack.includes(folded);
}

/**
 * The first range of `text` that equals `query` under `collator`, anchored as `kind` asks, or
 * null. Collation can equate strings of different lengths (punctuation, ligatures, accents), so
 * every window of complete code points is compared rather than only query-length ones. An empty
 * query matches with an empty range.
 */
export function collationRange(
  text: string,
  query: string,
  kind: CollationMatch,
  collator: Intl.Collator,
): SearchRange | null {
  if (!query) return [0, 0];
  if (!asciiFolding(text, query, kind, collator)) return null;
  const characters = Array.from(text);
  const offsets = [0];
  for (const character of characters) offsets.push(offsets.at(-1)! + character.length);
  for (let start = 0; start < characters.length; start++) {
    if (kind === 'startsWith' && start !== 0) break;
    for (let end = start + 1; end <= characters.length; end++) {
      if (kind === 'endsWith' && end !== characters.length) continue;
      if (collator.compare(text.slice(offsets[start], offsets[end]), query) === 0)
        return [offsets[start]!, offsets[end]!];
    }
  }
  return null;
}

/**
 * Matches `text` against `query` in an exact mode and returns the matched ranges, or null:
 * `contains` (the query anywhere, collation-based), `prefix` (every query word begins a word of
 * the text) or `exact` (the whole text equals the query). An empty query matches everything.
 */
export function matchText(
  text: string,
  query: string,
  mode: 'contains' | 'prefix' | 'exact',
  locale?: string,
): SearchRange[] | null {
  if (!query.trim()) return [];
  const collator = searchCollator(locale ? { locale } : {});
  if (mode === 'exact') return collator.compare(text, query) === 0 ? [[0, text.length]] : null;
  if (mode === 'contains') {
    const range = collationRange(text, query, 'contains', collator);
    return range ? [range] : null;
  }
  const words = tokenize(text, locale);
  const ranges: SearchRange[] = [];
  for (const { term } of tokenize(query, locale)) {
    const word = words.find((token) => token.term.startsWith(term));
    if (!word) return null;
    ranges.push([word.start, foldedPrefixEnd(text, word.start, word.end, term.length, locale)]);
  }
  return mergeRanges(ranges);
}

/** Sorted, non-overlapping ranges covering the same offsets. */
export function mergeRanges(ranges: Iterable<SearchRange>): SearchRange[] {
  const sorted = [...ranges].filter(([start, end]) => end > start).sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const [start, end] of sorted) {
    const last = merged.at(-1);
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/** Ranges of the words of `text` whose folded form starts with one of `terms`. */
export function termRanges(text: string, terms: readonly string[], locale?: string): SearchRange[] {
  const ranges: SearchRange[] = [];
  for (const token of tokenize(text, locale)) {
    const term = terms.find((candidate) => token.term.startsWith(candidate));
    if (term)
      ranges.push([
        token.start,
        term === token.term
          ? token.end
          : foldedPrefixEnd(text, token.start, token.end, term.length, locale),
      ]);
  }
  return mergeRanges(ranges);
}
