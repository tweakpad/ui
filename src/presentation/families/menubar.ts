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
      description: 'The bar that holds the menu triggers.',
    },
    {
      name: 'menubar-menu',
      description: 'Each member Menu.',
    },
    {
      name: 'menubar-trigger',
      description: 'The trigger of each menu.',
    },
    {
      name: 'menubar-content',
      description: 'The surface of an open menu.',
    },
    {
      name: 'menubar-item',
      description: 'An item of a menu.',
    },
    {
      name: 'menubar-group',
      description: 'A group of items, such as a radio group.',
    },
    {
      name: 'menubar-sub-trigger',
      description: 'The item that opens a submenu.',
    },
    {
      name: 'menubar-sub-content',
      description: 'The surface of a submenu.',
    },
    {
      name: 'menubar-separator',
      description: 'A Separator between items.',
    },
    {
      name: 'menubar-shortcut',
      description: 'The shortcut of an item, the child marked `data-menu-shortcut`.',
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
