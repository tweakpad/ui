/**
 * Truncation for Text transform (Foundation §18.23 `ttf-truncation`, `ttf-fit`): units, count
 * cuts and the choice of a cut that fits a measured inline size. Pure, so the rules are testable
 * without a document; measuring belongs to the element.
 */
import { graphemes, segmenter } from '../text-split/segment.js';

export type TruncatePosition = 'none' | 'start' | 'middle' | 'end';
export type TruncateUnit = 'chars' | 'words';

/** The mark that replaces removed text. */
export const OMISSION = '…';

/** Units kept from the beginning and from the end of the text. */
export interface TruncationCut {
  readonly head: number;
  readonly tail: number;
}

/** Runs of whitespace, including line breaks, become one space so the text fits one line. */
export function singleLine(text: string): string {
  return text.replace(/\s+/gu, ' ').trim();
}

/**
 * Splits text into truncation units: grapheme clusters for `chars`; for `words`, words from the
 * locale word segmentation, each keeping its trailing whitespace and punctuation. Punctuation
 * after whitespace opens the next word.
 */
export function truncationUnits(text: string, by: TruncateUnit, locale?: string): string[] {
  if (by === 'chars') return graphemes(text, locale);
  const words = segmenter('word', locale);
  if (!words) return text.match(/\s*\S+\s*/gu) ?? (text ? [text] : []);
  const units: string[] = [];
  let lead = '';
  let spaced = false;
  for (const { segment, isWordLike } of words.segment(text)) {
    if (isWordLike) {
      units.push(lead + segment);
      lead = '';
      spaced = false;
    } else if (/^\s+$/u.test(segment) && units.length && !lead) {
      units[units.length - 1] += segment;
      spaced = true;
    } else if (units.length && !spaced && !lead) units[units.length - 1] += segment;
    else lead += segment;
  }
  if (lead) {
    if (units.length) units[units.length - 1] += lead;
    else units.push(lead);
  }
  return units;
}

/** The text that keeps `cut.head` leading and `cut.tail` trailing units around the omission. */
export function joinCut(units: readonly string[], cut: TruncationCut): string {
  const head = units.slice(0, cut.head).join('').trimEnd();
  const tail = cut.tail
    ? units
        .slice(units.length - cut.tail)
        .join('')
        .trimStart()
    : '';
  return `${head}${OMISSION}${tail}`;
}

/**
 * The cut that keeps at most `limit` units at `position` (`none` cuts the end), or null when the
 * text has no more units than that. Middle cuts give the beginning the extra unit.
 */
export function countCut(
  count: number,
  limit: number,
  position: TruncatePosition,
): TruncationCut | null {
  const keep = Math.max(0, Math.floor(limit));
  if (count <= keep) return null;
  if (position === 'start') return { head: 0, tail: keep };
  if (position === 'middle') return { head: Math.ceil(keep / 2), tail: Math.floor(keep / 2) };
  return { head: keep, tail: 0 };
}

/** Inline sizes of a measured text, in any unit, by kept units. */
export interface TruncationMeasure {
  readonly count: number;
  /** The whole text. */
  readonly full: number;
  /** The omission mark. */
  readonly omission: number;
  /** The first `units` units without trailing whitespace. */
  head(units: number): number;
  /** The last `units` units without leading whitespace. */
  tail(units: number): number;
}

const TOLERANCE = 0.5;

/** The largest `k` in [0, max] for which `fits(k)`, given `fits` is monotone and `fits(0)`. */
function largest(max: number, fits: (k: number) => boolean): number {
  let low = 0;
  let high = max;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(middle)) low = middle;
    else high = middle - 1;
  }
  return low;
}

/**
 * The cut whose kept units and omission fit `available`, keeping at most `limit` units, or null
 * when the whole text fits. Middle cuts grow the narrower side first so both sides stay as
 * equal in inline size as the units allow.
 */
export function fitCut(
  measure: TruncationMeasure,
  available: number,
  position: Exclude<TruncatePosition, 'none'>,
  limit = Number.POSITIVE_INFINITY,
): TruncationCut | null {
  const { count } = measure;
  const counted = countCut(count, limit, position);
  if (!counted && measure.full <= available + TOLERANCE) return null;
  const budget = available - measure.omission;
  if (budget < 0) return { head: 0, tail: 0 };
  const most = Math.min(count - 1, Math.max(0, Math.floor(limit)));
  // A count cut that also fits keeps the count rule's split.
  if (counted && measure.head(counted.head) + measure.tail(counted.tail) <= budget) return counted;
  if (position === 'end') return { head: largest(most, (k) => measure.head(k) <= budget), tail: 0 };
  if (position === 'start')
    return { head: 0, tail: largest(most, (k) => measure.tail(k) <= budget) };
  let head = 0;
  let tail = 0;
  while (head + tail < most) {
    const headWidth = measure.head(head);
    const tailWidth = measure.tail(tail);
    const growHead = measure.head(head + 1) + tailWidth <= budget;
    const growTail = headWidth + measure.tail(tail + 1) <= budget;
    if (growHead && (!growTail || headWidth <= tailWidth)) head += 1;
    else if (growTail) tail += 1;
    else break;
  }
  return { head, tail };
}
