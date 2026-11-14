/**
 * Markdown contract. A parser turns markdown source into a syntax tree; the presentation resolves
 * that tree in one shared step (`resolveMarkdown`) and renders it. Parser adapters never import a
 * parser package: the consumer supplies the engine and the adapter returns a tree in this model.
 */

/** A position in the markdown source, as a character offset. */
export interface MarkdownPoint {
  readonly offset: number;
}
/** The source range a markdown node came from, as character offsets. */
export interface MarkdownPosition {
  readonly start: MarkdownPoint;
  readonly end: MarkdownPoint;
}

/** The type tag and optional source position every markdown node carries. */
export interface MarkdownBaseNode<T extends string> {
  readonly type: T;
  position?: MarkdownPosition;
}
/** A markdown node that contains child nodes. */
export interface MarkdownParentNode<T extends string, C> extends MarkdownBaseNode<T> {
  children: C[];
}
/** A markdown node that holds its text as a string value. */
export interface MarkdownLiteralNode<T extends string> extends MarkdownBaseNode<T> {
  value: string;
}

/** The alignment of a markdown table column, or null when the column sets none. */
export type MarkdownAlign = 'left' | 'right' | 'center' | null;

/**
 * The top of a parsed markdown tree, holding the document's blocks, which a parser returns and the
 * markdown renders.
 */
export type MarkdownRoot = MarkdownParentNode<'root', MarkdownBlock>;
/** A paragraph of inline content. */
export type MarkdownParagraph = MarkdownParentNode<'paragraph', MarkdownInline>;
/** A heading from level 1 to 6. */
export interface MarkdownHeading extends MarkdownParentNode<'heading', MarkdownInline> {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  /** Assigned by `resolveMarkdown`. */
  identifier?: string;
}
/** A horizontal rule between sections. */
export type MarkdownThematicBreak = MarkdownBaseNode<'thematicBreak'>;
/** A quoted block of content. */
export type MarkdownBlockquote = MarkdownParentNode<'blockquote', MarkdownBlock>;
/** An ordered or unordered list. */
export interface MarkdownList extends MarkdownParentNode<'list', MarkdownListItem> {
  ordered: boolean;
  start: number | null;
  spread: boolean;
}
/** One item of a list, which is a task item when it is checked or unchecked. */
export interface MarkdownListItem extends MarkdownParentNode<'listItem', MarkdownBlock> {
  checked: boolean | null;
  spread: boolean;
}
/** A fenced or indented code block, with its language and the rest of its info string. */
export interface MarkdownCode extends MarkdownLiteralNode<'code'> {
  lang: string | null;
  meta: string | null;
}
/** Raw HTML from the source; the element policy decides which of its tags render. */
export type MarkdownHtml = MarkdownLiteralNode<'html'>;
/** A table, with one alignment per column. */
export interface MarkdownTable extends MarkdownParentNode<'table', MarkdownTableRow> {
  align: MarkdownAlign[];
}
/** One row of a table; the first row is the header. */
export type MarkdownTableRow = MarkdownParentNode<'tableRow', MarkdownTableCell>;
/** One cell of a table row. */
export type MarkdownTableCell = MarkdownParentNode<'tableCell', MarkdownInline>;
/** The content of a footnote, matched to its references by identifier. */
export interface MarkdownFootnoteDefinition extends MarkdownParentNode<
  'footnoteDefinition',
  MarkdownBlock
> {
  identifier: string;
  label: string;
  /** 1-based number in order of first reference; assigned by `resolveMarkdown`. */
  index?: number;
  /** How many references point at this footnote; assigned by `resolveMarkdown`. */
  references?: number;
}

