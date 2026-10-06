import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dragDropListAppearance } from '../recipes/drag-drop-list.js';

const definition: ComponentDefinition = {
  name: 'Drag Drop List',
  tagName: 'tp-drag-drop-list',
  kind: 'preset-composition',
  sourceNode: 'ucl21-drag-drop-list',
  axes: [
    { name: 'variant', values: ['ghost', 'outline', 'subdued'], default: 'ghost' },
    { name: 'size', values: ['xs', 'sm', 'default'], default: 'default' },
    { name: 'orientation', values: ['vertical', 'horizontal'], default: 'vertical' },
  ],
  parts: [
    {
      name: 'drag-drop-list-root',
      publicName: 'Root',
      slot: 'root',
      presentationKeys: ['drag-drop-list-root'],
      cardinality: 'exactly one public owner host',
    },
    {
      name: 'drag-drop-list-list',
      publicName: 'List',
      slot: 'list',
      presentationKeys: ['drag-drop-list-list'],
      cardinality: 'exactly one ordered list within Root',
    },
    {
      name: 'drag-drop-list-item',
      publicName: 'Item',
      slot: 'item',
      presentationKeys: ['drag-drop-list-item'],
      cardinality: 'zero or more list items within List',
    },
    {
      name: 'drag-drop-list-handle',
      publicName: 'Handle',
      slot: 'handle',
      presentationKeys: ['drag-drop-list-handle'],
      cardinality: 'one named button per item',
    },
    {
      name: 'drag-drop-list-placeholder',
      publicName: 'Placeholder',
      slot: 'placeholder',
      presentationKeys: ['drag-drop-list-placeholder'],
      cardinality: 'at most one source placeholder',
    },
    {
      name: 'drag-drop-list-overlay',
      publicName: 'Overlay',
      slot: 'overlay',
      presentationKeys: ['drag-drop-list-overlay'],
      cardinality: 'at most one active feedback overlay',
    },
    {
      name: 'drag-drop-list-empty',
      publicName: 'Empty',
      slot: 'empty',
      presentationKeys: ['drag-drop-list-empty'],
      cardinality: 'one when the list is empty',
    },
    {
      name: 'drag-drop-list-instructions',
      publicName: 'Instructions',
      slot: 'instructions',
      presentationKeys: ['drag-drop-list-instructions'],
      cardinality: 'one per applicable accessibility owner',
    },
    {
      name: 'drag-drop-list-announcements',
      publicName: 'Announcements',
      slot: 'announcements',
      presentationKeys: ['drag-drop-list-announcements'],
      cardinality: 'one per manager accessibility owner',
    },
  ],
  states: [
    'dragging',
    'dropping',
    'drop-target',
    'drag-disabled',
    'drop-disabled',
    'preview',
    'pending',
  ],
  motionRoles: [
    {
      name: 'sort-displacement',
      target: 'Item',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
      context: ['itemId', 'sourceGroup', 'targetGroup', 'fromIndex', 'toIndex', 'x', 'y'],
    },
    {
      name: 'keyboard-feedback',
      target: 'Overlay or source feedback',
      kind: 'state',
      phases: ['change'],
      completion: 'non-blocking',
      context: ['itemId', 'sourceGroup', 'targetGroup', 'fromIndex', 'toIndex', 'x', 'y'],
    },
    {
      name: 'drop-settlement',
      target: 'Overlay or source feedback',
      kind: 'state',
      phases: ['change'],
      completion: 'blocking',
      context: ['itemId', 'sourceGroup', 'targetGroup', 'fromIndex', 'toIndex', 'x', 'y'],
    },
  ],
};

export const dragDropListPresentation = definePresentation({
  definition,
  bindings: {
    'tp-drag-drop-list': {
      ':host': 'drag-drop-list-root',
      '.list': 'drag-drop-list-list',
      '.item': 'drag-drop-list-item',
      '.handle': 'drag-drop-list-handle',
      '.empty': 'drag-drop-list-empty',
    },
  },
  sources: [dragDropListAppearance],
});
