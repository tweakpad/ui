import { motionTransition } from '../../motion.js';
import type { PresentationDeclarations, PresentationRule } from '../../resolver.js';
import { codeFace } from './code-surface.js';

// Document content profile sets (`dcp-binding`): one builder per role. Each takes the consumer's
// selectors and, where the role spaces blocks, the consumer's flow variable names, so every
// consumer binds the same declarations to its own elements and restates none of them. The
// `paragraph` role (`dcp-roles-table-r1`) declares nothing of its own: its body text is the
// scope's and its spacing is the flow's.

/** The custom properties a content scope declares for block and section spacing (`dcp-flow`). */
export interface DocumentFlowVariables {
  /** Block spacing, on the block-start edge of each block. */
  readonly flow: `--${string}`;
  /** Section spacing: before headings and dividers, and on the block after a divider. */
  readonly headingFlow: `--${string}`;
}

/** The scales of the document content profile (`dcp-scale`). */
export type DocumentScale = 'default' | 'compact';

/** Where block flow applies; each selector names the consumer's own elements (`dcp-flow`). */
export interface DocumentFlowSelectors {
  /** Every block of every flow container. */
  readonly blocks: string;
  /** The block after a heading. */
  readonly afterHeading: string;
  /** Every divider and the block after one. */
  readonly dividers: string;
  /** The first block of every flow container. */
  readonly first: string;
}

/** A heading level. */
export type DocumentHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface DocumentHeadingSelectors {
  /** Every heading. */
  readonly heading: string;
  /** The heading of one level. */
  readonly level: (level: DocumentHeadingLevel) => string;
  /**
   * The heading of one level in the compact scale, called for levels 1 to 4 (5 and 6 keep one size).
   * A consumer without a size axis omits it (`dcp-scale`).
   */
  readonly compactLevel?: ((level: DocumentHeadingLevel) => string) | undefined;
}

export interface DocumentListSelectors {
  /** Every ordered, unordered or task list. */
  readonly list: string;
  /** A task list. */
  readonly taskList: string;
}

export interface DocumentListItemSelectors {
  /** An item that follows another item of its list. */
  readonly nextItem: string;
  /** A loose item (one that holds flowing blocks) after another loose item; omitted when none exist. */
  readonly nextLooseItem?: string | undefined;
  /** An item's marker (`dcp-roles-table-r4`). */
  readonly marker: string;
  /** A list nested in an item. */
  readonly nestedList: string;
  /** An item that shows no marker, such as a task item. */
  readonly unmarkedItem: string;
}

export interface DocumentInlineCodeSelectors {
  /** Every code span. */
  readonly code: string;
  /**
   * A code span in the compact scale, and one inside a heading there, which still keeps the heading
   * size; omitted without a size axis (`dcp-scale`).
   */
  readonly compact?: { readonly code: string; readonly inHeading: string } | undefined;
  /** A code span inside a heading, which keeps the heading size. */
  readonly inHeading: string;
}

const underline = 'color-mix(in oklab, var(--tp-foreground) 30%, transparent)';

/**
 * A rule at a consumer's selector; a rule on the bound element itself (`&`) has no selector. Every
 * document set places its rules through it (`dcp-binding`).
 */
export function at(selector: string, declarations: PresentationDeclarations): PresentationRule {
  return selector === '&' ? { declarations } : { selector, declarations };
}

/**
 * A content scope's declarations (`dcp-scale`, `dcp-flow`): body text and both spacing variables
 * at the default scale; at the compact scale, what a size axis changes over the default.
 */
export function documentScope(
  variables: DocumentFlowVariables,
  scale: DocumentScale,
): PresentationDeclarations {
  return scale === 'default'
    ? {
        'font-size': 'var(--tp-text-base)',
        'overflow-wrap': 'break-word',
        [variables.flow]: 'var(--tp-space-4)',
        [variables.headingFlow]: 'var(--tp-space-8)',
      }
    : {
        'font-size': 'var(--tp-text-sm)',
        [variables.flow]: 'var(--tp-space-3)',
        [variables.headingFlow]: 'var(--tp-space-6)',
      };
}

/**
 * Block flow (`dcp-flow`), in this order: blocks, afterHeading, dividers, first. A divider takes
 * section spacing before it and the following block carries the space after it. The selectors must
 * give `afterHeading` and `first` precedence over `dividers` and over the heading rule's section
 * spacing, so that the block after a heading takes the small step even when it is a heading or a
 * divider.
 */
export function documentFlowRules(
  variables: DocumentFlowVariables,
  selectors: DocumentFlowSelectors,
): readonly PresentationRule[] {
  return [
    at(selectors.blocks, { 'margin-block': `var(${variables.flow}) 0` }),
    at(selectors.afterHeading, { 'margin-block-start': 'var(--tp-space-2)' }),
    at(selectors.dividers, { 'margin-block-start': `var(${variables.headingFlow})` }),
    at(selectors.first, { 'margin-block-start': '0' }),
  ];
}

/**
 * The `heading` role (`dcp-roles-table-r2`): heading font, semibold, tight leading, section spacing
 * from `variables.headingFlow`; levels 1–6 at text-2xl … text-xs, 5 and 6 muted; level 1 tight
 * tracking, level 6 uppercase with wide tracking; levels 1–4 one step smaller in the compact scale.
 */
