import { motionTransition } from '../motion.js';
import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { CODE_SCOPES } from '../../foundation/code/types.js';

/** The code surface: the card fill mixed halfway toward muted (shadcn `--code`). */
const surface = 'color-mix(in oklab, var(--tp-card) 50%, var(--tp-muted))';

/** Scoped tokens read their `--tp-syntax-*` role; adapter colors win through `light-dark()`. */
const tokenColors: PresentationRule[] = [
  ...CODE_SCOPES.filter((scope) => scope !== 'plain' && scope !== 'punctuation').map((scope) => ({
    selector: `&[data-scope="${scope}"]`,
    declarations: { color: `var(--tp-syntax-${scope})` },
  })),
  {
    selector: '&[data-colored]',
    declarations: { color: 'light-dark(var(--_tp-code-light), var(--_tp-code-dark))' },
  },
  { selector: '&[data-font-style="italic"]', declarations: { 'font-style': 'italic' } },
  { selector: '&[data-font-style="bold"]', declarations: { 'font-weight': 'var(--tp-font-bold)' } },
  {
    selector: '&[data-font-style="underline"]',
    declarations: { 'text-decoration': 'underline' },
  },
];

/** Default Code block appearance (`ucl21-code-block`): existing roles plus the syntax extension. */
export const codeBlockAppearance: PresentationDictionary = {
  'code-block': [
    {
      declarations: {
        // shadcn code figure: bg-code, rounded-xl, text-sm, mono, ligatures off.
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'border-radius': 'var(--tp-radius-xl)',
        background: surface,
        color: 'var(--tp-foreground)',
        overflow: 'clip',
        'font-family': 'var(--tp-font-mono)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
        'font-feature-settings': '"liga" 0, "calt" 0',
        'tab-size': '2',
      },
    },
  ],
  'code-block-header': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'min-block-size': 'var(--tp-control-height-md)',
        'padding-block': 'var(--tp-space-1)',
        'padding-inline': 'var(--tp-space-4) var(--tp-space-2)',
        'border-block-end': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'code-block-title': [
    {
      declarations: {
        'font-family': 'var(--tp-font-sans)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        color: 'var(--tp-foreground)',
      },
    },
  ],
  'code-block-language': [
    {
      declarations: {
        'font-size': 'var(--tp-text-xs)',
        color: 'var(--tp-muted-foreground)',
      },
    },
  ],
  'code-block-viewport': [
    {
      declarations: {
        'padding-block': 'var(--tp-space-3)',
        'white-space': 'pre',
        'interpolate-size': 'allow-keywords',
        transition: motionTransition(['max-block-size'], 'normal'),
      },
    },
    {
      selector: ':host([wrap]) &',
      declarations: { 'white-space': 'pre-wrap', 'overflow-wrap': 'anywhere' },
    },
    { selector: ':host([collapsible]) &', declarations: { 'max-block-size': 'max-content' } },
    {
      selector: ':host([data-collapsed]) &',
      declarations: {
        'max-block-size': 'calc(var(--_tp-code-collapsed-lines) * 1lh + var(--tp-space-3))',
        'mask-image':
          'linear-gradient(to bottom, black calc(100% - var(--tp-space-12)), transparent)',
      },
    },
    {
      selector: '&:focus-visible',
      declarations: {
        outline: 'var(--tp-ring-width) var(--tp-border-style) var(--tp-ring)',
        'outline-offset': 'calc(var(--tp-ring-width) * -1)',
      },
    },
  ],
  'code-block-line': [
    {
      declarations: {
        'min-block-size': '1lh',
        'padding-inline': 'var(--tp-space-4)',
      },
    },
    { selector: ':host([line-numbers]) &', declarations: { 'padding-inline-start': '0' } },
    {
      selector: '&[data-highlighted]',
      declarations: {
        background: 'color-mix(in oklab, var(--tp-muted-foreground) 12%, transparent)',
        'box-shadow':
          'inset var(--tp-border-width-strong) 0 0 0 color-mix(in oklab, var(--tp-muted-foreground) 50%, transparent)',
      },
    },
    {
      selector: '&[data-inserted]',
      declarations: {
        background: 'color-mix(in oklab, var(--tp-syntax-inserted) 10%, transparent)',
      },
    },
    {
      selector: '&[data-deleted]',
      declarations: {
        background: 'color-mix(in oklab, var(--tp-syntax-deleted) 10%, transparent)',
      },
    },
  ],
  'code-block-line-number': [
    {
      declarations: {
        'box-sizing': 'border-box',
        'inline-size': 'var(--tp-space-12)',
        'padding-inline-end': 'var(--tp-space-4)',
        'text-align': 'end',
        color: 'var(--tp-muted-foreground)',
        background: surface,
        'user-select': 'none',
      },
    },
  ],
  'code-block-line-marker': [
    {
      declarations: {
        display: 'inline-block',
        'inline-size': 'var(--tp-space-4)',
        color: 'var(--tp-muted-foreground)',
        'user-select': 'none',
      },
    },
    {
      selector: ':is([data-inserted]) > &',
      declarations: { color: 'var(--tp-syntax-inserted)' },
    },
    {
      selector: ':is([data-deleted]) > &',
      declarations: { color: 'var(--tp-syntax-deleted)' },
    },
  ],
  'code-block-token': tokenColors,
  'code-block-expand': [
    {
      declarations: {
        padding: 'var(--tp-space-1)',
        'border-block-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        'font-family': 'var(--tp-font-sans)',
      },
    },
    {
      selector: '& tp-button[data-expanded]::part(button-trailing-mark)',
      declarations: { rotate: '180deg' },
    },
  ],
};
