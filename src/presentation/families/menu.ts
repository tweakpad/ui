import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { coarseTarget } from '../recipes/shared/target.js';
import { menuAppearance } from '../recipes/menu.js';

const definition: ComponentDefinition = {
  name: 'Menu',
  tagName: 'tp-menu',
  kind: 'flattening-compound',
  sourceNode: 'ucl20-menu',
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
      publicName: 'Root',
      presentationKeys: ['menu'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'menu-trigger',
      publicName: 'Trigger',
      presentationKeys: ['menu-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-target',
      publicName: 'Context target',
      presentationKeys: ['menu-target'],
      cardinality: 'one invoking region in context invocation mode',
    },
    {
      name: 'menu-content',
      publicName: 'Content',
      presentationKeys: ['menu-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-item',
      publicName: 'Item',
      presentationKeys: ['menu-item', 'menu-item-variant-ghost', 'menu-item-variant-destructive'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menu-checkbox-item',
      publicName: 'Checkbox item',
      presentationKeys: ['menu-checkbox-item'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-radio-group',
      publicName: 'RadioGroup',
      presentationKeys: ['menu-radio-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menu-radio-item',
      publicName: 'RadioItem',
      presentationKeys: ['menu-radio-item'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menu-group',
      publicName: 'Group',
      presentationKeys: ['menu-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menu-label',
      publicName: 'Label',
      presentationKeys: ['menu-label'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-sub-trigger',
      publicName: 'SubTrigger',
      presentationKeys: ['menu-sub-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-sub-content',
      publicName: 'SubContent',
      presentationKeys: ['menu-sub-content'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'menu-separator',
      publicName: 'Separator',
      presentationKeys: ['menu-separator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'menu-shortcut',
      publicName: 'Shortcut',
      presentationKeys: ['menu-shortcut'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
    'menu-shortcut': [
      {
        declarations: {
          'margin-inline-start': 'auto',
          flex: 'none',
        },
      },
    ],
    'menu-item': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          // Nova items have no fixed or minimum extent (a reused Button sub-trigger
          // included); touch keeps the accessible target.
          'block-size': 'auto',
          'min-block-size': coarseTarget,
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
    'menu-checkbox-item': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          // Nova items have no fixed or minimum extent (a reused Button sub-trigger
          // included); touch keeps the accessible target.
          'block-size': 'auto',
          'min-block-size': coarseTarget,
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
    'menu-radio-item': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          // Nova items have no fixed or minimum extent (a reused Button sub-trigger
          // included); touch keeps the accessible target.
          'block-size': 'auto',
          'min-block-size': coarseTarget,
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
    'menu-sub-trigger': [
      {
        declarations: {
          'box-sizing': 'border-box',
          display: 'flex',
          'align-items': 'center',
          'inline-size': '100%',
          // Nova items have no fixed or minimum extent (a reused Button sub-trigger
          // included); touch keeps the accessible target.
          'block-size': 'auto',
          'min-block-size': coarseTarget,
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
  sources: [menuAppearance],
  complete: true,
});
