/**
 * Text segmentation for Text motion (Foundation §18.19 `tm-segmentation`). Pure functions, so
 * splitting rules are testable without a document.
 */

/** A run of whitespace, or of text between whitespace. */
export interface TextToken {
  readonly text: string;
  readonly space: boolean;
}

const WHITESPACE = /(\s+)/u;

/** Splits text into alternating whitespace and non-whitespace tokens, in order. */
export function tokenize(text: string): TextToken[] {
  return text
    .split(WHITESPACE)
    .filter((part) => part !== '')
    .map((part) => ({ text: part, space: /^\s+$/u.test(part) }));
}

/** Scripts written without spaces, where every word boundary is already a line break. */
const UNSPACED =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}\p{Script=Lao}\p{Script=Khmer}\p{Script=Myanmar}]/u;

/** Whether `text` uses a script written without spaces. */
export function hasUnspacedScript(text: string): boolean {
  return UNSPACED.test(text);
}

/** Characters after which a line may break inside a word (hyphens and dashes). */
const BREAK_AFTER = /[-‐‒–—―­/]/u;

export type Segmenter = { segment(text: string): Iterable<{ segment: string; isWordLike?: boolean }> };
const segmenters = new Map<string, Segmenter | null>();

/** The host's cached segmenter for `granularity` and `locale`, or null where Intl.Segmenter is missing. */
export function segmenter(
  granularity: 'word' | 'grapheme',
  locale: string | undefined,
): Segmenter | null {
  const key = `${granularity}|${locale ?? ''}`;
  if (segmenters.has(key)) return segmenters.get(key)!;
  const Constructor = (Intl as unknown as { Segmenter?: new (...args: unknown[]) => Segmenter })
    .Segmenter;
  let instance: Segmenter | null = null;
  if (Constructor) {
    try {
      instance = new Constructor(locale || undefined, { granularity });
    } catch {
      instance = new Constructor(undefined, { granularity });
    }
  }
  segmenters.set(key, instance);
  return instance;
}

/**
 * Splits a whitespace-free chunk into words at the places a line may already break: after
 * hyphens and dashes, and at the host's word boundaries in scripts written without spaces.
 * Punctuation stays with the word it follows (or, at the start, the word it precedes), so no new
 * break opportunity is introduced.
 */
export function splitChunk(chunk: string, locale?: string): string[] {
  const parts: string[] = [];
  let current = '';
  const flush = () => {
    if (current) parts.push(current);
    current = '';
  };
  const words = UNSPACED.test(chunk) ? segmenter('word', locale) : null;
  const segments = words ? [...words.segment(chunk)] : [{ segment: chunk, isWordLike: true }];
  for (const { segment, isWordLike } of segments) {
    if (words && isWordLike && current && UNSPACED.test(segment)) flush();
    for (const character of Array.from(segment)) {
      current += character;
      if (BREAK_AFTER.test(character) && current.length > character.length) flush();
    }
  }
  flush();
  // A part made only of punctuation joins its neighbour.
  return parts.reduce<string[]>((merged, part) => {
    if (merged.length && !/[\p{L}\p{N}\p{So}]/u.test(part) && !BREAK_AFTER.test(part))
      merged[merged.length - 1] += part;
    else merged.push(part);
    return merged;
  }, []);
}

/** User-perceived characters (grapheme clusters). */
export function graphemes(text: string, locale?: string): string[] {
  const clusters = segmenter('grapheme', locale);
  if (clusters) return [...clusters.segment(text)].map((part) => part.segment);
  // Without a segmenter, keep combining marks, joiners and variation selectors with their base.
  return text.match(/\P{M}(?:\p{M}|‍\P{M}|️)*/gu) ?? [];
}
