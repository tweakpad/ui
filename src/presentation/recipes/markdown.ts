import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/**
 * Default Markdown appearance (`ucl21-markdown`), traced from shadcn Typeset (`typeset.css`) and
 * expressed in typography, spacing and color roles. Block spacing flows from the block-start edge
 * only (`--_tp-markdown-flow`), so appended streaming content never restyles settled blocks.
 */
const sm = ':host([size="sm"]) &';
const underline = 'color-mix(in oklab, var(--tp-foreground) 30%, transparent)';

export const markdownAppearance: PresentationDictionary = {
  markdown: [
    {
      declarations: {
        'font-size': 'var(--tp-text-base)',
        'overflow-wrap': 'break-word',
        '--_tp-markdown-flow': 'var(--tp-space-4)',
        '--_tp-markdown-heading-flow': 'var(--tp-space-8)',
      },
    },
    // Flow containers: the root and every element marked `data-flow`.
    {
      selector: '& > *, & [data-flow] > *',
      declarations: { 'margin-block': 'var(--_tp-markdown-flow) 0' },
    },
    {
      selector: '& [part~="markdown-heading"] + *',
      declarations: { 'margin-block-start': 'var(--tp-space-2)' },
    },
    // A thematic break separates sections, so it takes section spacing on both sides
    // (Typeset: flow × 2.4); the following block carries the trailing space.
    {
      selector: '& > tp-separator, & [data-flow] > tp-separator, & tp-separator + *',
      declarations: { 'margin-block-start': 'var(--_tp-markdown-heading-flow)' },
    },
    {
      selector: '& > :first-child, & [data-flow] > :first-child',
      declarations: { 'margin-block-start': '0' },
    },
  ],
  'markdown-size-default': [],
  'markdown-size-sm': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        '--_tp-markdown-flow': 'var(--tp-space-3)',
        '--_tp-markdown-heading-flow': 'var(--tp-space-6)',
      },
    },
  ],
  'markdown-heading': [
    {
      declarations: {
        'margin-block-start': 'var(--_tp-markdown-heading-flow)',
        'font-family': 'var(--tp-font-heading)',
        'font-weight': 'var(--tp-font-semibold)',
        'line-height': 'var(--tp-leading-tight)',
        'letter-spacing': 'var(--tp-tracking-normal)',
        color: 'var(--tp-foreground)',
        'scroll-margin-block-start': 'var(--tp-space-4)',
      },
    },
    {
      selector: '&[data-level="1"]',
      declarations: {
        'font-size': 'var(--tp-text-2xl)',
        'letter-spacing': 'var(--tp-tracking-tight)',
      },
    },
    { selector: '&[data-level="2"]', declarations: { 'font-size': 'var(--tp-text-xl)' } },
    { selector: '&[data-level="3"]', declarations: { 'font-size': 'var(--tp-text-lg)' } },
    { selector: '&[data-level="4"]', declarations: { 'font-size': 'var(--tp-text-base)' } },
    {
      selector: '&[data-level="5"]',
      declarations: { 'font-size': 'var(--tp-text-sm)', color: 'var(--tp-muted-foreground)' },
    },
    {
      selector: '&[data-level="6"]',
      declarations: {
        'font-size': 'var(--tp-text-xs)',
        color: 'var(--tp-muted-foreground)',
        'text-transform': 'uppercase',
        'letter-spacing': 'var(--tp-tracking-wide)',
      },
    },
    { selector: `${sm}[data-level="1"]`, declarations: { 'font-size': 'var(--tp-text-xl)' } },
    { selector: `${sm}[data-level="2"]`, declarations: { 'font-size': 'var(--tp-text-lg)' } },
    { selector: `${sm}[data-level="3"]`, declarations: { 'font-size': 'var(--tp-text-base)' } },
    { selector: `${sm}[data-level="4"]`, declarations: { 'font-size': 'var(--tp-text-sm)' } },
  ],
  'markdown-paragraph': [],
  'markdown-list': [
    { declarations: { 'padding-inline-start': 'var(--tp-space-6)' } },
    {
      selector: '&[data-task-list]',
      declarations: { 'list-style': 'none', 'padding-inline-start': '0' },
    },
  ],
  'markdown-list-item': [
    {
      selector: '& + &',
      declarations: { 'margin-block-start': 'var(--tp-space-2)' },
    },
    {
      selector: '&[data-flow] + &[data-flow]',
      declarations: { 'margin-block-start': 'var(--_tp-markdown-flow)' },
    },
    { selector: '&::marker', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: '& > [part~="markdown-list"]',
      declarations: { 'margin-block-start': 'var(--tp-space-2)' },
    },
    { selector: '&[data-task]', declarations: { 'list-style': 'none' } },
    {
      selector: '& > tp-checkbox',
      declarations: { 'vertical-align': 'middle', 'margin-inline-end': 'var(--tp-space-2)' },
    },
  ],
  'markdown-blockquote': [
    {
      declarations: {
        'margin-inline': '0',
        'padding-inline-start': 'var(--tp-space-4)',
        'border-inline-start':
          'var(--tp-border-width-strong) var(--tp-border-style) var(--tp-border)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  'markdown-code': [
    {
      declarations: {
        'font-family': 'var(--tp-font-mono)',
        'font-size': 'var(--tp-text-sm)',
        'font-feature-settings': '"liga" 0, "calt" 0',
        background: 'var(--tp-muted)',
        'border-radius': 'var(--tp-radius-sm)',
        'padding-block': 'var(--tp-space-0-5)',
        'padding-inline': 'var(--tp-space-1)',
        'overflow-wrap': 'anywhere',
      },
    },
    { selector: sm, declarations: { 'font-size': 'var(--tp-text-xs)' } },
    { selector: '[part~="markdown-heading"] &', declarations: { 'font-size': 'inherit' } },
  ],
  'markdown-link': [
    {
      declarations: {
        color: 'var(--tp-foreground)',
        'font-weight': 'var(--tp-font-medium)',
        'text-decoration-line': 'underline',
        'text-decoration-color': underline,
        'text-underline-offset': 'var(--tp-space-0-5)',
        transition: motionTransition(['text-decoration-color'], 'fast'),
      },
    },
    { selector: '&:hover', declarations: { 'text-decoration-color': 'var(--tp-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'var(--tp-space-0-5)',
        'border-radius': 'var(--tp-radius-sm)',
      },
    },
  ],
  'markdown-image': [
    {
      declarations: {
        'max-inline-size': '100%',
        'block-size': 'auto',
        'border-radius': 'var(--tp-radius-md)',
      },
    },
  ],
  'markdown-emphasis': [],
  'markdown-strong': [{ declarations: { 'font-weight': 'var(--tp-font-semibold)' } }],
  'markdown-delete': [],
  'markdown-footnotes': [
    {
      declarations: {
        'padding-block-start': 'var(--_tp-markdown-flow)',
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
