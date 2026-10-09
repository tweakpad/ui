import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tableOfContentsAppearance } from '../recipes/table-of-contents.js';

const definition: ComponentDefinition = {
  name: 'Table of contents',
  tagName: 'tp-table-of-contents',
  kind: 'compound-reexport',
  parts: [
    {
      name: 'table-of-contents',
    },
    {
      name: 'table-of-contents-title',
    },
    {
      name: 'table-of-contents-list',
    },
    {
      name: 'table-of-contents-item',
    },
    {
      name: 'table-of-contents-link',
    },
    {
      name: 'table-of-contents-rail',
    },
    {
      name: 'table-of-contents-indicator',
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
    },
    'tp-table-of-contents-item': {
      ':host': 'table-of-contents-item',
      "[part~='link']": 'table-of-contents-link',
    },
  },
  sources: [tableOfContentsAppearance],
});
