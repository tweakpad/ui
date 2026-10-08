import { hasUnspacedScript, segmenter } from '../text-split/segment.js';

/** A word of a text: its folded term and its offsets in the original text. */
export interface SearchToken {
  readonly term: string;
  readonly start: number;
  readonly end: number;
}

const MARKS = /\p{M}/gu;

/**
 * Folds text for matching: lowercase for `locale` (so Turkish İ becomes i), then compatibility
 * decomposition with combining marks removed, so case and accent differences match.
 */
export function foldText(text: string, locale?: string): string {
  let lower: string;
  try {
    lower = text.toLocaleLowerCase(locale || undefined);
  } catch {
    lower = text.toLowerCase();
  }
  return lower.normalize('NFKD').replace(MARKS, '');
}

const WORD = /[^\s\p{P}]+/gu;

/**
 * The words of `text`, each with its folded term and original offsets: runs of characters that are
 * neither white space nor punctuation, split further by the host's word segmentation for `locale`
 * in scripts written without spaces.
 */
export function tokenize(text: string, locale?: string): SearchToken[] {
  const tokens: SearchToken[] = [];
  // The host's segmentation is needed only for scripts written without spaces.
  const words = hasUnspacedScript(text) ? segmenter('word', locale) : null;
  if (words) {
    let index = 0;
    for (const { segment, isWordLike } of words.segment(text)) {
      if (isWordLike) {
        const term = foldText(segment, locale);
        if (term) tokens.push({ term, start: index, end: index + segment.length });
      }
      index += segment.length;
    }
    return tokens;
  }
  for (const match of text.matchAll(WORD)) {
    const term = foldText(match[0], locale);
    if (term) tokens.push({ term, start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/**
 * The end offset in `text` (from `start`) of its shortest prefix whose folded form is at least
 * `length` characters long, so a prefix match of a folded query maps back to the original text.
 */
export function foldedPrefixEnd(
  text: string,
  start: number,
  end: number,
  length: number,
  locale?: string,
): number {
  let folded = 0;
  for (let index = start; index < end;) {
    const point = text.codePointAt(index)!;
    const next = index + (point > 0xffff ? 2 : 1);
    folded += foldText(text.slice(index, next), locale).length;
    index = next;
    if (folded >= length) return index;
  }
  return end;
}
