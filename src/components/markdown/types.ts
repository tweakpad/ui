import type { MarkdownNode, MarkdownNodeType } from '../../foundation/markdown/index.js';

/**
 * Replacements for the built-in text of a Markdown element, such as the footnote and alert titles;
 * missing entries keep the defaults.
 */
export interface MarkdownMessages {
  /** Accessible name of the footnotes section. */
  readonly footnotes?: string;
  /** Accessible name of each footnote back-reference. */
  readonly backReference?: string;
  /** Accessible name of composed tables. */
  readonly table?: string;
  readonly note?: string;
  readonly tip?: string;
  readonly important?: string;
  readonly warning?: string;
  readonly caution?: string;
}

export const DEFAULT_MARKDOWN_MESSAGES: Required<MarkdownMessages> = {
  footnotes: 'Footnotes',
  backReference: 'Back to reference',
  table: 'Table',
  note: 'Note',
  tip: 'Tip',
  important: 'Important',
  warning: 'Warning',
  caution: 'Caution',
};

/**
 * What a custom Markdown renderer receives with its node: the rendering element, the rendered
 * children and the default rendering.
 */
export interface MarkdownRenderContext {
  /** The rendering element. */
  readonly markdown: HTMLElement;
  /** The node's children rendered with the active renderers. */
  children(): unknown;
  /** The node's default rendering. */
  fallback(): unknown;
}

/**
 * Renders one node. Return `undefined` to keep the default rendering; return Lit `nothing` to
 * render nothing.
 */
export type MarkdownRenderer<N extends MarkdownNode = MarkdownNode> = (
  node: N,
  context: MarkdownRenderContext,
) => unknown;

/**
 * Functions keyed by node type that replace how a Markdown element renders that node; returning
 * `undefined` keeps the default.
 */
export type MarkdownRenderers = {
  readonly [T in MarkdownNodeType]?: MarkdownRenderer<Extract<MarkdownNode, { type: T }>>;
};

/** One heading in the collected-target shape of scroll spy. */
export interface MarkdownHeadingTarget {
  readonly element: Element;
  readonly id: string | null;
  readonly label: string;
  /** The rendered heading level, including the heading offset. */
  readonly depth: number;
}

/**
 * Detail of `tp-markdown-render`, dispatched after each committed render with the headings it
 * produced.
 */
export interface MarkdownRenderDetail {
  readonly headings: readonly MarkdownHeadingTarget[];
}
