import type { PresentationDictionary } from '../../resolver.js';
import { anchoredPresenceAppearance } from '../command-surface.js';
import { surfaceAppearance } from '../shared/surface.js';
import { rule } from '../shared/variant.js';

/** Preview card surface with anchored presence and its own sizing. */
export const previewCardCoreAppearance: PresentationDictionary = {
  'preview-card-content': [
    ...surfaceAppearance,
    ...anchoredPresenceAppearance,
    rule({ fill: 'var(--tp-popover)' }, '& > .arrow'),
    rule({
      // Nova cn-hover-card-content: w-64 p-2.5 gap-2.5 (space-16 × 4 = 64 units).
      'inline-size': 'min(calc(var(--tp-space-16) * 4), var(--tp-available-width))',
      padding: 'var(--tp-space-2-5)',
      gap: 'var(--tp-space-2-5)',
      'font-size': 'var(--tp-text-sm)',
    }),
  ],
};

/** Tooltip surface with anchored presence, inverted palette and arrow fill. */
export const tooltipCoreAppearance: PresentationDictionary = {
  'tooltip-content': [
    ...surfaceAppearance,
    ...anchoredPresenceAppearance,
    rule({
      // Nova cn-tooltip-content: max-w-xs (20rem = space-16 × 5) px-3 py-1.5 gap-1.5 text-xs.
      'max-inline-size': 'min(calc(var(--tp-space-16) * 5), var(--tp-available-width))',
      padding: 'var(--tp-space-1-5) var(--tp-space-3)',
      gap: 'var(--tp-space-1-5)',
      border: '0',
      'border-radius': 'var(--tp-radius-md)',
      background: 'var(--tp-foreground)',
      color: 'var(--tp-background)',
      'font-size': 'var(--tp-text-xs)',
      'line-height': 'var(--tp-leading-normal)',
      'box-shadow': 'none',
    }),
  ],
  'tooltip-arrow': [rule({ fill: 'var(--tp-foreground)' })],
};
