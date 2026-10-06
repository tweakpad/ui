import type { PresentationDictionary } from '../resolver.js';
import {
  commandSeparatorAppearance,
  commandShortcutAppearance,
  popupTriggerAppearance,
} from './command-surface.js';
import { menuItem, menuSurface, subTrigger } from './menu.js';

/** Menubar strip and its menus, built from Menu's command rows and surfaces. */
export const menubarAppearance: PresentationDictionary = {
  menubar: [
    {
      declarations: {
        // Nova cn-menubar: h-8 gap-0.5 p-[3px]; the 3px inset is space-1 less the border.
        'box-sizing': 'border-box',
        'block-size': 'var(--tp-control-height-md)',
        padding: 'calc(var(--tp-space-1) - var(--tp-border-width))',
        gap: 'var(--tp-space-0-5)',
        'border-radius': 'var(--tp-radius-lg)',
        border: 'var(--tp-border-width) var(--tp-border-style) var(--tp-border)',
      },
    },
  ],
  'menubar-menu': [],
  'menubar-trigger': [
    ...popupTriggerAppearance,
    {
      declarations: {
        background: 'transparent',
        color: 'var(--tp-foreground)',
        border: '0',
        // Nova cn-menubar-trigger: rounded-sm px-1.5 py-[2px], filling the bar's content box
        // (its height less the 3px inset and border on each side), so a 24px target.
        'block-size': 'calc(var(--tp-control-height-md) - var(--tp-space-2))',
        'min-block-size': '0',
        'border-radius': 'var(--tp-radius-sm)',
        padding: 'var(--tp-space-0-5) var(--tp-space-1-5)',
        'font-size': 'var(--tp-text-sm)',
        'line-height': 'var(--tp-leading-tight)',
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
    // Nova min-w-36: three space-12 steps.
    { declarations: { 'min-inline-size': 'calc(var(--tp-space-12) * 3)' } },
  ],
  'menubar-item': [
    ...menuItem,
    {
      selector: '&:is([role="menuitemcheckbox"],[role="menuitemradio"])',
      declarations: {
        'padding-inline-start':
          'calc(var(--tp-space-1-5) + var(--tp-icon-size-md) + var(--tp-space-1-5))',
        'padding-inline-end': 'var(--tp-space-1-5)',
      },
    },
    {
      selector: '& .indicator',
      declarations: {
        position: 'absolute',
        'inset-inline-start': 'var(--tp-space-1-5)',
        'inset-inline-end': 'auto',
        'inline-size': 'var(--tp-icon-size-md)',
        'block-size': 'var(--tp-icon-size-md)',
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
