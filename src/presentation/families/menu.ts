import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { menuItemStructure, menuShortcutStructure } from '../recipes/shared/menu-item.js';
import { menuAppearance } from '../recipes/menu.js';

const definition: ComponentDefinition = {
  name: 'Menu',
  tagName: 'tp-menu',
  kind: 'flattening-compound',
  axes: [
    {
      name: 'itemVariant',
      values: ['ghost', 'destructive'],
      default: 'ghost',
    },
  ],
  parts: [
    {
      name: 'menu',
    },
    {
      name: 'menu-trigger',
    },
    {
      name: 'menu-target',
    },
    {
      name: 'menu-content',
    },
    {
      name: 'menu-item',
      axes: ['itemVariant'],
    },
    {
      name: 'menu-checkbox-item',
    },
    {
      name: 'menu-radio-group',
    },
    {
      name: 'menu-radio-item',
    },
    {
      name: 'menu-group',
    },
    {
      name: 'menu-label',
    },
    {
      name: 'menu-sub-trigger',
    },
    {
      name: 'menu-sub-content',
    },
    {
      name: 'menu-separator',
    },
    {
      name: 'menu-shortcut',
    },
  ],
};

export const menuPresentation = definePresentation({
  definition,
  structure: {
    'menu-label': [
      {
        declarations: {
          display: 'block',
        },
      },
    ],
    'menu-shortcut': menuShortcutStructure,
    'menu-item': menuItemStructure,
    'menu-checkbox-item': menuItemStructure,
    'menu-radio-item': menuItemStructure,
    'menu-sub-trigger': menuItemStructure,
  },
  sources: [menuAppearance],
});
