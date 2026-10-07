import { motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/** Default Table of contents appearance (`ucl20-table-of-contents`), Nova text and spacing. */
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
};