/** Plain text. */
export type MarkdownText = MarkdownLiteralNode<'text'>;
/** Emphasized inline content, usually shown in italics. */
export type MarkdownEmphasis = MarkdownParentNode<'emphasis', MarkdownInline>;
/** Strongly emphasized inline content, usually shown in bold. */
export type MarkdownStrong = MarkdownParentNode<'strong', MarkdownInline>;
/** Struck-through inline content. */
export type MarkdownDelete = MarkdownParentNode<'delete', MarkdownInline>;
/** A code span within text. */
export type MarkdownInlineCode = MarkdownLiteralNode<'inlineCode'>;
/** A hard line break within a paragraph. */
export type MarkdownBreak = MarkdownBaseNode<'break'>;
/** A link around inline content, which renders only when its URL passes the URL policy. */
export interface MarkdownLink extends MarkdownParentNode<'link', MarkdownInline> {
  url: string;
  title: string | null;
}
/** An image, which renders only when its URL passes the URL policy. */
export interface MarkdownImage extends MarkdownBaseNode<'image'> {
  url: string;
  title: string | null;
  alt: string;
}
/** A reference in text to a footnote definition. */
export interface MarkdownFootnoteReference extends MarkdownBaseNode<'footnoteReference'> {
  identifier: string;
  label: string;
  /** Assigned by `resolveMarkdown`; the reference renders as text without one. */
  index?: number;
  /** Which reference to the same footnote this is, from 1. */
  occurrence?: number;
}

/** Produced by `resolveMarkdown` from raw HTML admitted by the element policy. */
export interface MarkdownElement extends MarkdownParentNode<'element', MarkdownContent> {
  tagName: string;
  attributes: Record<string, string>;
}
/** Produced by `resolveMarkdown` from a GitHub alert blockquote. */
export interface MarkdownAlert extends MarkdownParentNode<'alert', MarkdownBlock> {
  kind: MarkdownAlertKind;
}
/** Produced by `resolveMarkdown`: referenced footnote definitions in order of first reference. */
export type MarkdownFootnotes = MarkdownParentNode<'footnotes', MarkdownFootnoteDefinition>;

/** The kind of an alert callout, which sets its tone and title. */
export type MarkdownAlertKind = 'note' | 'tip' | 'important' | 'warning' | 'caution';

/** Any block-level markdown node, as found in the root, blockquotes, list items and footnotes. */
export type MarkdownBlock =
  | MarkdownParagraph
  | MarkdownHeading
  | MarkdownThematicBreak
  | MarkdownBlockquote
  | MarkdownList
  | MarkdownCode
  | MarkdownHtml
  | MarkdownTable
  | MarkdownFootnoteDefinition
  | MarkdownElement
  | MarkdownAlert
  | MarkdownFootnotes;

/** Any inline markdown node, as found in paragraphs, headings, links and table cells. */
export type MarkdownInline =
  | MarkdownText
  | MarkdownEmphasis
  | MarkdownStrong
  | MarkdownDelete
  | MarkdownInlineCode
  | MarkdownBreak
  | MarkdownLink
  | MarkdownImage
  | MarkdownFootnoteReference
  | MarkdownHtml
  | MarkdownElement;

/** Any block-level or inline markdown node. */
export type MarkdownContent = MarkdownBlock | MarkdownInline;
/** Any node a markdown tree can contain, including the root. */
export type MarkdownNode =
  MarkdownRoot | MarkdownContent | MarkdownListItem | MarkdownTableRow | MarkdownTableCell;
/** The type tag of any markdown node, such as `paragraph` or `link`. */
export type MarkdownNodeType = MarkdownNode['type'];

/** The parser an application supplies: it turns markdown source into the tree `tp-markdown` renders. */
export interface MarkdownParser {
  /** Diagnostic identity. */
  readonly name?: string;
  /** Parses the complete source synchronously into the tree model. */
  parse(source: string): MarkdownRoot;
}

/**
 * Tags admitted from raw HTML and the attributes each keeps. `'*'` lists attributes kept on every
 * tag. A tag mapped to `false` removes a default tag.
 */
export type MarkdownElementPolicy = Readonly<Record<string, readonly string[] | false>>;

/**
 * The URL protocols a markdown accepts for links and images; a blocked link keeps only its text and
 * a blocked image its alternative text.
 */
export interface MarkdownUrlPolicy {
  /** Protocols allowed for links, such as `https:`; relative references and fragments always pass. */
  readonly links?: readonly string[];
  /** Protocols allowed for images; relative references always pass. */
  readonly images?: readonly string[];
}

export interface MarkdownDiagnostic {
  readonly code: string;
  readonly message: string;
}
