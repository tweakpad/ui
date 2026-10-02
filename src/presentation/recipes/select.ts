import type { PresentationDictionary } from '../resolver.js';
import { textControlAppearance } from './text-controls.js';

/** shadcn bases/base Select, style-nova.css cn-select-*; shared field/surface base remains. */
export const selectAppearance: PresentationDictionary = {
  select: [],
  'select-trigger': [
    ...textControlAppearance.input!,
    {
      declarations: {
        'min-block-size': 'var(--tp-control-height-sm)',
        'block-size': 'var(--tp-control-height-sm)',
        'padding-block': 'var(--tp-space-2)',
        'padding-inline-start': 'calc(var(--tp-spacing) * 2.5)',
        'padding-inline-end': 'var(--tp-space-2)',
        gap: 'calc(var(--tp-spacing) * 1.5)',
        'font-size': 'var(--tp-text-sm)',
        'border-radius': 'var(--tp-radius-lg)',
        background:
          'light-dark(transparent, color-mix(in oklab, var(--tp-input) 30%, transparent))',
      },
    },
    {
      selector: '&:hover:not(:disabled, [aria-disabled="true"])',
      declarations: {
        background:
          'light-dark(transparent, color-mix(in oklab, var(--tp-input) 50%, transparent))',
      },
    },
    { selector: '&[data-placeholder]', declarations: { color: 'var(--tp-muted-foreground)' } },
    {
      selector: '&:focus-visible',
      declarations: {
        outline:
          'var(--tp-ring-width) var(--tp-border-style) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
        'outline-offset': '0',
        'border-color': 'var(--tp-ring)',
      },
    },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
    {
      selector: '&[data-invalid]:focus-visible',
      declarations: {
        'outline-color': 'color-mix(in oklab, var(--tp-destructive) 20%, transparent)',
      },
    },
    { selector: '&[data-disabled]', declarations: { cursor: 'not-allowed' } },
  ],
  'select-value': [{ declarations: { gap: 'calc(var(--tp-spacing) * 1.5)' } }],
  'select-content': [
    {
      declarations: {
        padding: '0',
        'box-shadow': 'var(--tp-shadow-md)',
        'border-color': 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
        'border-radius': 'var(--tp-radius-lg)',
        'min-inline-size': 'max(var(--tp-anchor-width, 0px), calc(var(--tp-spacing) * 36))',
        opacity: '1',
        scale: '1',
        'transform-origin': 'var(--tp-transform-origin)',
        transition:
          'opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard), scale calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard)',
      },
    },
    {
      selector: '&:is([data-starting-style], [data-ending-style]):not([data-align-item])',
      declarations: { opacity: '0', scale: '.95' },
    },
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
    { selector: '& .select-item-text', declarations: { gap: 'calc(var(--tp-spacing) * 1.5)' } },
    { selector: '& .select-arrow', declarations: { color: 'var(--tp-popover)' } },
  ],
  'select-list': [{ declarations: { padding: 'var(--tp-space-1)' } }],
  'select-group': [{ declarations: { padding: '0' } }],
  'select-label': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        padding: 'var(--tp-space-1) calc(var(--tp-spacing) * 1.5)',
      },
    },
  ],
  'select-option': [
    {
      declarations: {
        color: 'var(--tp-popover-foreground)',
        background: 'transparent',
        border: '0',
        'border-radius': 'var(--tp-radius-md)',
        'font-family': 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
        gap: 'calc(var(--tp-spacing) * 1.5)',
        'padding-block': 'var(--tp-space-1)',
        'padding-inline-start': 'calc(var(--tp-spacing) * 1.5)',
        'padding-inline-end': 'calc(var(--tp-spacing) * 8)',
        'text-align': 'start',
        outline: '0',
      },
    },
    {
      selector: '&[data-highlighted]:not([data-disabled])',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
    {
      selector: '&[data-disabled]',
      declarations: { opacity: 'var(--tp-opacity-disabled)', cursor: 'not-allowed' },
    },
  ],
  'select-separator': [
    {
      declarations: {
        background: 'var(--tp-border)',
        margin: 'var(--tp-space-1) calc(-1 * var(--tp-space-1))',
      },
    },
  ],
  'select-scroll-up-button': [
    {
      declarations: {
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        padding: 'var(--tp-space-1) 0',
      },
    },
  ],
  'select-scroll-down-button': [
    {
      declarations: {
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        padding: 'var(--tp-space-1) 0',
      },
    },
  ],
};
