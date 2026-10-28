/**
 * The built-in serializer (Foundation §18.16): writes a tree in the tree model as markdown source in
 * the dialect the built-in parser reads, CommonMark with the GitHub Flavored Markdown tables, task
 * list items, strikethrough, extended autolinks and footnotes.
 *
 * - It is synchronous and deterministic, and no tree makes it throw.
 * - Parsing the output with `parseMarkdown` reproduces every tree that parser produces, apart from
 *   source positions. Content the dialect cannot express at its position changes form without
 *   breaking the surrounding structure: a line break inside a table cell or an ATX heading
 *   becomes `<br>`, a line ending in text there a character reference.
 * - Escaping is minimal. A backslash goes only before a character that could otherwise be read as
 *   syntax at its position. A numeric character reference replaces only whitespace the parser
 *   would strip, and a character next to an emphasis delimiter that keeps it from opening or
 *   closing.
 * - An `html` node is written as its value, and a node of an unknown type as its children, or its
 *   value as text when it has none.
 * - The nodes `resolveMarkdown` adds are written so that they resolve again: alerts as GitHub
 *   alerts, admitted elements as raw HTML with escaped attributes, and the footnotes section as
 *   the footnote definitions it holds.
 */
import {
  ATX_CLOSING,
  ATX_EMPTY_CLOSING,
  ATX_HEADING,
  BULLET_MARKER,
  CODE_FENCE,
  DELIMITER_ROW,
  FOOTNOTE,
  ORDERED_MARKER,
  SETEXT_HEADING,
  TABLE_INTERRUPT,
  TASK,
  THEMATIC_BREAK,
} from './block.js';
import { decodeEntity, ENTITY } from './entities.js';
import {
  ATTRIBUTE_NAME,
  HTML_BLOCK_CLOSE,
  HTML_BLOCK_OPEN,
  HTML_TAG,
  TAG_NAME,
  VOID_ELEMENTS,
} from './html.js';
import {
  AUTOLINK,
  delimiterRole,
  EMAIL_AUTOLINK,
  ESCAPABLE,
  normalizeLabel,
  parseInlines,
  PUNCTUATION,
  WHITESPACE,
} from './inline.js';
import type { MarkdownRoot } from './types.js';

/** A tree value as the serializer reads it: every field is checked before it is used. */
type Node = { readonly [key: string]: unknown };

/**
 * How a paragraph's first line is read: as a block start (`item` and `dash` start a list item's
 * content, `dash` after a `-` marker), as a continuation line, or not at all (after a task marker).
 */
type Lead = 'block' | 'item' | 'dash' | 'continuation' | 'none';

interface Container {
  /** Several lines (paragraphs, setext headings) or one (ATX headings, table cells). */
  readonly lines: boolean;
  readonly lead: Lead;
  /** A table cell: pipes are escaped. */
  readonly cell: boolean;
  /** An ATX heading: a closing sequence of `#` is escaped. */
  readonly heading: boolean;
  /**
   * Inline content that stood directly in a block list: a first line that starts an HTML block
   * (an admitted element's tag) stays one, as it was read.
   */
  readonly loose: boolean;
}

// Unit kinds: a character of text, of literal syntax, or of an emphasis delimiter run.
const TEXT = 0;
const RAW = 1;
const MARK = 2;
// How a text unit is written.
const PLAIN = 0;
const BACKSLASH = 1;
const REFERENCE = 2;
// Scope: inside link text, where a link is written as its text.
const IN_LINK = 1;
// Unit flags: the end of a footnote reference, a space reference written before the unit, and
// a closing delimiter.
const NOTE_END = 1;
const PAD = 2;
const CLOSER = 4;

interface Attention {
  readonly type: string;
  readonly size: number;
  /** The nearest emphasis or strong ancestor. */
  readonly emphasis: Attention | null;
  /** The run length of the nearest strikethrough ancestor, 0 without one. */
  readonly strike: number;
  readonly open: number;
  close: number;
  char: string;
  /** Whether no other span lies inside it. */
  leaf: boolean;
}

interface Unit {
  c: string;
  readonly kind: number;
  readonly scope: number;
  flags: number;
  escape: number;
}

// Projection markers: the verification compares the emphasis structure around the text.
const OPEN: Readonly<Record<string, string>> = {
  emphasis: '\u0001',
  strong: '\u0003',
  delete: '\u0005',
};
const CLOSE: Readonly<Record<string, string>> = {
  emphasis: '\u0002',
  strong: '\u0004',
  delete: '\u0006',
};
const OPAQUE = '\u0007';
// How emphasis delimiters choose between `*` and `_`.
const SAME = 0;
const SIBLINGS = 1;
const INNERMOST = 2;
const ALTERNATE = 3;
const CHOSEN = 4;
/** The most delimiters next to other delimiters whose characters are searched. */
const SEARCHED = 10;
/**
 * Delimiter strategies tried in order until the parser reads the emphasis back: `*` everywhere,
 * `_` where a span starts right after another one ends, `_` for an innermost span that touches
 * another delimiter, `_` and `*` alternating with nesting, then the same with every letter next
 * to a delimiter written as a reference.
 */
const STRATEGIES: readonly (readonly [choice: number, defensive: boolean])[] = [
  [SAME, false],
  [SIBLINGS, false],
  [INNERMOST, false],
  [ALTERNATE, false],
  [ALTERNATE, true],
  [INNERMOST, true],
  [SIBLINGS, true],
  [SAME, true],
];
const ALERT_KINDS = ['note', 'tip', 'important', 'warning', 'caution'];
const MAX_ORDINAL = 999999999;

const isNode = (value: unknown): value is Node => typeof value === 'object' && value !== null;
const typeOf = (node: Node): string => (typeof node.type === 'string' ? node.type : '');
const childrenOf = (node: Node): readonly unknown[] | null =>
  Array.isArray(node.children) ? node.children : null;
const stringOf = (value: unknown): string => (typeof value === 'string' ? value : '');

function isBlockType(type: string): boolean {
  switch (type) {
    case 'paragraph':
    case 'heading':
    case 'thematicBreak':
    case 'blockquote':
    case 'list':
    case 'code':
    case 'html':
    case 'table':
    case 'footnoteDefinition':
    case 'alert':
    case 'element':
      return true;
    default:
      return false;
  }
}

function isInlineType(type: string): boolean {
  switch (type) {
    case 'text':
    case 'emphasis':
    case 'strong':
    case 'delete':
    case 'inlineCode':
    case 'break':
    case 'link':
    case 'image':
    case 'footnoteReference':
      return true;
    default:
      return false;
  }
}

let patterns:
  | {
      readonly tag: RegExp;
      readonly autolink: RegExp;
      readonly email: RegExp;
      readonly entity: RegExp;
      readonly tagName: RegExp;
      readonly attributeName: RegExp;
    }
  | undefined;
