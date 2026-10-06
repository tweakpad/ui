import type { PresentationDictionary } from '../resolver.js';
import {
  anchoredPresenceAppearance,
  popupSpacingAppearance,
  popupItemSpacingAppearance,
  commandSeparatorAppearance,
} from './command-surface.js';
import { inputRules } from './shared/text-control.js';

/** shadcn bases/base Select, style-nova.css cn-select-*; shared field/surface base remains. */
export const selectAppearance: PresentationDictionary = {
  select: [],
  'select-anchor': [],
  'select-input': [
    {
      declarations: {
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-foreground)',
        background: 'transparent',
        border: '0',
        outline: '0',
        padding: 'var(--tp-space-1) calc(var(--tp-spacing) * 2.5)',
        'min-block-size': 'var(--tp-control-height-md)',
      },
    },
  ],
  'select-clear': [],
  'select-chip-remove': [],
  'select-chip-list': [
    { declarations: { gap: 'var(--tp-space-1)', padding: 'var(--tp-space-1)' } },
  ],
  'select-chip': [
    {
      selector: '&::part(badge)',
      declarations: {
        'border-radius': 'var(--tp-radius-md)',
        gap: 'var(--tp-space-1)',
        'padding-block': '0',
        'padding-inline': 'var(--tp-space-1)',
      },
    },
  ],
  'select-empty-state': [
    {
      declarations: {
        padding: 'var(--tp-space-2)',
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-sm)',
        'text-align': 'center',
      },
    },
  ],
  'select-collection': [],
  'select-row': [],
  'select-trigger': [
    ...inputRules,
    {
      declarations: {
        'min-block-size': 'var(--tp-control-height-md)',
        'block-size': 'var(--tp-control-height-md)',
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
  ].map((rule) => ({
    ...rule,
    selector: (rule.selector ?? '&').replaceAll('&', '&:not([data-searchable])'),
  })),
  'select-value': [{ declarations: { gap: 'calc(var(--tp-spacing) * 1.5)' } }],
  'select-content': [
    ...anchoredPresenceAppearance.map((rule) => ({
      ...rule,
      selector: (rule.selector ?? '&').replaceAll('&', '&:not([data-inline], [data-align-item])'),
    })),
    {
      selector: '&[data-inline]',
      declarations: {
        border: '0',
        'box-shadow': 'none',
        background: 'transparent',
        'min-inline-size': '0',
        opacity: '1',
      },
    },
    {
      declarations: {
        padding: '0',
        'box-shadow': 'var(--tp-shadow-md)',
        'border-color': 'color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
        'border-radius': 'var(--tp-radius-lg)',
        'min-inline-size': 'max(var(--tp-anchor-width, 0px), calc(var(--tp-spacing) * 36))',
        opacity: '1',
        'transform-origin': 'var(--tp-transform-origin)',
      },
    },
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
    { selector: '& .select-item-text', declarations: { gap: 'calc(var(--tp-spacing) * 1.5)' } },
    { selector: '& .select-arrow', declarations: { color: 'var(--tp-popover)' } },
  ],
  'select-list': popupSpacingAppearance,
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
    ...popupItemSpacingAppearance,
    {
      declarations: {
        color: 'var(--tp-popover-foreground)',
        background: 'transparent',
        border: '0',
        'border-radius': 'var(--tp-radius-md)',
        'font-family': 'inherit',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-normal)',
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
  'select-separator': commandSeparatorAppearance,
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
