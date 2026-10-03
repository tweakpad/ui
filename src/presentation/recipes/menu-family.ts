import type { PresentationDictionary, PresentationRule } from '../resolver.js';
import {
  commandSurfaceAppearance,
  commandItemAppearance,
  commandLabelAppearance,
  commandSeparatorAppearance,
  commandShortcutAppearance,
} from './command-surface.js';

const menuSurface: readonly PresentationRule[] = [
  ...commandSurfaceAppearance,
  {
    declarations: {
      'min-inline-size': 'min(var(--tp-anchor-width, 0px), var(--tp-available-width, 100vw))',
    },
  },
];
const menuItem: readonly PresentationRule[] = [...commandItemAppearance];

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
const root = (prefix: 'menu' | 'context-menu'): Record<string, readonly PresentationRule[]> => ({
  [prefix]: [],
  [`${prefix}-${prefix === 'menu' ? 'trigger' : 'target'}`]: [],
  [`${prefix}-content`]: menuSurface,
  [`${prefix}-item`]: menuItem,
  [`${prefix}-item-variant-ghost`]: ghost,
  [`${prefix}-item-variant-destructive`]: destructive,
  [`${prefix}-checkbox-item`]: choiceItem,
  [`${prefix}-radio-group`]: [],
  [`${prefix}-radio-item`]: choiceItem,
  [`${prefix}-group`]: [],
  [`${prefix}-label`]: commandLabelAppearance,
  [`${prefix}-sub-trigger`]: menuItem,
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
  ...root('context-menu'),
  menubar: [
    {
      declarations: {
        'min-block-size': 'var(--tp-control-height-sm)',
        gap: 'calc(var(--tp-spacing) / 2)',
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
        padding: 'calc(var(--tp-spacing) * .75)',
      },
    },
  ],
  'menubar-menu': [],
  'menubar-trigger': [
    {
      declarations: {
        background: 'transparent',
        color: 'var(--tp-foreground)',
        border: '0',
        'border-radius': 'var(--tp-radius-sm)',
        'padding-block': 'calc(var(--tp-spacing) / 2)',
        'padding-inline': 'calc(var(--tp-spacing) * 1.5)',
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
  'menubar-sub-trigger': menuItem,
  'menubar-sub-content': [
    ...menuSurface,
    { declarations: { 'box-shadow': 'var(--tp-shadow-lg)' } },
  ],
  'menubar-separator': commandSeparatorAppearance,
  'menubar-shortcut': commandShortcutAppearance,
};
