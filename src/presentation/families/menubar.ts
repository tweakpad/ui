import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { menubarAppearance } from '../recipes/menubar.js';

const definition: ComponentDefinition = {
  name: 'Menubar',
  tagName: 'tp-menubar',
  kind: 'flattening-compound',
  sourceNode: 'ucl20-menubar',
  axes: [],
  parts: [
    {
      name: 'menubar',
      publicName: 'Root',
      presentationKeys: ['menubar'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'menubar-menu',
      publicName: 'Menu',
      presentationKeys: ['menubar-menu'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menubar-trigger',
      publicName: 'Trigger',
      presentationKeys: ['menubar-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menubar-content',
      publicName: 'Content',
      presentationKeys: ['menubar-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menubar-item',
      publicName: 'Item',
      presentationKeys: ['menubar-item'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menubar-group',
      publicName: 'Group',
      presentationKeys: ['menubar-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menubar-sub-trigger',
      publicName: 'SubTrigger',
      presentationKeys: ['menubar-sub-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menubar-sub-content',
      publicName: 'SubContent',
      presentationKeys: ['menubar-sub-content'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menubar-separator',
      publicName: 'Separator',
      presentationKeys: ['menubar-separator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menubar-shortcut',
      publicName: 'Shortcut',
      presentationKeys: ['menubar-shortcut'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const menubarPresentation = definePresentation({
  definition,
  structure: {
    'menubar-shortcut': [
      {
        declarations: {
          'margin-inline-start': 'auto',
          flex: 'none',
        },
      },
    ],
    'menubar-item': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          'min-block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
          'text-align': 'start',
          'justify-content': 'start',
          cursor: 'pointer',
        },
      },
      {
        selector: '&[aria-disabled="true"]',
        declarations: {
          cursor: 'not-allowed',
        },
      },
    ],
    'menubar-sub-trigger': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          'min-block-size': 'max(var(--tp-control-height-md), var(--tp-target-size-min))',
          'text-align': 'start',
          'justify-content': 'start',
          cursor: 'pointer',
        },
      },
      {
        selector: '&[aria-disabled="true"]',
        declarations: {
          cursor: 'not-allowed',
        },
      },
    ],
  },
  sources: [menubarAppearance],
  complete: true,
});
