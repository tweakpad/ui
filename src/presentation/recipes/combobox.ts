import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  commandSurfaceAppearance,
  commandItemAppearance,
  commandLabelAppearance,
  commandSeparatorAppearance,
} from './command-surface.js';
const companionActionAppearance: readonly PresentationRule[] = [
  {
    declarations: {
      'min-block-size': 'calc(var(--tp-spacing) * 6)',
      'block-size': 'calc(var(--tp-spacing) * 6)',
      'inline-size': 'calc(var(--tp-spacing) * 6)',
      padding: '0',
    },
  },
];
/** Base registry Combobox + Nova: actual InputGroup/Button paint is retained in compositions. */
export const comboboxAppearance: PresentationDictionary = {
  combobox: [],
  'combobox-anchor': [],
  'combobox-input': [
    {
      declarations: {
        font: 'inherit',
        color: 'inherit',
        background: 'transparent',
        border: '0',
        outline: '0',
        'padding-block': 'var(--tp-space-1)',
        'padding-inline': 'calc(var(--tp-spacing) * 2.5)',
        'min-block-size': 'calc(var(--tp-control-height-sm) - var(--tp-border-width) * 2)',
      },
    },
  ],
  'combobox-trigger': companionActionAppearance,
  'combobox-clear': companionActionAppearance,
  'combobox-content': [
    ...commandSurfaceAppearance,
    {
      declarations: {
        padding: '0',
        'min-inline-size':
          'max(calc(var(--tp-spacing) * 36), calc(var(--tp-anchor-width) + var(--tp-spacing) * 7))',
      },
    },
  ],
  'combobox-list': [
    {
      declarations: {
        padding: 'var(--tp-space-1)',
        'max-block-size':
          'min(calc(var(--tp-spacing) * 63), calc(var(--tp-available-height) - var(--tp-spacing) * 9))',
        'scroll-padding-block': 'var(--tp-space-1)',
      },
    },
  ],
  'combobox-collection': [],
  'combobox-option': [
    ...commandItemAppearance,
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        'padding-inline-end': 'calc(var(--tp-spacing) * 8)',
      },
    },
  ],
  'combobox-group': [],
  'combobox-label': [
    ...commandLabelAppearance,
    {
      declarations: {
        'padding-inline': 'var(--tp-space-2)',
        'padding-block': 'calc(var(--tp-spacing) * 1.5)',
        'font-weight': 'var(--tp-font-normal)',
      },
    },
  ],
  'combobox-separator': commandSeparatorAppearance,
  'combobox-empty-state': [
    {
      declarations: {
        color: 'var(--tp-muted-foreground)',
        padding: 'var(--tp-space-2)',
        'font-size': 'var(--tp-text-sm)',
        'text-align': 'center',
      },
    },
  ],
  'combobox-chip-list': [
    {
      declarations: {
        background:
          'light-dark(transparent, color-mix(in oklab, var(--tp-input) 30%, transparent))',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
        'border-radius': 'var(--tp-radius-lg)',
        gap: 'var(--tp-space-1)',
        padding: 'var(--tp-space-1)',
        'min-block-size': 'var(--tp-control-height-sm)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    {
      selector: '&:focus-within',
      declarations: {
        'border-color': 'var(--tp-ring)',
        'box-shadow':
          '0 0 0 var(--tp-ring-width) color-mix(in oklab, var(--tp-ring) 50%, transparent)',
      },
    },
    { selector: '&[data-invalid]', declarations: { 'border-color': 'var(--tp-destructive)' } },
  ],
  'combobox-chip': [
    {
      declarations: {
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        gap: 'var(--tp-space-1)',
        'block-size': 'calc(var(--tp-spacing) * 5.25)',
        'border-radius': 'var(--tp-radius-sm)',
        'padding-inline': 'calc(var(--tp-spacing) * 1.5)',
        'font-size': 'var(--tp-text-xs)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'combobox-chip-remove': [
    ...companionActionAppearance,
    { declarations: { opacity: '.5', 'margin-inline-start': 'calc(var(--tp-space-1) * -1)' } },
    { selector: '&:hover', declarations: { opacity: '1' } },
  ],
};
