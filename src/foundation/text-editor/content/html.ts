/**
 * Portable HTML of the text editor (Widgets `uwg-te-req-content-2`, `uwg-te-req-content-3`,
 * `uwg-te-req-content-6`, `uwg-te-tab-content-model`, `uwg-te-tab-vocabulary`).
 *
 * The serializer writes one canonical profile from the portable model: the semantic elements of
 * the content model, block identifiers in `data-id`, palette names in `data-color` and
 * `data-background`, a logical `text-align` and the `col` width as the only inline styles, links
 * with `href` only, images with `src`, `alt` and an optional `width`, custom nodes as their
 * definition's element with the node name in `data-type`, and marks nested link, text color,
 * highlight, bold, italic, underline, strike, superscript or subscript, code. Runs of spaces, in
 * which a tab or a no-break space outside a code block counts as a space, alternate no-break
 * spaces with spaces so that they survive whitespace collapsing, and a hard break that ends a
 * block is followed by a second `br`. It never writes engine classes or attributes, theme
 * classes, literal colors or a line break in an empty block.
 *
 * The importer walks a structural tree (`content/dom.ts`) with its own element mapping: the
 * profile, `b`, `i` and `del` as aliases, a `mark` without a palette name as a yellow highlight,
 * the class vocabulary that adapters render, and every other element unwrapped with its content
 * kept, a block-level one keeping its text apart from its neighbors'. It reads `text-align` and
 * `width` from `style` before the shared Markdown policies filter attributes: the removal rule and
 * the link and image URL policy, which come from the Markdown owner instead of being restated
 * here. Scripts, styles and embedded frames that no custom definition parses are dropped, with
 * unknown attributes and color names outside the palette; ASCII whitespace collapses as a browser
 * collapses it outside `pre`; and the result is canonicalized as imported content.
 *
 * The clipboard writer and reader record whether the HTML holds a text range or whole blocks;
 * HTML without the record reads as a text range.
 */
import { VOID_ELEMENTS } from '../../markdown/html.js';
import {
  IMAGE_URL_ATTRIBUTES,
  isAlwaysRemovedAttribute,
  LINK_URL_ATTRIBUTES,
} from '../../markdown/resolve.js';
import type { MarkdownUrlPolicy } from '../../markdown/types.js';
import { allowedUrl, imageProtocols, linkProtocols } from '../../markdown/url.js';
import type { TextEditorDiagnostic } from '../engine.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorHeadingLevel,
  TextEditorListKind,
} from '../model.js';
import {
  ELEMENT_NAME,
  type TextEditorInlineDefinition,
  type TextEditorNodeDefinition,
} from '../nodes.js';
import { isTextEditorColor } from '../palette.js';
import { isElementLike, isTextLike, type ElementLike, type NodeLike } from './dom.js';
import {
  canonicalize,
  customNodeAttributes,
  definitionAttributes,
  inlineTree,
  isListItem,
  nodeLookup,
  outputBlocks,
  tableGrid,
  type TextEditorNodeLookup,
  type TextEditorPortableBlock,
  type TextEditorPortableCustomBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableDraftTableCell,
  type TextEditorPortableFragment,
  type TextEditorPortableInline,
  type TextEditorPortableInlineNode,
  type TextEditorPortableInlineTree,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
  type TextEditorPortableTable,
} from './portable.js';

// Writing (uwg-te-req-content-2)

export interface TextEditorHtmlWriteOptions {
  /** The custom node definitions, whose elements and attributes custom nodes are written with. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
}

const NO_BREAK_SPACE = '\u00a0';
/** Characters that count as a space of a run outside a code block. */
const SPACE_LIKE = /^[\t\n\f\r \u00a0]$/u;

const escapeText = (text: string): string =>
  text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/\u00a0/gu, '&nbsp;');

