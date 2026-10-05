import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  commandSurfaceAppearance,
  popupSpacingAppearance,
  commandItemRules,
  commandLabelAppearance,
  commandSeparatorAppearance,
  commandShortcutAppearance,
  popupTriggerAppearance,
} from './command-surface.js';

const menuSurface: readonly PresentationRule[] = [
  ...commandSurfaceAppearance,
  {
    declarations: {
      'min-inline-size': 'min(var(--tp-anchor-width, 0px), var(--tp-available-width, 100vw))',
    },
  },
];
// Menu's tree owns active paint; focus, checked values and expanded paths are independent.
const menuItem: readonly PresentationRule[] = [
  ...commandItemRules('&[data-highlighted]:not([data-disabled], [aria-disabled="true"])'),
  // Submenu triggers reuse Button, but active Menu rows must switch together.
  // An inherited Button fade leaves the previous row painted after ownership moves.
  { declarations: { transition: 'none' } },
];

const subTrigger: readonly PresentationRule[] = [
  ...menuItem,
  {
    selector: '& > [part~="button-trailing-mark"]',
    declarations: { 'margin-inline-start': 'auto' },
  },
];
const choiceItem: readonly PresentationRule[] = [
  ...menuItem,
  { declarations: { 'padding-inline-end': 'calc(var(--tp-spacing) * 8)' } },
  {
    selector: '& .indicator',
    declarations: {
      position: 'absolute',
      'inset-inline-end': 'var(--tp-space-2)',
      'inline-size': 'var(--tp-icon-size-sm)',
      'block-size': 'var(--tp-icon-size-sm)',
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
export const menuFamilyAppearance: PresentationDictionary = {
  ...root('menu'),
  'menu-target': [],
  menubar: [
    {
      declarations: {
        'min-block-size': 'var(--tp-control-height-sm)',
        gap: 'calc(var(--tp-spacing) / 2)',
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
    ...popupSpacingAppearance,
  ],
  'menubar-menu': [],
  'menubar-trigger': [
    ...popupTriggerAppearance,
    {
      declarations: {
        background: 'transparent',
        color: 'var(--tp-foreground)',
        border: '0',
        'border-radius': 'var(--tp-radius-md)',
        // Include the control's minimum height in the horizontal inset too.
        padding: 'max(var(--tp-space-2), calc((var(--tp-control-height-md) - 1lh) / 2))',
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
      },
    },
    {
      selector: '&:is(:hover,[aria-expanded="true"])',
      declarations: { background: 'var(--tp-muted)' },
    },
  ],
  'menubar-content': [
    ...menuSurface,
    { declarations: { 'min-inline-size': 'calc(var(--tp-spacing) * 36)' } },
  ],
  'menubar-item': [
    ...menuItem,
    {
      selector: '&:is([role="menuitemcheckbox"],[role="menuitemradio"])',
      declarations: {
        'padding-inline-start': 'calc(var(--tp-spacing) * 7)',
        'padding-inline-end': 'calc(var(--tp-spacing) * 1.5)',
      },
    },
    {
      selector: '& .indicator',
      declarations: {
        position: 'absolute',
        'inset-inline-start': 'calc(var(--tp-spacing) * 1.5)',
        'inset-inline-end': 'auto',
        'inline-size': 'var(--tp-icon-size-sm)',
        'block-size': 'var(--tp-icon-size-sm)',
      },
    },
  ],
  'menubar-group': [],
  'menubar-sub-trigger': subTrigger,
  'menubar-sub-content': [
    ...menuSurface,
    { declarations: { 'box-shadow': 'var(--tp-shadow-lg)' } },
  ],
  'menubar-separator': commandSeparatorAppearance,
  'menubar-shortcut': commandShortcutAppearance,
};
