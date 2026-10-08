import { html, type TemplateResult } from 'lit';
import { mergeRanges } from './match.js';
import type { SearchRange } from './types.js';

/** `text` cut into runs, each marked as matched or not by `ranges`. */
export function splitByRanges(
  text: string,
  ranges: readonly SearchRange[],
): Array<{ text: string; match: boolean }> {
  const runs: Array<{ text: string; match: boolean }> = [];
  let index = 0;
  for (const [start, end] of mergeRanges(ranges)) {
    const from = Math.max(index, Math.min(start, text.length)),
      to = Math.min(end, text.length);
    if (from > index) runs.push({ text: text.slice(index, from), match: false });
    if (to > from) runs.push({ text: text.slice(from, to), match: true });
    index = Math.max(index, to);
  }
  if (index < text.length) runs.push({ text: text.slice(index), match: false });
  return runs;
}

/**
 * `text` in one inline span, with its matched `ranges` wrapped in `mark` elements carrying the
 * `part` name. The text is rendered as text, never as markup.
 */
export function renderHighlighted(
  text: string,
  ranges: readonly SearchRange[],
  part: string,
): TemplateResult {
  // One inline box, so flex or grid containers with gaps keep the runs together as one word.
  return html`<span class="search-text"
    >${splitByRanges(text, ranges).map((run) =>
      run.match ? html`<mark part=${part} class="search-match">${run.text}</mark>` : run.text,
    )}</span
  >`;
}
