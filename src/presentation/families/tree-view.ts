import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { treeViewAppearance } from '../recipes/tree-view.js';

const part = (name: string, publicName: string, cardinality: string, axisKeys = false) => ({
  name,
  publicName,
  presentationKeys: axisKeys ? [name, `${name}-size-sm`, `${name}-size-default`] : [name],
  cardinality,
});

const definition: ComponentDefinition = {
  name: 'Tree view',
  tagName: 'tp-tree-view',
  kind: 'compound-reexport',
  sourceNode: 'ucl20-tree-view',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  states: [
    'expanded',
    'selected',
    'checked',
    'indeterminate',
    'disabled',
    'loading',
    'error',
    'dragging',
  ],
  parts: [
    part('tree-view', 'Root', 'exactly one public owner host per control instance'),
    part(
      'tree-view-viewport',
      'Viewport',
      'exactly one descendant of Root; the scroll container in records mode',
    ),
    part(
      'tree-view-item',
      'Item',
      'one per mounted item; authored children of Root or of an Item in markup mode',
    ),
    part('tree-view-row', 'Row', 'exactly one per Item', true),
    part('tree-view-indent', 'Indent', 'exactly one per Row; carries the guides'),
    part(
      'tree-view-indicator',
      'Indicator',
      'at most one per Row; present when the Item is expandable',
    ),
    part('tree-view-checkbox', 'Checkbox', 'at most one per Row; present with checkbox selection'),
    part('tree-view-leading', 'Leading', 'exactly one per Row; empty when unassigned'),
    part('tree-view-label', 'Label', 'exactly one per Row'),
    part('tree-view-trailing', 'Trailing', 'exactly one per Row; empty when unassigned'),
    part('tree-view-handle', 'Handle', 'at most one per Row; present when reordering is enabled'),
    part(
      'tree-view-status',
      'Status',
      'at most one per expanded Item while loading or after a load error',
    ),
    part(
      'tree-view-group',
      'Group',
      'at most one per Item; markup-mode children and records-mode transient motion region',
    ),
    part('tree-view-empty', 'Empty', 'at most one descendant of Root while there are no items'),
  ],
  motionRoles: [
    {
      name: 'disclosure',
      target: 'tree-view-group',
      kind: 'presence',
      phases: ['enter', 'exit'],
      completion: 'blocking',
      context: ['itemId', 'level'],
    },
    {
      name: 'content',
      target: 'tree-view-group',
      kind: 'presence',
      phases: ['enter', 'exit'],
      completion: 'blocking',
      context: ['itemId', 'level'],
    },
    {
      name: 'indicator',
      target: 'tree-view-indicator',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
      context: ['itemId', 'level'],
    },
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
