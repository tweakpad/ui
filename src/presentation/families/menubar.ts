import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { menuItemStructure, menuShortcutStructure } from '../recipes/shared/menu-item.js';
import { menubarAppearance } from '../recipes/menubar.js';

const definition: ComponentDefinition = {
  name: 'Menubar',
  tagName: 'tp-menubar',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'menubar',
    },
    {
      name: 'menubar-menu',
    },
    {
      name: 'menubar-trigger',
    },
    {
      name: 'menubar-content',
    },
    {
      name: 'menubar-item',
    },
    {
      name: 'menubar-group',
    },
    {
      name: 'menubar-sub-trigger',
    },
    {
      name: 'menubar-sub-content',
    },
    {
      name: 'menubar-separator',
    },
    {
      name: 'menubar-shortcut',
    },
  ],
};

export const menubarPresentation = definePresentation({
  definition,
  structure: {
    'menubar-shortcut': menuShortcutStructure,
    'menubar-item': menuItemStructure,
    'menubar-sub-trigger': menuItemStructure,
  },
  sources: [menubarAppearance],
});
