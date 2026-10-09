import type { PresentationDictionary } from '../resolver.js';
import { popupBorderColor } from './shared/surface.js';
import {
  anchoredPresenceAppearance,
  popupSpacingAppearance,
  popupItemSpacingAppearance,
  commandSeparatorAppearance,
} from './command-surface.js';
import { inputRules } from './shared/text-control.js';
import { controlStepDeclarations } from './shared/variant.js';

/**
 * A matched range of option text (Text search highlighting). shadcn has no counterpart; matched
 * text keeps the option's color and gains weight, with the native mark background removed.
 */
export const searchMatchRules: PresentationDictionary[string] = [
  {
    declarations: {
      background: 'transparent',
      color: 'inherit',
      'font-weight': 'var(--tp-font-semibold)',
    },
  },
];

/** cn-combobox-empty: muted, small, centered; also the loading and error status row. */
const emptyStateRules: PresentationDictionary[string] = [
  {
    declarations: {
      padding: 'var(--tp-space-2)',
      color: 'var(--tp-muted-foreground)',
      'font-size': 'var(--tp-text-sm)',
      'text-align': 'center',
    },
  },
];

/** shadcn bases/base Select, style-nova.css cn-select-*; shared field/surface base remains. */
export const selectAppearance: PresentationDictionary = {
  select: [],
  'select-input': [
    {
      declarations: {
        font: 'inherit',
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-foreground)',
        background: 'transparent',
        border: '0',
        outline: '0',
        padding: 'var(--tp-space-1) var(--tp-space-2-5)',
        'min-block-size': 'var(--tp-control-height-md)',
      },
    },
  ],
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
  'select-empty-state': emptyStateRules,
  'select-status': emptyStateRules,
  'select-match': searchMatchRules,
  'select-trigger': [
    ...inputRules,
    {
      declarations: {
        // Nova cn-select-trigger: the md control step with pl-2.5 pr-2.
        ...controlStepDeclarations('md'),
        'padding-inline-start': 'var(--tp-space-2-5)',
        'padding-inline-end': 'var(--tp-space-2)',
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
  'select-value': [{ declarations: { gap: 'var(--tp-space-1-5)' } }],
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
        'border-color': popupBorderColor,
        'border-radius': 'var(--tp-radius-lg)',
        // Nova min-w-36: three space-12 steps.
        'min-inline-size': 'max(var(--tp-anchor-width, 0px), calc(var(--tp-space-12) * 3))',
        opacity: '1',
        'transform-origin': 'var(--tp-transform-origin)',
      },
    },
    { selector: '&[data-tp-motion-driven]', declarations: { transition: 'none' } },
    { selector: '& .select-item-text', declarations: { gap: 'var(--tp-space-1-5)' } },
    { selector: '& .select-arrow', declarations: { color: 'var(--tp-popover)' } },
  ],
  'select-list': popupSpacingAppearance,
  'select-group': [{ declarations: { padding: '0' } }],
  'select-label': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        'font-size': 'var(--tp-text-xs)',
        padding: 'var(--tp-space-1) var(--tp-space-1-5)',
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
        'line-height': 'var(--tp-leading-tight)',
        'padding-inline-end': 'var(--tp-space-8)',
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
