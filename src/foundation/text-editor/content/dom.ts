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
 * Parses an HTML string into an inert document and returns its body, or `null` where no
 * `DOMParser` exists, as in Node. The parser comes from `view` when one is given, otherwise from
 * the global scope at call time; the parsed tree is never attached to a live document.
 */
export function parseHtmlDocument(html: string, view?: HtmlParserView | null): ElementLike | null {
  const Parser = view ? view.DOMParser : (globalThis as { DOMParser?: typeof DOMParser }).DOMParser;
  if (typeof Parser !== 'function') return null;
  return new Parser().parseFromString(String(html), 'text/html').body;
}
