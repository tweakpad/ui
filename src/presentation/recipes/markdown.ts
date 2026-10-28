import type { PresentationDictionary } from '../resolver.js';
import {
  documentFlowRules,
  documentHeadingRules,
  documentImageRules,
  documentInlineCodeRules,
  documentLinkRules,
  documentListItemRules,
  documentListRules,
  documentQuoteRules,
  documentScope,
  documentStrongRules,
  type DocumentFlowVariables,
} from './shared/document-content.js';

const sm = ':host([size="sm"]) &';
const flow: DocumentFlowVariables = {
  flow: '--_tp-markdown-flow',
  headingFlow: '--_tp-markdown-heading-flow',
};

/**
 * Default Markdown appearance (`ucl21-markdown`): the root is the content scope of the document
 * content profile (`mdl-typography`), and the parts bind its roles through the shared sets
 * (`mdl-presentation`). Block spacing flows from the block-start edge only
 * (`--_tp-markdown-flow`), so appended streaming content never restyles settled blocks.
 */
export const markdownAppearance: PresentationDictionary = {
  markdown: [
    { declarations: documentScope(flow, 'default') },
    // Flow containers: the root and every element marked `data-flow`.
    ...documentFlowRules(flow, {
      blocks: '& > *, & [data-flow] > *',
      afterHeading: '& [part~="markdown-heading"] + *',
      dividers: '& > tp-separator, & [data-flow] > tp-separator, & tp-separator + *',
      first: '& > :first-child, & [data-flow] > :first-child',
    }),
  ],
  'markdown-size-sm': [{ declarations: documentScope(flow, 'compact') }],
  'markdown-heading': documentHeadingRules(flow, {
    heading: '&',
    level: (level) => `&[data-level="${level}"]`,
    compactLevel: (level) => `${sm}[data-level="${level}"]`,
  }),
  'markdown-list': documentListRules({ list: '&', taskList: '&[data-task-list]' }),
  'markdown-list-item': [
    ...documentListItemRules(flow, {
      nextItem: '& + &',
      nextLooseItem: '&[data-flow] + &[data-flow]',
      marker: '&::marker',
      nestedList: '& > [part~="markdown-list"]',
      unmarkedItem: '&[data-task]',
    }),
    // The composed read-only Checkbox leads the task item's text (`mdl-presentation`).
    {
      selector: '& > tp-checkbox',
      declarations: { 'vertical-align': 'middle', 'margin-inline-end': 'var(--tp-space-2)' },
    },
  ],
  'markdown-blockquote': documentQuoteRules('&'),
  'markdown-code': documentInlineCodeRules({
    code: '&',
    compact: { code: sm, inHeading: ':host([size="sm"]) [part~="markdown-heading"] &' },
    inHeading: '[part~="markdown-heading"] &',
  }),
  'markdown-link': documentLinkRules('&'),
  'markdown-image': documentImageRules('&'),
  'markdown-strong': documentStrongRules('&'),
  'markdown-footnotes': [
    {
      declarations: {
        'padding-block-start': `var(${flow.flow})`,
        'border-block-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-muted-foreground)',
      },
    },
    {
      selector: '& > ol',
      declarations: { margin: '0', 'padding-inline-start': 'var(--tp-space-6)' },
    },
    { selector: '& li + li', declarations: { 'margin-block-start': 'var(--tp-space-2)' } },
    { selector: sm, declarations: { 'font-size': 'var(--tp-text-xs)' } },
  ],
  'markdown-footnote-reference': [
    {
      declarations: {
        color: 'var(--tp-foreground)',
        'font-weight': 'var(--tp-font-medium)',
        'text-decoration-line': 'none',
        'scroll-margin-block-start': 'var(--tp-space-4)',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
  ],
  'markdown-footnote-back-reference': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'text-decoration-line': 'none',
      },
    },
    { selector: '&:hover', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
  ],
};
