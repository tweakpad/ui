import type { PresentationDictionary } from '../resolver.js';
import { joinedGroupGap, joinedGroupSeparator } from './shared/joined-group.js';

export const buttonGroupAppearance: PresentationDictionary = {
  'button-group': [joinedGroupGap],
  'button-group-text-segment': [
    {
      declarations: {
        gap: 'var(--tp-space-2)',
        padding: '0 var(--tp-space-2-5)',
        background: 'var(--tp-muted)',
        color: 'var(--tp-foreground)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-input)',
        'border-radius': 'var(--tp-radius-lg)',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
  ],
  'button-group-separator': [joinedGroupSeparator],
};
