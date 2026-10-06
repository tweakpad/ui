import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  commandSurfaceAppearance,
  commandItemRules,
  commandLabelAppearance,
  commandSeparatorAppearance,
  commandShortcutAppearance,
  popupTriggerAppearance,
} from './command-surface.js';

export const menuSurface: readonly PresentationRule[] = [
  ...commandSurfaceAppearance,
  {
    declarations: {
      'min-inline-size': 'min(var(--tp-anchor-width, 0px), var(--tp-available-width, 100vw))',
    },
  },
];
// Menu's tree owns active paint; focus, checked values and expanded paths are independent.
export const menuItem: readonly PresentationRule[] = [
  ...commandItemRules('&[data-highlighted]:not([data-disabled], [aria-disabled="true"])'),
  // Submenu triggers reuse Button, but active Menu rows must switch together.
  // An inherited Button fade leaves the previous row painted after ownership moves.
  { declarations: { transition: 'none' } },
];

export const subTrigger: readonly PresentationRule[] = [
  ...menuItem,
  {
    selector: '& > [part~="button-trailing-mark"]',
    declarations: { 'margin-inline-start': 'auto' },
  },
];
const choiceItem: readonly PresentationRule[] = [
  ...menuItem,
  { declarations: { 'padding-inline-end': 'var(--tp-space-8)' } },
  {
    selector: '& .indicator',
    declarations: {
      position: 'absolute',
      'inset-inline-end': 'var(--tp-space-2)',
      'inline-size': 'var(--tp-icon-size-md)',
      'block-size': 'var(--tp-icon-size-md)',
    },
  },
];
const ghost: readonly PresentationRule[] = [];
const destructive: readonly PresentationRule[] = [
  { declarations: { color: 'var(--tp-accent-foreground)' } },
];
const root = (prefix: 'menu'): Record<string, readonly PresentationRule[]> => ({
  [prefix]: [],
  [`${prefix}-trigger`]: popupTriggerAppearance,
  [`${prefix}-content`]: menuSurface,
  [`${prefix}-item`]: menuItem,
  [`${prefix}-item-variant-ghost`]: ghost,
  [`${prefix}-item-variant-destructive`]: destructive,
  [`${prefix}-checkbox-item`]: choiceItem,
  [`${prefix}-radio-group`]: [],
  [`${prefix}-radio-item`]: choiceItem,
  [`${prefix}-group`]: [],
  [`${prefix}-label`]: commandLabelAppearance,
  [`${prefix}-sub-trigger`]: subTrigger,
  [`${prefix}-sub-content`]: [
    ...menuSurface,
    { declarations: { 'box-shadow': 'var(--tp-shadow-lg)' } },
  ],
  [`${prefix}-separator`]: commandSeparatorAppearance,
  [`${prefix}-shortcut`]: commandShortcutAppearance,
});

/** Base Menu/Context reexports and the shared Nova translucent command surface. */
export const menuAppearance: PresentationDictionary = {
  ...root('menu'),
  'menu-target': [],
};
