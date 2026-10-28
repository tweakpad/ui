/**
 * Content glue of every engine instance (Widgets `uwg-te-req-content-1`, `uwg-te-req-engine-8`,
 * `uwg-te-tab-engine` r5).
 *
 * One read and one write path between the four content formats and the portable model, which
 * each adapter feeds with its own pure mapper of native JSON: HTML, Markdown and text go through
 * the shared converters only, native JSON through the adapter's mapper and the shared URL policy,
 * and what the instance cannot represent is converted on every load.
 */
import { domError } from '../../../dom-error.js';
import { allowedUrl, imageProtocols, linkProtocols } from '../../../markdown/url.js';
import { assertTextEditorFormat, unknownFormatError } from '../../actions.js';
import type { TextEditorCapability } from '../../capabilities.js';
import { parseHtmlDocument, type ElementLike, type HtmlParserView } from '../../content/dom.js';
import { importHtml, serializeHtml } from '../../content/html.js';
import { readMarkdown, writeMarkdown } from '../../content/markdown.js';
import {
  canonicalize,
  convertedDiagnostic,
  convertUnsupported,
  selectPortableBlocks,
  textToInline,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
} from '../../content/portable.js';
import { readText, writeText } from '../../content/text.js';
import type {
  TextEditorContentOptions,
  TextEditorDiagnostic,
  TextEditorDiagnosticCode,
  TextEditorEngine,
  TextEditorEngineContext,
  TextEditorFormat,
  TextEditorPortableFormat,
  TextEditorSnapshot,
  TextEditorUrlPolicy,
} from '../../engine.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { resolveTextEditorCapabilities } from '../../tools.js';

/** What one instance reads and writes content with. */
export interface TextEditorContentGlue {
  readonly urls: TextEditorUrlPolicy;
  /** The custom node definitions of the mount, each supported by the engine. */
  readonly nodes: readonly TextEditorNodeDefinition[];
  /**
   * The definitions content is read with: `nodes`, then those the mount converts (the context's
   * `convertNodes`); `nodes` when absent.
   */
  readonly readNodes?: readonly TextEditorNodeDefinition[] | undefined;
  /** Creates the identifiers of blocks that need one. */
  readonly createId: () => string;
  /** What the instance represents: the engine's capabilities and those of `nodes`. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  /**
   * The adapter's pure mapper from its native JSON, an object, to the portable model; throws a
   * DataError for JSON that is malformed or belongs to another engine.
   */
  readonly fromNative: (json: unknown) => TextEditorPortableDraft;
  /** The window whose `DOMParser` reads HTML; the global scope when absent. */
  readonly view?: HtmlParserView | null | undefined;
  /** Parses HTML in place of the `DOMParser`, such as a structural builder in Node tests. */
  readonly parseHtml?: ((html: string) => ElementLike | null) | undefined;
  /**
   * The writing direction in which HTML that sets none maps a physical `left` or `right`
   * alignment to start or end, read at each load; left-to-right when absent.
   */
  readonly direction?: (() => TextEditorDirection) | undefined;
}

/** A writing direction. */
export type TextEditorDirection = 'ltr' | 'rtl';

/**
 * The direction an element resolves, through shadow roots: `rtl` when it matches `:dir(rtl)`,
 * else `ltr`, also where the selector is unknown or the element is no DOM element.
 */
export function resolvedDirection(element: unknown): TextEditorDirection {
  const matches = (element as { matches?: (selector: string) => boolean } | null)?.matches;
  if (typeof matches !== 'function') return 'ltr';
  try {
    return matches.call(element, ':dir(rtl)') ? 'rtl' : 'ltr';
  } catch {
    return 'ltr';
  }
}

/** The parser of the glue's HTML. */
export interface TextEditorContentGlueOptions {
  /** The window whose `DOMParser` reads HTML, such as the container's. */
  readonly view?: HtmlParserView | null | undefined;
  /** Parses HTML in place of the `DOMParser`. */
  readonly parseHtml?: ((html: string) => ElementLike | null) | undefined;
  /** The direction of the widget, which maps a physical alignment of loaded HTML. */
  readonly direction?: (() => TextEditorDirection) | undefined;
}

/**
 * The glue of a mount: the context's URL policy, nodes and identifiers, the capabilities that the
 * engine and the mount's nodes give, and the adapter's mapper.
 */
export function textEditorContentGlue(
  context: Pick<TextEditorEngineContext, 'urls' | 'nodes' | 'createId' | 'convertNodes'>,
  engine: Pick<TextEditorEngine, 'capabilities' | 'supportsNode'>,
  fromNative: (json: unknown) => TextEditorPortableDraft,
  options: TextEditorContentGlueOptions = {},
): TextEditorContentGlue {
  return Object.freeze({
    urls: context.urls,
    nodes: context.nodes,
    readNodes: readingNodes(context.nodes, context.convertNodes),
    createId: () => context.createId(),
    capabilities: resolveTextEditorCapabilities(engine, context.nodes),
    fromNative,
    view: options.view,
    parseHtml: options.parseHtml,
    direction: options.direction,
  });
}

