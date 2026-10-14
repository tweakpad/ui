import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/** Default Table of contents appearance (`ucl20-table-of-contents`): text and spacing. */
export const tableOfContentsAppearance: PresentationDictionary = {
  'table-of-contents': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
      },
    },
  ],
  'table-of-contents-title': [
    {
      declarations: {
        color: 'var(--tp-foreground)',
        'font-weight': 'var(--tp-font-medium)',
        'padding-inline-start': 'var(--tp-space-3)',
      },
    },
  ],
  'table-of-contents-list': [{ declarations: { gap: 'var(--tp-space-0-5)' } }],
  'table-of-contents-rail': [
    {
      declarations: {
        'border-inline-start': 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'table-of-contents-indicator': [
    {
      declarations: {
        // Two border widths, centered on the rail line.
        'inline-size': 'calc(var(--tp-border-width) * 2)',
        'inset-inline-start': 'calc(var(--tp-border-width) * -1.5)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'var(--tp-table-of-contents-indicator, var(--tp-primary))',
      },
    },
  ],
  'table-of-contents-item': [{ declarations: { 'min-inline-size': '0' } }],
  'table-of-contents-link': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'text-decoration': 'none',
        'padding-block': 'var(--tp-space-1)',
        'padding-inline': 'calc(var(--tp-space-3) * var(--_tp-toc-depth, 1)) var(--tp-space-1)',
        'border-radius': 'var(--tp-radius-sm)',
        'overflow-wrap': 'anywhere',
        transition: motionTransition(['color'], 'fast'),
      },
    },
    { selector: '&:hover', declarations: { color: 'var(--tp-foreground)' } },
    { selector: '&[data-active]', declarations: { color: 'var(--tp-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: { 'outline-offset': 'calc(-1 * var(--tp-ring-width))' },
    },
  ],
  // Compact: the strip is a ghost Button under the marks; the card is the Popover surface.
  'table-of-contents-variant-compact': [{ declarations: { gap: '0' } }],
  'table-of-contents-trigger': [
    {
      selector: '&::part(button)',
      declarations: {
        'inline-size': '100%',
        'block-size': '100%',
        'min-inline-size': '0',
        'min-block-size': '0',
        padding: '0',
      },
    },
  ],
  'table-of-contents-marks': [
    {
      declarations: {
        // The Indicator's thickness; rows give up their spacing before a mark is clipped.
        '--_tp-toc-mark-thickness': 'calc(var(--tp-border-width) * 2)',
        '--_tp-toc-mark-pitch': 'var(--tp-space-2)',
        padding: 'var(--tp-space-2) var(--tp-space-2)',
      },
    },
  ],
  'table-of-contents-mark': [
    {
      declarations: {
        color: 'var(--tp-border)',
        transition: motionTransition(['color'], 'fast'),
      },
    },
    { selector: '&[data-active]', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: '&[data-current]',
      declarations: { color: 'var(--tp-table-of-contents-indicator, var(--tp-primary))' },
    },
    {
      // A line painted with the mark's color, so only the color transitions.
      selector: '&::after',
      declarations: {
        'inline-size': 'var(--tp-space-3)',
        'block-size': 'var(--_tp-toc-mark-thickness)',
        'border-radius': 'var(--tp-radius-full)',
        background: 'currentColor',
      },
    },
  ],
  'table-of-contents-popover': [
    {
      selector: '&::part(popover-content)',
      declarations: {
        'inline-size': 'max-content',
        'max-inline-size': 'min(calc(var(--tp-spacing) * 72), var(--tp-available-width, 100vw))',
      },
    },
  ],
};
