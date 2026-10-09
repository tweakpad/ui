import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { coarseTarget } from '../recipes/shared/target.js';
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
});