export function documentHeadingRules(
  variables: DocumentFlowVariables,
  selectors: DocumentHeadingSelectors,
): readonly PresentationRule[] {
  const { level, compactLevel } = selectors;
  return [
    at(selectors.heading, {
      'margin-block-start': `var(${variables.headingFlow})`,
      'font-family': 'var(--tp-font-heading)',
      'font-weight': 'var(--tp-font-semibold)',
      'line-height': 'var(--tp-leading-tight)',
      'letter-spacing': 'var(--tp-tracking-normal)',
      color: 'var(--tp-foreground)',
      'scroll-margin-block-start': 'var(--tp-space-4)',
    }),
    at(level(1), {
      'font-size': 'var(--tp-text-2xl)',
      'letter-spacing': 'var(--tp-tracking-tight)',
    }),
    at(level(2), { 'font-size': 'var(--tp-text-xl)' }),
    at(level(3), { 'font-size': 'var(--tp-text-lg)' }),
    at(level(4), { 'font-size': 'var(--tp-text-base)' }),
    at(level(5), { 'font-size': 'var(--tp-text-sm)', color: 'var(--tp-muted-foreground)' }),
    at(level(6), {
      'font-size': 'var(--tp-text-xs)',
      color: 'var(--tp-muted-foreground)',
      'text-transform': 'uppercase',
      'letter-spacing': 'var(--tp-tracking-wide)',
    }),
    ...(compactLevel
      ? [
          at(compactLevel(1), { 'font-size': 'var(--tp-text-xl)' }),
          at(compactLevel(2), { 'font-size': 'var(--tp-text-lg)' }),
          at(compactLevel(3), { 'font-size': 'var(--tp-text-base)' }),
          at(compactLevel(4), { 'font-size': 'var(--tp-text-sm)' }),
        ]
      : []),
  ];
}

/** The `list` role on list elements (`dcp-roles-table-r3`): an inline-start inset, none for a task list. */
export function documentListRules(selectors: DocumentListSelectors): readonly PresentationRule[] {
  return [
    at(selectors.list, { 'padding-inline-start': 'var(--tp-space-6)' }),
    at(selectors.taskList, { 'list-style': 'none', 'padding-inline-start': '0' }),
  ];
}

/**
 * The `list` role on items and the `list-marker` role (`dcp-roles-table-r3`, `-r4`), in this order:
 * a small fixed step between consecutive items, block spacing between loose items, muted markers,
 * a small fixed step before a nested list, no marker on an unmarked item.
 */
export function documentListItemRules(
  variables: DocumentFlowVariables,
  selectors: DocumentListItemSelectors,
): readonly PresentationRule[] {
  const { nextLooseItem } = selectors;
  return [
    at(selectors.nextItem, { 'margin-block-start': 'var(--tp-space-2)' }),
    ...(nextLooseItem === undefined
      ? []
      : [at(nextLooseItem, { 'margin-block-start': `var(${variables.flow})` })]),
    at(selectors.marker, { color: 'var(--tp-muted-foreground)' }),
    at(selectors.nestedList, { 'margin-block-start': 'var(--tp-space-2)' }),
    at(selectors.unmarkedItem, { 'list-style': 'none' }),
  ];
}

/** The `quote` role (`dcp-roles-table-r6`). */
export function documentQuoteRules(quote: string): readonly PresentationRule[] {
  return [
    at(quote, {
      'margin-inline': '0',
      'padding-inline-start': 'var(--tp-space-4)',
      'border-inline-start':
        'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-border)',
      color: 'var(--tp-muted-foreground)',
    }),
  ];
}

/**
 * The `inline-code` role (`dcp-roles-table-r7`), in this order: code spans, compact code spans,
 * code spans inside a heading, compact code spans inside a heading. A code span inside a heading
 * keeps the heading size in either scale, so each in-heading selector must have at least the
 * specificity of the size rule before it in its scale.
 */
export function documentInlineCodeRules(
  selectors: DocumentInlineCodeSelectors,
): readonly PresentationRule[] {
  const { compact } = selectors;
  return [
    at(selectors.code, {
      'font-family': codeFace['font-family'],
      'font-size': 'var(--tp-text-sm)',
      'font-feature-settings': codeFace['font-feature-settings'],
      background: 'var(--tp-muted)',
      'border-radius': 'var(--tp-radius-sm)',
      'padding-block': 'var(--tp-space-0-5)',
      'padding-inline': 'var(--tp-space-1)',
      'overflow-wrap': 'anywhere',
    }),
    ...(compact === undefined ? [] : [at(compact.code, { 'font-size': 'var(--tp-text-xs)' })]),
    at(selectors.inHeading, { 'font-size': 'inherit' }),
    ...(compact === undefined ? [] : [at(compact.inHeading, { 'font-size': 'inherit' })]),
  ];
}

/**
 * The `link` role (`dcp-roles-table-r9`): the link, then its `:hover` and `:focus-visible` states,
 * which are appended to `link`, so `link` is one complex selector, not a list.
 */
export function documentLinkRules(link: string): readonly PresentationRule[] {
  return [
    at(link, {
      color: 'var(--tp-foreground)',
      'font-weight': 'var(--tp-font-medium)',
      'text-decoration-line': 'underline',
      'text-decoration-color': underline,
      'text-underline-offset': 'var(--tp-space-0-5)',
      transition: motionTransition(['text-decoration-color'], 'fast'),
    }),
    at(`${link}:hover`, { 'text-decoration-color': 'var(--tp-foreground)' }),
    at(`${link}:focus-visible`, {
      outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
      'outline-offset': 'var(--tp-space-0-5)',
      'border-radius': 'var(--tp-radius-sm)',
    }),
  ];
}

/** The `image` role (`dcp-roles-table-r11`). */
export function documentImageRules(image: string): readonly PresentationRule[] {
  return [
    at(image, {
      'max-inline-size': '100%',
      'block-size': 'auto',
      'border-radius': 'var(--tp-radius-md)',
    }),
  ];
}

/** The `strong` role (`dcp-roles-table-r10`). */
export function documentStrongRules(strong: string): readonly PresentationRule[] {
  return [at(strong, { 'font-weight': 'var(--tp-font-semibold)' })];
}
