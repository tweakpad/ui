/**
 * Streaming completion (Foundation §18.16): while a source is still growing, unterminated
 * emphasis, strong, strikethrough, inline code and link syntax in its final block is completed
 * before parsing so partial syntax never shows as literal markers. Settled blocks are untouched.
 */

const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/u;

/** Start offset of the final block: after the last blank line outside an open code fence. */
function finalBlockStart(source: string): number | null {
  let fence: string | null = null;
  let start = 0;
  let offset = 0;
  for (const line of source.split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) {
      if (
        marker &&
        marker[0] === fence[0] &&
        marker.length >= fence.length &&
        !line.trim().slice(marker.length).trim()
      )
        fence = null;
    } else if (marker) fence = marker;
    else if (!line.trim()) start = offset + line.length + 1;
    offset += line.length + 1;
  }
  // An open fence runs to the end of the document by itself; nothing to complete.
  return fence ? null : start;
}

interface Run {
  readonly char: string;
  readonly length: number;
  readonly index: number;
}

/** Completes unterminated inline syntax in the final block of a growing source. */
export function completeMarkdown(source: string): string {
  const start = finalBlockStart(source);
  if (start === null || start >= source.length) return source;
  const head = source.slice(0, start);
  let tail = source.slice(start);

  // Strip a dangling marker at the very end: it opens nothing yet.
  tail = tail.replace(/(?:!?\[|[*_~]+|`+)$/, (marker, index: number) =>
    tail.charAt(index - 1) === '\\' ? marker : '',
  );

  // Inline code: an odd backtick run without a matching closer.
  const ticks = [...tail.matchAll(/(?<!\\)`+/g)];
  const openCode = new Map<number, number>();
  for (const match of ticks) {
    const length = match[0].length;
    if (openCode.has(length)) openCode.delete(length);
    else if (!openCode.size) openCode.set(length, match.index);
    else if ([...openCode.keys()][0] === length) openCode.clear();
  }
  const codeOpen = [...openCode.entries()][0];
  let suffix = '';
  // Delimiters inside an unterminated code span are code text, not emphasis.
  const scan = codeOpen ? tail.slice(0, codeOpen[1]) : tail;
  if (codeOpen) suffix = '`'.repeat(codeOpen[0]);

  // Links: `[text](partial` keeps only its text; `[text` keeps only its text.
  const visible = scan
    .replace(/(!?)\[([^\]\n]*)\]\([^)\n]*$/, (_match, bang: string, text: string) =>
      bang ? '' : text,
    )
    .replace(/(!?)\[([^\]\n]*)$/, (_match, bang: string, text: string) => (bang ? '' : text));
  const rebuilt = codeOpen ? visible + tail.slice(codeOpen[1]) : visible;
  const emphasisSource = codeOpen ? visible : rebuilt;

  // Emphasis: unmatched opening delimiter runs, outside complete code spans.
  const withoutCode = emphasisSource.replace(/(`+)[\s\S]*?\1/g, (code) => ' '.repeat(code.length));
  const stack: Run[] = [];
  for (const match of withoutCode.matchAll(/(?<!\\)(\*+|_+|~+)/g)) {
    const run: Run = { char: match[0][0]!, length: match[0].length, index: match.index };
    const before = run.index === 0 ? ' ' : withoutCode.charAt(run.index - 1);
    const after = withoutCode.charAt(run.index + run.length) || ' ';
    const left =
      !WHITESPACE.test(after) &&
      (!PUNCTUATION.test(after) || WHITESPACE.test(before) || PUNCTUATION.test(before));
    const right =
      !WHITESPACE.test(before) &&
      (!PUNCTUATION.test(before) || WHITESPACE.test(after) || PUNCTUATION.test(after));
    const top = stack.at(-1);
    if (right && top?.char === run.char) {
      if (top.length === run.length) stack.pop();
      else if (top.length > run.length)
        stack[stack.length - 1] = { ...top, length: top.length - run.length };
      else stack.pop();
      continue;
    }
    if (left && (run.char !== '_' || !/[\p{L}\p{N}]/u.test(before))) stack.push(run);
  }
  const closers = stack
    .reverse()
    .map((run) => run.char.repeat(Math.min(run.length, run.char === '~' ? 2 : 3)))
    .join('');
  // A closer after whitespace would not be right-flanking.
  const body = codeOpen ? rebuilt + suffix : closers ? rebuilt.replace(/\s+$/, '') : rebuilt;
  return head + body + closers;
}
