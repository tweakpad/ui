import type { PresentationDictionary } from '../resolver.js';
import { anchoredPresenceAppearance, popupSpacingAppearance } from './command-surface.js';

/** Base Popover, Nova cn-popover-*; placement/presence comes from the shared owner. */
export const popoverAppearance: PresentationDictionary = {
  popover: [],
  'popover-trigger': [],
  'popover-anchor': [],
  'popover-positioner': [],
  'popover-portal': [],
  'popover-content': [
    ...popupSpacingAppearance,
    {
      declarations: {
        background: 'var(--tp-popover)',
        color: 'var(--tp-popover-foreground)',
        gap: 'var(--tp-space-2)',
        'border-radius': 'var(--tp-radius-lg)',
        border:
          'var(--tp-border-width) var(--tp-border-style) color-mix(in oklab, var(--tp-foreground) 10%, transparent)',
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
        gap: 'calc(var(--tp-spacing) / 2)',
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
