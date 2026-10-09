import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { coarseTarget } from '../recipes/shared/target.js';
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
    'menubar-sub-trigger': [
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
  sources: [menubarAppearance],
});
