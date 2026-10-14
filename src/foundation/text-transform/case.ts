/**
 * Locale case mapping for Text transform (Foundation §18.23 `ttf-case`). Word starts come from
 * the host word segmentation for the locale; uppercasing changes only the first grapheme cluster.
 */
import { graphemes, segmenter } from '../text-split/segment.js';

/** Uppercases `text` for `locale`, falling back to the root mapping for a rejected locale. */
export function toUpper(text: string, locale?: string): string {
  try {
    return text.toLocaleUpperCase(locale);
  } catch {
    return text.toUpperCase();
  }
}

/** Lowercases `text` for `locale`, falling back to the root mapping for a rejected locale. */
export function toLower(text: string, locale?: string): string {
  try {
    return text.toLocaleLowerCase(locale);
  } catch {
    return text.toLowerCase();
  }
}

/** Uppercases the first grapheme cluster of `word` and keeps the rest unchanged. */
export function upperFirst(word: string, locale?: string): string {
  const [first = ''] = graphemes(word, locale);
  return toUpper(first, locale) + word.slice(first.length);
}

/** Word-like runs and the text between them, in order. */
function wordRuns(text: string, locale?: string): { segment: string; word: boolean }[] {
  const words = segmenter('word', locale);
  if (words)
    return [...words.segment(text)].map(({ segment, isWordLike }) => ({
      segment,
      word: Boolean(isWordLike),
    }));
  return text
    .split(/(\s+)/u)
    .filter(Boolean)
    .map((segment) => ({ segment, word: !/^\s+$/u.test(segment) }));
}

/** Uppercases the first grapheme cluster of every word. */
export function capitalize(text: string, locale?: string): string {
  return wordRuns(text, locale)
    .map(({ segment, word }) => (word ? upperFirst(segment, locale) : segment))
    .join('');
}

/** Uppercases the first grapheme cluster of the first word. */
export function sentence(text: string, locale?: string): string {
  let done = false;
  return wordRuns(text, locale)
    .map(({ segment, word }) => {
      if (done || !word) return segment;
      done = true;
      return upperFirst(segment, locale);
    })
    .join('');
}
