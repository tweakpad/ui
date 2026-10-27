/**
 * Markdown of the text editor (Widgets `uwg-te-req-content-4`, `uwg-te-tab-content-model`;
 * Foundation `uwg-te-md-req-serializer`, `uwg-te-md-req-policy`).
 *
 * Markdown follows the library's dialect and is read and written only through the library's
 * parser, resolve step and serializer. Import parses, resolves raw HTML under the default element
 * policy extended with `span` and `mark` carrying `data-color`, and brings in each construct that
 * the content model lacks as its content: an element outside the profile unwrapped, an alert that
 * no custom block parses as a quote, a footnote reference as its number in superscript and the
 * referenced definitions, in the order of their first reference, as an ordered list at the end;
 * the result is canonicalized as imported content. Inline nodes never import back, and a custom
 * block only through its definition's `parse`.
 *
 * Export builds the Markdown tree and serializes it: underline, superscript, subscript, text color
 * and highlight as allowed inline HTML; a link that the dialect's extended autolinks read back from
 * its text alone, at its place, as that text; a quote whose first line would read back as an
 * alert marker written so that it reads back as a quote keeping that line; dividers as `---`;
 * pipe tables with a header row, added when missing, spans as empty cells, and `:-:` or `--:` only
 * for the center or end alignment that every cell of a column shares; and custom nodes as their
 * definition's Markdown, otherwise their text. Markdown loses empty paragraphs, a hard break that
 * ends a block, identifiers, alignment, image widths, cell spans, widths and backgrounds, the
 * header column, and a no-break space outside a code block, which it writes as a space. Link and
 * image destinations pass the URL policy both ways, with a `markdown-url` diagnostic for each one
 * that fails it.
 */
import { parseMarkdown } from '../../markdown/block.js';
import { resolveMarkdown } from '../../markdown/resolve.js';
import { serializeMarkdown } from '../../markdown/serialize.js';
import type {
  MarkdownAlign,
  MarkdownBlock,
  MarkdownBlockquote,
  MarkdownContent,
  MarkdownElementPolicy,
  MarkdownInline,
  MarkdownLink,
  MarkdownList,
  MarkdownListItem,
  MarkdownRoot,
  MarkdownTable,
  MarkdownUrlPolicy,
} from '../../markdown/types.js';
import { allowedUrl, imageProtocols, linkProtocols } from '../../markdown/url.js';
import type { TextEditorDiagnostic } from '../engine.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorHeadingLevel,
  TextEditorListKind,
} from '../model.js';
import type { TextEditorBlockDefinition, TextEditorNodeDefinition } from '../nodes.js';
import { isTextEditorColor } from '../palette.js';
import {
  blockText,
  canonicalize,
  definitionAttributes,
  inlineText,
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
  type TextEditorPortableImage,
  type TextEditorPortableInline,
  type TextEditorPortableInlineNode,
  type TextEditorPortableInlineTree,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
  type TextEditorPortableTable,
} from './portable.js';

/** A problem that the Markdown converters report. */
export type TextEditorMarkdownDiagnostic =
  | TextEditorDiagnostic
  | {
      /** A link destination or image source that fails the URL policy. */
      readonly code: 'markdown-url';
      readonly message: string;
    };

/** The element policy of the import: the default one with `span` and `mark` carrying a color. */
const EDITOR_ELEMENTS: MarkdownElementPolicy = Object.freeze({
  span: Object.freeze(['data-color']),
  mark: Object.freeze(['data-color']),
});

// Reading

export interface TextEditorMarkdownReadOptions {
  /** The link and image protocols; the shared defaults for a member that is absent. */
  readonly urls?: MarkdownUrlPolicy | null | undefined;
  /** The custom node definitions, whose Markdown `parse` restores custom blocks. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  /** Creates the identifiers of the blocks; ten random characters by default. */
  readonly createId?: (() => string) | undefined;
}

