import type { PresentationDictionary } from '../resolver.js';
import {
  commandSeparatorAppearance,
  commandShortcutAppearance,
  popupSpacingAppearance,
  popupTriggerAppearance,
} from './command-surface.js';
import { menuItem, menuSurface, subTrigger } from './menu.js';

/** Menubar strip and its menus, built from Menu's command rows and surfaces. */
export const menubarAppearance: PresentationDictionary = {
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
