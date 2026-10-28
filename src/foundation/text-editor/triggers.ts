/**
 * Trigger matching for the slash menu and inline suggestions (uwg-te-req-inline-2).
 *
 * One engine-neutral matcher reads the text of the caret's textblock before the caret as the
 * engine state reports it: at most its last 64 UTF-16 code units, a hard break as a line feed and
 * an inline node as U+FFFC (uwg-te-req-engine-4). A trigger matches only at the start of the
 * textblock or after whitespace, never inside a word, after an inline node, in code or in a link,
 * and the fullwidth form of a trigger character from the ASCII range matches as that trigger. The
 * query is the text from the trigger to the caret and holds no whitespace, so whitespace ends the
 * match; an inline node ends it as well.
 */

/** UTF-16 code units of the text before the caret that matching reads. */
const WINDOW = 64;
/** Whitespace, or the U+FFFC that stands for an inline node: either ends a query. */
const BOUNDARY = /[\s￼]/;
const INLINE_NODE = '￼';
/** The distance from a printable ASCII character to its fullwidth form (U+FF01–U+FF5E). */
const FULLWIDTH_OFFSET = 0xfee0;

export interface TriggerContext {
  /** The caret lies in inline code or a code block. */
  readonly inCode: boolean;
  /** The caret lies in a link. */
  readonly inLink: boolean;
}

export interface TriggerMatch {
  /** The trigger as `triggers` lists it, also when its fullwidth form was typed. */
  readonly trigger: string;
  /** The text from the trigger to the caret. */
  readonly query: string;
  /** The UTF-16 index of the trigger in `textBefore`. */
  readonly offset: number;
}

/**
 * The trigger whose query reaches the caret, or `null`. `textBefore` is the text of the caret's
 * textblock before the caret. Only its last 64 code units are read; when it holds 64 or more, the
 * first unit read is not taken for the start of the textblock, since the state may have cut the
 * text there. A trigger typed as `triggers` lists it wins over one whose fullwidth form was
 * typed, and an earlier entry wins over a later one.
 */
export function matchTrigger(
  textBefore: string,
  triggers: readonly string[],
  context: TriggerContext,
): TriggerMatch | null {
  if (context.inCode || context.inLink) return null;
  const windowStart = Math.max(0, textBefore.length - WINDOW);
  let start = textBefore.length;
  while (start > windowStart && !BOUNDARY.test(textBefore.charAt(start - 1))) start -= 1;
  if (start > windowStart) {
    // The query starts after its boundary, which must be whitespace, not an inline node.
    if (textBefore.charAt(start - 1) === INLINE_NODE) return null;
  } else if (textBefore.length >= WINDOW) return null; // the start of the textblock is unknown
  const run = textBefore.slice(start);
  const exact = triggers.find((trigger) => trigger !== '' && run.startsWith(trigger));
  const trigger = exact ?? triggers.find((candidate) => fullwidthForm(candidate) === run.charAt(0));
  if (trigger === undefined) return null;
  return { trigger, query: run.slice(exact === undefined ? 1 : trigger.length), offset: start };
}

/** The fullwidth form of a one-character trigger from the printable ASCII range, if any. */
function fullwidthForm(trigger: string): string | null {
  if (trigger.length !== 1) return null;
  const code = trigger.charCodeAt(0);
  return code > 0x20 && code < 0x7f ? String.fromCharCode(code + FULLWIDTH_OFFSET) : null;
}
