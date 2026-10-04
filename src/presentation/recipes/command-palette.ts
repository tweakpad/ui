import type { PresentationDictionary } from '../resolver.js';
import { selectAppearance } from './select.js';
import { commandItemAppearance } from './command-surface.js';
export const commandPaletteAppearance: PresentationDictionary = {
  'command-palette': [
    {
      declarations: {
        padding: '0',
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        'border-radius': 'var(--tp-radius-lg)',
      },
    },
  ],
  'command-palette-input-wrapper': [{ declarations: { padding: 'var(--tp-space-2)' } }],
  'command-palette-input': selectAppearance['select-input']!,
  'command-palette-list': selectAppearance['select-list']!,
  'command-palette-group': selectAppearance['select-group']!,
  'command-palette-item': commandItemAppearance,
  'command-palette-shortcut-hint': [
    { declarations: { 'margin-inline-start': 'auto', color: 'var(--tp-muted-foreground)' } },
  ],
  'command-palette-separator': selectAppearance['select-separator']!,
  'command-palette-empty-state': selectAppearance['select-empty-state']!,
};