/** The mount's definitions, then each converted one whose name none of them takes. */
function readingNodes(
  nodes: readonly TextEditorNodeDefinition[],
  convert: readonly TextEditorNodeDefinition[] | undefined,
): readonly TextEditorNodeDefinition[] {
  if (!convert?.length) return nodes;
  const names = new Set(nodes.map((definition) => definition.name));
  return Object.freeze([...nodes, ...convert.filter((definition) => !names.has(definition.name))]);
}

/** Content read into the portable model. */
export interface TextEditorContentRead {
  /** The canonical document, converted to what the instance represents. */
  readonly document: TextEditorPortableDocument;
  /**
   * The load's diagnostics for the caller to report: only `text-editor-` codes, at most one
   * `text-editor-content-converted` among them.
   */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/** Native JSON as an object: an object as it is, JSON text parsed. */
function nativeJson(content: unknown): unknown {
  if (typeof content !== 'string') return content;
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw domError('DataError', 'The native JSON cannot be parsed.');
  }
}

/** The converters' diagnostics that are the editor's: the `text-editor-` codes. */
const editorDiagnostics = (
  diagnostics: readonly { readonly code: string; readonly message: string }[],
): TextEditorDiagnostic[] =>
  diagnostics
    .filter(({ code }) => code.startsWith('text-editor-'))
    .map(({ code, message }) => ({ code: code as TextEditorDiagnosticCode, message }));

/** What a converter read: a canonical document and the converter's diagnostics. */
interface ConverterRead {
  readonly document: TextEditorPortableDocument;
  readonly diagnostics: readonly { readonly code: string; readonly message: string }[];
}

/**
 * A canonical document under the URL policy, which the HTML importer applies as it reads: a link
 * whose destination fails the link protocols is removed and its text kept, and an image whose
 * source fails the image protocols becomes a paragraph holding its alternative text, keeping its
 * identifier, or is removed when it has none. Reports nothing; the document itself when every
 * destination passes. Native JSON loads and inserted fragments go through it.
 */
export function applyTextEditorUrlPolicy(
  document: TextEditorPortableDocument,
  glue: Pick<TextEditorContentGlue, 'urls' | 'nodes' | 'createId'>,
): TextEditorPortableDocument {
  const links = linkProtocols(glue.urls);
  const images = imageProtocols(glue.urls);
  let blocked = false;
  const inline = (content: readonly TextEditorPortableInline[]): TextEditorPortableInline[] =>
    content.map((node) => {
      const link = node.type === 'text' ? node.marks?.link : undefined;
      if (node.type !== 'text' || link === undefined || allowedUrl(link, links)) return node;
      blocked = true;
      return { ...node, marks: { ...node.marks, link: undefined } };
    });
  const item = (block: TextEditorPortableListItem): TextEditorPortableListItem => ({
    ...block,
    content: inline(block.content),
    children: block.children.map(item),
  });
  const fit = (block: TextEditorPortableBlock): TextEditorPortableBlock[] => {
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
        return [{ ...block, content: inline(block.content) }];
      case 'list-bullet':
      case 'list-ordered':
      case 'list-task':
        return [item(block)];
      case 'image': {
        if (allowedUrl(block.src, images)) return [block];
        blocked = true;
        if (block.alt === '') return [];
        const id = block.id === undefined ? {} : { id: block.id };
        return [{ type: 'paragraph', ...id, content: textToInline(block.alt) }];
      }
      case 'table':
        return [
          {
            ...block,
            rows: block.rows.map((row) => ({
              cells: row.cells.map((cell) => ({
                ...cell,
                paragraphs: cell.paragraphs.map((p) => ({ content: inline(p.content) })),
              })),
            })),
          },
        ];
      case 'custom':
        return [block.content ? { ...block, content: inline(block.content) } : block];
      default:
        return [block];
    }
  };
  const blocks = document.blocks.flatMap(fit);
  if (!blocked) return document;
  // Runs left with equal marks merge, and a document left without blocks gets its paragraph.
  return canonicalize({ blocks }, { nodes: glue.nodes, createId: glue.createId }).document;
}

/** Content in a format as a canonical document, before conversion. */
function readCanonical(
  content: unknown,
  format: TextEditorFormat,
  glue: TextEditorContentGlue,
): ConverterRead {
  const { urls, createId } = glue;
  const nodes = glue.readNodes ?? glue.nodes;
  switch (format) {
    case 'html': {
      const html = String(content);
      const root = glue.parseHtml ? glue.parseHtml(html) : parseHtmlDocument(html, glue.view);
      if (!root) throw domError('NotSupportedError', 'No HTML parser is available.');
      return importHtml(root, { urls, nodes, createId, direction: glue.direction?.() });
    }
    case 'markdown':
      return readMarkdown(String(content), { urls, nodes, createId });
    case 'text':
      return { document: readText(String(content), { createId }), diagnostics: [] };
    case 'json': {
      const read = canonicalize(glue.fromNative(nativeJson(content)), { nodes, createId });
      return {
        document: applyTextEditorUrlPolicy(read.document, glue),
        diagnostics: read.diagnostics,
      };
    }
    default:
      throw unknownFormatError(format);
  }
}

