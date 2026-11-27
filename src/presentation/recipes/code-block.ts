import { motionDuration, motionEasing, motionTransition } from '../motion.js';
import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import { CODE_SCOPES } from '../../foundation/code/types.js';
import {
  codeFocusRing,
  codeInsetBlock,
  codeInsetInline,
  codeSurface,
  codeSurfaceFill,
  codeSurfaceRadius,
  codeTypography,
} from './shared/code-surface.js';
import { divider } from './shared/edges.js';

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

/** The figure's end corners inside its border, which the Expand row follows. */
const expandCorner = `calc(${codeSurfaceRadius} - var(--tp-border-width))`;

/** The block size of the Expand control, which fills its row. */
const expandControlSize = 'calc(var(--tp-control-height-sm) + var(--tp-space-1) * 2)';

/**
 * An expand-only row leaves without a height change at the end: while the viewport opens, the row
 * slides over the code's last lines, so the figure lands on its final height; then it fades.
 */
const expandLeave = [
  motionTransition(['margin-block-start'], 'normal'),
  `opacity ${motionDuration('normal')} ${motionEasing('exit')} ${motionDuration('normal')}`,
  `visibility 0s linear calc(${motionDuration('normal')} * 2)`,
].join(', ');

/** Default Code block appearance (`ucl21-code-block`): existing roles plus the syntax extension. */
export const codeBlockAppearance: PresentationDictionary = {
  // Code figure: the code surface and code typography; the figure clips its scrolling viewport.
  'code-block': [
    { declarations: { ...codeSurface, overflow: 'clip', ...codeTypography } },
    // The copy action floating over the code sits on a translucent piece of the code surface, so
    // the lines behind it read as a backdrop instead of mixing with the icon.
    {
      selector: '& > .floating',
      declarations: {
        'border-radius': 'var(--tp-radius-md)',
        background: `color-mix(in oklab, ${codeSurfaceFill} 80%, transparent)`,
        'backdrop-filter': 'blur(var(--tp-space-1))',
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
        'border-block-end': divider.border,
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
        'padding-block': codeInsetBlock,
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
        'max-block-size': `calc(var(--_tp-code-collapsed-lines) * 1lh + ${codeInsetBlock})`,
        'mask-image':
          'linear-gradient(to bottom, black calc(100% - var(--tp-space-12)), transparent)',
      },
    },
    { selector: '&:focus-visible', declarations: codeFocusRing },
  ],
  'code-block-line': [
    {
      declarations: {
        'min-block-size': '1lh',
        'padding-inline': codeInsetInline,
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
        background: codeSurfaceFill,
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
        'border-block-start': divider.border,
        'font-family': 'var(--tp-font-sans)',
      },
    },
    // The leaving row covers the code beneath it with the code surface until it has faded.
    {
      selector: '&[data-leaving]',
      declarations: {
        position: 'relative',
        'margin-block-start': `calc(-1 * (${expandControlSize} + var(--tp-border-width)))`,
        background: codeSurfaceFill,
        opacity: '0',
        visibility: 'hidden',
        'pointer-events': 'none',
        transition: expandLeave,
      },
    },
    // The Button fills the row, so the whole row is the target. It takes no fill: the label and
    // chevron alone answer hover and focus.
    {
      selector: '& tp-button::part(button)',
      declarations: {
        'block-size': expandControlSize,
        'border-radius': `0 0 ${expandCorner} ${expandCorner}`,
        color: 'var(--tp-muted-foreground)',
      },
    },
    { selector: '& tp-button::part(button)::before', declarations: { content: 'none' } },
    {
      selector: '& tp-button::part(button):hover',
      declarations: { color: 'var(--tp-foreground)' },
    },
    {
      selector: '& tp-button::part(button):focus-visible',
      declarations: { color: 'var(--tp-foreground)', ...codeFocusRing },
    },
    {
      selector: '& tp-button::part(button-leading-mark)',
      declarations: { transition: motionTransition(['rotate'], 'fast') },
    },
    {
      selector: '& tp-button[data-expanded]::part(button-leading-mark)',
      declarations: { rotate: '180deg' },
    },
  ],
};
