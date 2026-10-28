/**
 * Input rules of the text editor (Widgets `uwg-te-req-key-7`, `uwg-te-tab-input-rules`,
 * `uwg-te-lis-up-i2`).
 *
 * The one rule table that every engine applies, as pure functions that the adapters call from
 * their engines' input hooks with the text before the caret. That text is the whole text of the
 * textblock before the caret, not the state's last 64 units, with a hard break as a line feed and
 * an inline node as U+FFFC, as `caretTextBefore` of `adapters/shared/state.ts` writes it.
 *
 * Block rules complete on the space typed after their pattern, `---` on its third hyphen, at the
 * start of a top-level paragraph. Inline rules complete on their closing delimiter. Autolinks
 * complete on a space, Enter or Shift+Enter after a URL that the Markdown dialect's extended
 * autolinks read from text, the one matcher of every engine. Links pass the link policy.
 */
import { parseMarkdown } from '../markdown/block.js';
import type { MarkdownInline, MarkdownLink } from '../markdown/types.js';
import { allowedUrl, linkProtocols } from '../markdown/url.js';
import type { TextEditorUrlPolicy } from './engine.js';
import type { TextEditorHeadingLevel } from './model.js';
import type { TextEditorColor } from './palette.js';

// Block rules (uwg-te-tab-input-rules r1–r7)

/** What a block rule turns its paragraph into. */
export type TextEditorBlockRule =
  | { readonly kind: 'heading'; readonly level: TextEditorHeadingLevel }
  | { readonly kind: 'list-bullet' | 'quote' | 'divider' }
  | { readonly kind: 'list-ordered'; readonly start: number }
  | { readonly kind: 'list-task'; readonly checked: boolean }
  | { readonly kind: 'code'; readonly language: string | null };

/** Where the caret lies when a block rule may complete. */
export interface TextEditorBlockRuleScope {
  /**
   * The caret's textblock is a paragraph at the top level of the document: not a heading, quote,
   * code block or list item, and not in a table cell.
   */
  readonly topLevelParagraph: boolean;
  /** The caret lies in inline code. */
  readonly inCode: boolean;
  /** Nothing follows the caret in its textblock. */
  readonly atEnd: boolean;
}

/** A completed block rule. */
export interface TextEditorBlockRuleMatch {
  readonly rule: TextEditorBlockRule;
  /** The UTF-16 length of the typed pattern, which starts the paragraph and the rule removes. */
  readonly length: number;
}

