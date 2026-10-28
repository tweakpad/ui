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
      description: 'The host around the trigger and the menu.',
    },
    {
      name: 'menu-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'menu-target',
      description: 'The context target, with `invocation="context"`.',
    },
    {
      name: 'menu-content',
      description: 'The menu surface.',
    },
    {
      name: 'menu-item',
      description: 'Each Menu Item.',
      axes: ['itemVariant'],
    },
    {
      name: 'menu-checkbox-item',
      description: 'Each Menu Checkbox Item.',
    },
    {
      name: 'menu-radio-group',
      description: 'Each Menu Radio Group.',
    },
    {
      name: 'menu-radio-item',
      description: 'Each Menu Radio Item.',
    },
    {
      name: 'menu-group',
      description: 'A group of items.',
    },
    {
      name: 'menu-label',
      description: 'The label of a group, the child marked `data-menu-label`.',
    },
    {
      name: 'menu-sub-trigger',
      description: 'The item that opens a submenu.',
    },
    {
      name: 'menu-sub-content',
      description: 'The surface of a submenu.',
    },
    {
      name: 'menu-separator',
      description: 'A Separator between items.',
    },
    {
      name: 'menu-shortcut',
      description: 'The shortcut of an item, the child marked `data-menu-shortcut`.',
    },
    {
      name: 'indicator',
      description:
        'The check of a checkbox item or the mark of a radio item, shown while it is on.',
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
