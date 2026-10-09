import type { PresentationDictionary } from '../resolver.js';
import { popupBorder } from './shared/surface.js';
import { anchoredPresenceAppearance, popupSpacingAppearance } from './command-surface.js';

/** Base Popover, Nova cn-popover-*; placement/presence comes from the shared owner. */
export const popoverAppearance: PresentationDictionary = {
  popover: [],
  'popover-content': [
    ...popupSpacingAppearance,
    {
      declarations: {
        // Nova cn-popover-content: gap-2.5 p-2.5 text-sm.
        '--_tp-popup-spacing': 'var(--tp-space-2-5)',
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        gap: 'var(--tp-space-2-5)',
        'border-radius': 'var(--tp-radius-lg)',
        border: popupBorder,
        'box-shadow': 'var(--tp-shadow-md)',
        'font-size': 'var(--tp-text-sm)',
      },
    },
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