const escapeAttribute = (value: string): string =>
  value
    .replace(/&/gu, '&amp;')
    .replace(/"/gu, '&quot;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;');

type Attributes = readonly (readonly [name: string, value: string | null | undefined])[];

/** An open tag; an attribute without a value is left out. */
function openTag(tag: string, attributes: Attributes = []): string {
  let html = `<${tag}`;
  for (const [name, value] of attributes)
    if (value !== null && value !== undefined) html += ` ${name}="${escapeAttribute(value)}"`;
  return `${html}>`;
}

/** The inline style of a stored alignment: center, end or justify; start writes none. */
const alignStyle = (align: TextEditorAlign | undefined): string | null =>
  align && align !== 'start' ? `text-align: ${align}` : null;

/**
 * How a run of `length` spaces is written: never two collapsible spaces side by side, and a
 * no-break space where a line starts or ends, so that every space survives collapsing.
 */
function spaceRun(length: number, lineStart: boolean, lineEnd: boolean): string[] {
  if (length === 1 && !lineStart && !lineEnd) return [' '];
  const run: string[] = [];
  for (let index = 0; index < length; index += 1)
    run.push((index % 2 === 0) === lineStart ? NO_BREAK_SPACE : ' ');
  if (lineEnd && run[length - 1] === ' ') run[length - 1] = NO_BREAK_SPACE;
  return run;
}

/**
 * Inline content with its spaces written to survive collapsing: each run of spaces, tabs and
 * no-break spaces, across text runs and inline code included, becomes spaces alternating with
 * no-break spaces. A hard break and the edges of the block end a line; an inline node does not.
 */
function collapseProof(
  content: readonly TextEditorPortableInline[],
): readonly TextEditorPortableInline[] {
  const texts = content.map((node) => (node.type === 'text' ? [...node.text] : []));
  let positions: (readonly [node: number, offset: number])[] = [];
  let lineStart = true;
  let runAtLineStart = true;
  const flush = (lineEnd: boolean) => {
    if (positions.length === 0) return;
    const run = spaceRun(positions.length, runAtLineStart, lineEnd);
    positions.forEach(([node, offset], index) => {
      texts[node]![offset] = run[index]!;
    });
    positions = [];
  };
  content.forEach((node, index) => {
    if (node.type === 'text')
      texts[index]!.forEach((char, offset) => {
        if (SPACE_LIKE.test(char)) {
          if (positions.length === 0) runAtLineStart = lineStart;
          positions.push([index, offset]);
        } else {
          flush(false);
          lineStart = false;
        }
      });
    else {
      flush(node.type === 'hard-break');
      lineStart = node.type === 'hard-break';
    }
  });
  flush(true);
  return content.map((node, index) =>
    node.type === 'text' ? { ...node, text: texts[index]!.join('') } : node,
  );
}

/** The text an inline node shows, by its definition; nothing when the definition throws. */
function nodeText(definition: TextEditorInlineDefinition, attrs: TextEditorAttributes): string {
  try {
    const text = definition.text(attrs);
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

const MARK_TAGS = {
  bold: 'strong',
  italic: 'em',
  underline: 'u',
  strike: 's',
  superscript: 'sup',
  subscript: 'sub',
  code: 'code',
} as const;

class HtmlWriter {
  readonly #lookup: TextEditorNodeLookup;

  constructor(nodes: readonly TextEditorNodeDefinition[] | undefined) {
    this.#lookup = nodeLookup(nodes);
  }

  /** Blocks in order; consecutive list items of one kind form one list. */
  blocks(blocks: readonly TextEditorPortableBlock[], separator: string): string {
    const parts: string[] = [];
    let index = 0;
    while (index < blocks.length) {
      const block = blocks[index]!;
      if (!isListItem(block)) {
        parts.push(this.#block(block));
        index += 1;
        continue;
      }
      let end = index + 1;
      while (end < blocks.length && blocks[end]!.type === block.type) end += 1;
      parts.push(this.#list(blocks.slice(index, end) as TextEditorPortableListItem[]));
      index = end;
    }
    return parts.join(separator);
  }

  #block(block: TextEditorPortableBlock): string {
    switch (block.type) {
      case 'paragraph':
        return this.#textblock(
          'p',
          [
            ['data-id', block.id],
            ['style', alignStyle(block.align)],
          ],
          block.content,
        );
      case 'heading':
        return this.#textblock(
          `h${block.level}`,
          [
            ['data-id', block.id],
            ['style', alignStyle(block.align)],
          ],
          block.content,
        );
      case 'quote': {
        const open = openTag('blockquote', [
          ['data-id', block.id],
          ['style', alignStyle(block.align)],
        ]);
        return `${open}${this.#textblock('p', [], block.content)}</blockquote>`;
      }
      case 'code': {
        const code = openTag('code', [
          ['class', block.language ? `language-${block.language}` : null],
        ]);
        return `${openTag('pre', [['data-id', block.id]])}${code}${escapeText(block.text)}</code></pre>`;
      }
      case 'divider':
        return openTag('hr', [['data-id', block.id]]);
      case 'image':
        return openTag('img', [
          ['data-id', block.id],
          ['src', block.src],
          ['alt', block.alt],
          ['width', block.width === undefined ? null : String(block.width)],
        ]);
      case 'table':
        return this.#table(block);
      case 'custom':
        return this.#customBlock(block);
      default:
        return this.#list([block]);
    }
  }

  /** A textblock: its inline content, and a second `br` after a hard break that ends it. */
  #textblock(
    tag: string,
    attributes: Attributes,
    content: readonly TextEditorPortableInline[],
  ): string {
    const extra = content[content.length - 1]?.type === 'hard-break' ? '<br>' : '';
    return `${openTag(tag, attributes)}${this.#inline(content)}${extra}</${tag}>`;
  }

  #list(items: readonly TextEditorPortableListItem[]): string {
    const first = items[0]!;
    const ordered = first.type === 'list-ordered';
    const open = ordered
      ? openTag('ol', [['start', first.start === undefined ? null : String(first.start)]])
      : openTag('ul', [['data-type', first.type === 'list-task' ? 'task' : null]]);
    const tag = ordered ? 'ol' : 'ul';
    return `${open}${items.map((item) => this.#item(item)).join('')}</${tag}>`;
  }

  /** An item: its paragraph, which holds the item's alignment, then its nested lists. */
  #item(item: TextEditorPortableListItem): string {
    const open = openTag('li', [
      ['data-id', item.id],
      ['data-checked', item.type === 'list-task' ? String(item.checked) : null],
    ]);
    const paragraph = this.#textblock('p', [['style', alignStyle(item.align)]], item.content);
    return `${open}${paragraph}${this.blocks(item.children, '')}</li>`;
  }

  /**
   * A table: its column widths, the header row in `thead`, header cells as `th`, those of the
   * header column with row scope, and every cell holding its paragraphs.
   */
  #table(table: TextEditorPortableTable): string {
    const grid = tableGrid(table);
    const rows: string[] = table.rows.map(() => '');
    for (const placed of grid.cells) {
      const { cell } = placed;
      const headerColumn = table.headerColumn && placed.column === 0;
      const tag = headerColumn || (table.headerRow && placed.row === 0) ? 'th' : 'td';
      const open = openTag(tag, [
        ['scope', headerColumn ? 'row' : null],
        ['colspan', placed.colSpan > 1 ? String(placed.colSpan) : null],
        ['rowspan', placed.rowSpan > 1 ? String(placed.rowSpan) : null],
        ['data-background', cell.background],
        ['style', alignStyle(cell.align)],
      ]);
      const paragraphs = cell.paragraphs.map((paragraph) =>
        this.#textblock('p', [], paragraph.content),
      );
      rows[placed.row] += `${open}${paragraphs.join('')}</${tag}>`;
    }
    const line = (cells: string) => `<tr>${cells}</tr>`;
    const head = table.headerRow ? rows.slice(0, 1) : [];
    const body = table.headerRow ? rows.slice(1) : rows;
    const columns = table.widths
      ? `<colgroup>${table.widths.map((width) => openTag('col', [['style', `width: ${width}px`]])).join('')}</colgroup>`
      : '';
    const thead = head.length > 0 ? `<thead>${head.map(line).join('')}</thead>` : '';
    const tbody = body.length > 0 ? `<tbody>${body.map(line).join('')}</tbody>` : '';
    return `${openTag('table', [['data-id', table.id]])}${columns}${thead}${tbody}</table>`;
  }

  /** A custom block: its definition's element; a textblock holds its inline content. */
  #customBlock(block: TextEditorPortableCustomBlock): string {
    const definition = this.#lookup.blocks.get(block.name);
    const tag = definition && ELEMENT_NAME.test(definition.element) ? definition.element : 'div';
    const attrs = definition ? definitionAttributes(definition, block.attrs) : block.attrs;
    const attributes: Attributes = [
      ['data-id', block.id],
      ...customNodeAttributes(block.name, attrs, true),
    ];
    if (VOID_ELEMENTS.has(tag)) return openTag(tag, attributes);
    const textblock = definition ? definition.content === 'inline' : block.content !== undefined;
    return textblock
      ? this.#textblock(tag, attributes, block.content ?? [])
      : `${openTag(tag, attributes)}</${tag}>`;
  }

  /** An inline node: its definition's element holding the text the node shows. */
  #inlineNode(node: TextEditorPortableInlineNode): string {
    const definition = this.#lookup.inlines.get(node.name);
    const tag = definition && ELEMENT_NAME.test(definition.element) ? definition.element : 'span';
    const attrs = definition ? definitionAttributes(definition, node.attrs) : node.attrs;
    const open = openTag(tag, customNodeAttributes(node.name, attrs, false));
    if (VOID_ELEMENTS.has(tag)) return open;
    return `${open}${escapeText(definition ? nodeText(definition, attrs) : '')}</${tag}>`;
  }

  /** Inline content with its marks nested in the order of the profile. */
  #inline(content: readonly TextEditorPortableInline[]): string {
    return inlineTree(collapseProof(content))
      .map((node) => this.#tree(node))
      .join('');
  }

  #tree(node: TextEditorPortableInlineTree): string {
    switch (node.type) {
      case 'text':
        return escapeText(node.text);
      case 'hard-break':
        return '<br>';
      case 'custom':
        return this.#inlineNode(node);
      default: {
        const children = node.children.map((child) => this.#tree(child)).join('');
        switch (node.mark) {
          case 'link':
            return `${openTag('a', [['href', String(node.value)]])}${children}</a>`;
          case 'textColor':
            return `${openTag('span', [['data-color', String(node.value)]])}${children}</span>`;
          case 'highlight':
            return `${openTag('mark', [['data-color', String(node.value)]])}${children}</mark>`;
          default: {
            const tag = MARK_TAGS[node.mark];
            return `<${tag}>${children}</${tag}>`;
          }
        }
      }
    }
  }
}

