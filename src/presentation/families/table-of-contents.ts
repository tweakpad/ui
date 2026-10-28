import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tableOfContentsAppearance } from '../recipes/table-of-contents.js';

const definition: ComponentDefinition = {
  name: 'Table of contents',
  tagName: 'tp-table-of-contents',
  kind: 'compound-reexport',
  axes: [{ name: 'variant', values: ['list', 'compact'], default: 'list' }],
  parts: [
    {
      name: 'table-of-contents',
      description: 'The navigation landmark.',
      axes: ['variant'],
    },
    {
      name: 'table-of-contents-title',
      description: 'The visible title naming the list.',
    },
    {
      name: 'table-of-contents-list',
      description: 'The list of items, carrying the rail and the indicator.',
    },
    {
      name: 'table-of-contents-item',
      description: 'An item host.',
    },
    {
      name: 'table-of-contents-link',
      description: 'The native link of an item; marked while its target is active or current.',
    },
    {
      name: 'table-of-contents-rail',
      description: 'The decorative line along the inline-start edge of the list.',
    },
    {
      name: 'table-of-contents-indicator',
      description: 'The mark on the rail spanning the active items.',
    },
    {
      name: 'table-of-contents-trigger',
      description: 'Compact: the Button over the marks that opens the card.',
    },
    {
      name: 'table-of-contents-marks',
      description: 'Compact: the decorative column of marks.',
    },
    {
      name: 'table-of-contents-mark',
      description: 'Compact: the mark of one top-level item.',
    },
    {
      name: 'table-of-contents-popover',
      description: 'Compact: the Popover card holding the title and list.',
    },
  ],
};

export const tableOfContentsPresentation = definePresentation({
  definition,
  bindings: {
    'tp-table-of-contents': {
      "[part~='table-of-contents']": 'table-of-contents',
      "[part~='title']": 'table-of-contents-title',
      "[part~='list']": 'table-of-contents-list',
      "[part~='rail']": 'table-of-contents-rail',
      "[part~='indicator']": 'table-of-contents-indicator',
      "[part~='trigger']": 'table-of-contents-trigger',
      "[part~='marks']": 'table-of-contents-marks',
      "[part~='mark']": 'table-of-contents-mark',
      "[part~='popover']": 'table-of-contents-popover',
    },
    'tp-table-of-contents-item': {
      ':host': 'table-of-contents-item',
      "[part~='link']": 'table-of-contents-link',
    },
  },
  sources: [tableOfContentsAppearance],
});
