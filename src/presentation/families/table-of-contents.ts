import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tableOfContentsAppearance } from '../recipes/table-of-contents.js';

const definition: ComponentDefinition = {
  name: 'Table of contents',
  tagName: 'tp-table-of-contents',
  kind: 'compound-reexport',
  sourceNode: 'ucl20-table-of-contents',
  states: ['active', 'current'],
  parts: [
    {
      name: 'table-of-contents',
      publicName: 'Root',
      presentationKeys: ['table-of-contents'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'table-of-contents-title',
      publicName: 'Title',
      presentationKeys: ['table-of-contents-title'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'table-of-contents-list',
      publicName: 'List',
      presentationKeys: ['table-of-contents-list'],
      cardinality: 'exactly one descendant of Root',
    },
    {
      name: 'table-of-contents-item',
      publicName: 'Item',
      presentationKeys: ['table-of-contents-item'],
      cardinality: 'zero or more children of Root, slotted into List',
    },
    {
      name: 'table-of-contents-link',
      publicName: 'Link',
      presentationKeys: ['table-of-contents-link'],
      cardinality: 'exactly one per Item',
    },
    {
      name: 'table-of-contents-rail',
      publicName: 'Rail',
      presentationKeys: ['table-of-contents-rail'],
      cardinality: 'exactly one descendant of List',
    },
    {
      name: 'table-of-contents-indicator',
      publicName: 'Indicator',
      presentationKeys: ['table-of-contents-indicator'],
      cardinality: 'exactly one descendant of Rail',
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
  complete: true,
});
