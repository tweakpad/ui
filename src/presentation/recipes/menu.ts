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

// Nova cn-*-sub-trigger is an ordinary command row (gap-1.5 px-1.5 py-1) whose icon and text
// are direct children. The reused Button wraps its default slot in a label and tightens edges
// that show a mark, so the row restores both: label content shares the row gap, as in a Menu
// item, and either mark keeps the item's inline padding so icons align across rows.
export const subTrigger: readonly PresentationRule[] = [
  ...menuItem,
  {
    selector: '& > [part~="button-label"]',
    declarations: {
      display: 'inline-flex',
      'align-items': 'center',
      gap: 'inherit',
    },
  },
  {
    selector: "&:has(> [part~='button-leading-mark']:not([hidden]))",
    declarations: { 'padding-inline-start': 'var(--tp-space-1-5)' },
  },
  {
    selector: "&:has(> [part~='button-trailing-mark']:not([hidden]))",
    declarations: { 'padding-inline-end': 'var(--tp-space-1-5)' },
  },
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