/**
 * Writes a document as portable HTML. A line feed separates top-level blocks, which the importer
 * ignores between blocks, and the empty paragraph that the engines keep after a final atom block
 * or table is left out.
 */
export function serializeHtml(
  document: TextEditorPortableDocument,
  options: TextEditorHtmlWriteOptions = {},
): string {
  return new HtmlWriter(options.nodes).blocks(outputBlocks(document), '\n');
}

// Reading (uwg-te-req-content-3)

export interface TextEditorHtmlReadOptions {
  /** The link and image protocols; the shared defaults for a member that is absent. */
  readonly urls?: MarkdownUrlPolicy | null | undefined;
  /** The custom node definitions, whose elements read back as custom nodes. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  /**
   * The direction of the content where no element sets one, which maps a physical `left` or
   * `right` alignment to start or end; left-to-right by default.
   */
  readonly direction?: 'ltr' | 'rtl' | undefined;
  /** Creates the identifiers of the blocks that need one; ten random characters by default. */
  readonly createId?: (() => string) | undefined;
}

export interface TextEditorHtmlRead {
  readonly document: TextEditorPortableDocument;
  /** One `text-editor-block-id` diagnostic when identifiers were replaced. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

type Direction = 'ltr' | 'rtl';

/** What an element passes to its content: the marks, the direction and the inherited alignment. */
interface Scope {
  readonly marks: TextEditorPortableMarks;
  readonly direction: Direction;
  readonly align: TextEditorAlign | undefined;
}

/** A part of the content: text with its marks, a hard break, an inline node or a block. */
type Piece =
  | {
      readonly kind: 'text';
      readonly text: string;
      readonly marks: TextEditorPortableMarks;
      /** The identifier of the paragraph that this text starts, from the element it replaces. */
      readonly id?: string;
    }
  | { readonly kind: 'break' }
  | { readonly kind: 'node'; readonly node: TextEditorPortableInlineNode }
  | { readonly kind: 'block'; readonly block: TextEditorPortableDraftBlock };

/** A list item while its list is read; the item after it may add nested items. */
interface DraftItem {
  readonly type: TextEditorListKind;
  readonly id?: string;
  start?: number;
  readonly checked?: boolean;
  readonly children: TextEditorPortableDraftBlock[];
}

interface DraftCell {
  readonly draft: TextEditorPortableDraftTableCell;
  readonly rowSpan: number;
  /** A `th` with row scope. */
  readonly rowScope: boolean;
}

/** Scripts, styles, embedded frames and content never rendered: dropped with what they hold. */
const DROPPED: ReadonlySet<string> = new Set([
  'script',
  'style',
  'template',
  'iframe',
  'frame',
  'frameset',
  'object',
  'embed',
  'noembed',
  'noframes',
  'head',
  'title',
  'meta',
  'link',
  'base',
]);

/** Elements laid out as blocks, whose text stays apart from the text around them. */
const BLOCK_LEVEL: ReadonlySet<string> = new Set([
  'address',
  'article',
  'aside',
  'body',
  'caption',
  'center',
  'colgroup',
  'dd',
  'details',
  'dialog',
  'dir',
  'div',
  'dl',
  'dt',
  'fieldset',
  'figcaption',
  'figure',
  'footer',
  'form',
  'header',
  'hgroup',
  'html',
  'legend',
  'main',
  'menu',
  'nav',
  'optgroup',
  'option',
  'search',
  'section',
  'summary',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
]);

const HEADING = /^h([1-6])$/u;
/** Whitespace that collapses outside `pre`: ASCII whitespace, never a no-break space. */
const COLLAPSIBLE = /^[\t\n\f\r ]$/u;
const EDGE_WHITESPACE = /^[\t\n\f\r ]+|[\t\n\f\r ]+$/gu;
const VISIBLE = /[^\t\n\f\r ]/u;
const PIXELS = /^(\d+(?:\.\d+)?|\.\d+)(?:px)?$/u;
const INTEGER = /^[+-]?\d+$/u;
const VENDOR = /^-(?:webkit|moz)-/u;
/** Letters of the scripts written right to left, and the right-to-left mark. */
const STRONG_RTL =
  /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}\p{Script=Samaritan}\p{Script=Mandaic}\p{Script=Adlam}\u200f]/u;