/** Sticky forms of the parser's patterns, built on first use. */
function sticky(): NonNullable<typeof patterns> {
  return (patterns ??= {
    tag: new RegExp(HTML_TAG.source.replace(/^\^/, ''), 'y'),
    autolink: new RegExp(AUTOLINK.source.replace(/^\^/, ''), 'uy'),
    email: new RegExp(EMAIL_AUTOLINK.source.replace(/^\^/, ''), 'y'),
    entity: new RegExp(ENTITY.source.replace(/^\^/, ''), 'y'),
    tagName: new RegExp(`^${TAG_NAME}$`),
    attributeName: new RegExp(`^${ATTRIBUTE_NAME}$`),
  });
}

/** Whether a decodable character reference starts at `index`. */
function referenceAt(source: string, index: number): boolean {
  const pattern = sticky().entity;
  pattern.lastIndex = index;
  const match = pattern.exec(source);
  return match !== null && decodeEntity(match[0]) !== null;
}

/** Whether inline HTML, an autolink or an email autolink starts at `index`. */
function angleAt(source: string, index: number): boolean {
  const { tag, autolink, email } = sticky();
  for (const pattern of [email, autolink, tag]) {
    pattern.lastIndex = index;
    if (pattern.test(source)) return true;
  }
  return false;
}

const reference = (codePoint: number): string => `&#${codePoint};`;

/** The number of bits set in a mask. */
function ones(mask: number): number {
  let count = 0;
  for (let rest = mask; rest; rest >>= 1) count += rest & 1;
  return count;
}

/**
 * Writes `value` for a position the parser unescapes (link destinations and titles, code info
 * strings): backslash escapes are removed first, then character references decoded. `special`
 * writes a character the position gives a meaning of its own, or returns `null`.
 */
function unescapable(
  value: string,
  special: (char: string, index: number) => string | null,
): string {
  let out = '';
  for (let index = 0; index < value.length; index++) {
    const char = value[index]!;
    const written = special(char, index);
    if (written !== null) out += written;
    else if (char === '\\') {
      const next = value[index + 1];
      // A backslash before punctuation, a reference or the end would escape what follows it.
      const escape =
        next === undefined ||
        ESCAPABLE.test(next) ||
        special(next, index + 1)?.startsWith('&') === true;
      out += escape ? '\\\\' : '\\';
    } else if (char === '&') out += referenceAt(value, index) ? '&amp;' : '&';
    else if (char === '\n' || char === '\r') out += reference(char.charCodeAt(0));
    else out += char;
  }
  return out;
}

function parenthesesBalanced(value: string): boolean {
  let depth = 0;
  for (let index = 0; index < value.length; index++) {
    const char = value[index];
    if (char === '\\') index++;
    else if (char === '(') depth++;
    else if (char === ')' && --depth < 0) return false;
  }
  return depth === 0;
}

/** A link or image destination; angle brackets when it holds spaces. */
function destination(url: string, titled: boolean): string {
  if (!url) return titled ? '<>' : '';
  if (/[ \t]/.test(url)) {
    const written = unescapable(url, (char) =>
      char === '<' || char === '>'
        ? `\\${char}`
        : /\p{Cc}/u.test(char) && char !== '\t'
          ? reference(char.charCodeAt(0))
          : null,
    );
    return `<${written}>`;
  }
  const balanced = parenthesesBalanced(url);
  return unescapable(url, (char, index) =>
    (char === '(' || char === ')') && !balanced
      ? `\\${char}`
      : /[\s\p{Cc}]/u.test(char)
        ? reference(char.codePointAt(0)!)
        : index === 0 && char === '<'
          ? '\\<'
          : null,
  );
}

function linkTitle(title: string): string {
  return `"${unescapable(title, (char) => (char === '"' ? '\\"' : null))}"`;
}

/** `[text](destination "title")`, or the autolink form when the text is the destination. */
function autolinkSource(
  url: string,
  title: string | null,
  children: readonly unknown[],
): string | null {
  if (title !== null || children.length !== 1) return null;
  const only = children[0];
  if (!isNode(only) || typeOf(only) !== 'text') return null;
  const label = stringOf(only.value);
  const whole = (pattern: RegExp, source: string): boolean =>
    pattern.exec(source)?.[0].length === source.length;
  if (label === url && whole(AUTOLINK, `<${url}>`)) return `<${url}>`;
  if (url === `mailto:${label}` && whole(EMAIL_AUTOLINK, `<${label}>`)) return `<${label}>`;
  return null;
}