export interface TextEditorMarkdownRead {
  readonly document: TextEditorPortableDocument;
  /** A `markdown-url` diagnostic per blocked destination, then canonicalization's. */
  readonly diagnostics: readonly TextEditorMarkdownDiagnostic[];
}

/** Inline content as it is read, or a block found in it, such as an image. */
type Piece =
  | TextEditorPortableInline
  | { readonly type: 'block'; readonly block: TextEditorPortableDraftBlock };

const BLOCK_TYPES: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'thematicBreak',
  'blockquote',
  'list',
  'code',
  'html',
  'table',
  'footnoteDefinition',
  'alert',
  'footnotes',
]);

type AnyNode = MarkdownContent & {
  readonly children?: readonly MarkdownContent[];
  readonly value?: string;
};

const childrenOf = (node: AnyNode): readonly MarkdownContent[] =>
  Array.isArray(node.children) ? node.children : [];

/** Whether a node of the resolved tree is a block: a block type, or an element holding blocks. */
function isBlock(node: AnyNode): boolean {
  if (node.type === 'element') return childrenOf(node).some((child) => isBlock(child as AnyNode));
  return BLOCK_TYPES.has(node.type);
}

const ALIGNMENTS: Readonly<Record<string, TextEditorAlign>> = { center: 'center', right: 'end' };

class MarkdownReader {
  readonly #parsers: readonly TextEditorBlockDefinition[];

