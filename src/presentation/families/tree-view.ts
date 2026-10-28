import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { treeViewAppearance } from '../recipes/tree-view.js';

const definition: ComponentDefinition = {
  name: 'Tree view',
  tagName: 'tp-tree-view',
  kind: 'compound-reexport',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  parts: [
    { name: 'tree-view', description: 'The tree itself, the single tab stop.' },
    { name: 'tree-view-viewport', description: 'The scroll container of the rows.' },
    { name: 'tree-view-item', description: 'An item host.' },
    {
      name: 'tree-view-row',
      description: 'The pressable line of an item; marked while selected, expanded or disabled.',
      axes: ['size'],
    },
    {
      name: 'tree-view-indent',
      description: 'The indentation of a row, carrying the guide lines.',
    },
    { name: 'tree-view-indicator', description: 'The disclosure chevron region.' },
    {
      name: 'tree-view-checkbox',
      description: 'The checkbox of a row with checkbox selection; marked while checked or mixed.',
    },
    { name: 'tree-view-leading', description: 'The region before the label.' },
    { name: 'tree-view-label', description: 'The label region.' },
    { name: 'tree-view-trailing', description: 'The region after the label.' },
    { name: 'tree-view-handle', description: 'The reorder handle region.' },
    { name: 'tree-view-status', description: 'The loading or load-error line under an item.' },
    {
      name: 'tree-view-group',
      description:
        'The region holding the children of an item, which animates as it opens and closes.',
    },
    { name: 'tree-view-empty', description: 'The region shown when there are no items.' },
  ],
};

export const treeViewPresentation = definePresentation({
  definition,
  bindings: {
    'tp-tree-view': {
      "[part~='tree']": 'tree-view',
      "[part~='viewport']": 'tree-view-viewport',
      "[part~='segment']": 'tree-view-group',
      "[part~='empty']": 'tree-view-empty',
    },
    'tp-tree-item': {
      ':host': 'tree-view-item',
      "[part~='row']": 'tree-view-row',
      "[part~='indent']": 'tree-view-indent',
      "[part~='indicator']": 'tree-view-indicator',
      "[part~='checkbox']": 'tree-view-checkbox',
      "[part~='leading']": 'tree-view-leading',
      "[part~='label']": 'tree-view-label',
      "[part~='trailing']": 'tree-view-trailing',
      "[part~='handle']": 'tree-view-handle',
      "[part~='status']": 'tree-view-status',
      "[part~='group']": 'tree-view-group',
    },
  },
  sources: [treeViewAppearance],
});