/** An inline code span: a fence no run in the code matches, padded where the parser strips. */
function codeSpan(value: string): string {
  const code = value.replace(/\r\n?|\n/g, ' ');
  if (!code) return '';
  const runs = new Set((code.match(/`+/g) ?? []).map((run) => run.length));
  let length = 1;
  while (runs.has(length)) length++;
  const fence = '`'.repeat(length);
  const pad =
    code.startsWith('`') ||
    code.endsWith('`') ||
    (code.startsWith(' ') && code.endsWith(' ') && /[^ ]/.test(code));
  return pad ? `${fence} ${code} ${fence}` : `${fence}${code}${fence}`;
}

/** A fenced code block whose fence no line of the code could close. */
function fencedCode(value: string, lang: string | null, meta: string | null): string {
  let info = unescapable(`${lang ?? ''}${meta ? ` ${meta}` : ''}`, () => null);
  // The info string is trimmed before it is split: a missing language keeps its separator.
  if (!lang && meta) info = `&#32;${info.slice(1)}`;
  const char = info.includes('`') ? '~' : '`';
  let longest = 0;
  for (const match of value.matchAll(char === '`' ? /^ {0,3}(`+)/gm : /^ {0,3}(~+)/gm))
    longest = Math.max(longest, match[1]!.length);
  const fence = char.repeat(Math.max(3, longest + 1));
  return value ? `${fence}${info}\n${value}\n${fence}` : `${fence}${info}\n${fence}`;
}

function attributeValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;');
}

function openTag(name: string, attributes: unknown): string {
  let out = `<${name}`;
  if (isNode(attributes))
    for (const [key, value] of Object.entries(attributes)) {
      const text =
        typeof value === 'string'
          ? value
          : typeof value === 'number' || typeof value === 'boolean'
            ? String(value)
            : null;
      if (text !== null && sticky().attributeName.test(key))
        out += ` ${key}="${attributeValue(text)}"`;
    }
  return `${out}>`;
}

const tagNameOf = (node: Node): string | null => {
  const name = stringOf(node.tagName);
  return sticky().tagName.test(name) ? name : null;
};

function alignDelimiter(align: unknown): string {
  return align === 'left' ? ':--' : align === 'right' ? '--:' : align === 'center' ? ':-:' : '---';
}

/** A footnote definition label in the parser's syntax: no whitespace and no `]`. */
function definitionLabel(node: Node): string {
  const label = stringOf(node.label) || stringOf(node.identifier);
  return /^[^\]\s]+$/.test(label) ? label : label.replace(/[\]\s]+/g, '-') || 'note';
}

/** Whether an admitted element holds blocks, which put its tags on lines of their own. */
function holdsBlocks(node: Node): boolean {
  return (childrenOf(node) ?? []).some((child) => {
    if (!isNode(child)) return false;
    const type = typeOf(child);
    if (type === 'element') return holdsBlocks(child);
    return type !== 'html' && (isBlockType(type) || !isInlineType(type));
  });
}

/** Breaks and text line endings, which an ATX heading cannot hold. */
function hasLineBreak(nodes: readonly unknown[]): boolean {
  return nodes.some(
    (node) =>
      isNode(node) &&
      (typeOf(node) === 'break' ||
        (typeOf(node) === 'text' && stringOf(node.value).includes('\n')) ||
        hasLineBreak(childrenOf(node) ?? [])),
  );
}

/** Prefixes the lines of a container's content: the first line, the others and empty lines. */
function prefix(body: string, first: string, rest: string, blank: string): string {
  if (!body) return first.trimEnd();
  return body
    .split('\n')
    .map((line, index) =>
      index === 0 ? (line ? first + line : first.trimEnd()) : line ? rest + line : blank,
    )
    .join('\n');
}

/** The emphasis structure and text of inline content, as the verification compares it. */
function project(nodes: readonly unknown[]): string {
  let out = '';
  for (const node of nodes) {
    if (!isNode(node)) continue;
    const type = typeOf(node);
    switch (type) {
      case 'text':
        out += stringOf(node.value);
        break;
      case 'emphasis':
      case 'strong':
      case 'delete':
        out += OPEN[type]! + project(childrenOf(node) ?? []) + CLOSE[type]!;
        break;
      case 'inlineCode':
      case 'image':
      case 'footnoteReference':
        out += OPAQUE;
        break;
      case 'break':
      case 'html':
        break;
      default:
        out += project(childrenOf(node) ?? []);
    }
  }
  return out;
}

const isHigh = (char: string): boolean => /[\uD800-\uDBFF]/.test(char);
const isLow = (char: string): boolean => /[\uDC00-\uDFFF]/.test(char);

/** Marks a text unit to be written as a character reference, with both halves of a pair. */
function refer(units: Unit[], index: number): void {
  const unit = units[index];
  if (!unit || unit.kind !== TEXT) return;
  if (isHigh(unit.c) || isLow(unit.c)) {
    const partner = isHigh(unit.c) ? units[index + 1] : units[index - 1];
    if (partner?.kind !== TEXT || !(isHigh(unit.c) ? isLow(partner.c) : isHigh(partner.c))) return;
    partner.escape = REFERENCE;
  }
  unit.escape = REFERENCE;
}

const isText = (unit: Unit | undefined): unit is Unit => unit?.kind === TEXT;
const isLineEnd = (unit: Unit | undefined): boolean =>
  unit?.c === '\n' && !(unit.kind === TEXT && unit.escape === REFERENCE);

/** The character the parser sees right before `index + 1`: a reference ends with `;`. */
function charBefore(units: readonly Unit[], index: number): string {
  const unit = units[index];
  return !unit ? '\n' : unit.kind === TEXT && unit.escape === REFERENCE ? ';' : unit.c;
}

/** The character the parser sees at `index`: a reference starts with `&`. */
function charAfter(units: readonly Unit[], index: number): string {
  const unit = units[index];
  if (!unit) return '\n';
  return (unit.kind === TEXT && unit.escape === REFERENCE) || unit.flags & PAD ? '&' : unit.c;
}

/**
 * Where a paragraph line would start another block when read as `lead` says: the offset of the
 * character to escape (`at`, else `or`), or `null` when it stays paragraph text.
 */
function blockStart(line: string, lead: Lead): { at: number; or: number | null } | null {
  if (lead === 'none') return null;
  const opening = lead !== 'continuation';
  if (
    line.startsWith('>') ||
    ATX_HEADING.test(line) ||
    CODE_FENCE.test(line) ||
    THEMATIC_BREAK.test(line) ||
    // After a `-` marker, the marker's dash counts towards a thematic break.
    (lead === 'dash' && THEMATIC_BREAK.test(`- ${line}`)) ||
    HTML_BLOCK_OPEN.slice(1, opening ? 8 : 7).some((pattern) => pattern.test(line))
  )
    return { at: 0, or: null };
  if (!opening && (SETEXT_HEADING.test(line) || (line.includes('|') && DELIMITER_ROW.test(line))))
    return { at: 0, or: null };
  // A list item interrupts a paragraph only when it is not empty, and an ordered one from 1.
  const content = (marker: string): boolean => {
    const next = line.charAt(marker.length);
    return (
      (next === '' || next === ' ' || next === '\t') &&
      (opening || /[^ \t]/.test(line.slice(marker.length)))
    );
  };
  const bullet = BULLET_MARKER.exec(line);
  if (bullet && content(bullet[0])) return { at: 0, or: null };
  const ordered = ORDERED_MARKER.exec(line);
  if (ordered && (opening || ordered[1] === '1') && content(ordered[0]))
    return { at: ordered[1]!.length, or: null };
  // A footnote reference that starts the line has its colon escaped instead.
  const footnote = opening ? FOOTNOTE.exec(line) : null;
  if (footnote) return { at: 0, or: footnote[0].length - 1 };
  // The first paragraph of a list item would become a task item.
  if ((lead === 'item' || lead === 'dash') && TASK.test(`${line}\n`)) return { at: 0, or: null };
  return null;
}

/** Whether a block's last line is paragraph text, which a following line would continue. */
function endsInParagraph(node: Node): boolean {
  const type = typeOf(node);
  if (type === 'paragraph') return true;
  if (!['blockquote', 'alert', 'list', 'listItem', 'footnoteDefinition'].includes(type))
    return false;
  const last = (childrenOf(node) ?? []).filter(isNode).at(-1);
  return last !== undefined && endsInParagraph(last);
}

/** Whether a written HTML block or element would also take in the line after it. */
function takesNextLine(node: Node, text: string): boolean {
  const type = typeOf(node);
  if (type === 'element') return true;
  if (type !== 'html') return false;
  const first = text.split('\n', 1)[0]!.replace(/^ {0,3}/, '');
  const kind = HTML_BLOCK_OPEN.findIndex((pattern, index) => index > 0 && pattern.test(first));
  // Kinds 1 to 5 end on the line that closes them; 6 and 7, and other text, at a blank line.
  return (
    kind < 1 || kind > 5 || !text.split('\n').some((line) => HTML_BLOCK_CLOSE[kind]!.test(line))
  );
}

/**
 * Whether two blocks of a tight list item need a blank line between them all the same: one
 * would take in or continue into the other (the parser never reads such a pair as tight), or a
 * footnote definition, which takes in the blank line so the item still reads as tight.
 */
function needsBlank(previous: Node, text: string, next: Node, nextText: string): boolean {
  if (typeOf(previous) === 'footnoteDefinition' || takesNextLine(previous, text)) return true;
  const line = nextText.split('\n', 1)[0]!;
  const type = typeOf(previous);
  if (type === 'table') return !TABLE_INTERRUPT.test(line) && !THEMATIC_BREAK.test(line);
  if (type === 'paragraph') {
    // The line continues the paragraph unless it interrupts it (a table takes its last line).
    if (typeOf(next) === 'table') return false;
    const found = blockStart(line, 'continuation');
    return !found || SETEXT_HEADING.test(line) || (line.includes('|') && DELIMITER_ROW.test(line));
  }
  if (!endsInParagraph(previous)) return false;
  // A paragraph inside the previous block continues lazily unless the line starts a block where
  // it stands; raw HTML that ends only at a blank line cannot start there.
  const html = (pattern: RegExp): boolean => pattern.test(line);
  return (
    !blockStart(line, 'block') ||
    (html(HTML_BLOCK_OPEN[7]!) && !HTML_BLOCK_OPEN.slice(1, 7).some(html))
  );
}

/** A written block and the node it was written from. */
interface Written {
  readonly text: string;
  readonly node: Node;
}

/** Collects and writes the inline content of one paragraph, heading or table cell. */
class InlineWriter {
  readonly #units: Unit[] = [];
  readonly #attentions: Attention[] = [];
  /** The unit ranges of hard line breaks. */
  readonly #breaks: (readonly [start: number, end: number])[] = [];
  /** The unit ranges of link text and image alternative text, inside their brackets. */
  readonly #brackets: (readonly [start: number, end: number])[] = [];
  #projection = '';
  /** Whether the output starts with a no-break space that keeps its first line paragraph text. */
  #lead = false;

  constructor(
    private readonly footnotes: ReadonlySet<string>,
    private readonly container: Container,
  ) {}

  write(nodes: readonly unknown[]): string {
    this.#collect(nodes, 0, null);
    // A line break that ends the content has no effect, and could not be read back.
    for (let last = this.#breaks.pop(); last?.[1] === this.#units.length; last = this.#breaks.pop())
      this.#units.length = last[0];
    if (!this.#units.length) return '';
    if (!this.#attentions.length) return this.#render(SAME, false).out;
    const attentions = [...this.#attentions].sort((a, b) => a.open - b.open);
    let fallback = '';
    for (const [choice, defensive] of STRATEGIES) {
      const { raw, out } = this.#render(choice, defensive, attentions);
      if (this.#verify(raw)) return out;
      if (choice === ALTERNATE && !defensive) fallback = out;
    }
    // Last, the characters of the delimiters that touch other delimiters are searched, fewest
    // `_` first, for nestings the strategies above do not foresee.
    const touches = (index: number): boolean => this.#units[index]?.kind === MARK;
    const touching = attentions.filter(
      ({ type, open, close, size }) =>
        type !== 'delete' && [open - 1, open + size, close - 1, close + size].some(touches),
    );
    if (touching.length > SEARCHED) return fallback;
    const masks = Array.from({ length: 2 ** touching.length }, (_, mask) => mask).sort(
      (a, b) => ones(a) - ones(b) || a - b,
    );
    for (const defensive of [false, true])
      for (const mask of masks) {
        const underscored = new Set(touching.filter((_, index) => (mask >> index) & 1));
        const { raw, out } = this.#render(CHOSEN, defensive, attentions, underscored);
        if (this.#verify(raw)) return out;
      }
    return fallback;
  }

  #push(c: string, kind: number, scope: number, flags = 0): void {
    this.#units.push({ c, kind, scope, flags, escape: PLAIN });
  }

  #raw(text: string, scope: number, flags = 0): void {
    for (let index = 0; index < text.length; index++)
      this.#push(text[index]!, RAW, scope, index === text.length - 1 ? flags : 0);
  }

  #text(value: string, scope: number): void {
    for (let index = 0; index < value.length; index++) this.#push(value[index]!, TEXT, scope);
  }

  #collect(nodes: readonly unknown[], scope: number, parent: Attention | null): void {
    for (const node of nodes) if (isNode(node)) this.#node(node, scope, parent);
  }

  #node(node: Node, scope: number, parent: Attention | null): void {
    const type = typeOf(node);
    switch (type) {
      case 'text': {
        const value = stringOf(node.value);
        this.#text(value, scope);
        this.#projection += value;
        return;
      }
      case 'emphasis':
      case 'strong':
      case 'delete':
        this.#attention(node, type, scope, parent);
        return;
      case 'inlineCode': {
        const span = codeSpan(stringOf(node.value));
        if (!span) return;
        this.#raw(span, scope);
        this.#projection += OPAQUE;
        return;
      }
      case 'break': {
        const start = this.#units.length;
        this.#raw(this.container.lines ? '\\\n' : '<br>', scope);
        this.#breaks.push([start, this.#units.length]);
        return;
      }
      case 'link':
        this.#link(node, scope, parent);
        return;
      case 'image': {
        const title = typeof node.title === 'string' ? node.title : null;
        this.#raw('![', scope);
        const start = this.#units.length;
        this.#text(stringOf(node.alt), scope);
        this.#brackets.push([start, this.#units.length]);
        this.#raw(`](${destination(stringOf(node.url), title !== null)}`, scope);
        this.#raw(`${title === null ? '' : ` ${linkTitle(title)}`})`, scope);
        this.#projection += OPAQUE;
        return;
      }
      case 'footnoteReference': {
        let label = (stringOf(node.label) || stringOf(node.identifier)).replace(/\]/g, '');
        if (!this.container.lines) label = label.replace(/\r\n?|\n/g, ' ');
        this.#raw(`[^${label}]`, scope, NOTE_END);
        this.#projection += OPAQUE;
        return;
      }
      case 'html': {
        const value = stringOf(node.value);
        this.#raw(this.container.lines ? value : value.replace(/\r\n?|\n/g, ' '), scope);
        return;
      }
      case 'element': {
        const name = tagNameOf(node);
        if (name !== null) this.#raw(openTag(name, node.attributes), scope);
        if (name !== null && VOID_ELEMENTS.has(name.toLowerCase())) return;
        this.#collect(childrenOf(node) ?? [], scope, parent);
        if (name !== null) this.#raw(`</${name}>`, scope);
        return;
      }
      default: {
        // A node of an unknown type: its children, or its value as text.
        const children = childrenOf(node);
        if (children) this.#collect(children, scope, parent);
        else if (typeof node.value === 'string') {
          this.#text(node.value, scope);
          this.#projection += node.value;
        }
      }
    }
  }

  #attention(node: Node, type: string, scope: number, parent: Attention | null): void {
    const emphasis = parent?.type === 'delete' ? parent.emphasis : parent;
    const strike = parent ? (parent.type === 'delete' ? parent.size : parent.strike) : 0;
    // Strikethrough runs pair only when equal: one inside another alternates `~~` and `~`.
    const size = type === 'emphasis' || (type === 'delete' && strike === 2) ? 1 : 2;
    const open = this.#units.length;
    const attention: Attention = {
      type,
      size,
      emphasis,
      strike,
      open,
      close: -1,
      char: '*',
      leaf: true,
    };
    for (let index = 0; index < size; index++) this.#push('*', MARK, scope);
    const projected = this.#projection.length;
    this.#projection += OPEN[type]!;
    const content = this.#units.length;
    this.#collect(childrenOf(node) ?? [], scope, attention);
    if (this.#units.length === content) {
      // A span around nothing writes nothing.
      this.#units.length = open;
      this.#projection = this.#projection.slice(0, projected);
      return;
    }
    attention.close = this.#units.length;
    for (let index = 0; index < size; index++) this.#push('*', MARK, scope, CLOSER);
    this.#projection += CLOSE[type]!;
    this.#attentions.push(attention);
    if (parent) parent.leaf = false;
  }

  #link(node: Node, scope: number, parent: Attention | null): void {
    const url = stringOf(node.url);
    const title = typeof node.title === 'string' ? node.title : null;
    const children = childrenOf(node) ?? [];
    const auto = autolinkSource(url, title, children);
    if (auto !== null) {
      this.#raw(auto, scope);
      this.#projection += project(children);
      return;
    }
    // Links do not nest: a link inside link text is written as its text.
    if (scope & IN_LINK) {
      this.#collect(children, scope, parent);
      return;
    }
    this.#raw('[', scope);
    const start = this.#units.length;
    this.#collect(children, scope | IN_LINK, parent);
    this.#brackets.push([start, this.#units.length]);
    this.#raw(`](${destination(url, title !== null)}`, scope);
    this.#raw(`${title === null ? '' : ` ${linkTitle(title)}`})`, scope);
  }

  #verify(raw: string): boolean {
    const subject = (this.container.lines ? raw.replace(/\n[ \t]+/g, '\n') : raw).trim();
    const parsed = parseInlines(subject, { references: new Map(), footnotes: this.footnotes });
    return project(parsed) === this.#projection;
  }

  #render(
    choice: number,
    defensive: boolean,
    attentions: readonly Attention[] = [],
    underscored: ReadonlySet<Attention> = new Set(),
  ): { raw: string; out: string } {
    const units = this.#units;
    for (const unit of units) {
      unit.escape = PLAIN;
      unit.flags &= ~PAD;
    }
    this.#lead = false;
    this.#assign(attentions, choice, underscored);
    this.#whitespace();
    for (let pass = 0; pass < 2; pass++)
      for (const attention of attentions) {
        this.#flank(attention.open, attention.size, true, attention.char, defensive);
        this.#flank(attention.close, attention.size, false, attention.char, defensive);
      }
    const { text, offsets } = this.#emit(false);
    this.#escapes(text, offsets);
    if (this.container.lines) this.#lines(text, offsets);
    if (this.container.heading) this.#closing(text);
    const raw = this.#emit(true).text;
    return { raw, out: this.container.cell ? raw.replace(/\|/g, '\\|') : raw };
  }

  /**
   * Chooses each delimiter's character. A span that starts where another one ends needs the other
   * character, or both runs would join; alternating with nesting also keeps nested runs apart.
   */
  #assign(
    attentions: readonly Attention[],
    choice: number,
    underscored: ReadonlySet<Attention>,
  ): void {
    const units = this.#units;
    for (const attention of attentions)
      for (let index = 0; index < attention.size; index++) {
        units[attention.open + index]!.c = '*';
        units[attention.close + index]!.c = '*';
      }
    const mark = (unit: Unit | undefined, char: string): boolean =>
      unit?.kind === MARK && unit.c === char;
    for (const attention of attentions) {
      let char = attention.type === 'delete' ? '~' : '*';
      const before = units[attention.open - 1];
      if (char === '~' || choice === SAME) {
        // Every emphasis delimiter is `*`.
      } else if (choice === CHOSEN) {
        if (underscored.has(attention)) char = '_';
      } else if (choice === INNERMOST) {
        const after = units[attention.close + attention.size];
        if (attention.leaf && (mark(before, '*') || mark(after, '*'))) char = '_';
      } else {
        if (choice === ALTERNATE && attention.emphasis?.char === '*') char = '_';
        const touches = mark(before, char) && (choice === ALTERNATE || before!.flags & CLOSER);
        if (touches) char = char === '*' ? '_' : '*';
      }
      attention.char = char;
      for (let index = 0; index < attention.size; index++) {
        units[attention.open + index]!.c = char;
        units[attention.close + index]!.c = char;
      }
    }
  }

  /** References for whitespace the parser strips or reads as structure. */
  #whitespace(): void {
    const units = this.#units;
    const { lines } = this.container;
    // The content is trimmed.
    for (const index of [0, units.length - 1])
      if (isText(units[index]) && WHITESPACE.test(units[index]!.c)) refer(units, index);
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!;
      if (unit.kind !== TEXT || unit.escape === REFERENCE) continue;
      const afterLineEnd = index > 0 && isLineEnd(units[index - 1]);
      if (unit.c === '\r') refer(units, index);
      else if (unit.c === '\n') {
        // On one line every line ending is a reference; on several, one that would leave an
        // empty line, which ends the paragraph.
        if (!lines || afterLineEnd) refer(units, index);
        // The parser drops the spaces that end a line: one extra space survives in their place.
        else if (units[index - 1]?.kind === TEXT && units[index - 1]!.c === ' ') unit.flags |= PAD;
      } else if (lines && afterLineEnd && (unit.c === ' ' || unit.c === '\t')) refer(units, index);
    }
  }

  /**
   * A delimiter run must open or close where it stands. Whitespace inside it, or a letter outside
   * it next to punctuation, keeps it from doing so; such a character is written as a reference.
   */
  #flank(start: number, size: number, opening: boolean, char: string, defensive: boolean): void {
    const units = this.#units;
    // Delimiters of one character that touch form a single run for the parser.
    let first = start;
    let end = start + size;
    while (units[first - 1]?.kind === MARK && units[first - 1]!.c === char) first--;
    while (units[end]?.kind === MARK && units[end]!.c === char) end++;
    const inside = opening ? end : first - 1;
    const outside = opening ? first - 1 : end;
    const works = (): boolean => {
      const role = delimiterRole(char, charBefore(units, first - 1), charAfter(units, end));
      return opening ? role.canOpen : role.canClose;
    };
    if (!works() && isText(units[inside]) && WHITESPACE.test(units[inside]!.c))
      refer(units, inside);
    const neighbor = units[outside];
    if (
      (defensive || !works()) &&
      isText(neighbor) &&
      neighbor.escape !== REFERENCE &&
      !WHITESPACE.test(neighbor.c) &&
      !PUNCTUATION.test(neighbor.c)
    )
      refer(units, outside);
  }

  /**
   * The written text with the offset of every unit: before backslash escapes, which the escape
   * rules read, or final, with them and the no-break space that may lead it.
   */
  #emit(final: boolean): { text: string; offsets: number[] } {
    const units = this.#units;
    const offsets: number[] = [];
    let text = final && this.#lead ? '\u00a0' : '';
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!;
      if (unit.flags & PAD) text += '&#32;';
      offsets.push(text.length);
      if (unit.kind !== TEXT || unit.escape === PLAIN) text += unit.c;
      else if (unit.escape === BACKSLASH) text += final ? `\\${unit.c}` : unit.c;
      else if (isHigh(unit.c)) text += reference(`${unit.c}${units[index + 1]!.c}`.codePointAt(0)!);
      else if (!isLow(unit.c)) text += reference(unit.c.charCodeAt(0));
    }
    offsets.push(text.length);
    return { text, offsets };
  }

  /** Backslash escapes for characters that would be read as inline syntax where they stand. */
  #escapes(text: string, offsets: readonly number[]): void {
    const units = this.#units;
    const ticks: number[] = new Array<number>(units.length + 1).fill(0);
    for (let index = units.length - 1; index >= 0; index--)
      ticks[index] = ticks[index + 1]! + (units[index]!.c === '`' ? 1 : 0);
    this.#pairs(text, offsets);
    // A run of `*`, `_` or `~` can only pair with another run of its character.
    const runs = new Map<string, number>();
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!;
      const previous = units[index - 1];
      const counts = (candidate: Unit | undefined): boolean =>
        candidate !== undefined &&
        candidate.kind !== RAW &&
        candidate.escape !== REFERENCE &&
        (candidate.c === '*' || candidate.c === '_' || candidate.c === '~');
      if (counts(unit) && !(counts(previous) && previous!.c === unit.c))
        runs.set(unit.c, (runs.get(unit.c) ?? 0) + 1);
    }
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!;
      if (unit.kind !== TEXT || unit.escape !== PLAIN) continue;
      const previous = units[index - 1];
      const next = units[index + 1];
      switch (unit.c) {
        case '\\':
          // Before punctuation it would escape it; before a line ending it is a hard break.
          if (next && (next.c === '\n' || ESCAPABLE.test(charAfter(units, index + 1))))
            unit.escape = BACKSLASH;
          break;
        case '*':
        case '_':
        case '~':
          index = this.#run(index, runs.get(unit.c)! > 1);
          break;
        case '`':
          // A backtick opens a code span when another one follows, or joins a fence before it.
          if (ticks[index + 1]! > 0 || (previous?.kind !== TEXT && previous?.c === '`'))
            unit.escape = BACKSLASH;
          break;
        case '!':
          // Before the bracket of a link or a footnote reference it would make an image.
          if (next?.kind !== TEXT && next?.c === '[') unit.escape = BACKSLASH;
          break;
        case '(':
          // After a footnote reference it would make the reference a link.
          if (previous && previous.flags & NOTE_END) unit.escape = BACKSLASH;
          break;
        case '<':
          if (angleAt(text, offsets[index]!)) unit.escape = BACKSLASH;
          break;
        case '&':
          if (referenceAt(text, offsets[index]!)) unit.escape = BACKSLASH;
          break;
      }
    }
  }

  /**
   * Brackets in text. A pair is escaped where it would be read as a link, an image, a footnote
   * reference or a definition. Inside link text or alternative text an unpaired bracket would
   * also close or take over the enclosing brackets, so it is escaped, and so is all of a pair.
   */
  #pairs(text: string, offsets: readonly number[]): void {
    const units = this.#units;
    // The innermost bracketed range of every unit, -1 outside them.
    const region = new Array<number>(units.length).fill(-1);
    [...this.#brackets]
      .sort((a, b) => a[0] - b[0] || b[1] - a[1])
      .forEach(([start, end], id) => region.fill(id, start, end));
    const stacks = new Map<number, number[]>();
    const escape = (index: number): void => {
      units[index]!.escape = BACKSLASH;
    };
    for (let index = 0; index < units.length; index++) {
      const unit = units[index]!;
      if (unit.kind !== TEXT || unit.escape !== PLAIN || (unit.c !== '[' && unit.c !== ']'))
        continue;
      const id = region[index]!;
      const stack = stacks.get(id) ?? [];
      stacks.set(id, stack);
      if (unit.c === '[') {
        stack.push(index);
        continue;
      }
      const opener = stack.at(-1);
      const syntax = opener === undefined ? null : this.#syntax(opener, index, text, offsets);
      if (opener === undefined) {
        if (id >= 0) escape(index);
      } else if (!syntax) stack.pop();
      else if (syntax === 'definition') {
        // An escaped `]` would only lengthen the label: the paragraph must not start with `[`.
        escape(opener);
        stack.pop();
      }
      // An escaped `]` closes nothing: its `[` stays open for the parser, and so it does here.
      else if (id < 0) escape(index);
      else {
        escape(opener);
        escape(index);
        stack.pop();
      }
    }
    for (const [id, stack] of stacks) if (id >= 0) stack.forEach(escape);
  }

  /**
   * What a bracket pair in text would be read as: a definition (a paragraph that starts with
   * `[label]:`), a link or image, a footnote reference, or nothing.
   */
  #syntax(
    opener: number,
    closer: number,
    text: string,
    offsets: readonly number[],
  ): 'definition' | 'link' | null {
    const next = charAfter(this.#units, closer + 1);
    const { lines, lead } = this.container;
    if (
      opener === 0 &&
      next === ':' &&
      lines &&
      (lead === 'block' || lead === 'item' || lead === 'dash')
    )
      return 'definition';
    if (next === '(') return 'link';
    const label = text.slice(offsets[opener + 1]!, offsets[closer]!);
    return label.startsWith('^') && this.footnotes.has(normalizeLabel(label.slice(1)))
      ? 'link'
      : null;
  }

  /**
   * A run of `*`, `_` or `~` in text is escaped when it could open or close a span: it touches a
   * delimiter of its character, or it flanks text and another run could pair with it.
   */
  #run(start: number, paired: boolean): number {
    const units = this.#units;
    const char = units[start]!.c;
    const plain = (unit: Unit | undefined): boolean =>
      isText(unit) && unit.escape === PLAIN && unit.c === char;
    let end = start;
    while (plain(units[end + 1])) end++;
    // A delimiter or other syntax of the same character next to it would join the run.
    const joins = (unit: Unit | undefined): boolean =>
      unit !== undefined && unit.kind !== TEXT && unit.c === char;
    let escape = joins(units[start - 1]) || joins(units[end + 1]);
    if (!escape && paired && (char !== '~' || end - start < 2)) {
      const role = delimiterRole(char, charBefore(units, start - 1), charAfter(units, end + 1));
      escape = role.canOpen || role.canClose;
    }
    if (escape) for (let index = start; index <= end; index++) units[index]!.escape = BACKSLASH;
    return end;
  }

  /** Escapes the character that would make a line start another block. */
  #lines(text: string, offsets: readonly number[]): void {
    const units = this.#units;
    let start = 0;
    for (let line = 0; start <= units.length; line++) {
      let end = start;
      while (end < units.length && !isLineEnd(units[end])) end++;
      const lead = line === 0 ? this.container.lead : 'continuation';
      const found = blockStart(text.slice(offsets[start]!, offsets[end]!), lead);
      const escapable = (offset: number | null): boolean => {
        const unit = offset === null ? undefined : units[start + offset];
        return isText(unit) && unit.escape !== REFERENCE && ESCAPABLE.test(unit.c);
      };
      const at = found && (escapable(found.at) ? found.at : escapable(found.or) ? found.or : null);
      if (at !== null) {
        const first = units[start + at]!;
        first.escape = BACKSLASH;
        // The rest of a `*`, `_` or `~` run would be a shorter run that pairs: escape all of it.
        if ('*_~'.includes(first.c))
          for (let index = start + at + 1; index < units.length; index++) {
            const unit = units[index]!;
            if (unit.kind !== TEXT || unit.escape === REFERENCE || unit.c !== first.c) break;
            unit.escape = BACKSLASH;
          }
      }
      // Syntax that would start a block (inline HTML) cannot be escaped. On the first line a
      // no-break space before it keeps the line paragraph text, and the parser trims it; after a
      // text line ending, the line ending is written as a reference.
      else if (found && line === 0 && !this.container.loose) this.#lead = true;
      else if (found && line > 0 && isText(units[start - 1])) {
        units[start - 1]!.flags &= ~PAD;
        refer(units, start - 1);
      }
      start = end + 1;
    }
  }

  /** An ATX heading's trailing `#` run would be read as its closing sequence. */
  #closing(text: string): void {
    if (!ATX_EMPTY_CLOSING.test(text) && !ATX_CLOSING.test(text)) return;
    const units = this.#units;
    let index = units.length - 1;
    while (index >= 0 && (units[index]!.c === ' ' || units[index]!.c === '\t')) index--;
    while (index > 0 && units[index - 1]!.c === '#') index--;
    const unit = units[index];
    if (isText(unit) && unit.c === '#') unit.escape = BACKSLASH;
  }
}