const STRONG = /[\p{L}\u200e\u200f]/u;

const tagOf = (element: ElementLike): string => element.localName.toLowerCase();

const classList = (element: ElementLike): ReadonlySet<string> =>
  new Set((element.getAttribute('class') ?? '').split(/[\t\n\f\r ]+/u).filter(Boolean));

const childNodes = (element: ElementLike): NodeLike[] => Array.from(element.childNodes);

const childElements = (element: ElementLike): ElementLike[] =>
  childNodes(element).filter(isElementLike);

/**
 * The declarations of an element's `style`: lowercase property names to lowercase values. This is
 * the presentational read that happens before the removal rule drops the attribute.
 */
function styleOf(element: ElementLike): ReadonlyMap<string, string> {
  const declarations = new Map<string, string>();
  for (const declaration of (element.getAttribute('style') ?? '').split(';')) {
    const colon = declaration.indexOf(':');
    if (colon < 0) continue;
    const property = declaration.slice(0, colon).trim().toLowerCase();
    const value = declaration
      .slice(colon + 1)
      .replace(/!\s*important\s*$/iu, '')
      .trim()
      .toLowerCase();
    if (property) declarations.set(property, value);
  }
  return declarations;
}

/** A `text-align` value as a logical alignment; `left` and `right` follow the direction. */
function alignmentOf(value: string | undefined, direction: Direction): TextEditorAlign | undefined {
  const name = value?.replace(VENDOR, '');
  switch (name) {
    case 'start':
    case 'center':
    case 'end':
    case 'justify':
      return name;
    case 'left':
      return direction === 'rtl' ? 'end' : 'start';
    case 'right':
      return direction === 'rtl' ? 'start' : 'end';
    default:
      return undefined;
  }
}

/** A stored alignment: start stores nothing. */
const stored = (align: TextEditorAlign | undefined): TextEditorAlign | undefined =>
  align === 'start' ? undefined : align;

/** A positive width in CSS pixels from a number or a `px` length. */
function pixels(value: string | null | undefined): number | undefined {
  const match = PIXELS.exec((value ?? '').trim().toLowerCase());
  const width = match ? Number(match[1]) : Number.NaN;
  return Number.isFinite(width) && width > 0 ? width : undefined;
}

/** A whole number of at least 1, else 1. */
function span(value: string | null): number {
  const trimmed = (value ?? '').trim();
  const number = INTEGER.test(trimmed) ? Number(trimmed) : 1;
  return number >= 1 ? number : 1;
}

/**
 * The direction that `dir="auto"` gives an element: that of the first strong character of its
 * text outside descendants that set their own direction, else left-to-right.
 */
function autoDirection(element: ElementLike): Direction {
  const stack = childNodes(element).reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (isTextLike(node)) {
      for (const char of node.data)
        if (STRONG.test(char)) return STRONG_RTL.test(char) ? 'rtl' : 'ltr';
    } else if (
      isElementLike(node) &&
      node.getAttribute('dir') === null &&
      !DROPPED.has(tagOf(node))
    )
      stack.push(...childNodes(node).reverse());
  }
  return 'ltr';
}

/** Text with the marks that are on, or plain text. */
function markedText(text: string, marks: TextEditorPortableMarks): TextEditorPortableInline {
  const on = Object.entries(marks).filter(([, value]) => value !== undefined);
  return on.length > 0
    ? { type: 'text', text, marks: Object.fromEntries(on) as TextEditorPortableMarks }
    : { type: 'text', text };
}

