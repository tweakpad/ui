import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { treeViewAppearance } from '../recipes/tree-view.js';

const definition: ComponentDefinition = {
  name: 'Tree view',
  tagName: 'tp-tree-view',
  kind: 'compound-reexport',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  parts: [
    { name: 'tree-view' },
    { name: 'tree-view-viewport' },
    { name: 'tree-view-item' },
    { name: 'tree-view-row', axes: ['size'] },
    { name: 'tree-view-indent' },
    { name: 'tree-view-indicator' },
    { name: 'tree-view-checkbox' },
    { name: 'tree-view-leading' },
    { name: 'tree-view-label' },
    { name: 'tree-view-trailing' },
    { name: 'tree-view-handle' },
    { name: 'tree-view-status' },
    { name: 'tree-view-group' },
    { name: 'tree-view-empty' },
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