const HEADING = /^(#{1,6}) $/u;
const BULLET = /^[-*+] $/u;
/** A number of at most nine digits, as the Markdown dialect reads the marker of an ordered item. */
const ORDERED = /^(\d{1,9})\. $/u;
const TASK = /^\[([ x])\] $/u;
const QUOTE = '> ';
const FENCE = /^```([a-z]*) $/u;
const DIVIDER = '---';

function blockRule(text: string, atEnd: boolean): TextEditorBlockRule | null {
  if (text === DIVIDER) return atEnd ? { kind: 'divider' } : null;
  if (text === QUOTE) return { kind: 'quote' };
  if (BULLET.test(text)) return { kind: 'list-bullet' };
  let match = HEADING.exec(text);
  if (match) return { kind: 'heading', level: match[1]!.length as TextEditorHeadingLevel };
  match = ORDERED.exec(text);
  if (match) return { kind: 'list-ordered', start: Number(match[1]) };
  match = TASK.exec(text);
  if (match) return { kind: 'list-task', checked: match[1] === 'x' };
  match = FENCE.exec(text);
  if (match) return { kind: 'code', language: match[1] || null };
  return null;
}

/**
 * The block rule that `textBefore`, the text of the paragraph before the caret with the character
 * just typed, completes: `#` to `######`, `-`, `*` or `+`, a number and `.`, `[ ]` or `[x]`, `>`,
 * or three backticks with an optional language of the letters a to z, each followed by a space,
 * or `---` completing on its third hyphen in an otherwise empty paragraph. `null` outside a
 * top-level paragraph, in inline code and for every other pattern.
 */
export function matchBlockRule(
  textBefore: string,
  scope: TextEditorBlockRuleScope,
): TextEditorBlockRuleMatch | null {
  if (!scope.topLevelParagraph || scope.inCode) return null;
  const rule = blockRule(textBefore, scope.atEnd);
  return rule ? Object.freeze({ rule: Object.freeze(rule), length: textBefore.length }) : null;
}

// Inline rules and autolinks (uwg-te-tab-input-rules r8–r14)

/** Where the caret lies when an inline rule or an autolink may complete. */
export interface TextEditorInlineRuleScope {
  /** The caret lies in a code block or in inline code: no inline rule and no autolink applies. */
  readonly inCode: boolean;
  /** The caret lies in a link: no autolink applies; inline rules still do. */
  readonly inLink: boolean;
}

/** The mark that an inline rule applies to its text. */
export type TextEditorInlineRuleMark =
  | { readonly mark: 'bold' | 'italic' | 'code' | 'strike' }
  | { readonly mark: 'highlight'; readonly color: TextEditorColor }
  | { readonly mark: 'link'; readonly href: string };

/**
 * A completed inline rule, in UTF-16 offsets into the text before the caret: the rule removes
 * `from`–`textFrom` and `textTo`–`to`, the delimiters, and applies its mark to `textFrom`–`textTo`.
 */
export interface TextEditorInlineRuleMatch {
  readonly rule: TextEditorInlineRuleMark;
  /** Where the opening delimiter starts. */
  readonly from: number;
  /** Where the marked text starts. */
  readonly textFrom: number;
  /** Where the marked text ends. */
  readonly textTo: number;
  /** Where the closing delimiter ends: the length of the text before the caret. */
  readonly to: number;
}

interface FormatRule {
  readonly delimiter: string;
  readonly rule: TextEditorInlineRuleMark;
}

/** The formatting rules, each doubled delimiter before the single one it starts with. */
const FORMAT_RULES: readonly FormatRule[] = Object.freeze(
  (
    [
      ['**', { mark: 'bold' }],
      ['__', { mark: 'bold' }],
      ['~~', { mark: 'strike' }],
      ['==', { mark: 'highlight', color: 'yellow' }],
      ['*', { mark: 'italic' }],
      ['_', { mark: 'italic' }],
      ['`', { mark: 'code' }],
    ] as const
  ).map(([delimiter, rule]) => Object.freeze({ delimiter, rule: Object.freeze(rule) })),
);

/**
 * The characters that complete an inline rule when typed: the last character of each formatting
 * delimiter and the closing parenthesis of a link. An adapter runs `matchInlineRule` only after
 * typing one of them.
 */
export const INLINE_RULE_TRIGGERS: readonly string[] = Object.freeze([
  ...new Set([...FORMAT_RULES.map(({ delimiter }) => delimiter.slice(-1)), ')']),
]);

const WHITESPACE = /\s/u;
/** A hard break or an inline node, which formatted text and link text never hold. */
const NOT_TEXT = /[\n￼]/u;
/** `[t](url)` at the end of the text: link text without brackets, a destination without spaces or parentheses. */
const LINK_RULE = /\[([^[\]\n￼]+)\]\(([^\s()￼]+)\)$/u;

/**
 * The formatting rule of `format` that ends `text`: the text between its delimiters holds no
 * delimiter character, so the opening delimiter is the run that ends at the nearest one before
 * the closing delimiter.
 */
function matchFormat(text: string, format: FormatRule): TextEditorInlineRuleMatch | null {
  const { delimiter, rule } = format;
  const to = text.length;
  const textTo = to - delimiter.length;
  if (textTo < 1) return null;
  const textFrom = text.lastIndexOf(delimiter.charAt(0), textTo - 1) + 1;
  const from = textFrom - delimiter.length;
  if (textFrom === 0 || from < 0 || text.slice(from, textFrom) !== delimiter) return null;
  const inner = text.slice(textFrom, textTo);
  if (
    inner === '' ||
    WHITESPACE.test(inner.charAt(0)) ||
    WHITESPACE.test(inner.charAt(inner.length - 1)) ||
    NOT_TEXT.test(inner)
  )
    return null;
  // The opening delimiter starts the text or follows whitespace or a hard break; inline code may
  // also follow any character but a backtick.
  const before = text.charAt(from - 1);
  const opens = rule.mark === 'code' ? before !== '`' : from === 0 || WHITESPACE.test(before);
  return opens ? Object.freeze({ rule, from, textFrom, textTo, to }) : null;
}

function matchLinkRule(text: string, urls: TextEditorUrlPolicy): TextEditorInlineRuleMatch | null {
  const match = LINK_RULE.exec(text);
  if (!match) return null;
  const href = match[2]!;
  if (!allowedUrl(href, linkProtocols(urls))) return null;
  const from = match.index;
  return Object.freeze({
    rule: Object.freeze({ mark: 'link', href }),
    from,
    textFrom: from + 1,
    textTo: from + 1 + match[1]!.length,
    to: text.length,
  });
}

/**
 * The inline rule that the closing delimiter just typed completes, `textBefore` ending with it:
 * `**x**` or `__x__` (bold), `*x*` or `_x_` (italic), x between single backticks (code), `~~x~~`
 * (strike), `==x==` (yellow highlight), or `[t](url)` (t linked to url when url passes the link
 * policy). A formatting rule needs its opening delimiter at the start of the text or after
 * whitespace or a hard break, inline code also after any character other than a backtick, and
 * text between the delimiters that holds no delimiter character, hard break or inline node and
 * neither starts nor ends with whitespace. `null` in code.
 */
export function matchInlineRule(
  textBefore: string,
  scope: TextEditorInlineRuleScope,
  urls: TextEditorUrlPolicy,
): TextEditorInlineRuleMatch | null {
  if (scope.inCode) return null;
  if (textBefore.endsWith(')')) return matchLinkRule(textBefore, urls);
  for (const format of FORMAT_RULES)
    if (textBefore.endsWith(format.delimiter)) {
      const match = matchFormat(textBefore, format);
      if (match) return match;
    }
  return null;
}

/** A URL to link to itself, in UTF-16 offsets into the text before the trigger. */
export interface TextEditorAutolinkMatch {
  /** Where the URL starts. */
  readonly from: number;
  /** Where it ends: the end of the text, before punctuation that ends the sentence. */
  readonly to: number;
  /** The destination: the URL, with `http://` before a `www.` address and `mailto:` before an email address. */
  readonly href: string;
}

/** The inline content of Markdown source that is one paragraph, or `null`. */
function paragraphOf(source: string): readonly MarkdownInline[] | null {
  const [only, ...rest] = parseMarkdown(source).children;
  return only?.type === 'paragraph' && rest.length === 0 ? only.children : null;
}

/** The text of a link that holds text only, or `null`. */
function linkText(link: MarkdownLink): string | null {
  const [only, ...rest] = link.children;
  return only?.type === 'text' && rest.length === 0 ? only.value : null;
}

/**
 * The autolink of the Markdown dialect that ends `word`, a run of text without whitespace, apart
 * from the trailing punctuation that the dialect leaves out of a link: its range in `word` and its
 * destination. A link whose text is not written as it is in `word` is no autolink.
 */
function trailingAutolink(word: string): { from: number; to: number; href: string } | null {
  const inlines = paragraphOf(word);
  if (!inlines) return null;
  const last = inlines[inlines.length - 1];
  const trailing = last?.type === 'text' ? last.value : '';
  const link = trailing === '' ? last : inlines[inlines.length - 2];
  if (link?.type !== 'link') return null;
  const text = linkText(link);
  if (text === null || !word.endsWith(text + trailing)) return null;
  const from = word.length - trailing.length - text.length;
  return { from, to: from + text.length, href: link.url };
}

const WORD_BOUNDARY = /[\s￼]/u;

/**
 * The URL that ends the text before a space, Enter or Shift+Enter, `textBefore` excluding that
 * trigger: the www, URL or email autolink of the Markdown dialect that ends there, apart from
 * trailing punctuation the dialect leaves out, when its destination passes the link policy.
 * `null` in code or a link.
 */
export function matchAutolink(
  textBefore: string,
  scope: TextEditorInlineRuleScope,
  urls: TextEditorUrlPolicy,
): TextEditorAutolinkMatch | null {
  if (scope.inCode || scope.inLink) return null;
  let start = textBefore.length;
  while (start > 0 && !WORD_BOUNDARY.test(textBefore.charAt(start - 1))) start -= 1;
  if (start === textBefore.length) return null;
  const found = trailingAutolink(textBefore.slice(start));
  if (!found || !allowedUrl(found.href, linkProtocols(urls))) return null;
  return Object.freeze({ from: start + found.from, to: start + found.to, href: found.href });
}

/** The destination of `url` read as a CommonMark autolink between angle brackets, or `null`. */
function absoluteUrl(url: string): string | null {
  const inlines = paragraphOf(`<${url}>`);
  const [link, ...rest] = inlines ?? [];
  return link?.type === 'link' && rest.length === 0 && linkText(link) === url ? link.url : null;
}

/**
 * The destination of a text that is one URL and nothing else, surrounding whitespace aside: an
 * absolute URL with a scheme, or a www or email address as the Markdown dialect autolinks it,
 * when the destination passes the link policy; otherwise `null`. It is the check of a single URL
 * pasted over a text selection (`uwg-te-req-content-6`).
 */
export function matchUrl(text: string, urls: TextEditorUrlPolicy): string | null {
  const url = text.trim();
  if (url === '' || WHITESPACE.test(url) || NOT_TEXT.test(url)) return null;
  let href = absoluteUrl(url);
  if (href === null) {
    const found = trailingAutolink(url);
    href = found && found.from === 0 && found.to === url.length ? found.href : null;
  }
  return href !== null && allowedUrl(href, linkProtocols(urls)) ? href : null;
}