/** A bold element whose own style sets a normal weight, as office suites wrap copied content. */
function lightWeight(element: ElementLike): boolean {
  const weight = styleOf(element).get('font-weight');
  if (weight === undefined) return false;
  if (weight === 'normal' || weight === 'lighter') return true;
  return /^\d+$/u.test(weight) && Number(weight) < 600;
}

/** The language of a code block: the `language-` class of its `code` element, else its own. */
function codeLanguage(element: ElementLike): string | undefined {
  const code = childElements(element).find((child) => tagOf(child) === 'code');
  for (const candidate of code ? [code, element] : [element])
    for (const name of classList(candidate))
      if (name.startsWith('language-') && name.length > 'language-'.length)
        return name.slice('language-'.length);
  return undefined;
}

/** The text of a code block: its text nodes, with a `br` as a line feed. */
function codeText(element: ElementLike): string {
  let text = '';
  const stack = childNodes(element).reverse();
  while (stack.length > 0) {
    const node = stack.pop()!;
    if (isTextLike(node)) text += node.data;
    else if (isElementLike(node)) {
      const tag = tagOf(node);
      if (tag === 'br') text += '\n';
      else if (!DROPPED.has(tag)) stack.push(...childNodes(node).reverse());
    }
  }
  return text.replace(/\r\n?/gu, '\n');
}

const asBlocks = (blocks: readonly TextEditorPortableDraftBlock[]): Piece[] =>
  blocks.map((block) => ({ kind: 'block', block }));

class HtmlReader {
  readonly #lookup: TextEditorNodeLookup;
  readonly #links: readonly string[];
  readonly #images: readonly string[];

  constructor(options: TextEditorHtmlReadOptions) {
    this.#lookup = nodeLookup(options.nodes);
    this.#links = linkProtocols(options.urls);
    this.#images = imageProtocols(options.urls);
  }

  /** The blocks of the content of `root`, in the scope that `root` sets. */
  read(root: ElementLike, direction: Direction): TextEditorPortableDraftBlock[] {
    const scope = this.#scope(root, { marks: {}, direction, align: undefined });
    return this.#blocks(this.#children(root, scope), scope);
  }