  constructor(lookup: TextEditorNodeLookup) {
    this.#parsers = [...lookup.blocks.values()].filter(
      (definition) => typeof definition.markdown?.parse === 'function',
    );
  }

  /** Blocks in order; each run of inline content between them becomes paragraphs. */
  blocks(nodes: readonly MarkdownContent[]): TextEditorPortableDraftBlock[] {
    const blocks: TextEditorPortableDraftBlock[] = [];
    let run: MarkdownContent[] = [];
    const flush = () => {
      if (run.length > 0) blocks.push(...this.#paragraphs(this.#inline(run, {})));
      run = [];
    };
    for (const node of nodes)
      if (isBlock(node as AnyNode)) {
        flush();
        blocks.push(...this.#block(node as AnyNode));
      } else run.push(node);
    flush();
    return blocks;
  }

  #block(node: AnyNode): TextEditorPortableDraftBlock[] {
    const custom = this.#custom(node);
    if (custom) return [custom];
    switch (node.type) {
      case 'paragraph':
        return this.#paragraphs(this.#inline(childrenOf(node), {}));
      case 'heading': {
        const level = node.depth as TextEditorHeadingLevel;
        return this.#split(this.#inline(childrenOf(node), {}), (content) => ({
          type: 'heading',
          level,
          content,
        }));
      }
      case 'blockquote':
      case 'alert':
        return [{ type: 'quote', blocks: this.blocks(childrenOf(node)) }];
      case 'list':
        return this.#items(node);
      case 'code':
        return [
          {
            type: 'code',
            ...(node.lang ? { language: node.lang } : {}),
            text: node.value,
          },
        ];
      case 'thematicBreak':
        return [{ type: 'divider' }];
      case 'table':
        return [this.#table(node)];
      case 'footnotes':
        // The referenced definitions, in the order of their first reference.
        return node.children.map((definition, index) => ({
          type: 'list-ordered',
          ...(index === 0 ? { start: 1 } : {}),
          children: this.blocks(definition.children),
        }));
      default:
        // An element holding blocks, and a node of another type: its content.
        if (Array.isArray(node.children)) return this.blocks(childrenOf(node));
        return typeof node.value === 'string' && node.value
          ? [{ type: 'paragraph', content: [{ type: 'text', text: node.value }] }]
          : [];
    }
  }

  /** A custom block that a definition's `parse` restores from the node, or `null`. */
  #custom(node: AnyNode): TextEditorPortableDraftBlock | null {
    for (const definition of this.#parsers) {
      let match: ReturnType<
        NonNullable<NonNullable<TextEditorBlockDefinition['markdown']>['parse']>
      >;
      try {
        match = definition.markdown!.parse!(node as MarkdownBlock);
      } catch {
        continue;
      }
      if (typeof match !== 'object' || match === null) continue;
      const attrs = definedAttributes(match.attrs);
      if (definition.content !== 'inline') return { type: 'custom', name: definition.name, attrs };
      const content = Array.isArray(match.content) ? match.content : [];
      return {
        type: 'custom',
        name: definition.name,
        attrs,
        blocks: this.#paragraphs(this.#inline(content, {})),
      };
    }
    return null;
  }

  /** The items of a list; a nested list holds items directly. */
  #items(list: MarkdownList): TextEditorPortableDraftBlock[] {
    return list.children.map((item, index) => {
      const kind: TextEditorListKind =
        item.checked !== null ? 'list-task' : list.ordered ? 'list-ordered' : 'list-bullet';
      return {
        type: kind,
        ...(kind === 'list-ordered' && index === 0 && list.start !== null
          ? { start: list.start }
          : {}),
        ...(kind === 'list-task' ? { checked: item.checked === true } : {}),
        children: this.blocks(item.children),
      } as TextEditorPortableDraftBlock;
    });
  }

  /** A pipe table: its first row is the header row; a column marker aligns every cell of it. */
  #table(table: MarkdownTable): TextEditorPortableDraftBlock {
    const rows = table.children.map((row, rowIndex) => ({
      cells: row.children.map((cell, column): TextEditorPortableDraftTableCell => {
        const align = ALIGNMENTS[table.align[column] ?? ''];
        return {
          header: rowIndex === 0,
          ...(align ? { align } : {}),
          blocks: this.#paragraphs(this.#inline(cell.children, {})),
        };
      }),
    }));
    return { type: 'table', headerRow: true, headerColumn: false, rows };
  }

  /** Paragraphs of inline content; a block found in it leaves at its place, splitting it. */
  #paragraphs(pieces: readonly Piece[]): TextEditorPortableDraftBlock[] {
    return this.#split(pieces, (content) => ({ type: 'paragraph', content }));
  }

  /**
   * Textblocks of one kind from inline content: a block found in it leaves at its place and
   * splits it, a part left empty being dropped; without a block the textblock stays, even empty.
   */
  #split(
    pieces: readonly Piece[],
    make: (content: TextEditorPortableInline[]) => TextEditorPortableDraftBlock,
  ): TextEditorPortableDraftBlock[] {
    const out: TextEditorPortableDraftBlock[] = [];
    let run: TextEditorPortableInline[] = [];
    let split = false;
    for (const piece of pieces)
      if (piece.type !== 'block') run.push(piece);
      else {
        if (run.length > 0) out.push(make(run));
        run = [];
        out.push(piece.block);
        split = true;
      }
    if (run.length > 0 || !split) out.push(make(run));
    return out;
  }

  /** Inline content with the marks of its ancestors; a soft line break reads as a space. */
  #inline(nodes: readonly MarkdownContent[], marks: TextEditorPortableMarks): Piece[] {
    const out: Piece[] = [];
    const text = (value: string, on: TextEditorPortableMarks = marks) => {
      if (value) out.push({ type: 'text', text: value, marks: on });
    };
    for (const node of nodes) {
      const any = node as AnyNode;
      switch (node.type) {
        case 'text':
          text(node.value.replace(/\r?\n/gu, ' '));
          break;
        case 'inlineCode':
          text(node.value, { ...marks, code: true });
          break;
        case 'break':
          out.push({ type: 'hard-break' });
          break;
        case 'emphasis':
          out.push(...this.#inline(node.children, { ...marks, italic: true }));
          break;
        case 'strong':
          out.push(...this.#inline(node.children, { ...marks, bold: true }));
          break;
        case 'delete':
          out.push(...this.#inline(node.children, { ...marks, strike: true }));
          break;
        case 'link':
          out.push(...this.#inline(node.children, { ...marks, link: node.url }));
          break;
        case 'image':
          out.push({ type: 'block', block: { type: 'image', src: node.url, alt: node.alt } });
          break;
        case 'footnoteReference':
          // Its number in superscript; an unresolved reference is already its text.
          if (node.index !== undefined)
            text(String(node.index), { ...marks, superscript: true, subscript: undefined });
          break;
        case 'html':
          text(node.value);
          break;
        case 'element':
          out.push(...this.#element(node.tagName, node.attributes, node.children, marks));
          break;
        default:
          if (Array.isArray(any.children)) out.push(...this.#inline(childrenOf(any), marks));
          else if (typeof any.value === 'string') text(any.value);
      }
    }
    return out;
  }

  /** An admitted element: a mark of the profile, a hard break, or its content unwrapped. */
  #element(
    tag: string,
    attributes: Readonly<Record<string, string>>,
    children: readonly MarkdownContent[],
    marks: TextEditorPortableMarks,
  ): Piece[] {
    const color = attributes['data-color'];
    const on = (patch: TextEditorPortableMarks) => this.#inline(children, { ...marks, ...patch });
    switch (tag.toLowerCase()) {
      case 'br':
        return [{ type: 'hard-break' }];
      case 'b':
      case 'strong':
        return on({ bold: true });
      case 'i':
      case 'em':
        return on({ italic: true });
      case 'u':
        return on({ underline: true });
      case 's':
      case 'del':
        return on({ strike: true });
      // Of a nested superscript and subscript, the inner one is kept.
      case 'sup':
        return on({ superscript: true, subscript: undefined });
      case 'sub':
        return on({ subscript: true, superscript: undefined });
      case 'span':
        return isTextEditorColor(color) ? on({ textColor: color }) : on({});
      case 'mark':
        return on({ highlight: isTextEditorColor(color) ? color : 'yellow' });
      default:
        return on({});
    }
  }
}

/** The attribute values that a definition's `parse` gives; canonicalization checks them. */
function definedAttributes(attrs: unknown): TextEditorAttributes {
  const values: Record<string, TextEditorAttributeValue> = {};
  if (typeof attrs === 'object' && attrs !== null)
    for (const [name, value] of Object.entries(attrs))
      if (value !== undefined) values[name] = value as TextEditorAttributeValue;
  return values;
}

/** The resolve diagnostics the import reports: those of destinations that fail the URL policy. */
function urlDiagnostics(
  diagnostics: readonly { readonly code: string; readonly message: string }[],
): TextEditorMarkdownDiagnostic[] {
  return diagnostics
    .filter((diagnostic) => diagnostic.code === 'markdown-url')
    .map(({ message }) => ({ code: 'markdown-url', message }));
}

/**
 * Reads Markdown as a document: parse, resolve under the extended element policy and the URL
 * policy, map to the portable model and canonicalize as imported content. An empty source gives
 * one empty paragraph.
 */
export function readMarkdown(
  source: string,
  options: TextEditorMarkdownReadOptions = {},
): TextEditorMarkdownRead {
  const { root, diagnostics } = resolveMarkdown(parseMarkdown(String(source)), {
    elements: EDITOR_ELEMENTS,
    urls: options.urls ?? null,
  });
  const blocks = new MarkdownReader(nodeLookup(options.nodes)).blocks(root.children);
  const canonical = canonicalize(
    { blocks },
    { nodes: options.nodes, imported: true, createId: options.createId },
  );
  return {
    document: canonical.document,
    diagnostics: [...urlDiagnostics(diagnostics), ...canonical.diagnostics],
  };
}

// Writing

export interface TextEditorMarkdownWriteOptions {
  /** The link and image protocols; the shared defaults for a member that is absent. */
  readonly urls?: MarkdownUrlPolicy | null | undefined;
  /** The custom node definitions, whose Markdown or text custom nodes are written as. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
}

export interface TextEditorMarkdownWrite {
  readonly markdown: string;
  /** A `markdown-url` diagnostic per destination left out because it fails the URL policy. */
  readonly diagnostics: readonly TextEditorMarkdownDiagnostic[];
}

/** What a divider is written as; the serializer's own form of a thematic break is `***`. */
const DIVIDER = '---';
/**
 * Written inside the bracket that opens a quote's first line when that line would read back as an
 * alert marker: an empty comment, which the resolve step drops, so the line stays the quote's text.
 */
const ALERT_GUARD = '<!---->';

/** A part of the text of inline content and the link it belongs to, to compare two readings. */
type Segment = readonly [text: string, link: string | null];

/** The text of inline content with the link each part belongs to, adjacent parts merged. */
function segments(nodes: readonly MarkdownContent[]): Segment[] {
  const out: [string, string | null][] = [];
  const push = (text: string, link: string | null) => {
    const last = out[out.length - 1];
    if (last && last[1] === link) last[0] += text;
    else out.push([text, link]);
  };
  const visit = (list: readonly MarkdownContent[], link: string | null) => {
    for (const node of list) {
      const any = node as AnyNode;
      if (node.type === 'link') visit(node.children, node.url);
      else if (node.type === 'break') push('\n', link);
      else if (node.type === 'image') push('\ufffc', link);
      else if (Array.isArray(any.children)) visit(childrenOf(any), link);
      else if (typeof any.value === 'string') push(any.value, link);
    }
  };
  visit(nodes, null);
  return out;
}

/** How inline content reads back on its own line of Markdown, before the resolve step. */
function readBack(nodes: readonly MarkdownInline[]): readonly MarkdownContent[] {
  const source = serializeMarkdown({
    type: 'root',
    children: [{ type: 'paragraph', children: [...nodes] }],
  });
  const first = parseMarkdown(source).children[0] as AnyNode | undefined;
  return first ? childrenOf(first) : [];
}

/** The plain text of inline content holding text and formatting only, or `null`. */
function plainText(nodes: readonly MarkdownContent[]): string | null {
  let text = '';
  for (const node of nodes) {
    const any = node as AnyNode;
    if (node.type === 'text') text += node.value;
    else if (
      node.type === 'emphasis' ||
      node.type === 'strong' ||
      node.type === 'delete' ||
      node.type === 'element'
    ) {
      const inner = plainText(childrenOf(any));
      if (inner === null) return null;
      text += inner;
    } else return null;
  }
  return text;
}

/** Inline content with the given links replaced by their content. */
function unwrapLinks(
  nodes: readonly MarkdownInline[],
  links: ReadonlySet<MarkdownLink>,
): MarkdownInline[] {
  return nodes.flatMap((node): MarkdownInline[] => {
    if (node.type === 'link' && links.has(node)) return unwrapLinks(node.children, links);
    const any = node as AnyNode;
    if (!Array.isArray(any.children)) return [node];
    return [
      { ...node, children: unwrapLinks(any.children as MarkdownInline[], links) } as MarkdownInline,
    ];
  });
}

class MarkdownWriter {
  readonly diagnostics: TextEditorMarkdownDiagnostic[] = [];
  readonly #lookup: TextEditorNodeLookup;
  readonly #nodes: readonly TextEditorNodeDefinition[] | undefined;
  readonly #links: readonly string[];
  readonly #images: readonly string[];

  constructor(options: TextEditorMarkdownWriteOptions) {
    this.#nodes = options.nodes;
    this.#lookup = nodeLookup(options.nodes);
    this.#links = linkProtocols(options.urls);
    this.#images = imageProtocols(options.urls);
  }

  root(blocks: readonly TextEditorPortableBlock[]): MarkdownRoot {
    return { type: 'root', children: this.#blocks(blocks) };
  }

  #blocked(what: 'link destination' | 'image source', url: string): void {
    this.diagnostics.push({ code: 'markdown-url', message: `Blocked ${what} "${url}".` });
  }

  /** Blocks in order; consecutive list items of one kind form one list. */
  #blocks(blocks: readonly TextEditorPortableBlock[]): MarkdownBlock[] {
    const out: MarkdownBlock[] = [];
    let index = 0;
    while (index < blocks.length) {
      const block = blocks[index]!;
      if (!isListItem(block)) {
        out.push(...this.#block(block));
        index += 1;
        continue;
      }
      let end = index + 1;
      while (end < blocks.length && blocks[end]!.type === block.type) end += 1;
      out.push(this.#list(blocks.slice(index, end) as TextEditorPortableListItem[]));
      index = end;
    }
    return out;
  }

  #block(block: TextEditorPortableBlock): MarkdownBlock[] {
    switch (block.type) {
      case 'paragraph': {
        const children = this.#textblock(block.content);
        return children.length > 0 ? [{ type: 'paragraph', children }] : [];
      }
      case 'heading':
        return [{ type: 'heading', depth: block.level, children: this.#textblock(block.content) }];
      case 'quote':
        return [this.#quote(block.content)];
      case 'code':
        return [{ type: 'code', lang: block.language ?? null, meta: null, value: block.text }];
      case 'divider':
        return [{ type: 'html', value: DIVIDER }];
      case 'image':
        return this.#image(block);
      case 'table':
        return [this.#table(block)];
      case 'custom':
        return this.#customBlock(block);
      default:
        return [this.#list([block])];
    }
  }

  #list(items: readonly TextEditorPortableListItem[]): MarkdownList {
    const first = items[0]!;
    const ordered = first.type === 'list-ordered';
    return {
      type: 'list',
      ordered,
      start: first.type === 'list-ordered' ? (first.start ?? 1) : null,
      spread: false,
      children: items.map((item) => this.#item(item)),
    };
  }

  /** An item: its paragraph unless it is empty, then its nested lists. */
  #item(item: TextEditorPortableListItem): MarkdownListItem {
    const content = this.#textblock(item.content);
    return {
      type: 'listItem',
      checked: item.type === 'list-task' ? item.checked : null,
      spread: false,
      children: [
        ...(content.length > 0 ? [{ type: 'paragraph' as const, children: content }] : []),
        ...this.#blocks(item.children),
      ],
    };
  }

  /**
   * A quote. When its first line would read back as an alert marker, an empty comment inside the
   * opening bracket keeps that line the quote's text.
   */
  #quote(content: readonly TextEditorPortableInline[]): MarkdownBlockquote {
    const children = this.#textblock(content);
    const quote: MarkdownBlockquote = {
      type: 'blockquote',
      children: children.length > 0 ? [{ type: 'paragraph', children }] : [],
    };
    const probe = resolveMarkdown({ type: 'root', children: [quote] }).root.children[0];
    const [first, ...rest] = children;
    if (probe?.type !== 'alert' || first?.type !== 'text') return quote;
    const guarded: MarkdownInline[] = [
      { type: 'text', value: first.value.slice(0, 1) },
      { type: 'html', value: ALERT_GUARD },
      { type: 'text', value: first.value.slice(1) },
      ...rest,
    ];
    return { type: 'blockquote', children: [{ type: 'paragraph', children: guarded }] };
  }

  /** An image in a paragraph of its own; one whose source fails the policy is its alternative text. */
  #image(image: TextEditorPortableImage): MarkdownBlock[] {
    // A pending image (an empty source) is transient and leaves no output and no diagnostic.
    if (image.src === '') return [];
    if (allowedUrl(image.src, this.#images))
      return [
        {
          type: 'paragraph',
          children: [{ type: 'image', url: image.src, title: null, alt: image.alt }],
        },
      ];
    this.#blocked('image source', image.src);
    return image.alt ? [{ type: 'paragraph', children: [{ type: 'text', value: image.alt }] }] : [];
  }

  /**
   * A pipe table: a header row, an empty one when the table has none, each cell's paragraphs
   * joined by line breaks, positions a span covers as empty cells, and a column marker for the
   * center or end alignment that every cell of a column shares.
   */
  #table(table: TextEditorPortableTable): MarkdownTable {
    const grid = tableGrid(table);
    const align: MarkdownAlign[] = [];
    for (let column = 0; column < grid.columns; column += 1) {
      const shared = new Set(
        grid.grid.map((row) => grid.cells[row[column] ?? -1]?.cell.align ?? 'start'),
      );
      const [only] = shared;
      align.push(
        shared.size === 1 && only === 'center'
          ? 'center'
          : shared.size === 1 && only === 'end'
            ? 'right'
            : null,
      );
    }
    const rows: MarkdownInline[][][] = grid.grid.map((row, rowIndex) =>
      row.map((index, column) => {
        const placed = grid.cells[index];
        if (!placed || placed.row !== rowIndex || placed.column !== column) return [];
        const content: TextEditorPortableInline[] = [];
        placed.cell.paragraphs.forEach((paragraph, position) => {
          if (position > 0) content.push({ type: 'hard-break' });
          content.push(...paragraph.content);
        });
        return this.#textblock(content);
      }),
    );
    if (!table.headerRow) rows.unshift(Array.from({ length: grid.columns }, () => []));
    return {
      type: 'table',
      align,
      children: rows.map((cells) => ({
        type: 'tableRow',
        children: cells.map((children) => ({ type: 'tableCell', children })),
      })),
    };
  }

  /** A custom block: its definition's Markdown, otherwise its text. */
  #customBlock(block: TextEditorPortableCustomBlock): MarkdownBlock[] {
    const definition = this.#lookup.blocks.get(block.name);
    const serialize = definition?.markdown?.serialize;
    if (definition && serialize) {
      const textblock = definition.content === 'inline';
      const markdown = textblock ? this.#inlineMarkdown(block.content ?? []) : '';
      try {
        const written = serialize({
          attrs: definitionAttributes(definition, block.attrs),
          markdown,
        });
        if (typeof written === 'string') {
          const value = written.replace(/\s+$/u, '');
          return value ? [{ type: 'html', value }] : [];
        }
      } catch {
        // A definition that throws is written as its text.
      }
    }
    const text = blockText(block, this.#nodes);
    return text ? [{ type: 'paragraph', children: this.#plain(text) }] : [];
  }

  /** Inline content as Markdown on its own, for a custom block's `serialize`. */
  #inlineMarkdown(content: readonly TextEditorPortableInline[]): string {
    const children = this.#textblock(content);
    if (children.length === 0) return '';
    return serializeMarkdown({ type: 'root', children: [{ type: 'paragraph', children }] }).replace(
      /\n$/u,
      '',
    );
  }

  /** Text with its line breaks as hard breaks. */
  #plain(text: string): MarkdownInline[] {
    const out: MarkdownInline[] = [];
    text.split('\n').forEach((line, index) => {
      if (index > 0) out.push({ type: 'break' });
      if (line) out.push({ type: 'text', value: line });
    });
    return out;
  }

  /**
   * The inline content of a textblock, without the hard breaks that end it. Links that the
   * extended autolinks would read back from their text alone are written as that text when, at
   * their place, the text reads back as the same links.
   */
  #textblock(content: readonly TextEditorPortableInline[]): MarkdownInline[] {
    let end = content.length;
    while (end > 0 && content[end - 1]!.type === 'hard-break') end -= 1;
    const autolinks = new Set<MarkdownLink>();
    const nodes = inlineTree(content.slice(0, end)).flatMap((node) => this.#tree(node, autolinks));
    if (autolinks.size === 0) return nodes;
    // Each candidate, in document order, is written as text when the content still reads back
    // with the same links; otherwise it stays a link.
    const expected = JSON.stringify(segments(readBack(nodes)));
    const chosen = new Set<MarkdownLink>();
    for (const link of autolinks) {
      chosen.add(link);
      if (JSON.stringify(segments(readBack(unwrapLinks(nodes, chosen)))) !== expected)
        chosen.delete(link);
    }
    return chosen.size > 0 ? unwrapLinks(nodes, chosen) : nodes;
  }

  #tree(node: TextEditorPortableInlineTree, autolinks: Set<MarkdownLink>): MarkdownInline[] {
    switch (node.type) {
      case 'text':
        return [{ type: 'text', value: node.text.replace(/[\u00a0\r\n]/gu, ' ') }];
      case 'hard-break':
        return [{ type: 'break' }];
      case 'custom':
        return this.#inlineNode(node);
      default:
        break;
    }
    const children = node.children.flatMap((child) => this.#tree(child, autolinks));
    const value = String(node.value);
    switch (node.mark) {
      case 'link': {
        if (!allowedUrl(value, this.#links)) {
          this.#blocked('link destination', value);
          return children;
        }
        const link: MarkdownLink = { type: 'link', url: value, title: null, children };
        if (this.#readsAsAutolink(link)) autolinks.add(link);
        return [link];
      }
      case 'textColor':
        return [
          { type: 'element', tagName: 'span', attributes: { 'data-color': value }, children },
        ];
      case 'highlight':
        return [
          { type: 'element', tagName: 'mark', attributes: { 'data-color': value }, children },
        ];
      case 'bold':
        return [{ type: 'strong', children }];
      case 'italic':
        return [{ type: 'emphasis', children }];
      case 'underline':
        return [{ type: 'element', tagName: 'u', attributes: {}, children }];
      case 'strike':
        return [{ type: 'delete', children }];
      case 'superscript':
        return [{ type: 'element', tagName: 'sup', attributes: {}, children }];
      case 'subscript':
        return [{ type: 'element', tagName: 'sub', attributes: {}, children }];
      default:
        return [{ type: 'inlineCode', value: plainText(children) ?? '' }];
    }
  }

  /** Whether the extended autolinks read a link back from its text alone: the parser's probe. */
  #readsAsAutolink(link: MarkdownLink): boolean {
    const text = plainText(link.children);
    if (!text) return false;
    const blocks = parseMarkdown(text).children;
    const paragraph = blocks[0];
    if (blocks.length !== 1 || paragraph?.type !== 'paragraph') return false;
    const [only] = paragraph.children;
    return (
      paragraph.children.length === 1 &&
      only?.type === 'link' &&
      only.url === link.url &&
      plainText(only.children) === text
    );
  }

  /** An inline node: its definition's Markdown, otherwise its text; nothing without one. */
  #inlineNode(node: TextEditorPortableInlineNode): MarkdownInline[] {
    const definition = this.#lookup.inlines.get(node.name);
    if (!definition) return [];
    const serialize = definition.markdown?.serialize;
    if (serialize)
      try {
        const written = serialize(definitionAttributes(definition, node.attrs));
        if (typeof written === 'string') return written ? [{ type: 'html', value: written }] : [];
      } catch {
        // A definition that throws is written as its text.
      }
    return this.#plain(inlineText([node], this.#nodes));
  }
}

/**
 * Writes a document as Markdown in the library's dialect, deterministically. The empty paragraph
 * that the engines keep after a final atom block or table is left out, as every format leaves it.
 */
export function writeMarkdown(
  document: TextEditorPortableDocument,
  options: TextEditorMarkdownWriteOptions = {},
): TextEditorMarkdownWrite {
  const writer = new MarkdownWriter(options);
  const markdown = serializeMarkdown(writer.root(outputBlocks(document)));
  return { markdown, diagnostics: writer.diagnostics };
}
