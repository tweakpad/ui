import type { PresentationDictionary } from '../resolver.js';
import { floatEdge } from './shared/edges.js';
import { anchoredPresenceAppearance, popupSpacingAppearance } from './command-surface.js';

/** Popover surface; placement and presence come from the shared owner. */
export const popoverAppearance: PresentationDictionary = {
  popover: [],
  'popover-content': [
    ...popupSpacingAppearance,
    {
      declarations: {
        '--_tp-popup-spacing': 'var(--tp-space-2-5)',
        background: 'var(--tp-popover)',
        '--tp-surface': 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        gap: 'var(--tp-space-2-5)',
        'border-radius': 'var(--tp-radius-lg)',
        border: floatEdge.border,
        'box-shadow': 'var(--tp-shadow-md)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
    { selector: '& > .arrow', declarations: { fill: 'var(--tp-popover)' } },
    ...anchoredPresenceAppearance,
  ],
  'popover-header': [
    {
      declarations: {
        display: 'flex',
        'flex-direction': 'column',
        gap: 'var(--tp-space-0-5)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
  ],
  'popover-title': [
    {
      declarations: { margin: '0', 'font-size': 'inherit', 'font-weight': 'var(--tp-font-medium)' },
    },
  ],
  'popover-description': [{ declarations: { margin: '0', color: 'var(--tp-muted-foreground)' } }],
};
