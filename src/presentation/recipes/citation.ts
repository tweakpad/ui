import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

export const citationAppearance: PresentationDictionary = {
  // A numbered marker keeps a hairline of space from the word it follows.
  citation: [
    {
      selector: '&[data-number-only]',
      declarations: { 'margin-inline-start': 'var(--tp-space-0-5)' },
    },
  ],
  // The outline chip is only a border: no state fill, and a stronger border while a link is
  // hovered. Unfilled citations read below the surrounding text until a link is hovered or focused.
  'citation-badge': [
    {
      selector: ':host([variant="outline"]) &::part(badge)::before',
      declarations: { content: 'none' },
    },
    {
      selector: ':host([data-linked][variant="outline"]:hover) &::part(badge)',
      declarations: { 'border-color': 'var(--tp-muted-foreground)' },
    },
    {
      selector: ':host(:is([variant="outline"], [variant="ghost"])) &::part(badge)',
      declarations: { color: 'var(--tp-muted-foreground)' },
    },
    {
      selector:
        ':host([data-linked]:is([variant="outline"], [variant="ghost"]):is(:hover, :focus-within)) &::part(badge)',
      declarations: { color: 'var(--tp-foreground)' },
    },
  ],
  'citation-index': [{ declarations: { 'font-variant-numeric': 'tabular-nums' } }],
  'citation-icon': [
    {
      declarations: {
        'inline-size': 'var(--_tp-icon-extent, var(--tp-icon-size-xs))',
        'block-size': 'var(--_tp-icon-extent, var(--tp-icon-size-xs))',
      },
    },
    { selector: '& img', declarations: { 'border-radius': 'var(--tp-radius-sm)' } },
  ],
  // About 12rem (space-16 × 3) before a long source label ellipsizes. A site link fades the
  // end of its label out beneath the external-link mark: the mask is wider than the label by the
  // fade and the mark, and slides over the end on hover or focus.
  'citation-label': [
    { declarations: { 'max-inline-size': 'calc(var(--tp-space-16) * 3)' } },
    {
      selector: ':host([data-external]) &',
      declarations: {
        '--_tp-citation-mark':
          'calc(var(--_tp-icon-extent, var(--tp-icon-size-xs)) + var(--tp-space-1))',
        '--_tp-citation-fade': 'calc(var(--_tp-citation-mark) + var(--tp-space-3))',
        'mask-image':
          'linear-gradient(to right, black calc(100% - var(--_tp-citation-fade)), transparent calc(100% - var(--_tp-citation-mark)))',
        'mask-repeat': 'no-repeat',
        'mask-size': 'calc(100% + var(--_tp-citation-fade)) 100%',
        'mask-position': 'left 0 top 0',
        transition: motionTransition(['mask-position'], 'fast'),
      },
    },
    {
      selector: ':host([data-external]:is(:hover, :focus-within)) &',
      declarations: { 'mask-position': 'left calc(var(--_tp-citation-fade) * -1) top 0' },
    },
    {
      selector: ':host([data-external]:dir(rtl)) &',
      declarations: {
        'mask-image':
          'linear-gradient(to left, black calc(100% - var(--_tp-citation-fade)), transparent calc(100% - var(--_tp-citation-mark)))',
        'mask-position': 'right 0 top 0',
      },
    },
    {
      selector: ':host([data-external]:dir(rtl):is(:hover, :focus-within)) &',
      declarations: { 'mask-position': 'right calc(var(--_tp-citation-fade) * -1) top 0' },
    },
  ],
  'citation-external': [
    { declarations: { opacity: '0', transition: motionTransition(['opacity'], 'fast') } },
    { selector: ':host(:is(:hover, :focus-within)) &', declarations: { opacity: '1' } },
  ],
  'citation-preview-source': [
    {
      declarations: {
        gap: 'var(--tp-space-1-5)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        '--_tp-icon-extent': 'var(--tp-icon-size-sm)',
      },
    },
  ],
  'citation-preview-title': [
    {
      declarations: {
        color: 'var(--tp-popover-foreground)',
        'font-weight': 'var(--tp-font-medium)',
        'line-height': 'var(--tp-leading-tight)',
      },
    },
  ],
  'citation-preview-description': [
    { declarations: { margin: '0', color: 'var(--tp-muted-foreground)' } },
  ],
  'citation-list': [
    {
      declarations: { gap: 'var(--tp-space-2)', margin: '0', padding: '0' },
    },
  ],
};
