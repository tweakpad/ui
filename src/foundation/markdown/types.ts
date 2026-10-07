/**
 * Markdown contract (Foundation §18.16). A parser turns markdown source into an mdast tree; the
 * presentation resolves that tree in one shared step (`resolveMarkdown`) and renders it. Parser
 * adapters never import a parser package: the consumer supplies the engine and the adapter returns
 * a tree in this model.
 */

export interface MarkdownPoint {
  readonly offset: number;
}
export interface MarkdownPosition {
  readonly start: MarkdownPoint;
  readonly end: MarkdownPoint;
}

interface Node<T extends string> {
  readonly type: T;
  position?: MarkdownPosition;
}
interface Parent<T extends string, C> extends Node<T> {
  children: C[];
}
interface Literal<T extends string> extends Node<T> {
  value: string;
}

export type MarkdownAlign = 'left' | 'right' | 'center' | null;

export type MarkdownRoot = Parent<'root', MarkdownBlock>;
export type MarkdownParagraph = Parent<'paragraph', MarkdownInline>;
export interface MarkdownHeading extends Parent<'heading', MarkdownInline> {
  depth: 1 | 2 | 3 | 4 | 5 | 6;
  /** Assigned by `resolveMarkdown`. */
  identifier?: string;
}
export type MarkdownThematicBreak = Node<'thematicBreak'>;
export type MarkdownBlockquote = Parent<'blockquote', MarkdownBlock>;
export interface MarkdownList extends Parent<'list', MarkdownListItem> {
  ordered: boolean;
  start: number | null;
  spread: boolean;
}
export interface MarkdownListItem extends Parent<'listItem', MarkdownBlock> {
  checked: boolean | null;
  spread: boolean;
}
export interface MarkdownCode extends Literal<'code'> {
  lang: string | null;
  meta: string | null;
}
export type MarkdownHtml = Literal<'html'>;
export interface MarkdownTable extends Parent<'table', MarkdownTableRow> {
  align: MarkdownAlign[];
}
export type MarkdownTableRow = Parent<'tableRow', MarkdownTableCell>;
export type MarkdownTableCell = Parent<'tableCell', MarkdownInline>;
export interface MarkdownFootnoteDefinition extends Parent<'footnoteDefinition', MarkdownBlock> {
  identifier: string;
  label: string;
  /** 1-based number in order of first reference; assigned by `resolveMarkdown`. */
  index?: number;
  /** How many references point at this footnote; assigned by `resolveMarkdown`. */
  references?: number;
}

export type MarkdownText = Literal<'text'>;
export type MarkdownEmphasis = Parent<'emphasis', MarkdownInline>;
export type MarkdownStrong = Parent<'strong', MarkdownInline>;
export type MarkdownDelete = Parent<'delete', MarkdownInline>;
export type MarkdownInlineCode = Literal<'inlineCode'>;
export type MarkdownBreak = Node<'break'>;
export interface MarkdownLink extends Parent<'link', MarkdownInline> {
  url: string;
  title: string | null;
}
export interface MarkdownImage extends Node<'image'> {
  url: string;
  title: string | null;
  alt: string;
}
export interface MarkdownFootnoteReference extends Node<'footnoteReference'> {
  identifier: string;
  label: string;
  /** Assigned by `resolveMarkdown`; the reference renders as text without one. */
  index?: number;
  /** Which reference to the same footnote this is, from 1. */
  occurrence?: number;
}

/** Produced by `resolveMarkdown` from raw HTML admitted by the element policy. */
export interface MarkdownElement extends Parent<'element', MarkdownContent> {
  tagName: string;
  attributes: Record<string, string>;
}
/** Produced by `resolveMarkdown` from a GitHub alert blockquote. */
export interface MarkdownAlert extends Parent<'alert', MarkdownBlock> {
  kind: MarkdownAlertKind;
}
/** Produced by `resolveMarkdown`: referenced footnote definitions in order of first reference. */
export type MarkdownFootnotes = Parent<'footnotes', MarkdownFootnoteDefinition>;

export type MarkdownAlertKind = 'note' | 'tip' | 'important' | 'warning' | 'caution';

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

export type MarkdownContent = MarkdownBlock | MarkdownInline;
export type MarkdownNode =
  MarkdownRoot | MarkdownContent | MarkdownListItem | MarkdownTableRow | MarkdownTableCell;
export type MarkdownNodeType = MarkdownNode['type'];

/** A consumer-supplied parser (Foundation §18.16 parser contract). */
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
