/**
 * Inline structure (CommonMark §6) with the GitHub Flavored Markdown strikethrough, footnote
 * reference and extended autolink extensions. Follows the reference implementation's delimiter
 * and bracket stacks; nodes live in doubly linked lists until they are materialized as mdast.
 */
import { decodeEntity, ENTITY } from './entities.js';
import { HTML_TAG } from './html.js';
import type { MarkdownInline, MarkdownLink, MarkdownText } from './types.js';

export interface LinkReference {
  readonly url: string;
  readonly title: string | null;
}

export interface InlineContext {
  /** Normalized label to definition; the first definition of a label wins. */
  readonly references: Map<string, LinkReference>;
  /** Normalized labels of footnote definitions. */
  readonly footnotes: ReadonlySet<string>;
}

const ESCAPABLE = /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const ESCAPED = /\\([!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~])/g;
const PUNCTUATION = /[\p{P}\p{S}]/u;
const WHITESPACE = /\s/u;
const LINK_LABEL = /^\[(?:[^\\[\]]|\\.){0,999}\]/s;
const LINK_DESTINATION_BRACES = /^<(?:[^<>\n\\]|\\.)*>/;
const LINK_TITLE = /^(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\((?:\\.|[^()\\])*\))/s;
const EMAIL_AUTOLINK =
  /^<([a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*)>/;
const AUTOLINK = /^<([A-Za-z][A-Za-z0-9.+-]{1,31}:[^<>\p{Cc} ]*)>/u;
const SPNL = /^ *(?:\n *)?/;
const MAIN = /^[^\n`[\]\\!<&*_~]+/;
const SPACE_AT_END_OF_LINE = /^[ \t]*(?:\n|$)/;

/** Removes backslash escapes and decodes character references. */
export function unescapeString(text: string): string {
  return text
    .replace(ESCAPED, '$1')
    .replace(/&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/g, (match) => {
      return decodeEntity(match) ?? match;
    });
}

/** Normalizes a link or footnote label, with or without its brackets, for matching. */
export function normalizeLabel(label: string): string {
  const inner = label.startsWith('[') && label.endsWith(']') ? label.slice(1, -1) : label;
  return inner
    .trim()
    .replace(/[ \t\r\n]+/g, ' ')
    .toLowerCase()
    .toUpperCase();
}

interface List {
  head: Item | null;
  tail: Item | null;
}
interface Item {
  node: MarkdownInline;
  children?: List;
  prev: Item | null;
  next: Item | null;
  list: List;
}
interface Delimiter {
  char: string;
  count: number;
  original: number;
  item: Item;
  canOpen: boolean;
  canClose: boolean;
  prev: Delimiter | null;
  next: Delimiter | null;
}
interface Bracket {
  item: Item;
  index: number;
  image: boolean;
  active: boolean;
  bracketAfter: boolean;
  previous: Bracket | null;
  previousDelimiter: Delimiter | null;
}

function append(list: List, node: MarkdownInline, children?: List): Item {
  const item: Item = { node, prev: list.tail, next: null, list };
  if (children) item.children = children;
  if (list.tail) list.tail.next = item;
  else list.head = item;
  list.tail = item;
  return item;
}
function unlink(item: Item): void {
  if (item.prev) item.prev.next = item.next;
  else item.list.head = item.next;
  if (item.next) item.next.prev = item.prev;
  else item.list.tail = item.prev;
  item.prev = item.next = null;
}
function insertAfter(anchor: Item, item: Item): void {
  item.list = anchor.list;
  item.prev = anchor;
  item.next = anchor.next;
  if (anchor.next) anchor.next.prev = item;
  else anchor.list.tail = item;
  anchor.next = item;
}
/** Moves the items after `from` up to (not including) `until` into a new list. */
function takeAfter(from: Item, until: Item | null): List {
  const list: List = { head: null, tail: null };
  let current = from.next;
  while (current && current !== until) {
    const next = current.next;
    unlink(current);
    current.list = list;
    current.prev = list.tail;
    if (list.tail) list.tail.next = current;
    else list.head = current;
    list.tail = current;
    current = next;
  }
  return list;
}
const text = (value: string): MarkdownText => ({ type: 'text', value });

class InlineParser {
  #subject = '';
  #pos = 0;
  #list: List = { head: null, tail: null };
  #delimiters: Delimiter | null = null;
  #brackets: Bracket | null = null;

  constructor(private readonly context: InlineContext) {}

  parse(subject: string): MarkdownInline[] {
    this.#subject = subject;
    this.#pos = 0;
    this.#list = { head: null, tail: null };
    this.#delimiters = null;
    this.#brackets = null;
    while (this.#pos < subject.length) this.#parseInline();
    this.#processEmphasis(null);
    return materialize(this.#list, false);
  }

  /** Parses a link reference definition at the start of `subject`; returns characters consumed. */
  parseReference(subject: string): number {
    this.#subject = subject;
    this.#pos = 0;
    const length = this.#parseLinkLabel();
    if (!length) return 0;
    const raw = subject.slice(0, length);
    if (this.#peek() !== ':') return 0;
    this.#pos++;
    this.#spnl();
    const url = this.#parseLinkDestination();
    if (url === null) return 0;
    const beforeTitle = this.#pos;
    this.#spnl();
    let title: string | null = null;
    if (this.#pos !== beforeTitle) title = this.#parseLinkTitle();
    if (title === null) this.#pos = beforeTitle;
    let atLineEnd = true;
    if (!this.#match(SPACE_AT_END_OF_LINE)) {
      if (title === null) atLineEnd = false;
      else {
        title = null;
        this.#pos = beforeTitle;
        atLineEnd = this.#match(SPACE_AT_END_OF_LINE) !== null;
      }
    }
    if (!atLineEnd) return 0;
    const label = normalizeLabel(raw);
    if (!label) return 0;
    if (!this.context.references.has(label)) this.context.references.set(label, { url, title });
    return this.#pos;
  }

  #peek(offset = 0): string {
    return this.#subject.charAt(this.#pos + offset);
  }
  #match(pattern: RegExp): string | null {
    const match = pattern.exec(this.#subject.slice(this.#pos));
    if (!match) return null;
    this.#pos += match.index + match[0].length;
    return match[0];
  }
  #spnl(): void {
    this.#match(SPNL);
  }
  #text(value: string): Item {
    return append(this.#list, text(value));
  }

  #parseInline(): void {
    const char = this.#peek();
    switch (char) {
      case '\n':
        this.#parseNewline();
        return;
      case '\\':
        this.#parseBackslash();
        return;
      case '`':
        this.#parseBackticks();
        return;
      case '*':
      case '_':
      case '~':
        this.#handleDelimiters(char);
        return;
      case '[':
        this.#pos++;
        this.#addBracket(this.#text('['), this.#pos - 1, false);
        return;
      case '!':
        this.#pos++;
        if (this.#peek() === '[') {
          this.#pos++;
          this.#addBracket(this.#text('!['), this.#pos - 1, true);
        } else this.#text('!');
        return;
      case ']':
        this.#handleCloseBracket();
        return;
      case '<':
        this.#parseAngle();
        return;
      case '&':
        this.#parseEntity();
        return;
      default: {
        const run = this.#match(MAIN);
        if (run) this.#text(run);
        else {
          this.#text(char);
          this.#pos++;
        }
      }
    }
  }

  #parseNewline(): void {
    this.#pos++;
    const last = this.#list.tail;
    if (last?.node.type === 'text' && !last.children && last.node.value.endsWith(' ')) {
      const hard = last.node.value.endsWith('  ');
      last.node.value = last.node.value.replace(/ +$/, '');
      if (hard) append(this.#list, { type: 'break' });
      else this.#text('\n');
    } else this.#text('\n');
    this.#match(/^ */);
  }

  #parseBackslash(): void {
    this.#pos++;
    if (this.#peek() === '\n') {
      this.#pos++;
      append(this.#list, { type: 'break' });
    } else if (ESCAPABLE.test(this.#peek())) {
      this.#text(this.#peek());
      this.#pos++;
    } else this.#text('\\');
  }

  #parseBackticks(): void {
    const ticks = this.#match(/^`+/)!;
    const afterOpen = this.#pos;
    let found: string | null;
    while ((found = this.#match(/`+/)) !== null) {
      if (found === ticks) {
        let value = this.#subject.slice(afterOpen, this.#pos - ticks.length).replace(/\n/g, ' ');
        if (/[^ ]/.test(value) && value.startsWith(' ') && value.endsWith(' '))
          value = value.slice(1, -1);
        append(this.#list, { type: 'inlineCode', value });
        return;
      }
    }
    this.#pos = afterOpen;
    this.#text(ticks);
  }

  #parseAngle(): void {
    let match: RegExpExecArray | null;
    const rest = this.#subject.slice(this.#pos);
    if ((match = EMAIL_AUTOLINK.exec(rest))) {
      this.#pos += match[0].length;
      append(this.#list, autolink(`mailto:${match[1]!}`, match[1]!));
    } else if ((match = AUTOLINK.exec(rest))) {
      this.#pos += match[0].length;
      append(this.#list, autolink(match[1]!, match[1]!));
    } else if ((match = HTML_TAG.exec(rest))) {
      this.#pos += match[0].length;
      append(this.#list, { type: 'html', value: match[0] });
    } else {
      this.#pos++;
      this.#text('<');
    }
  }

  #parseEntity(): void {
    const match = ENTITY.exec(this.#subject.slice(this.#pos));
    if (match) {
      this.#pos += match[0].length;
      this.#text(decodeEntity(match[0]) ?? match[0]);
    } else {
      this.#pos++;
      this.#text('&');
    }
  }

  #handleDelimiters(char: string): void {
    const start = this.#pos;
    while (this.#peek() === char) this.#pos++;
    const count = this.#pos - start;
    const run = this.#subject.slice(start, this.#pos);
    const item = this.#text(run);
    if (char === '~' && count > 2) return;
    const before = start === 0 ? '\n' : this.#subject.charAt(start - 1);
    const after = this.#pos >= this.#subject.length ? '\n' : this.#peek();
    const afterSpace = WHITESPACE.test(after);
    const afterPunct = PUNCTUATION.test(after);
    const beforeSpace = WHITESPACE.test(before);
    const beforePunct = PUNCTUATION.test(before);
    const left = !afterSpace && (!afterPunct || beforeSpace || beforePunct);
    const right = !beforeSpace && (!beforePunct || afterSpace || afterPunct);
    const canOpen = char === '_' ? left && (!right || beforePunct) : left;
    const canClose = char === '_' ? right && (!left || afterPunct) : right;
    if (!canOpen && !canClose) return;
    const delimiter: Delimiter = {
      char,
      count,
      original: count,
      item,
      canOpen,
      canClose,
      prev: this.#delimiters,
      next: null,
    };
    if (this.#delimiters) this.#delimiters.next = delimiter;
    this.#delimiters = delimiter;
  }

  #removeDelimiter(delimiter: Delimiter): void {
    if (delimiter.prev) delimiter.prev.next = delimiter.next;
    if (delimiter.next) delimiter.next.prev = delimiter.prev;
    else this.#delimiters = delimiter.prev;
  }

  #processEmphasis(bottom: Delimiter | null): void {
    const openersBottom = new Map<string, Delimiter | null>();
    let closer = this.#delimiters === bottom ? null : this.#delimiters;
    while (closer && closer.prev !== bottom) closer = closer.prev;
    while (closer) {
      if (!closer.canClose) {
        closer = closer.next;
        continue;
      }
      const key = `${closer.char}${closer.canOpen ? 1 : 0}${closer.original % 3}`;
      const floor = openersBottom.has(key) ? openersBottom.get(key)! : bottom;
      let opener = closer.prev;
      let found = false;
      while (opener && opener !== bottom && opener !== floor) {
        const oddMatch =
          closer.char !== '~' &&
          (closer.canOpen || opener.canClose) &&
          closer.original % 3 !== 0 &&
          (opener.original + closer.original) % 3 === 0;
        if (
          opener.char === closer.char &&
          opener.canOpen &&
          !oddMatch &&
          (closer.char !== '~' || opener.count === closer.count)
        ) {
          found = true;
          break;
        }
        opener = opener.prev;
      }
      const oldCloser = closer;
      if (found && opener) {
        const use =
          closer.char === '~' ? closer.count : closer.count >= 2 && opener.count >= 2 ? 2 : 1;
        const openerItem = opener.item;
        const closerItem = closer.item;
        opener.count -= use;
        closer.count -= use;
        (openerItem.node as MarkdownText).value = (openerItem.node as MarkdownText).value.slice(
          0,
          -use,
        );
        (closerItem.node as MarkdownText).value = (closerItem.node as MarkdownText).value.slice(
          0,
          -use,
        );
        const type = closer.char === '~' ? 'delete' : use === 1 ? 'emphasis' : 'strong';
        const children = takeAfter(openerItem, closerItem);
        const wrapper: Item = {
          node: { type, children: [] },
          children,
          prev: null,
          next: null,
          list: openerItem.list,
        };
        insertAfter(openerItem, wrapper);
        // Delimiters between the opener and closer can no longer match.
        let between = closer.prev;
        while (between && between !== opener) {
          const previous = between.prev;
          this.#removeDelimiter(between);
          between = previous;
        }
        if (opener.count === 0) {
          unlink(openerItem);
          this.#removeDelimiter(opener);
        }
        if (closer.count === 0) {
          const next = closer.next;
          unlink(closerItem);
          this.#removeDelimiter(closer);
          closer = next;
        }
      } else {
        closer = closer.next;
        openersBottom.set(
          `${oldCloser.char}${oldCloser.canOpen ? 1 : 0}${oldCloser.original % 3}`,
          oldCloser.prev,
        );
        if (!oldCloser.canOpen) this.#removeDelimiter(oldCloser);
      }
    }
    while (this.#delimiters && this.#delimiters !== bottom) this.#removeDelimiter(this.#delimiters);
  }

  #addBracket(item: Item, index: number, image: boolean): void {
    if (this.#brackets) this.#brackets.bracketAfter = true;
    this.#brackets = {
      item,
      index,
      image,
      active: true,
      bracketAfter: false,
      previous: this.#brackets,
      previousDelimiter: this.#delimiters,
    };
  }

  #parseLinkLabel(): number {
    const match = LINK_LABEL.exec(this.#subject.slice(this.#pos));
    if (!match || match[0].length > 1001) return 0;
    this.#pos += match[0].length;
    return match[0].length;
  }

  #parseLinkDestination(): string | null {
    const braces = this.#match(LINK_DESTINATION_BRACES);
    if (braces) return unescapeString(braces.slice(1, -1));
    if (this.#peek() === '<') return null;
    const start = this.#pos;
    let depth = 0;
    let char: string;
    while ((char = this.#peek()) !== '') {
      if (char === '\\' && ESCAPABLE.test(this.#peek(1))) this.#pos += 2;
      else if (char === '(') {
        this.#pos++;
        depth++;
      } else if (char === ')') {
        if (depth < 1) break;
        this.#pos++;
        depth--;
      } else if (/[\s\p{Cc}]/u.test(char)) break;
      else this.#pos++;
    }
    if (this.#pos === start && char !== ')') return null;
    if (depth !== 0) return null;
    return unescapeString(this.#subject.slice(start, this.#pos));
  }

  #parseLinkTitle(): string | null {
    const title = this.#match(LINK_TITLE);
    return title === null ? null : unescapeString(title.slice(1, -1));
  }

  #handleCloseBracket(): void {
    this.#pos++;
    const startPos = this.#pos;
    const opener = this.#brackets;
    if (!opener) {
      this.#text(']');
      return;
    }
    if (!opener.active) {
      this.#text(']');
      this.#brackets = opener.previous;
      return;
    }
    let url: string | null = null;
    let title: string | null = null;
    let matched = false;
    const savePos = this.#pos;
    if (this.#peek() === '(') {
      this.#pos++;
      this.#spnl();
      url = this.#parseLinkDestination();
      if (url !== null) {
        const beforeTitle = this.#pos;
        this.#spnl();
        if (this.#pos > beforeTitle || /\s/.test(this.#subject.charAt(this.#pos - 1)))
          title = this.#parseLinkTitle();
        this.#spnl();
        if (this.#peek() === ')') {
          this.#pos++;
          matched = true;
        }
      }
      if (!matched) {
        this.#pos = savePos;
        url = title = null;
      }
    }
    const inner = this.#subject.slice(opener.index + 1, startPos - 1);
    if (!matched && !opener.image && inner.startsWith('^') && this.#peek() !== '(') {
      const label = inner.slice(1);
      if (this.context.footnotes.has(normalizeLabel(label))) {
        takeAfter(opener.item, null);
        const anchor = opener.item;
        append(this.#list, {
          type: 'footnoteReference',
          identifier: label.toLowerCase(),
          label,
        });
        unlink(anchor);
        this.#brackets = opener.previous;
        while (this.#delimiters && this.#delimiters !== opener.previousDelimiter)
          this.#removeDelimiter(this.#delimiters);
        return;
      }
    }
    if (!matched) {
      const beforeLabel = this.#pos;
      const length = this.#parseLinkLabel();
      let label: string | null = null;
      if (length > 2) label = this.#subject.slice(beforeLabel, beforeLabel + length);
      else if (!opener.bracketAfter) label = this.#subject.slice(opener.index, startPos);
      if (length === 0) this.#pos = savePos;
      if (label) {
        const reference = this.context.references.get(normalizeLabel(label));
        if (reference) {
          url = reference.url;
          title = reference.title;
          matched = true;
        }
      }
    }
    if (!matched) {
      this.#brackets = opener.previous;
      this.#pos = startPos;
      this.#text(']');
      return;
    }
    const children = takeAfter(opener.item, null);
    const node: MarkdownInline = opener.image
      ? { type: 'image', url: url!, title, alt: '' }
      : { type: 'link', url: url!, title, children: [] };
    append(this.#list, node, children);
    // Delimiters inside the link text now live in the link's child list.
    this.#processEmphasis(opener.previousDelimiter);
    this.#brackets = opener.previous;
    unlink(opener.item);
    if (!opener.image)
      for (let bracket = this.#brackets; bracket; bracket = bracket.previous)
        if (!bracket.image) bracket.active = false;
  }
}

function autolink(url: string, label: string): MarkdownLink {
  return { type: 'link', url, title: null, children: [text(label)] };
}

/** Plain text of inline content, for image alternative text. */
export function inlineText(nodes: readonly MarkdownInline[]): string {
  return nodes
    .map((node) =>
      node.type === 'text' || node.type === 'inlineCode'
        ? node.value
        : node.type === 'image'
          ? node.alt
          : node.type === 'break'
            ? '\n'
            : 'children' in node
              ? inlineText(node.children as MarkdownInline[])
              : '',
    )
    .join('');
}

function materialize(list: List, inLink: boolean): MarkdownInline[] {
  const out: MarkdownInline[] = [];
  for (let item = list.head; item; item = item.next) {
    const node = item.node;
    if (item.children) {
      const children = materialize(item.children, inLink || node.type === 'link');
      if (node.type === 'image') node.alt = inlineText(children);
      else (node as { children: MarkdownInline[] }).children = children;
    }
    const last = out.at(-1);
    if (node.type === 'text') {
      if (!node.value) continue;
      if (last?.type === 'text') {
        last.value += node.value;
        continue;
      }
    }
    out.push(node);
  }
  return inLink
    ? out
    : out.flatMap((node) => (node.type === 'text' ? extendedAutolinks(node.value) : [node]));
}

const AUTOLINK_CANDIDATE =
  /(?:https?:\/\/|www\.)[^\s<]+|[A-Za-z0-9._+-]+@[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+/g;

/** GitHub Flavored Markdown extended www, URL and email autolinks inside plain text. */
function extendedAutolinks(value: string): MarkdownInline[] {
  if (!/www\.|:\/\/|@/.test(value)) return [text(value)];
  const out: MarkdownInline[] = [];
  let last = 0;
  for (const match of value.matchAll(AUTOLINK_CANDIDATE)) {
    const start = match.index;
    const before = start > 0 ? value.charAt(start - 1) : '';
    if (before && !/[\s*_~(]/.test(before)) continue;
    let candidate = match[0];
    const email = !/^(?:https?:\/\/|www\.)/.test(candidate);
    if (email) {
      candidate = candidate.replace(/\.+$/, '');
      if (/[-_]$/.test(candidate) || !/\.[A-Za-z0-9-]*[A-Za-z0-9]$/.test(candidate)) continue;
    } else {
      candidate = trimAutolink(candidate);
      const domain = candidate.replace(/^https?:\/\//, '').split(/[/?#]/)[0] ?? '';
      const segments = domain.split('.');
      if (
        segments.length < 2 ||
        segments.slice(-2).some((segment) => segment.includes('_')) ||
        segments.some((segment) => !segment)
      )
        continue;
    }
    if (start > last) out.push(text(value.slice(last, start)));
    const url = email
      ? `mailto:${candidate}`
      : candidate.startsWith('www.')
        ? `http://${candidate}`
        : candidate;
    out.push(autolink(url, candidate));
    last = start + candidate.length;
  }
  if (last < value.length) out.push(text(value.slice(last)));
  return out;
}

function trimAutolink(candidate: string): string {
  let result = candidate;
  for (;;) {
    const previous = result;
    result = result.replace(/[?!.,:*_~'"]+$/, '');
    if (result.endsWith(')')) {
      const open = (result.match(/\(/g) ?? []).length;
      const close = (result.match(/\)/g) ?? []).length;
      if (close > open) result = result.slice(0, -1);
    }
    result = result.replace(/&[A-Za-z0-9]+;$/, '');
    if (result === previous) return result;
  }
}

/** Parses inline content against the document's reference and footnote definitions. */
export function parseInlines(subject: string, context: InlineContext): MarkdownInline[] {
  return new InlineParser(context).parse(subject);
}

/** Parses one link reference definition at the start of `subject`; returns characters consumed. */
export function parseReference(subject: string, context: InlineContext): number {
  return new InlineParser(context).parseReference(subject);
}
