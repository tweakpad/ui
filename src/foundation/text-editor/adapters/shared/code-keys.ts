/**
 * The editing keys of a code block, for every engine adapter (Widgets `uwg-te-req-parity-1`,
 * `uwg-te-req-key-3`, `uwg-te-req-engine-12`).
 *
 * Pure edits of a code block's text, in UTF-16 offsets into that text, where a line break is a
 * line feed: Tab and Shift+Tab indent and outdent by two spaces, never by a tab character; Enter
 * and Shift+Enter insert a line break followed by the leading spaces and tabs of the caret line;
 * Enter at the end of a text that ends with two line breaks leaves the code block. Each adapter
 * applies the result to its engine's code block and places the selection at the returned offsets.
 */

/** What Tab inserts and Shift+Tab removes at most, per line. */
export const CODE_INDENT = '  ';

/** A code block's next text with the selection in it. */
export interface TextEditorCodeEdit {
  readonly text: string;
  readonly anchor: number;
  readonly head: number;
}

/**
 * The offset where the line holding `offset` starts. Offset 0 is on the first line: a negative
 * `lastIndexOf` position would search from 0 and find a line feed at offset 0.
 */
const lineStart = (text: string, offset: number): number =>
  offset <= 0 ? 0 : text.lastIndexOf('\n', offset - 1) + 1;

/** The leading spaces and tabs of the line holding `offset`. */
export function codeLineIndent(text: string, offset: number): string {
  const start = lineStart(text, offset);
  let end = start;
  while (end < text.length && (text[end] === ' ' || text[end] === '\t')) end += 1;
  return text.slice(start, end);
}

/**
 * The distinct starts of the lines a selection touches, in order: the caret line, or each line
 * from the one holding the selection's start to the one holding its end, apart from a last line
 * that the selection only reaches at its start.
 */
export function touchedLineStarts(text: string, from: number, to: number): number[] {
  const starts = [lineStart(text, from)];
  for (let index = text.indexOf('\n', from); index !== -1 && index + 1 < to;) {
    if (index + 1 > starts[starts.length - 1]!) starts.push(index + 1);
    index = text.indexOf('\n', index + 1);
  }
  return starts;
}

/**
 * Tab (`outdent` false) or Shift+Tab (`outdent` true) in a code block. Tab inserts two spaces at
 * a caret, or at the start of each line a selection touches; Shift+Tab removes up to two leading
 * spaces from the caret line or from each touched line. The selection follows the text: a point
 * at or after an insertion moves right, a point inside removed spaces goes to where they started.
 * `null` when nothing changes (Shift+Tab without leading spaces), the key then consumed without
 * effect.
 */
export function indentCode(
  text: string,
  anchor: number,
  head: number,
  outdent: boolean,
): TextEditorCodeEdit | null {
  const from = Math.min(anchor, head);
  const to = Math.max(anchor, head);
  if (!outdent) {
    const at = from === to ? [from] : touchedLineStarts(text, from, to);
    let next = text;
    for (const position of [...at].reverse())
      next = next.slice(0, position) + CODE_INDENT + next.slice(position);
    const move = (point: number) =>
      point + CODE_INDENT.length * at.filter((position) => position <= point).length;
    return { text: next, anchor: move(anchor), head: move(head) };
  }
  const removals: { readonly start: number; readonly count: number }[] = [];
  for (const start of touchedLineStarts(text, from, to)) {
    let count = 0;
    while (count < CODE_INDENT.length && text[start + count] === ' ') count += 1;
    if (count > 0) removals.push({ start, count });
  }
  if (removals.length === 0) return null;
  let next = text;
  for (const { start, count } of [...removals].reverse())
    next = next.slice(0, start) + next.slice(start + count);
  const move = (point: number) => {
    let moved = point;
    for (const { start, count } of removals) {
      if (point >= start + count) moved -= count;
      else if (point > start) moved -= point - start;
    }
    return moved;
  };
  return { text: next, anchor: move(anchor), head: move(head) };
}

/**
 * Enter or Shift+Enter in a code block over `from`–`to` (a caret when equal): the selected text is
 * replaced by a line break followed by the leading spaces and tabs of the line holding `from`, and
 * the caret goes after them.
 */
export function codeLineBreak(text: string, from: number, to: number): TextEditorCodeEdit {
  const start = Math.min(from, to);
  const end = Math.max(from, to);
  const inserted = `\n${codeLineIndent(text, start)}`;
  const caret = start + inserted.length;
  return { text: text.slice(0, start) + inserted + text.slice(end), anchor: caret, head: caret };
}

/**
 * The text a code block keeps when Enter at a caret leaves it: with the caret at the end of a
 * text that ends with two line breaks, the text without them; otherwise `null`. The caret then
 * moves into a new paragraph after the code block.
 */
export function codeExitText(text: string, caret: number): string | null {
  return caret === text.length && text.endsWith('\n\n') ? text.slice(0, -2) : null;
}