/**
 * Reads content in a format as the canonical document: `html` through the HTML importer,
 * `markdown` and `text` through their readers, `json`, an object or JSON text, through the
 * adapter's mapper and then the URL policy as the HTML importer applies it; then converts what
 * the instance cannot represent. Throws a DataError for content that cannot be parsed and a
 * NotSupportedError for an unknown format.
 */
export function readTextEditorContent(
  content: unknown,
  format: TextEditorFormat,
  glue: TextEditorContentGlue,
): TextEditorContentRead {
  assertTextEditorFormat(format);
  const read = readCanonical(content, format, glue);
  const { document, converted } = convertUnsupported(read.document, {
    capabilities: glue.capabilities,
    nodes: glue.readNodes ?? glue.nodes,
  });
  const diagnostics = editorDiagnostics(read.diagnostics);
  const diagnostic = convertedDiagnostic(converted);
  if (diagnostic) diagnostics.push(diagnostic);
  return { document, diagnostics: Object.freeze(diagnostics) };
}

/**
 * Writes a document in a portable format through the shared converters, limited to the block
 * subtrees of `options.blocks` when given. `json` is the adapter's own native JSON and is not
 * written here: it and an unknown format throw a NotSupportedError.
 */
export function writeTextEditorContent(
  document: TextEditorPortableDocument,
  format: TextEditorPortableFormat,
  glue: Pick<TextEditorContentGlue, 'urls' | 'nodes'>,
  options: TextEditorContentOptions = {},
): string {
  const { urls, nodes } = glue;
  const source = options.blocks ? selectPortableBlocks(document, options.blocks) : document;
  switch (format) {
    case 'html':
      return serializeHtml(source, { nodes });
    case 'markdown':
      return writeMarkdown(source, { urls, nodes }).markdown;
    case 'text':
      return writeText(source, { nodes });
    default:
      throw unknownFormatError(format);
  }
}

/** What `getContent` reads from a mount. */
export interface TextEditorContentSource {
  /** The canonical portable document of the current revision. */
  portable(): TextEditorPortableDocument;
  /** The engine's native JSON of the whole document. */
  native(): unknown;
  /** The adapter's native JSON of a portable document. */
  toNative(document: TextEditorPortableDocument): unknown;
}

/**
 * `getContent` of an instance (`uwg-te-tab-engine` r5): a portable format through the shared
 * converters (`writeTextEditorContent`), limited to the block subtrees of `options.blocks` when
 * given; `json` as the engine holds it, or with `blocks` those subtrees (`selectPortableBlocks`)
 * through the adapter's own mapper. A value that names no format throws a NotSupportedError.
 */
export function textEditorContentOf(
  source: TextEditorContentSource,
  format: TextEditorFormat,
  glue: Pick<TextEditorContentGlue, 'urls' | 'nodes'>,
  options: TextEditorContentOptions = {},
): unknown {
  assertTextEditorFormat(format);
  if (format !== 'json') return writeTextEditorContent(source.portable(), format, glue, options);
  if (!options.blocks) return source.native();
  return source.toNative(selectPortableBlocks(source.portable(), options.blocks));
}

/** The revision that a snapshot reads, mapped only when content is read. */
export interface TextEditorSnapshotSource {
  /** The revision as a portable document; a snapshot calls it at most once. */
  portable(): TextEditorPortableDocument;
  /** The revision's native JSON. */
  native(): unknown;
}

/**
 * A lazy handle on one revision: it maps the revision to the portable model once, on the first
 * read of a portable format, and serializes on every read; the controller memoizes per format.
 */
export class TextEditorAdapterSnapshot implements TextEditorSnapshot {
  readonly revision: number;
  readonly empty: boolean;
  readonly #source: TextEditorSnapshotSource;
  readonly #glue: Pick<TextEditorContentGlue, 'urls' | 'nodes'>;
  #portable: TextEditorPortableDocument | null = null;

  constructor(
    revision: number,
    empty: boolean,
    source: TextEditorSnapshotSource,
    glue: Pick<TextEditorContentGlue, 'urls' | 'nodes'>,
  ) {
    this.revision = revision;
    this.empty = empty;
    this.#source = source;
    this.#glue = glue;
  }

  getContent(format: TextEditorPortableFormat): string;
  getContent(format: 'json'): unknown;
  getContent(format: TextEditorFormat): unknown;
  getContent(format: TextEditorFormat): unknown {
    assertTextEditorFormat(format);
    if (format === 'json') return this.#source.native();
    this.#portable ??= this.#source.portable();
    return writeTextEditorContent(this.#portable, format, this.#glue);
  }
}