/** Writes block content: blocks separated by blank lines, list items by their spread. */
class Serializer {
  readonly footnotes = new Set<string>();
  /** The paragraphs made from runs of inline content that stood directly in a block list. */
  readonly #runs = new WeakSet<Node>();

  write(root: unknown): string {
    this.#collectFootnotes(root);
    const nodes = isNode(root) ? (childrenOf(root) ?? (typeOf(root) === 'root' ? [] : [root])) : [];
    const body = this.#render(this.#group(nodes), 'block').join('\n\n');
    return body ? `${body}\n` : '';
  }

  #collectFootnotes(node: unknown): void {
    if (!isNode(node)) return;
    if (typeOf(node) === 'footnoteDefinition')
      this.footnotes.add(normalizeLabel(definitionLabel(node)));
    for (const child of childrenOf(node) ?? []) this.#collectFootnotes(child);
  }

  /**
   * Blocks in document order: unknown wrappers give their children, and a run of inline content
   * (with admitted elements that hold no blocks) a paragraph.
   */
  #group(nodes: readonly unknown[]): Node[] {
    const flat: { readonly node: Node; readonly inline: boolean }[] = [];
    const expand = (list: readonly unknown[]): void => {
      for (const node of list) {
        if (!isNode(node)) continue;
        const type = typeOf(node);
        if (type === 'element' && tagNameOf(node) === null) expand(childrenOf(node) ?? []);
        else if (type === 'element') flat.push({ node, inline: !holdsBlocks(node) });
        else if (isBlockType(type) || isInlineType(type))
          flat.push({ node, inline: isInlineType(type) });
        else if (childrenOf(node)) expand(childrenOf(node)!);
        else if (typeof node.value === 'string')
          flat.push({ node: { type: 'text', value: node.value }, inline: true });
      }
    };
    expand(nodes);
    const out: Node[] = [];
    let run: Node[] | null = null;
    for (const { node, inline } of flat) {
      if (!inline) {
        run = null;
        out.push(node);
      } else if (run) run.push(node);
      else {
        run = [node];
        const paragraph: Node = { type: 'paragraph', children: run };
        this.#runs.add(paragraph);
        out.push(paragraph);
      }
    }
    return out;
  }

  /** The written blocks' text. */
  #render(blocks: readonly Node[], lead: Lead): string[] {
    return this.#written(blocks, lead).map((block) => block.text);
  }

  /** The written blocks; adjacent lists of one kind alternate their markers so they stay two. */
  #written(blocks: readonly Node[], lead: Lead): Written[] {
    const out: Written[] = [];
    let previous = null as { ordered: boolean; alternate: boolean } | null;
    for (const block of blocks) {
      let text: string;
      if (typeOf(block) === 'list') {
        const ordered = block.ordered === true;
        // A bullet list that opens a `-` item's line uses `+`: three dashes would be a rule.
        const opening = !out.length && lead === 'dash' && !ordered;
        const alternate: boolean =
          opening || (previous?.ordered === ordered && !previous.alternate);
        text = this.#list(block, alternate);
        if (text) previous = { ordered, alternate };
      } else {
        text = this.#block(block, out.length ? 'block' : lead);
        if (text) previous = null;
      }
      if (text) out.push({ text, node: block });
    }
    return out;
  }

  #block(node: Node, lead: Lead): string {
    switch (typeOf(node)) {
      case 'paragraph': {
        const children = childrenOf(node) ?? [];
        // A paragraph without content is a line of whitespace the parser trims but does not
        // read as blank: a no-break space.
        return children.length ? this.#paragraph(children, lead, this.#runs.has(node)) : '\u00a0';
      }
      case 'heading':
        return this.#heading(node);
      case 'thematicBreak':
        return '***';
      case 'blockquote':
        return prefix(
          this.#render(this.#group(childrenOf(node) ?? []), 'block').join('\n\n'),
          '> ',
          '> ',
          '>',
        );
      case 'alert':
        return this.#alert(node);
      case 'code':
        return fencedCode(
          stringOf(node.value),
          typeof node.lang === 'string' ? node.lang : null,
          typeof node.meta === 'string' ? node.meta : null,
        );
      case 'html':
        return stringOf(node.value);
      case 'table':
        return this.#table(node);
      case 'footnoteDefinition':
        return prefix(
          this.#render(this.#group(childrenOf(node) ?? []), 'block').join('\n\n'),
          `[^${definitionLabel(node)}]: `,
          '    ',
          '',
        );
      case 'element':
        return this.#element(node);
      default:
        return '';
    }
  }

  #paragraph(children: readonly unknown[], lead: Lead, loose = false): string {
    return new InlineWriter(this.footnotes, {
      lines: true,
      lead,
      cell: false,
      heading: false,
      loose,
    }).write(children);
  }

  #heading(node: Node): string {
    const depth =
      typeof node.depth === 'number' && node.depth >= 1 ? Math.min(6, Math.floor(node.depth)) : 1;
    const children = childrenOf(node) ?? [];
    // A heading over several lines is a setext heading; ATX headings hold one line.
    if (depth <= 2 && hasLineBreak(children)) {
      const content = this.#paragraph(children, 'block');
      if (content) return `${content}\n${depth === 1 ? '===' : '---'}`;
    }
    const content = new InlineWriter(this.footnotes, {
      lines: false,
      lead: 'none',
      cell: false,
      heading: true,
      loose: false,
    }).write(children);
    return content ? `${'#'.repeat(depth)} ${content}` : '#'.repeat(depth);
  }

  #list(node: Node, alternate: boolean): string {
    const ordered = node.ordered === true;
    const items = (childrenOf(node) ?? []).filter(isNode);
    if (!items.length) return '';
    let ordinal =
      typeof node.start === 'number' && Number.isInteger(node.start) && node.start >= 0
        ? Math.min(node.start, MAX_ORDINAL)
        : 1;
    const written = items.map((item) => {
      const marker = ordered
        ? `${Math.min(ordinal++, MAX_ORDINAL)}${alternate ? ')' : '.'}`
        : alternate
          ? '+'
          : '-';
      return this.#item(item, marker);
    });
    return written.join(node.spread === true ? '\n\n' : '\n');
  }

  #item(item: Node, marker: string): string {
    const blocks = this.#group(typeOf(item) === 'listItem' ? (childrenOf(item) ?? []) : [item]);
    const checked = item.checked === true ? 'x' : item.checked === false ? ' ' : null;
    const parts: Written[] = [];
    const head = blocks[0] !== undefined && typeOf(blocks[0]) === 'paragraph' ? blocks[0] : null;
    if (checked === null) parts.push(...this.#written(blocks, marker === '-' ? 'dash' : 'item'));
    else {
      // The task marker needs a space after it, even before no text.
      const text = head ? this.#paragraph(childrenOf(head) ?? [], 'none') : '';
      parts.push({ text: `[${checked}] ${text}`, node: head ?? { type: 'paragraph' } });
      parts.push(...this.#written(head ? blocks.slice(1) : blocks, 'block'));
    }
    const spread = item.spread === true;
    const body = parts.reduce((text, part, index) => {
      if (index === 0) return part.text;
      const previous = parts[index - 1]!;
      const blank = spread || needsBlank(previous.node, previous.text, part.node, part.text);
      return `${text}${blank ? '\n\n' : '\n'}${part.text}`;
    }, '');
    return prefix(body, `${marker} `, ' '.repeat(marker.length + 1), '');
  }

  /** A GitHub alert: the marker line, then the content of the quote. */
  #alert(node: Node): string {
    const kind = stringOf(node.kind).toLowerCase();
    const blocks = this.#group(childrenOf(node) ?? []);
    if (!ALERT_KINDS.includes(kind))
      return prefix(this.#render(blocks, 'block').join('\n\n'), '> ', '> ', '>');
    const marker = `[!${kind.toUpperCase()}]`;
    const head = blocks[0];
    // A first paragraph continues the marker's line; another first block follows a blank line.
    const first =
      head !== undefined && typeOf(head) === 'paragraph'
        ? this.#paragraph(childrenOf(head) ?? [], 'continuation')
        : '';
    const rest = this.#render(first ? blocks.slice(1) : blocks, 'block');
    const body = [first ? `${marker}\n${first}` : marker, ...rest].join('\n\n');
    return prefix(body, '> ', '> ', '>');
  }

  #table(node: Node): string {
    const rows = (childrenOf(node) ?? []).filter(isNode);
    const header = rows[0];
    if (!header) return '';
    const cellsOf = (row: Node): Node[] =>
      typeOf(row) === 'tableRow' ? (childrenOf(row) ?? []).filter(isNode) : [row];
    const width = Math.max(1, cellsOf(header).length);
    const align = Array.isArray(node.align) ? node.align : [];
    const line = (row: Node): string => {
      const cells = cellsOf(row);
      const written: string[] = [];
      for (let index = 0; index < width; index++) {
        const cell = cells[index];
        written.push(
          cell
            ? new InlineWriter(this.footnotes, {
                lines: false,
                lead: 'none',
                cell: true,
                heading: false,
                loose: false,
              }).write(typeOf(cell) === 'tableCell' ? (childrenOf(cell) ?? []) : [cell])
            : '',
        );
      }
      return `| ${written.join(' | ')} |`;
    };
    const delimiter = Array.from({ length: width }, (_, index) => alignDelimiter(align[index]));
    return [line(header), `| ${delimiter.join(' | ')} |`, ...rows.slice(1).map(line)].join('\n');
  }

  /** An admitted element at block level: its tags on lines of their own around its content. */
  #element(node: Node): string {
    const name = tagNameOf(node)!;
    const open = openTag(name, node.attributes);
    if (VOID_ELEMENTS.has(name.toLowerCase())) return open;
    const content = this.#render(this.#group(childrenOf(node) ?? []), 'block').join('\n\n');
    return content ? `${open}\n\n${content}\n\n</${name}>` : `${open}\n\n</${name}>`;
  }
}

/** A last resort for values that are not trees (cycles, throwing getters): their text only. */
function plainText(root: unknown): string {
  try {
    const values: string[] = [];
    const seen = new Set<unknown>();
    const stack: unknown[] = [root];
    while (stack.length) {
      const node = stack.pop();
      if (!isNode(node) || seen.has(node)) continue;
      seen.add(node);
      if (typeof node.value === 'string') values.push(node.value);
      const children = childrenOf(node);
      if (children)
        for (let index = children.length - 1; index >= 0; index--) stack.push(children[index]);
    }
    const text = values
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g, '\\$&');
    return text ? `${text}\n` : '';
  } catch {
    return '';
  }
}

/**
 * Writes a tree in the tree model as markdown source. Parsing the result with `parseMarkdown`
 * gives back every tree that parser produces, apart from source positions.
 */
export function serializeMarkdown(root: MarkdownRoot): string {
  try {
    return new Serializer().write(root);
  } catch {
    return plainText(root);
  }
}