  /**
   * An attribute that the shared removal rule keeps; a link-valued or image-valued one only when
   * it passes the URL policy, without the ASCII whitespace around it.
   */
  #attribute(element: ElementLike, name: string): string | null {
    if (isAlwaysRemovedAttribute(name)) return null;
    const value = element.getAttribute(name);
    if (value === null) return null;
    const protocols = LINK_URL_ATTRIBUTES.includes(name)
      ? this.#links
      : IMAGE_URL_ATTRIBUTES.includes(name)
        ? this.#images
        : null;
    if (protocols === null) return value;
    const url = value.replace(EDGE_WHITESPACE, '');
    return allowedUrl(url, protocols) ? url : null;
  }

  #id(element: ElementLike): { id?: string } {
    const id = this.#attribute(element, 'data-id');
    return id === null ? {} : { id };
  }

  #scope(element: ElementLike, outer: Scope): Scope {
    const dir = (element.getAttribute('dir') ?? '').trim().toLowerCase();
    const direction: Direction =
      dir === 'rtl' || dir === 'ltr'
        ? dir
        : dir === 'auto'
          ? autoDirection(element)
          : outer.direction;
    const align = alignmentOf(styleOf(element).get('text-align'), direction);
    return { marks: outer.marks, direction, align: align ?? outer.align };
  }

  #children(element: ElementLike, scope: Scope): Piece[] {
    const pieces: Piece[] = [];
    for (const node of childNodes(element))
      if (isTextLike(node)) pieces.push({ kind: 'text', text: node.data, marks: scope.marks });
      else if (isElementLike(node)) pieces.push(...this.#element(node, scope));
    return pieces;
  }

  #element(element: ElementLike, outer: Scope): Piece[] {
    const tag = tagOf(element);
    const classes = classList(element);
    const scope = this.#scope(element, outer);
    const custom = this.#custom(element, tag, classes, scope);
    if (custom) return custom;
    if (DROPPED.has(tag) || classes.has('tp-te-task-marker') || classes.has('tp-te-block-cursor'))
      return [];
    if (tag === 'pre' || classes.has('tp-te-code-block')) return this.#codeBlock(element);
    const heading = HEADING.exec(tag);
    if (heading) {
      const level = Number(heading[1]) as TextEditorHeadingLevel;
      return this.#textblocks(element, scope, (content, first) => ({
        type: 'heading',
        ...(first ? this.#id(element) : {}),
        level,
        align: stored(scope.align),
        content,
      }));
    }
    switch (tag) {
      case 'p':
        return this.#textblocks(element, scope, (content, first) => ({
          type: 'paragraph',
          ...(first ? this.#id(element) : {}),
          align: stored(scope.align),
          content,
        }));
      case 'blockquote':
        return [
          {
            kind: 'block',
            block: {
              type: 'quote',
              ...this.#id(element),
              blocks: this.#blocks(this.#children(element, scope), scope),
            },
          },
        ];
      case 'ul':
      case 'ol':
        return this.#list(element, tag, classes, scope);
      case 'li':
        return [{ kind: 'block', block: this.#item(element, 'list-bullet', outer) }];
      case 'table':
        return this.#table(element, scope);
      case 'hr':
        return [{ kind: 'block', block: { type: 'divider', ...this.#id(element) } }];
      case 'img':
        return this.#image(element, scope);
      case 'br':
        return [{ kind: 'break' }];
    }
    const marked: Scope = { ...scope, marks: this.#marks(element, tag, classes, scope.marks) };
    const pieces = this.#children(element, marked);
    // A block-level element keeps its text apart: its runs of inline content become paragraphs.
    return BLOCK_LEVEL.has(tag) ? asBlocks(this.#blocks(pieces, marked)) : pieces;
  }

  /** The marks that an element adds through its name or the class vocabulary. */
  #marks(
    element: ElementLike,
    tag: string,
    classes: ReadonlySet<string>,
    marks: TextEditorPortableMarks,
  ): TextEditorPortableMarks {
    let next = marks;
    const add = (patch: TextEditorPortableMarks) => {
      next = { ...next, ...patch };
    };
    if ((tag === 'strong' || tag === 'b' || classes.has('tp-te-bold')) && !lightWeight(element))
      add({ bold: true });
    if (tag === 'em' || tag === 'i' || classes.has('tp-te-italic')) add({ italic: true });
    if (tag === 'u' || classes.has('tp-te-underline')) add({ underline: true });
    if (tag === 's' || tag === 'del' || classes.has('tp-te-strike')) add({ strike: true });
    // Of a nested superscript and subscript, the inner one is kept.
    if (tag === 'sup' || classes.has('tp-te-sup')) add({ superscript: true, subscript: undefined });
    if (tag === 'sub' || classes.has('tp-te-sub')) add({ subscript: true, superscript: undefined });
    if (tag === 'code' || classes.has('tp-te-code')) add({ code: true });
    if (tag === 'a' || classes.has('tp-te-link')) {
      const href = this.#attribute(element, 'href');
      if (href) add({ link: href });
    }
    const color = this.#attribute(element, 'data-color');
    if (tag === 'mark' || classes.has('tp-te-highlight'))
      add({ highlight: isTextEditorColor(color) ? color : 'yellow' });
    else if ((tag === 'span' || classes.has('tp-te-color')) && isTextEditorColor(color))
      add({ textColor: color });
    return next;
  }

  /**
   * A custom node: `data-type` names a definition whose element this is, or whose node the
   * element renders in the class vocabulary.
   */
  #custom(
    element: ElementLike,
    tag: string,
    classes: ReadonlySet<string>,
    scope: Scope,
  ): Piece[] | null {
    const name = this.#attribute(element, 'data-type');
    if (!name) return null;
    const inline = this.#lookup.inlines.get(name);
    if (inline && (inline.element === tag || classes.has(`tp-te-inline-${name}`))) {
      const attrs = this.#dataAttributes(element, inline.attrs, false);
      return [{ kind: 'node', node: { type: 'custom', name, attrs } }];
    }
    const block = this.#lookup.blocks.get(name);
    if (!block || !(block.element === tag || classes.has(`tp-te-block-${name}`))) return null;
    const attrs = this.#dataAttributes(element, block.attrs, true);
    const id = this.#id(element);
    if (block.content !== 'inline')
      return [{ kind: 'block', block: { type: 'custom', ...id, name, attrs } }];
    const blocks = this.#blocks(this.#children(element, scope), scope);
    return [{ kind: 'block', block: { type: 'custom', ...id, name, attrs, blocks } }];
  }

  /** The attributes that a definition declares, read from their `data-` attributes as text. */
  #dataAttributes(
    element: ElementLike,
    specs: Readonly<Record<string, unknown>>,
    block: boolean,
  ): TextEditorAttributes {
    const attrs: Record<string, string> = {};
    for (const name of Object.keys(specs)) {
      if (name === 'type' || (block && name === 'id')) continue;
      const value = this.#attribute(element, `data-${name}`);
      if (value !== null) attrs[name] = value;
    }
    return attrs;
  }

  /**
   * A paragraph or heading. A block found inside it leaves it at its place and splits it there:
   * the part holding its first character keeps its identifier, and a part left empty is dropped.
   */
  #textblocks(
    element: ElementLike,
    scope: Scope,
    make: (content: TextEditorPortableInline[], first: boolean) => TextEditorPortableDraftBlock,
  ): Piece[] {
    const out: Piece[] = [];
    let run: Piece[] = [];
    let first = true;
    let split = false;
    const flush = (keepEmpty: boolean) => {
      const content = this.#inline(run);
      run = [];
      if (content.length === 0 && !keepEmpty) return;
      out.push({ kind: 'block', block: make(content, first) });
      first = false;
    };
    for (const piece of this.#children(element, scope))
      if (piece.kind !== 'block') run.push(piece);
      else {
        flush(false);
        out.push(piece);
        split = true;
      }
    flush(!split);
    return out;
  }

  /** Blocks from pieces: each run of inline content becomes a paragraph unless it holds nothing. */
  #blocks(pieces: readonly Piece[], scope: Scope): TextEditorPortableDraftBlock[] {
    const blocks: TextEditorPortableDraftBlock[] = [];
    let run: Piece[] = [];
    const flush = () => {
      // The first piece that holds more than collapsible whitespace starts the paragraph.
      const first = run.find(
        (piece) => piece.kind !== 'text' || [...piece.text].some((char) => !COLLAPSIBLE.test(char)),
      );
      const id = first?.kind === 'text' && first.id !== undefined ? { id: first.id } : {};
      const content = this.#inline(run);
      run = [];
      if (content.length > 0)
        blocks.push({ type: 'paragraph', ...id, align: stored(scope.align), content });
    };
    for (const piece of pieces)
      if (piece.kind !== 'block') run.push(piece);
      else {
        flush();
        blocks.push(piece.block);
      }
    flush();
    return blocks;
  }

  /**
   * Inline content as a browser lays it out outside `pre`: each run of ASCII whitespace across
   * text pieces collapses to one space, and a space that starts or ends a line, at the edges or
   * beside a hard break, is removed. A no-break space stays; canonicalization reads it as a space.
   */
  #inline(pieces: readonly Piece[]): TextEditorPortableInline[] {
    const out: TextEditorPortableInline[] = [];
    let space = true;
    const trimEnd = () => {
      const last = out[out.length - 1];
      if (last?.type !== 'text' || !last.text.endsWith(' ')) return;
      const text = last.text.slice(0, -1);
      if (text) out[out.length - 1] = { ...last, text };
      else out.pop();
    };
    for (const piece of pieces)
      if (piece.kind === 'text') {
        let text = '';
        for (const char of piece.text)
          if (!COLLAPSIBLE.test(char)) {
            text += char;
            space = false;
          } else if (!space) {
            text += ' ';
            space = true;
          }
        if (text) out.push(markedText(text, piece.marks));
      } else if (piece.kind === 'break') {
        trimEnd();
        out.push({ type: 'hard-break' });
        space = true;
      } else if (piece.kind === 'node') {
        out.push(piece.node);
        space = false;
      }
    trimEnd();
    return out;
  }

  /** A code block: its text verbatim, a `br` as a line feed, and the language of its class. */
  #codeBlock(element: ElementLike): Piece[] {
    const language = codeLanguage(element);
    return [
      {
        kind: 'block',
        block: {
          type: 'code',
          ...this.#id(element),
          ...(language ? { language } : {}),
          text: codeText(element),
        },
      },
    ];
  }

  /**
   * The items of a list. A nested list directly in a list, and an item that only wraps a nested
   * list in the class vocabulary, belong to the item before them; inline content directly in a
   * list becomes an item.
   */
  #list(element: ElementLike, tag: string, classes: ReadonlySet<string>, scope: Scope): Piece[] {
    const task =
      classes.has('tp-te-list-task') ||
      (tag === 'ul' && this.#attribute(element, 'data-type') === 'task');
    const kind: TextEditorListKind = task
      ? 'list-task'
      : tag === 'ol' || classes.has('tp-te-list-ordered')
        ? 'list-ordered'
        : 'list-bullet';
    const items: DraftItem[] = [];
    const out: Piece[] = [];
    let stray: Piece[] = [];
    for (const node of [...childNodes(element), null]) {
      if (node !== null && !isElementLike(node)) {
        if (isTextLike(node)) stray.push({ kind: 'text', text: node.data, marks: scope.marks });
        continue;
      }
      const child = node === null ? null : tagOf(node);
      if (node !== null && child !== 'li' && child !== 'ul' && child !== 'ol') {
        stray.push(...this.#element(node, scope));
        continue;
      }
      // Inline content directly in the list becomes an item of its own.
      const children = this.#blocks(stray, scope);
      stray = [];
      if (children.length > 0) {
        const item: DraftItem = { type: kind, ...(task ? { checked: false } : {}), children };
        items.push(item);
        out.push({ kind: 'block', block: item as TextEditorPortableDraftBlock });
      }
      if (node === null) break;
      if (child === 'li' && !classList(node).has('tp-te-nested-item')) {
        const item = this.#item(node, kind, scope);
        items.push(item);
        out.push({ kind: 'block', block: item as TextEditorPortableDraftBlock });
        continue;
      }
      // Nested items belong to the item before them; without one they stay at this level.
      const nested =
        child === 'li'
          ? this.#children(node, this.#scope(node, scope))
          : this.#element(node, scope);
      const previous = items[items.length - 1];
      for (const piece of nested)
        if (piece.kind === 'block' && previous) previous.children.push(piece.block);
        else out.push(piece);
    }
    const start = this.#attribute(element, 'start')?.trim();
    const first = items[0];
    if (kind === 'list-ordered' && first && start !== undefined && INTEGER.test(start))
      first.start = Number(start);
    return out;
  }

  /** An item: what it holds, in order; its alignment is that of its paragraphs. */
  #item(element: ElementLike, kind: TextEditorListKind, outer: Scope): DraftItem {
    const scope = this.#scope(element, outer);
    const checked =
      this.#attribute(element, 'data-checked') === 'true' ||
      classList(element).has('tp-te-checked');
    return {
      type: kind,
      ...this.#id(element),
      ...(kind === 'list-task' ? { checked } : {}),
      children: this.#blocks(this.#children(element, scope), scope),
    };
  }

  /**
   * A table: its rows from `thead`, `tbody`, `tfoot` or the table itself, the widths of its
   * columns, and its caption as paragraphs before it. The header row is a `thead` row or a first
   * row of header cells without row scope; the header column holds the header cells that start
   * the other rows, or, in a table of one header row, its first cell when that has row scope.
   */
  #table(element: ElementLike, scope: Scope): Piece[] {
    const caption: Piece[] = [];
    const widths: number[] = [];
    let columns = false;
    const rows: { readonly cells: DraftCell[]; readonly head: boolean }[] = [];
    const column = (col: ElementLike) => {
      columns = true;
      const width = pixels(styleOf(col).get('width')) ?? pixels(this.#attribute(col, 'width'));
      const count = Math.min(span(this.#attribute(col, 'span')), 1000);
      for (let index = 0; index < count; index += 1) widths.push(width ?? 0);
    };
    const row = (tr: ElementLike, head: boolean, outer: Scope) => {
      const rowScope = this.#scope(tr, outer);
      const cells = childElements(tr)
        .filter((cell) => tagOf(cell) === 'td' || tagOf(cell) === 'th')
        .map((cell) => this.#cell(cell, head, rowScope));
      rows.push({ cells, head });
    };
    for (const child of childElements(element)) {
      const tag = tagOf(child);
      if (tag === 'caption') caption.push(...this.#children(child, this.#scope(child, scope)));
      else if (tag === 'colgroup')
        childElements(child)
          .filter((col) => tagOf(col) === 'col')
          .forEach(column);
      else if (tag === 'col') column(child);
      else if (tag === 'thead' || tag === 'tbody' || tag === 'tfoot') {
        const group = this.#scope(child, scope);
        for (const tr of childElements(child))
          if (tagOf(tr) === 'tr') row(tr, tag === 'thead', group);
      } else if (tag === 'tr') row(child, false, scope);
    }
    const firstRow = rows[0];
    const headerRow =
      firstRow !== undefined &&
      (firstRow.head ||
        (firstRow.cells.length > 0 &&
          firstRow.cells.every((cell) => cell.draft.header === true && !cell.rowScope)));
    // The cells that start each row at the first column; a row span covers the rows below it.
    const leading: { readonly cell: DraftCell; readonly row: number }[] = [];
    let covered = 0;
    rows.forEach(({ cells }, index) => {
      const cell = cells[0];
      if (index < covered || !cell) return;
      leading.push({ cell, row: index });
      covered = index + cell.rowSpan;
    });
    const body = leading.filter(({ row: index }) => !(headerRow && index === 0));
    const headerColumn =
      body.length > 0
        ? body.every(({ cell }) => cell.draft.header === true)
        : headerRow && leading[0]?.cell.rowScope === true;
    const table: TextEditorPortableDraftBlock = {
      type: 'table',
      ...this.#id(element),
      headerRow,
      headerColumn,
      ...(columns ? { widths } : {}),
      rows: rows.map(({ cells }) => ({ cells: cells.map((cell) => cell.draft) })),
    };
    return [...asBlocks(this.#blocks(caption, scope)), { kind: 'block', block: table }];
  }

  #cell(element: ElementLike, head: boolean, outer: Scope): DraftCell {
    const scope = this.#scope(element, outer);
    const tag = tagOf(element);
    const background = this.#attribute(element, 'data-background');
    const rowSpan = span(this.#attribute(element, 'rowspan'));
    const draft: TextEditorPortableDraftTableCell = {
      rowSpan,
      colSpan: span(this.#attribute(element, 'colspan')),
      ...(isTextEditorColor(background) ? { background } : {}),
      align: stored(scope.align),
      header: head || tag === 'th' || classList(element).has('tp-te-header-cell'),
      blocks: this.#blocks(this.#children(element, scope), scope),
    };
    const rowScope = (this.#attribute(element, 'scope') ?? '').trim().toLowerCase() === 'row';
    return { draft, rowSpan, rowScope: tag === 'th' && rowScope };
  }

  /**
   * An image block, or, when its source is missing or fails the image policy, its alternative
   * text in its place; a paragraph that the text starts keeps the image's identifier, as the URL
   * policy keeps it for native JSON and inserted fragments.
   */
  #image(element: ElementLike, scope: Scope): Piece[] {
    const src = this.#attribute(element, 'src');
    const alt = this.#attribute(element, 'alt') ?? '';
    if (!src)
      return alt ? [{ kind: 'text', text: alt, marks: scope.marks, ...this.#id(element) }] : [];
    const width =
      pixels(this.#attribute(element, 'width')) ?? pixels(styleOf(element).get('width'));
    const block: TextEditorPortableDraftBlock = {
      type: 'image',
      ...this.#id(element),
      src,
      alt,
      ...(width === undefined ? {} : { width }),
    };
    return [{ kind: 'block', block }];
  }
}

/**
 * Reads the content of `root`, such as the body of a parsed document, as a document: the element
 * mapping above, then canonicalization as imported content.
 */
export function importHtml(
  root: ElementLike,
  options: TextEditorHtmlReadOptions = {},
): TextEditorHtmlRead {
  const blocks = new HtmlReader(options).read(root, options.direction ?? 'ltr');
  return canonicalize(
    { blocks },
    { nodes: options.nodes, imported: true, createId: options.createId },
  );
}

// Clipboard (uwg-te-req-content-6)

/** The attribute of the element that records what clipboard HTML holds. */
const FRAGMENT_RECORD = 'data-text-editor-fragment';

/**
 * Writes the HTML of copied content: the portable profile of its blocks inside one element that
 * records whether they are a text range or whole blocks.
 */
export function writeClipboardHtml(
  fragment: TextEditorPortableFragment,
  options: TextEditorHtmlWriteOptions = {},
): string {
  const kind = fragment.kind === 'blocks' ? 'blocks' : 'range';
  const blocks = new HtmlWriter(options.nodes).blocks(fragment.blocks, '');
  return `<div ${FRAGMENT_RECORD}="${kind}">${blocks}</div>`;
}

export interface TextEditorClipboardRead {
  readonly fragment: TextEditorPortableFragment;
  /** One `text-editor-block-id` diagnostic when identifiers were replaced. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/**
 * Reads pasted HTML: whole blocks when its record says so, otherwise a text range, as HTML from
 * another source without the record always is. The record is the only element in `root`,
 * whitespace, comments and elements that are never rendered, such as `meta`, aside.
 */
export function readClipboardHtml(
  root: ElementLike,
  options: TextEditorHtmlReadOptions = {},
): TextEditorClipboardRead {
  const content = childNodes(root).filter((node) =>
    isElementLike(node) ? !DROPPED.has(tagOf(node)) : isTextLike(node) && VISIBLE.test(node.data),
  );
  const only = content.length === 1 && isElementLike(content[0]!) ? content[0] : null;
  const record = only?.getAttribute(FRAGMENT_RECORD) ?? null;
  const { document, diagnostics } = importHtml(only && record !== null ? only : root, options);
  return {
    fragment: { kind: record === 'blocks' ? 'blocks' : 'range', blocks: document.blocks },
    diagnostics,
  };
}
