/**
 * Structural DOM for the text editor's HTML importer (Widgets `uwg-te-req-content-3`).
 *
 * The HTML importer walks structural nodes rather than DOM classes, so that Node tests feed it
 * trees built without a DOM and no module touches a DOM when it is imported. A real `Element` and
 * its children satisfy these types. `parseHtmlDocument` is the entry for HTML strings: at call
 * time it parses with a `DOMParser` into an inert document, which runs no script and loads
 * nothing, and returns that document's body without attaching it to a live document.
 */

/** Any node: an element, text, or another node such as a comment, which the importer skips. */
export interface NodeLike {
  readonly nodeType: number;
}

/** A text node (node type 3) or a CDATA section (node type 4). */
export interface TextLike extends NodeLike {
  readonly data: string;
}

/** An attribute with its lowercase name. */
export interface AttributeLike {
  readonly name: string;
  readonly value: string;
}

/** An element (node type 1). */
export interface ElementLike extends NodeLike {
  /** The element name, lowercase for HTML elements. */
  readonly localName: string;
  readonly childNodes: ArrayLike<NodeLike>;
  readonly attributes: ArrayLike<AttributeLike>;
  getAttribute(name: string): string | null;
}

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const CDATA_SECTION_NODE = 4;

/** Whether a node is an element. */
export function isElementLike(node: NodeLike): node is ElementLike {
  return node.nodeType === ELEMENT_NODE;
}

/** Whether a node holds text: a text node or a CDATA section. */
export function isTextLike(node: NodeLike): node is TextLike {
  return node.nodeType === TEXT_NODE || node.nodeType === CDATA_SECTION_NODE;
}

/** What `parseHtmlDocument` needs of a window: its `DOMParser`. */
export interface HtmlParserView {
  readonly DOMParser: typeof DOMParser;
}

/**
 * The attribute that holds an element's `style` text in a parsed tree. An inert document follows
 * the content-security policy of the page, so parsing a `style` attribute under `style-src` without
 * `'unsafe-inline'` reports a violation although nothing renders; the attribute is renamed before
 * parsing and the importer reads its declarations from here (Foundation `node-003102`).
 */
export const PARSED_STYLE_ATTRIBUTE = 'data-tp-parsed-style';

/** Elements whose content is raw text up to their end tag, where no tag starts. */
const RAW_TEXT =
  /^(?:script|style|textarea|title|xmp|iframe|noembed|noframes|noscript|plaintext)$/iu;

/**
 * Renames every `style` attribute of the tags of an HTML string to `PARSED_STYLE_ATTRIBUTE`,
 * following the tokenizer's tag, attribute and quoting rules, so that text, comments, attribute
 * values and raw-text content are copied unchanged.
 */
export function renameStyleAttributes(html: string): string {
  const lower = html.toLowerCase();
  if (!lower.includes('style')) return html;
  let out = '';
  let index = 0;
  const length = html.length;
  const isSpace = (char: string | undefined) =>
    char === ' ' || char === '\t' || char === '\n' || char === '\r' || char === '\f';
  while (index < length) {
    const open = html.indexOf('<', index);
    if (open < 0) break;
    out += html.slice(index, open);
    index = open;
    if (html.startsWith('<!--', index)) {
      const close = html.indexOf('-->', index + 4);
      const end = close < 0 ? length : close + 3;
      out += html.slice(index, end);
      index = end;
      continue;
    }
    const next = html[index + 1] ?? '';
    if (!/[a-z]/iu.test(next)) {
      // An end tag, a declaration or a lone `<`: copied up to the next `>` or as one character.
      const close = next === '/' || next === '!' || next === '?' ? html.indexOf('>', index) : -1;
      const end = close < 0 ? index + 1 : close + 1;
      out += html.slice(index, end);
      index = end;
      continue;
    }
    // A start tag: its name, then attributes up to `>`.
    let cursor = index + 1;
    while (
      cursor < length &&
      !isSpace(html[cursor]) &&
      html[cursor] !== '/' &&
      html[cursor] !== '>'
    )
      cursor += 1;
    const name = html.slice(index + 1, cursor);
    out += html.slice(index, cursor);
    while (cursor < length && html[cursor] !== '>') {
      const char = html[cursor];
      if (isSpace(char) || char === '/') {
        out += char;
        cursor += 1;
        continue;
      }
      let end = cursor;
      while (
        end < length &&
        !isSpace(html[end]) &&
        html[end] !== '/' &&
        html[end] !== '>' &&
        (html[end] !== '=' || end === cursor)
      )
        end += 1;
      const attribute = html.slice(cursor, end);
      out += attribute.toLowerCase() === 'style' ? PARSED_STYLE_ATTRIBUTE : attribute;
      cursor = end;
      let after = cursor;
      while (after < length && isSpace(html[after])) after += 1;
      if (html[after] !== '=') continue;
      after += 1;
      while (after < length && isSpace(html[after])) after += 1;
      const quote = html[after];
      let valueEnd: number;
      if (quote === '"' || quote === "'") {
        const close = html.indexOf(quote, after + 1);
        valueEnd = close < 0 ? length : close + 1;
      } else {
        valueEnd = after;
        while (valueEnd < length && !isSpace(html[valueEnd]) && html[valueEnd] !== '>')
          valueEnd += 1;
      }
      out += html.slice(cursor, valueEnd);
      cursor = valueEnd;
    }
    if (cursor < length) {
      out += '>';
      cursor += 1;
    }
    index = cursor;
    if (RAW_TEXT.test(name)) {
      const close = lower.indexOf(`</${name.toLowerCase()}`, index);
      const end = close < 0 ? length : close;
      out += html.slice(index, end);
      index = end;
    }
  }
  return out + html.slice(index);
}

/**
 * Parses an HTML string into an inert document and returns its body, or `null` where no
 * `DOMParser` exists, as in Node. The parser comes from `view` when one is given, otherwise from
 * the global scope at call time; the parsed tree is never attached to a live document. Its
 * `style` attributes are read from `PARSED_STYLE_ATTRIBUTE` (`renameStyleAttributes`).
 */
export function parseHtmlDocument(html: string, view?: HtmlParserView | null): ElementLike | null {
  const Parser = view ? view.DOMParser : (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (typeof Parser !== 'function') return null;
  return new Parser().parseFromString(renameStyleAttributes(String(html)), 'text/html').body;
}
