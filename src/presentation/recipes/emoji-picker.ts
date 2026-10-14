import type { PresentationDictionary } from '../resolver.js';
import { commandPaletteAppearance } from './command-palette.js';
import { selectAppearance } from './select.js';
import { popupBorder, popupBorderColor } from './shared/surface.js';

// Widgets Specification 6.4 Presentation: the surface, search, list, labels and options take
// the Command palette and Select recipes; the glyphs and custom images are content. Extents
// follow the size axis: a square cell of the control height and the emoji font size.

// A label is one cell tall, so every row of the virtual window has the same extent.
const extents = (cell: string, glyph: string): Record<string, string> => ({
  '--_tp-emoji-picker-cell': cell,
  '--_tp-emoji-picker-glyph': glyph,
  '--_tp-emoji-picker-label': cell,
  // Seven rows and one label, inside the list's popup inset.
  '--_tp-emoji-picker-list':
    'calc(var(--_tp-emoji-picker-cell) * 7 + var(--_tp-emoji-picker-label) + var(--tp-space-1) * 2)',
});

export const emojiPickerAppearance: PresentationDictionary = {
  'emoji-picker': [
    {
      declarations: {
        ...extents('var(--tp-control-height-md)', 'var(--tp-text-xl)'),
        '--_tp-emoji-picker-space': 'var(--tp-space-2)',
        color: 'var(--tp-popover-foreground)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'emoji-picker-size-sm': [
    {
      declarations: {
        ...extents('var(--tp-control-height-sm)', 'var(--tp-text-lg)'),
        '--_tp-emoji-picker-space': 'var(--tp-space-1-5)',
      },
    },
  ],
  'emoji-picker-size-lg': [
    {
      declarations: {
        ...extents('var(--tp-control-height-lg)', 'var(--tp-text-2xl)'),
        '--_tp-emoji-picker-space': 'var(--tp-space-2-5)',
      },
    },
  ],
  // The inline picker is its own surface: the Command palette surface with the popup border.
  'emoji-picker-picker-inline': [
    ...commandPaletteAppearance['command-palette']!,
    { declarations: { border: popupBorder, overflow: 'hidden' } },
  ],
  'emoji-picker-picker-popup': [],
  'emoji-picker-popup': [{ declarations: { 'border-radius': 'inherit', overflow: 'hidden' } }],
  'emoji-picker-categories': [
    {
      declarations: {
        padding: 'var(--_tp-emoji-picker-space) var(--_tp-emoji-picker-space) 0',
      },
    },
  ],
  // Each category is a Tabs trigger: the Tabs recipe styles it.
  'emoji-picker-category': [],
  'emoji-picker-search': commandPaletteAppearance['command-palette-input-wrapper']!,
  'emoji-picker-input': selectAppearance['select-input']!,
  'emoji-picker-clear': [],
  'emoji-picker-list': [
    ...selectAppearance['select-list']!,
    { declarations: { 'border-block-start': `var(--tp-border-width) solid ${popupBorderColor}` } },
  ],
  'emoji-picker-group': selectAppearance['select-group']!,
  'emoji-picker-group-label': [
    ...selectAppearance['select-label']!,
    // Rows scroll beneath a sticky label.
    { declarations: { background: 'var(--tp-popover)', 'padding-block': '0' } },
  ],
  'emoji-picker-row': [],
  'emoji-picker-item': [
    {
      declarations: {
        color: 'var(--tp-popover-foreground)',
        background: 'transparent',
        border: '0',
        'border-radius': 'var(--tp-radius-md)',
        outline: '0',
      },
    },
    {
      selector: '&[data-highlighted]:not([data-disabled])',
      declarations: { background: 'var(--tp-accent)', color: 'var(--tp-accent-foreground)' },
    },
    // The chosen emoji keeps a ring, distinct from the highlight fill.
    {
      selector: '&[data-selected]',
      declarations: {
        'box-shadow': 'inset 0 0 0 var(--tp-ring-width) var(--tp-ring)',
      },
    },
    {
      selector: '&[data-disabled]',
      declarations: { opacity: 'var(--tp-opacity-disabled)', cursor: 'not-allowed' },
    },
  ],
  'emoji-picker-image': [],
  'emoji-picker-empty': selectAppearance['select-empty-state']!,
  'emoji-picker-status': selectAppearance['select-status']!,
  'emoji-picker-retry': [],
  'emoji-picker-footer': [
    {
      declarations: {
        gap: 'var(--_tp-emoji-picker-space)',
        padding: 'var(--_tp-emoji-picker-space)',
        'border-block-start': `var(--tp-border-width) solid ${popupBorderColor}`,
      },
    },
  ],
  'emoji-picker-preview': [
    {
      declarations: {
        gap: 'var(--_tp-emoji-picker-space)',
        'min-block-size': 'var(--_tp-emoji-picker-cell)',
      },
    },
  ],
  'emoji-picker-preview-emoji': [
    { declarations: { 'font-size': 'var(--_tp-emoji-picker-glyph)' } },
  ],
  'emoji-picker-preview-label': [
    { declarations: { 'font-size': 'var(--tp-text-xs)' } },
    {
      selector: '&.placeholder',
      declarations: { color: 'var(--tp-muted-foreground)' },
    },
  ],
  'emoji-picker-skin-tone': [],
  'emoji-picker-trigger': [],
};

/** Geometry that a replaced dictionary keeps. */
export const emojiPickerStructure: PresentationDictionary = {
  'emoji-picker': [],
};
